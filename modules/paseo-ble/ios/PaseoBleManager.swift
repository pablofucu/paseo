import CoreBluetooth
import ExpoModulesCore

let paseoServiceUUID = CBUUID(string: "7B1E0001-5A5E-4F0A-9C3D-2A1F50A5E000")
let paseoStateUUID = CBUUID(string: "7B1E0002-5A5E-4F0A-9C3D-2A1F50A5E000")
let paseoInboxUUID = CBUUID(string: "7B1E0003-5A5E-4F0A-9C3D-2A1F50A5E000")

// MTU que pide Android (185); en iOS lo negocia el sistema y lo leemos al conectar.
private let maxMtu = 185
private let minMtu = 23
private let connectTimeout: Double = 15
private let maxQueued = 2000

/// Todo el estado vive en `queue` (también los delegados de CoreBluetooth), así que no hay carreras.
final class PaseoBleManager: NSObject {
  let queue = DispatchQueue(label: "app.paseo.ble")
  var emit: ((String, [String: Any?]) -> Void)?

  // Esperas a que un gestor salga de `.unknown`/`.resetting`
  private var stateWaiters: [(manager: CBManager, fire: () -> Void)] = []
  private var lastEmittedState: String?

  // ── Anfitrión (periférico) ──
  private var peripheralManager: CBPeripheralManager?
  private var stateChar: CBMutableCharacteristic?
  private var inboxChar: CBMutableCharacteristic?
  private var hosting = false
  private var localName = ""
  private var pendingHost: Promise?
  private var subscribed: [UUID: CBCentral] = [:]
  /// Lo que falta por mandar cuando `updateValue` devuelve false. `to == nil`: a todas.
  private var notifyQueue: [(data: Data, to: UUID?)] = []
  private var lastStateValue = Data()

  // ── Invitado (central) ──
  private var centralManager: CBCentralManager?
  private var discovered: [UUID: CBPeripheral] = [:]
  private var target: CBPeripheral?
  private var targetState: CBCharacteristic?
  private var targetInbox: CBCharacteristic?
  private var connectPromise: Promise?
  private var connectTimer: DispatchWorkItem?
  private var connected = false
  private var writeQueue: [(data: Data, promise: Promise)] = []
  private var writing: Promise?

  // MARK: - Utilidades

  private func send(_ name: String, _ body: [String: Any?]) {
    emit?(name, body)
  }

  private static func map(_ state: CBManagerState) -> String {
    switch state {
    case .unsupported: return "unsupported"
    case .unauthorized: return "unauthorized"
    case .poweredOff: return "poweredOff"
    case .poweredOn: return "poweredOn"
    case .unknown, .resetting: return "unknown"
    @unknown default: return "unknown"
    }
  }

  private func emitState(_ state: CBManagerState) {
    let s = Self.map(state)
    if s == lastEmittedState { return }
    lastEmittedState = s
    send("onStateChange", ["state": s])
  }

  private func ensureCentral() -> CBCentralManager {
    if let c = centralManager { return c }
    // Crearlo es lo que dispara el permiso de Bluetooth la primera vez
    let c = CBCentralManager(
      delegate: self, queue: queue,
      options: [CBCentralManagerOptionShowPowerAlertKey: false])
    centralManager = c
    return c
  }

  private func ensurePeripheral() -> CBPeripheralManager {
    if let p = peripheralManager { return p }
    let p = CBPeripheralManager(
      delegate: self, queue: queue,
      options: [CBPeripheralManagerOptionShowPowerAlertKey: false])
    peripheralManager = p
    return p
  }

  private static func isSettled(_ m: CBManager) -> Bool {
    return m.state != .unknown && m.state != .resetting
  }

  /// Llama a `then` (en `queue`) cuando el estado del gestor se conoce, o al agotar `timeout`.
  private func afterStateKnown(_ m: CBManager, timeout: Double = 3, _ then: @escaping () -> Void) {
    if Self.isSettled(m) {
      then()
      return
    }
    var done = false
    let fire = {
      if done { return }
      done = true
      then()
    }
    stateWaiters.append((manager: m, fire: fire))
    queue.asyncAfter(deadline: .now() + timeout, execute: fire)
  }

  private func fireWaiters(for m: CBManager) {
    guard Self.isSettled(m) else { return }
    let ready = stateWaiters.filter { $0.manager === m }
    stateWaiters.removeAll { $0.manager === m }
    ready.forEach { $0.fire() }
  }

  private static func string(_ data: Data?) -> String {
    guard let data else { return "" }
    return String(decoding: data, as: UTF8.self)
  }

  // MARK: - Estado y permisos

  func getState(_ promise: Promise) {
    queue.async {
      switch CBManager.authorization {
      case .denied, .restricted:
        promise.resolve("unauthorized")
        return
      case .notDetermined:
        // No creamos gestores aquí: eso pediría el permiso sin que lo pida la app
        if let c = self.centralManager {
          promise.resolve(Self.map(c.state))
        } else {
          promise.resolve("unknown")
        }
        return
      default:
        break
      }
      let c = self.ensureCentral()
      self.afterStateKnown(c, timeout: 1.5) {
        promise.resolve(Self.map(c.state))
      }
    }
  }

  func requestPermissions(_ promise: Promise) {
    queue.async {
      switch CBManager.authorization {
      case .allowedAlways:
        promise.resolve(true)
      case .denied, .restricted:
        promise.resolve(false)
      default:
        // Mientras el usuario decide, el gestor sigue en `.unknown`
        let c = self.ensureCentral()
        self.afterStateKnown(c, timeout: 120) {
          promise.resolve(CBManager.authorization == .allowedAlways)
        }
      }
    }
  }

  // MARK: - Anfitrión

  func startHost(_ name: String, _ promise: Promise) {
    queue.async {
      let p = self.ensurePeripheral()
      self.afterStateKnown(p) {
        guard p.state == .poweredOn else {
          promise.reject("ERR_BLE_STATE", "Bluetooth no está listo (\(Self.map(p.state))).")
          return
        }
        self.resetHost(p)
        self.localName = name

        let state = CBMutableCharacteristic(
          type: paseoStateUUID, properties: [.read, .notify], value: nil, permissions: [.readable])
        let inbox = CBMutableCharacteristic(
          type: paseoInboxUUID, properties: [.write, .writeWithoutResponse], value: nil,
          permissions: [.writeable])
        let service = CBMutableService(type: paseoServiceUUID, primary: true)
        service.characteristics = [state, inbox]
        self.stateChar = state
        self.inboxChar = inbox
        self.pendingHost?.reject("ERR_BLE_HOST", "Se ha vuelto a abrir el anfitrión.")
        self.pendingHost = promise
        p.add(service)  // sigue en didAdd → startAdvertising → didStartAdvertising
      }
    }
  }

  func stopHost(_ promise: Promise) {
    queue.async {
      if let p = self.peripheralManager { self.resetHost(p) }
      promise.resolve()
    }
  }

  /// Deja el periférico sin servicio ni anuncio (no avisa a JS de las centrales que se van).
  private func resetHost(_ p: CBPeripheralManager) {
    if p.isAdvertising { p.stopAdvertising() }
    if stateChar != nil || inboxChar != nil { p.removeAllServices() }
    pendingHost?.reject("ERR_BLE_HOST", "Anfitrión detenido.")
    pendingHost = nil
    hosting = false
    stateChar = nil
    inboxChar = nil
    subscribed.removeAll()
    notifyQueue.removeAll()
    lastStateValue = Data()
  }

  func notify(_ chunk: String, to deviceId: String?, _ promise: Promise) {
    queue.async {
      guard self.hosting, self.stateChar != nil, self.peripheralManager != nil else {
        promise.reject("ERR_BLE_NOT_HOSTING", "El anfitrión Bluetooth no está activo.")
        return
      }
      let data = Data(chunk.utf8)
      var to: UUID?
      if let deviceId {
        guard let id = UUID(uuidString: deviceId), self.subscribed[id] != nil else {
          promise.reject("ERR_BLE_NO_CENTRAL", "Ese dispositivo no está suscrito: \(deviceId)")
          return
        }
        to = id
      } else {
        self.lastStateValue = data
        if self.subscribed.isEmpty {
          promise.resolve()
          return
        }
      }
      guard self.notifyQueue.count < maxQueued else {
        promise.reject("ERR_BLE_QUEUE_FULL", "La cola de Bluetooth está llena.")
        return
      }
      self.notifyQueue.append((data: data, to: to))
      self.flushNotify()
      promise.resolve()
    }
  }

  private func flushNotify() {
    guard let p = peripheralManager, let ch = stateChar else { return }
    while let item = notifyQueue.first {
      var centrals: [CBCentral]?
      if let to = item.to {
        guard let c = subscribed[to] else {
          notifyQueue.removeFirst()  // se ha ido: se descarta
          continue
        }
        centrals = [c]
      }
      // false = la cola de transmisión está llena: esperar a peripheralManagerIsReady
      if !p.updateValue(item.data, for: ch, onSubscribedCentrals: centrals) { return }
      notifyQueue.removeFirst()
    }
  }

  // MARK: - Invitado

  func startScan(_ promise: Promise) {
    queue.async {
      let c = self.ensureCentral()
      self.afterStateKnown(c) {
        guard c.state == .poweredOn else {
          promise.reject("ERR_BLE_STATE", "Bluetooth no está listo (\(Self.map(c.state))).")
          return
        }
        c.scanForPeripherals(
          withServices: [paseoServiceUUID],
          options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        promise.resolve()
      }
    }
  }

  func stopScan(_ promise: Promise) {
    queue.async {
      if let c = self.centralManager, c.isScanning { c.stopScan() }
      promise.resolve()
    }
  }

  func connect(_ deviceId: String, _ promise: Promise) {
    queue.async {
      let c = self.ensureCentral()
      self.afterStateKnown(c) {
        guard c.state == .poweredOn else {
          promise.reject("ERR_BLE_STATE", "Bluetooth no está listo (\(Self.map(c.state))).")
          return
        }
        guard let uuid = UUID(uuidString: deviceId),
          let p = self.discovered[uuid] ?? c.retrievePeripherals(withIdentifiers: [uuid]).first
        else {
          promise.reject("ERR_BLE_NOT_FOUND", "No se encuentra el dispositivo \(deviceId).")
          return
        }
        // Una sola conexión a la vez
        self.failConnect("Se ha empezado otra conexión.")
        self.dropTarget(cancel: true, reason: "Se ha empezado otra conexión.")

        self.target = p
        p.delegate = self
        self.connectPromise = promise
        let timer = DispatchWorkItem { [weak self] in
          self?.failConnect("No se ha podido conectar a tiempo.")
        }
        self.connectTimer = timer
        self.queue.asyncAfter(deadline: .now() + connectTimeout, execute: timer)
        c.connect(p, options: nil)
      }
    }
  }

  func write(_ chunk: String, _ promise: Promise) {
    queue.async {
      guard self.connected, self.target != nil, self.targetInbox != nil else {
        promise.reject("ERR_BLE_NOT_CONNECTED", "No hay conexión Bluetooth con el anfitrión.")
        return
      }
      guard self.writeQueue.count < maxQueued else {
        promise.reject("ERR_BLE_QUEUE_FULL", "La cola de Bluetooth está llena.")
        return
      }
      self.writeQueue.append((data: Data(chunk.utf8), promise: promise))
      self.pumpWrite()
    }
  }

  private func pumpWrite() {
    guard writing == nil, !writeQueue.isEmpty, let p = target, let inbox = targetInbox else { return }
    let item = writeQueue.removeFirst()
    writing = item.promise
    p.writeValue(item.data, for: inbox, type: .withResponse)
  }

  func disconnect(_ promise: Promise) {
    queue.async {
      self.failConnect("Conexión cancelada.")
      // Pedida por la app: no se emite onDisconnected
      self.dropTarget(cancel: true, reason: "Desconectado.")
      promise.resolve()
    }
  }

  /// Rechaza un `connect` en curso (si lo hay) y suelta el periférico.
  private func failConnect(_ reason: String) {
    guard let promise = connectPromise else { return }
    connectPromise = nil
    dropTarget(cancel: true, reason: reason)
    promise.reject("ERR_BLE_CONNECT", reason)
  }

  /// Olvida el periférico actual y rechaza las escrituras pendientes.
  private func dropTarget(cancel: Bool, reason: String) {
    connectTimer?.cancel()
    connectTimer = nil
    if cancel, let p = target, let c = centralManager {
      if let s = targetState, p.state == .connected { p.setNotifyValue(false, for: s) }
      c.cancelPeripheralConnection(p)
    }
    target?.delegate = nil
    target = nil
    targetState = nil
    targetInbox = nil
    connected = false
    let pending = writeQueue.map { $0.promise } + (writing.map { [$0] } ?? [])
    writeQueue.removeAll()
    writing = nil
    pending.forEach { $0.reject("ERR_BLE_NOT_CONNECTED", reason) }
  }

  // MARK: - Ciclo de vida

  func shutdown() {
    queue.sync {
      if let p = self.peripheralManager {
        self.resetHost(p)
        p.delegate = nil
      }
      self.failConnect("Módulo destruido.")
      self.dropTarget(cancel: true, reason: "Módulo destruido.")
      if let c = self.centralManager {
        if c.isScanning { c.stopScan() }
        c.delegate = nil
      }
      self.peripheralManager = nil
      self.centralManager = nil
      self.discovered.removeAll()
      self.emit = nil
      self.stateWaiters.removeAll()
    }
  }
}

// MARK: - CBPeripheralManagerDelegate (anfitrión)

extension PaseoBleManager: CBPeripheralManagerDelegate {
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    emitState(peripheral.state)
    if peripheral.state != .poweredOn, hosting || pendingHost != nil {
      // El sistema ha tirado el servicio: las centrales ya no están
      let gone = Array(subscribed.keys)
      pendingHost?.reject("ERR_BLE_STATE", "Bluetooth se ha apagado.")
      pendingHost = nil
      hosting = false
      stateChar = nil
      inboxChar = nil
      subscribed.removeAll()
      notifyQueue.removeAll()
      gone.forEach { send("onCentralDisconnected", ["deviceId": $0.uuidString]) }
    }
    fireWaiters(for: peripheral)
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    guard let promise = pendingHost else { return }
    if let error {
      pendingHost = nil
      promise.reject("ERR_BLE_HOST", "No se pudo publicar el servicio: \(error.localizedDescription)")
      return
    }
    // iOS solo deja anunciar el nombre local y los UUID de servicio
    peripheral.startAdvertising([
      CBAdvertisementDataLocalNameKey: localName,
      CBAdvertisementDataServiceUUIDsKey: [paseoServiceUUID],
    ])
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    guard let promise = pendingHost else { return }
    pendingHost = nil
    if let error {
      peripheral.removeAllServices()
      stateChar = nil
      inboxChar = nil
      promise.reject("ERR_BLE_ADVERTISE", "No se pudo anunciar: \(error.localizedDescription)")
      return
    }
    hosting = true
    promise.resolve()
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager, central: CBCentral,
    didSubscribeTo characteristic: CBCharacteristic
  ) {
    guard characteristic.uuid == paseoStateUUID else { return }
    let isNew = subscribed[central.identifier] == nil
    subscribed[central.identifier] = central
    if isNew { send("onCentralConnected", ["deviceId": central.identifier.uuidString]) }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager, central: CBCentral,
    didUnsubscribeFrom characteristic: CBCharacteristic
  ) {
    guard characteristic.uuid == paseoStateUUID,
      subscribed.removeValue(forKey: central.identifier) != nil
    else { return }
    notifyQueue.removeAll { $0.to == central.identifier }
    send("onCentralDisconnected", ["deviceId": central.identifier.uuidString])
  }

  func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
    flushNotify()
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
    guard request.characteristic.uuid == paseoStateUUID else {
      peripheral.respond(to: request, withResult: .attributeNotFound)
      return
    }
    guard request.offset <= lastStateValue.count else {
      peripheral.respond(to: request, withResult: .invalidOffset)
      return
    }
    request.value = lastStateValue.subdata(in: request.offset..<lastStateValue.count)
    peripheral.respond(to: request, withResult: .success)
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    guard let first = requests.first else { return }
    guard requests.allSatisfy({ $0.characteristic.uuid == paseoInboxUUID }) else {
      peripheral.respond(to: first, withResult: .writeNotPermitted)
      return
    }
    // Una escritura larga llega en varios trozos con su offset: se juntan por central
    var byCentral: [UUID: Data] = [:]
    var order: [UUID] = []
    for r in requests.sorted(by: { $0.offset < $1.offset }) {
      let id = r.central.identifier
      if byCentral[id] == nil { order.append(id) }
      byCentral[id, default: Data()].append(r.value ?? Data())
    }
    // Una sola respuesta para todo el lote (como pide CoreBluetooth)
    peripheral.respond(to: first, withResult: .success)
    for id in order {
      send("onInbox", ["deviceId": id.uuidString, "chunk": Self.string(byCentral[id])])
    }
  }
}

// MARK: - CBCentralManagerDelegate (invitado)

extension PaseoBleManager: CBCentralManagerDelegate {
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    emitState(central.state)
    if central.state != .poweredOn {
      if connectPromise != nil {
        failConnect("Bluetooth se ha apagado.")
      } else if target != nil {
        let wasConnected = connected
        dropTarget(cancel: false, reason: "Bluetooth se ha apagado.")
        if wasConnected { send("onDisconnected", ["reason": "Bluetooth se ha apagado."]) }
      }
      discovered.removeAll()
    }
    fireWaiters(for: central)
  }

  func centralManager(
    _ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any], rssi RSSI: NSNumber
  ) {
    discovered[peripheral.identifier] = peripheral
    // Android anuncia el nombre como service data; iOS como nombre local
    var name: String?
    if let sd = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data],
      let d = sd[paseoServiceUUID], !d.isEmpty
    {
      name = Self.string(d)
    }
    if name == nil { name = advertisementData[CBAdvertisementDataLocalNameKey] as? String }
    if name == nil { name = peripheral.name }
    send(
      "onDeviceFound",
      [
        "deviceId": peripheral.identifier.uuidString,
        "name": name.map { $0 as Any } ?? NSNull(),
        "rssi": RSSI.intValue,
      ])
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    guard peripheral === target, connectPromise != nil else { return }
    peripheral.discoverServices([paseoServiceUUID])
  }

  func centralManager(
    _ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?
  ) {
    guard peripheral === target else { return }
    failConnect("No se pudo conectar: \(error?.localizedDescription ?? "error desconocido")")
  }

  func centralManager(
    _ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?
  ) {
    guard peripheral === target else { return }  // uno anterior o cerrado por disconnect()
    let reason = error?.localizedDescription ?? "El anfitrión se ha desconectado."
    if connectPromise != nil {
      failConnect(reason)
      return
    }
    let wasConnected = connected
    dropTarget(cancel: false, reason: reason)
    if wasConnected { send("onDisconnected", ["reason": reason]) }
  }
}

// MARK: - CBPeripheralDelegate (invitado)

extension PaseoBleManager: CBPeripheralDelegate {
  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard peripheral === target, connectPromise != nil else { return }
    if let error {
      failConnect("No se pudo descubrir el servicio: \(error.localizedDescription)")
      return
    }
    guard let service = peripheral.services?.first(where: { $0.uuid == paseoServiceUUID }) else {
      failConnect("Ese dispositivo no es un anfitrión de Paseo.")
      return
    }
    peripheral.discoverCharacteristics([paseoStateUUID, paseoInboxUUID], for: service)
  }

  func peripheral(
    _ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?
  ) {
    guard peripheral === target, connectPromise != nil else { return }
    if let error {
      failConnect("No se pudieron descubrir las características: \(error.localizedDescription)")
      return
    }
    let chars = service.characteristics ?? []
    guard let state = chars.first(where: { $0.uuid == paseoStateUUID }),
      let inbox = chars.first(where: { $0.uuid == paseoInboxUUID })
    else {
      failConnect("El anfitrión no tiene las características de Paseo.")
      return
    }
    targetState = state
    targetInbox = inbox
    peripheral.setNotifyValue(true, for: state)
  }

  func peripheral(
    _ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic,
    error: Error?
  ) {
    guard peripheral === target, characteristic.uuid == paseoStateUUID,
      let promise = connectPromise
    else { return }
    if let error {
      failConnect("No se pudo suscribir: \(error.localizedDescription)")
      return
    }
    connectPromise = nil
    connectTimer?.cancel()
    connectTimer = nil
    connected = true
    // Con respuesta iOS admite escrituras largas (512); sin respuesta refleja el MTU ATT real
    let mtu = min(max(peripheral.maximumWriteValueLength(for: .withoutResponse) + 3, minMtu), maxMtu)
    promise.resolve(["mtu": mtu])
  }

  func peripheral(
    _ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?
  ) {
    guard peripheral === target, characteristic.uuid == paseoStateUUID, error == nil,
      let value = characteristic.value
    else { return }
    send("onNotify", ["chunk": Self.string(value)])
  }

  func peripheral(
    _ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?
  ) {
    guard peripheral === target, characteristic.uuid == paseoInboxUUID else { return }
    let promise = writing
    writing = nil
    if let error {
      promise?.reject("ERR_BLE_WRITE", "No se pudo escribir: \(error.localizedDescription)")
    } else {
      promise?.resolve()
    }
    pumpWrite()
  }
}
