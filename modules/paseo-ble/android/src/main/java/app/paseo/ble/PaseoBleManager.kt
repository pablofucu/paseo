package app.paseo.ble

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream
import java.util.ArrayDeque
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

private const val TAG = "PaseoBle"

val PASEO_SERVICE_UUID: UUID = UUID.fromString("7b1e0001-5a5e-4f0a-9c3d-2a1f50a5e000")
val STATE_CHAR_UUID: UUID = UUID.fromString("7b1e0002-5a5e-4f0a-9c3d-2a1f50a5e000")
val INBOX_CHAR_UUID: UUID = UUID.fromString("7b1e0003-5a5e-4f0a-9c3d-2a1f50a5e000")
val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

private const val REQUESTED_MTU = 185
private const val DEFAULT_MTU = 23
private const val CONNECT_TIMEOUT_MS = 15_000L
private const val MTU_TIMEOUT_MS = 2_000L
private const val NOTIFY_SENT_TIMEOUT_MS = 1_000L
private const val BUSY_RETRY_MS = 15L
private const val MAX_BUSY_RETRIES = 40
private const val MAX_QUEUED = 2000

// Service data en la respuesta al escaneo: 31 bytes − 2 (cabecera) − 16 (UUID de 128 bits)
private const val MAX_NAME_BYTES = 13

/**
 * Anfitrión (GATT server + advertiser) e invitado (scanner + GATT client).
 * Todo el estado se toca solo en el hilo de [handler]: los callbacks de Android (que llegan
 * en hilos de binder o en el principal) se reenvían allí.
 */
@SuppressLint("MissingPermission") // Se comprueban en tiempo de ejecución; si faltan, SecurityException → reject
class PaseoBleManager(
  private val context: Context,
  private val emit: (String, Map<String, Any?>) -> Unit
) {
  private val thread = HandlerThread("PaseoBle").apply { start() }
  private val handler = Handler(thread.looper)
  private val btManager: BluetoothManager? = context.getSystemService(BluetoothManager::class.java)
  private val adapter: BluetoothAdapter? get() = btManager?.adapter

  @Volatile private var destroyed = false
  private var lastEmittedState: String? = null

  // ── Anfitrión ──
  private var server: BluetoothGattServer? = null
  private var stateChar: BluetoothGattCharacteristic? = null
  private var hosting = false
  private var pendingHost: Promise? = null
  private var advertising = false
  private val serverConnected = HashMap<String, BluetoothDevice>()
  private val subscribed = HashMap<String, BluetoothDevice>()
  private val preparedWrites = HashMap<String, ByteArrayOutputStream>()
  private val notifyQueue = ArrayDeque<Pair<String, ByteArray>>()
  private var notifyInFlight = false
  private var lastStateValue = ByteArray(0)
  private var busyRetries = 0
  private val notifyTimeout = Runnable {
    safe {
      notifyInFlight = false
      pumpNotify()
    }
  }
  private val notifyRetry = Runnable { safe { pumpNotify() } }

  // ── Invitado ──
  private var scanning = false
  private var gatt: BluetoothGatt? = null
  private var connectPromise: Promise? = null
  private var connected = false
  private var mtu = DEFAULT_MTU
  private var mtuPending = false
  private var guestState: BluetoothGattCharacteristic? = null
  private var guestInbox: BluetoothGattCharacteristic? = null
  private val writeQueue = ArrayDeque<Pair<ByteArray, Promise>>()
  private var writing: Promise? = null
  private val connectTimeout = Runnable { safe { failConnect("No se ha podido conectar a tiempo.") } }
  private val mtuTimeout = Runnable {
    safe {
      val g = gatt
      if (mtuPending && g != null) {
        mtuPending = false
        discover(g)
      }
    }
  }

  private val stateReceiver = object : BroadcastReceiver() {
    override fun onReceive(c: Context?, intent: Intent?) {
      if (intent?.action != BluetoothAdapter.ACTION_STATE_CHANGED) return
      val s = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
      post { onAdapterState(s) }
    }
  }

  init {
    val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        // Las difusiones del sistema llegan también a receptores no exportados
        context.registerReceiver(stateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        context.registerReceiver(stateReceiver, filter)
      }
    } catch (e: Exception) {
      Log.w(TAG, "No se pudo registrar el receptor de estado", e)
    }
  }

  // ── Hilo y utilidades ──

  private fun post(block: () -> Unit) {
    if (destroyed) return
    handler.post {
      try {
        block()
      } catch (e: Throwable) {
        Log.e(TAG, "Error en el hilo de Bluetooth", e)
      }
    }
  }

  /** Ejecuta en el hilo de Bluetooth y convierte cualquier excepción en un reject. */
  private fun exec(promise: Promise, block: () -> Unit) {
    if (destroyed) {
      promise.reject("ERR_BLE_DESTROYED", "El módulo de Bluetooth se ha cerrado", null)
      return
    }
    handler.post {
      try {
        block()
      } catch (e: SecurityException) {
        promise.reject("ERR_BLE_PERMISSION", "Falta el permiso de Bluetooth: ${e.message}", e)
      } catch (e: Throwable) {
        promise.reject("ERR_BLE", e.message ?: e.toString(), e)
      }
    }
  }

  /** Para Runnables del handler: que una excepción no tumbe el hilo. */
  private fun safe(block: () -> Unit) {
    try {
      block()
    } catch (e: Throwable) {
      Log.e(TAG, "Error en el hilo de Bluetooth", e)
    }
  }

  private fun send(name: String, body: Map<String, Any?>) {
    if (destroyed) return
    try {
      emit(name, body)
    } catch (e: Throwable) {
      Log.w(TAG, "No se pudo emitir $name", e)
    }
  }

  private fun granted(permission: String): Boolean =
    context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun hasBle(): Boolean =
    adapter != null && context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)

  private fun currentState(): String {
    val a = adapter
    if (a == null || !hasBle()) return "unsupported"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !granted(Manifest.permission.BLUETOOTH_CONNECT)) {
      return "unauthorized"
    }
    return when (a.state) {
      BluetoothAdapter.STATE_ON -> "poweredOn"
      BluetoothAdapter.STATE_OFF -> "poweredOff"
      else -> "unknown"
    }
  }

  private fun emitState(s: String) {
    if (s == lastEmittedState) return
    lastEmittedState = s
    send("onStateChange", mapOf("state" to s))
  }

  /** Rechaza (y devuelve false) si Bluetooth no está encendido y con permiso. */
  private fun ready(promise: Promise, vararg permissions: String): Boolean {
    val s = currentState()
    if (s != "poweredOn") {
      promise.reject("ERR_BLE_STATE", "Bluetooth no está listo ($s).", null)
      return false
    }
    val missing = permissions.filter { !granted(it) }
    if (missing.isNotEmpty()) {
      promise.reject("ERR_BLE_PERMISSION", "Falta el permiso: ${missing.joinToString()}", null)
      return false
    }
    return true
  }

  private fun onAdapterState(s: Int) {
    emitState(currentState())
    if (s == BluetoothAdapter.STATE_TURNING_OFF || s == BluetoothAdapter.STATE_OFF) {
      // El sistema corta todo: se avisa como si se fueran
      val gone = subscribed.keys.toList()
      closeHost()
      gone.forEach { send("onCentralDisconnected", mapOf("deviceId" to it)) }
      scanning = false
      if (connectPromise != null) {
        failConnect("Bluetooth se ha apagado.")
      } else if (gatt != null) {
        val wasConnected = connected
        closeGuest("Bluetooth se ha apagado.")
        if (wasConnected) send("onDisconnected", mapOf("reason" to "Bluetooth se ha apagado."))
      }
    }
  }

  // ── Estado ──

  fun getState(promise: Promise) = exec(promise) {
    val s = currentState()
    promise.resolve(s)
  }

  // ── Anfitrión ──

  fun startHost(localName: String, promise: Promise) = exec(promise) {
    val perms =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        arrayOf(Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.BLUETOOTH_CONNECT)
      } else {
        emptyArray()
      }
    if (!ready(promise, *perms)) return@exec
    val a = adapter!!
    if (a.bluetoothLeAdvertiser == null || !a.isMultipleAdvertisementSupported) {
      promise.reject("ERR_BLE_ADVERTISE", "Este móvil no puede anunciarse por Bluetooth LE.", null)
      return@exec
    }
    closeHost()

    val gattServer = btManager?.openGattServer(context, serverCallback)
    if (gattServer == null) {
      promise.reject("ERR_BLE_HOST", "No se pudo abrir el servidor GATT.", null)
      return@exec
    }
    val state = BluetoothGattCharacteristic(
      STATE_CHAR_UUID,
      BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
      BluetoothGattCharacteristic.PERMISSION_READ
    )
    state.addDescriptor(
      BluetoothGattDescriptor(
        CCCD_UUID,
        BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
      )
    )
    val inbox = BluetoothGattCharacteristic(
      INBOX_CHAR_UUID,
      BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
      BluetoothGattCharacteristic.PERMISSION_WRITE
    )
    val service = BluetoothGattService(PASEO_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
    service.addCharacteristic(state)
    service.addCharacteristic(inbox)

    server = gattServer
    stateChar = state
    hostName = localName
    pendingHost = promise
    if (!gattServer.addService(service)) {
      pendingHost = null
      closeHost()
      promise.reject("ERR_BLE_HOST", "No se pudo publicar el servicio.", null)
    }
    // sigue en onServiceAdded → startAdvertising → onStartSuccess
  }

  private var hostName = ""

  private fun startAdvertising() {
    val advertiser = adapter?.bluetoothLeAdvertiser
    val promise = pendingHost
    if (advertiser == null) {
      pendingHost = null
      closeHost()
      promise?.reject("ERR_BLE_ADVERTISE", "Este móvil no puede anunciarse por Bluetooth LE.", null)
      return
    }
    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
      .setConnectable(true)
      .setTimeout(0)
      .build()
    // Anuncio: flags (3) + UUID de 128 bits (18) = 21 bytes ≤ 31
    val data = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .setIncludeTxPowerLevel(false)
      .addServiceUuid(ParcelUuid(PASEO_SERVICE_UUID))
      .build()
    // Respuesta al escaneo: el nombre local como service data (el nombre del dispositivo es el del móvil)
    val nameBytes = truncateUtf8(hostName, MAX_NAME_BYTES)
    val scanResponse = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .setIncludeTxPowerLevel(false)
      .addServiceData(ParcelUuid(PASEO_SERVICE_UUID), nameBytes)
      .build()
    try {
      advertiser.startAdvertising(settings, data, scanResponse, advertiseCallback)
    } catch (e: SecurityException) {
      pendingHost = null
      closeHost()
      promise?.reject("ERR_BLE_PERMISSION", "Falta el permiso BLUETOOTH_ADVERTISE.", e)
    }
  }

  private val advertiseCallback = object : AdvertiseCallback() {
    override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
      post {
        val promise = pendingHost ?: return@post
        pendingHost = null
        advertising = true
        hosting = true
        promise.resolve()
      }
    }

    override fun onStartFailure(errorCode: Int) {
      post {
        val promise = pendingHost ?: return@post
        pendingHost = null
        closeHost()
        promise.reject("ERR_BLE_ADVERTISE", "No se pudo anunciar (código $errorCode).", null)
      }
    }
  }

  fun stopHost(promise: Promise) = exec(promise) {
    closeHost()
    promise.resolve()
  }

  /** Para el anuncio y cierra el servidor (no avisa a JS de las centrales que se van). */
  private fun closeHost() {
    pendingHost?.reject("ERR_BLE_HOST", "Anfitrión detenido.", null)
    pendingHost = null
    if (advertising) {
      try {
        adapter?.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
      } catch (e: Exception) {
        Log.w(TAG, "stopAdvertising", e)
      }
    }
    advertising = false
    server?.let { s ->
      try {
        serverConnected.values.forEach { s.cancelConnection(it) }
        s.clearServices()
        s.close()
      } catch (e: Exception) {
        Log.w(TAG, "cerrar el servidor GATT", e)
      }
    }
    server = null
    stateChar = null
    hosting = false
    serverConnected.clear()
    subscribed.clear()
    preparedWrites.clear()
    notifyQueue.clear()
    notifyInFlight = false
    busyRetries = 0
    handler.removeCallbacks(notifyTimeout)
    handler.removeCallbacks(notifyRetry)
    lastStateValue = ByteArray(0)
  }

  fun notify(chunk: String, deviceId: String?, promise: Promise) = exec(promise) {
    if (!hosting || server == null || stateChar == null) {
      promise.reject("ERR_BLE_NOT_HOSTING", "El anfitrión Bluetooth no está activo.", null)
      return@exec
    }
    val value = chunk.toByteArray(Charsets.UTF_8)
    val targets: List<String> =
      if (deviceId != null) {
        if (!subscribed.containsKey(deviceId)) {
          promise.reject("ERR_BLE_NO_CENTRAL", "Ese dispositivo no está suscrito: $deviceId", null)
          return@exec
        }
        listOf(deviceId)
      } else {
        lastStateValue = value
        subscribed.keys.toList()
      }
    if (notifyQueue.size + targets.size > MAX_QUEUED) {
      promise.reject("ERR_BLE_QUEUE_FULL", "La cola de Bluetooth está llena.", null)
      return@exec
    }
    targets.forEach { notifyQueue.add(it to value) }
    pumpNotify()
    promise.resolve()
  }

  /** Una notificación cada vez: la siguiente sale al llegar onNotificationSent. */
  private fun pumpNotify() {
    val s = server ?: return
    val ch = stateChar ?: return
    while (!notifyInFlight) {
      val (address, value) = notifyQueue.peekFirst() ?: return
      val device = subscribed[address]
      if (device == null) {
        notifyQueue.pollFirst()
        continue
      }
      val result = sendNotification(s, device, ch, value)
      // Ocupado: se reintenta en un momento (si no se libera, se descarta para no atascar la cola)
      if (result == NotifyResult.BUSY && busyRetries < MAX_BUSY_RETRIES) {
        busyRetries++
        handler.removeCallbacks(notifyRetry)
        handler.postDelayed(notifyRetry, BUSY_RETRY_MS)
        return
      }
      busyRetries = 0
      notifyQueue.pollFirst()
      if (result == NotifyResult.SENT) {
        notifyInFlight = true
        handler.postDelayed(notifyTimeout, NOTIFY_SENT_TIMEOUT_MS)
      }
      // FAILED (o BUSY sin remedio): se descarta y se sigue con la siguiente
    }
  }

  private enum class NotifyResult { SENT, BUSY, FAILED }

  @Suppress("DEPRECATION")
  private fun sendNotification(
    s: BluetoothGattServer,
    device: BluetoothDevice,
    ch: BluetoothGattCharacteristic,
    value: ByteArray
  ): NotifyResult {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        when (s.notifyCharacteristicChanged(device, ch, false, value)) {
          BluetoothStatusCodes.SUCCESS -> NotifyResult.SENT
          BluetoothStatusCodes.ERROR_GATT_WRITE_REQUEST_BUSY -> NotifyResult.BUSY
          else -> NotifyResult.FAILED
        }
      } else {
        ch.value = value
        if (s.notifyCharacteristicChanged(device, ch, false)) NotifyResult.SENT else NotifyResult.BUSY
      }
    } catch (e: SecurityException) {
      Log.w(TAG, "notify sin permiso", e)
      NotifyResult.FAILED
    }
  }

  private val serverCallback = object : BluetoothGattServerCallback() {
    override fun onServiceAdded(status: Int, service: BluetoothGattService?) {
      post {
        if (pendingHost == null || service?.uuid != PASEO_SERVICE_UUID) return@post
        if (status != BluetoothGatt.GATT_SUCCESS) {
          val promise = pendingHost
          pendingHost = null
          closeHost()
          promise?.reject("ERR_BLE_HOST", "No se pudo publicar el servicio (estado $status).", null)
          return@post
        }
        startAdvertising()
      }
    }

    override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
      post {
        val address = device.address
        if (newState == BluetoothProfile.STATE_CONNECTED) {
          if (server != null) serverConnected[address] = device
        } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
          serverConnected.remove(address)
          preparedWrites.remove(address)
          unsubscribe(address)
        }
      }
    }

    override fun onCharacteristicReadRequest(
      device: BluetoothDevice,
      requestId: Int,
      offset: Int,
      characteristic: BluetoothGattCharacteristic
    ) {
      post {
        val s = server ?: return@post
        if (characteristic.uuid != STATE_CHAR_UUID) {
          s.sendResponse(device, requestId, BluetoothGatt.GATT_READ_NOT_PERMITTED, offset, null)
          return@post
        }
        val v = lastStateValue
        if (offset > v.size) {
          s.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null)
        } else {
          s.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, v.copyOfRange(offset, v.size))
        }
      }
    }

    override fun onCharacteristicWriteRequest(
      device: BluetoothDevice,
      requestId: Int,
      characteristic: BluetoothGattCharacteristic,
      preparedWrite: Boolean,
      responseNeeded: Boolean,
      offset: Int,
      value: ByteArray?
    ) {
      val bytes = value ?: ByteArray(0)
      post {
        val s = server ?: return@post
        if (characteristic.uuid != INBOX_CHAR_UUID) {
          if (responseNeeded) s.sendResponse(device, requestId, BluetoothGatt.GATT_WRITE_NOT_PERMITTED, offset, null)
          return@post
        }
        if (preparedWrite) {
          // Escritura larga: se junta hasta onExecuteWrite
          preparedWrites.getOrPut(device.address) { ByteArrayOutputStream() }.write(bytes)
        }
        if (responseNeeded) s.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, bytes)
        if (!preparedWrite) {
          send("onInbox", mapOf("deviceId" to device.address, "chunk" to String(bytes, Charsets.UTF_8)))
        }
      }
    }

    override fun onExecuteWrite(device: BluetoothDevice, requestId: Int, execute: Boolean) {
      post {
        val buffer = preparedWrites.remove(device.address)
        server?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
        if (execute && buffer != null) {
          send(
            "onInbox",
            mapOf("deviceId" to device.address, "chunk" to String(buffer.toByteArray(), Charsets.UTF_8))
          )
        }
      }
    }

    override fun onDescriptorReadRequest(
      device: BluetoothDevice,
      requestId: Int,
      offset: Int,
      descriptor: BluetoothGattDescriptor
    ) {
      post {
        val s = server ?: return@post
        if (descriptor.uuid != CCCD_UUID) {
          s.sendResponse(device, requestId, BluetoothGatt.GATT_READ_NOT_PERMITTED, offset, null)
          return@post
        }
        val v =
          if (subscribed.containsKey(device.address)) BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
          else BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
        s.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, v)
      }
    }

    override fun onDescriptorWriteRequest(
      device: BluetoothDevice,
      requestId: Int,
      descriptor: BluetoothGattDescriptor,
      preparedWrite: Boolean,
      responseNeeded: Boolean,
      offset: Int,
      value: ByteArray?
    ) {
      val bytes = value ?: ByteArray(0)
      post {
        val s = server ?: return@post
        if (descriptor.uuid != CCCD_UUID || descriptor.characteristic?.uuid != STATE_CHAR_UUID) {
          if (responseNeeded) s.sendResponse(device, requestId, BluetoothGatt.GATT_WRITE_NOT_PERMITTED, offset, null)
          return@post
        }
        if (responseNeeded) s.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, bytes)
        val enable = bytes.isNotEmpty() && (bytes[0].toInt() and 0x03) != 0 // notify (1) o indicate (2)
        val address = device.address
        if (enable) {
          if (!subscribed.containsKey(address)) {
            subscribed[address] = device
            serverConnected[address] = device
            send("onCentralConnected", mapOf("deviceId" to address))
          }
        } else {
          unsubscribe(address)
        }
      }
    }

    override fun onNotificationSent(device: BluetoothDevice, status: Int) {
      post {
        handler.removeCallbacks(notifyTimeout)
        notifyInFlight = false
        pumpNotify()
      }
    }
  }

  private fun unsubscribe(address: String) {
    if (subscribed.remove(address) == null) return
    notifyQueue.removeAll { it.first == address }
    send("onCentralDisconnected", mapOf("deviceId" to address))
  }

  // ── Invitado ──

  fun startScan(promise: Promise) = exec(promise) {
    val perms =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) arrayOf(Manifest.permission.BLUETOOTH_SCAN)
      else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
    if (!ready(promise, *perms)) return@exec
    val scanner = adapter?.bluetoothLeScanner
    if (scanner == null) {
      promise.reject("ERR_BLE_SCAN", "No se puede escanear por Bluetooth LE.", null)
      return@exec
    }
    if (scanning) {
      scanner.stopScan(scanCallback)
      scanning = false
    }
    val filters = listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(PASEO_SERVICE_UUID)).build())
    val settings = ScanSettings.Builder()
      .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
      .build()
    scanner.startScan(filters, settings, scanCallback)
    scanning = true
    promise.resolve()
  }

  fun stopScan(promise: Promise) = exec(promise) {
    stopScanning()
    promise.resolve()
  }

  private fun stopScanning() {
    if (!scanning) return
    scanning = false
    try {
      adapter?.bluetoothLeScanner?.stopScan(scanCallback)
    } catch (e: Exception) {
      Log.w(TAG, "stopScan", e)
    }
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      val device = result.device
      val record = result.scanRecord
      // Android (anfitrión) manda el nombre como service data; iOS como nombre local
      var name: String? = record?.getServiceData(ParcelUuid(PASEO_SERVICE_UUID))
        ?.takeIf { it.isNotEmpty() }
        ?.let { String(it, Charsets.UTF_8) }
      if (name == null) name = record?.deviceName
      if (name == null) name = try { device.name } catch (e: SecurityException) { null }
      val body = mapOf("deviceId" to device.address, "name" to name, "rssi" to result.rssi)
      post { if (scanning) send("onDeviceFound", body) }
    }

    override fun onBatchScanResults(results: MutableList<ScanResult>) {
      results.forEach { onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, it) }
    }

    override fun onScanFailed(errorCode: Int) {
      Log.w(TAG, "Escaneo fallido: $errorCode")
      post { scanning = false }
    }
  }

  fun connect(deviceId: String, promise: Promise) = exec(promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      if (!ready(promise, Manifest.permission.BLUETOOTH_CONNECT)) return@exec
    } else if (!ready(promise)) {
      return@exec
    }
    if (!BluetoothAdapter.checkBluetoothAddress(deviceId)) {
      promise.reject("ERR_BLE_NOT_FOUND", "Identificador de dispositivo no válido: $deviceId", null)
      return@exec
    }
    // Una sola conexión a la vez
    failConnect("Se ha empezado otra conexión.")
    closeGuest("Se ha empezado otra conexión.")

    val device = adapter!!.getRemoteDevice(deviceId)
    connectPromise = promise
    mtu = DEFAULT_MTU
    handler.postDelayed(connectTimeout, CONNECT_TIMEOUT_MS)
    val g = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
    if (g == null) {
      connectPromise = null
      handler.removeCallbacks(connectTimeout)
      promise.reject("ERR_BLE_CONNECT", "No se pudo iniciar la conexión.", null)
      return@exec
    }
    gatt = g
  }

  private fun discover(g: BluetoothGatt) {
    if (!g.discoverServices()) failConnect("No se pudo descubrir el servicio.")
  }

  fun write(chunk: String, promise: Promise) = exec(promise) {
    if (!connected || gatt == null || guestInbox == null) {
      promise.reject("ERR_BLE_NOT_CONNECTED", "No hay conexión Bluetooth con el anfitrión.", null)
      return@exec
    }
    if (writeQueue.size >= MAX_QUEUED) {
      promise.reject("ERR_BLE_QUEUE_FULL", "La cola de Bluetooth está llena.", null)
      return@exec
    }
    writeQueue.add(chunk.toByteArray(Charsets.UTF_8) to promise)
    pumpWrite()
  }

  @Suppress("DEPRECATION")
  private fun pumpWrite() {
    if (writing != null) return
    val g = gatt ?: return
    val ch = guestInbox ?: return
    val (value, promise) = writeQueue.pollFirst() ?: return
    val ok = try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        g.writeCharacteristic(ch, value, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT) ==
          BluetoothStatusCodes.SUCCESS
      } else {
        ch.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        ch.value = value
        g.writeCharacteristic(ch)
      }
    } catch (e: SecurityException) {
      false
    }
    if (ok) {
      writing = promise
    } else {
      promise.reject("ERR_BLE_WRITE", "No se pudo escribir en el anfitrión.", null)
      pumpWrite()
    }
  }

  fun disconnect(promise: Promise) = exec(promise) {
    failConnect("Conexión cancelada.")
    // Pedida por la app: no se emite onDisconnected
    closeGuest("Desconectado.")
    promise.resolve()
  }

  /** Rechaza un `connect` en curso (si lo hay) y cierra la conexión. */
  private fun failConnect(reason: String) {
    val promise = connectPromise ?: return
    connectPromise = null
    closeGuest(reason)
    promise.reject("ERR_BLE_CONNECT", reason, null)
  }

  private fun closeGuest(reason: String) {
    handler.removeCallbacks(connectTimeout)
    handler.removeCallbacks(mtuTimeout)
    mtuPending = false
    gatt?.let { g ->
      try {
        g.disconnect()
        g.close()
      } catch (e: Exception) {
        Log.w(TAG, "cerrar GATT", e)
      }
    }
    gatt = null
    guestState = null
    guestInbox = null
    connected = false
    val pending = writeQueue.map { it.second } + listOfNotNull(writing)
    writeQueue.clear()
    writing = null
    pending.forEach { it.reject("ERR_BLE_NOT_CONNECTED", reason, null) }
  }

  @Suppress("DEPRECATION")
  private fun enableNotifications(g: BluetoothGatt, ch: BluetoothGattCharacteristic) {
    val cccd = ch.getDescriptor(CCCD_UUID)
    if (!g.setCharacteristicNotification(ch, true) || cccd == null) {
      failConnect("No se pudo suscribir a STATE.")
      return
    }
    val value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
    val ok =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        g.writeDescriptor(cccd, value) == BluetoothStatusCodes.SUCCESS
      } else {
        cccd.value = value
        g.writeDescriptor(cccd)
      }
    if (!ok) failConnect("No se pudo suscribir a STATE.")
  }

  private val gattCallback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
      post {
        if (g !== gatt) {
          // Una conexión anterior: se cierra sin más
          if (newState == BluetoothProfile.STATE_DISCONNECTED) runCatching { g.close() }
          return@post
        }
        if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
          if (connectPromise == null) return@post
          mtuPending = g.requestMtu(REQUESTED_MTU)
          if (mtuPending) {
            // Algunos móviles nunca llaman a onMtuChanged
            handler.postDelayed(mtuTimeout, MTU_TIMEOUT_MS)
          } else {
            discover(g)
          }
        } else if (newState == BluetoothProfile.STATE_DISCONNECTED || status != BluetoothGatt.GATT_SUCCESS) {
          val reason =
            if (status == BluetoothGatt.GATT_SUCCESS) "El anfitrión se ha desconectado."
            else "Conexión perdida (estado $status)."
          if (connectPromise != null) {
            failConnect(reason)
            return@post
          }
          val wasConnected = connected
          closeGuest(reason)
          if (wasConnected) send("onDisconnected", mapOf("reason" to reason))
        }
      }
    }

    override fun onMtuChanged(g: BluetoothGatt, newMtu: Int, status: Int) {
      post {
        if (g !== gatt) return@post
        if (status == BluetoothGatt.GATT_SUCCESS) mtu = newMtu
        if (!mtuPending) return@post // ya se siguió por tiempo, o es un cambio posterior
        mtuPending = false
        handler.removeCallbacks(mtuTimeout)
        discover(g)
      }
    }

    override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
      post {
        if (g !== gatt || connectPromise == null) return@post
        if (status != BluetoothGatt.GATT_SUCCESS) {
          failConnect("No se pudo descubrir el servicio (estado $status).")
          return@post
        }
        val service = g.getService(PASEO_SERVICE_UUID)
        val state = service?.getCharacteristic(STATE_CHAR_UUID)
        val inbox = service?.getCharacteristic(INBOX_CHAR_UUID)
        if (state == null || inbox == null) {
          failConnect("Ese dispositivo no es un anfitrión de Paseo.")
          return@post
        }
        guestState = state
        guestInbox = inbox
        enableNotifications(g, state)
      }
    }

    override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
      post {
        if (g !== gatt || descriptor.uuid != CCCD_UUID) return@post
        val promise = connectPromise ?: return@post
        if (status != BluetoothGatt.GATT_SUCCESS) {
          failConnect("No se pudo suscribir a STATE (estado $status).")
          return@post
        }
        connectPromise = null
        handler.removeCallbacks(connectTimeout)
        connected = true
        promise.resolve(mapOf("mtu" to mtu.coerceIn(DEFAULT_MTU, REQUESTED_MTU)))
      }
    }

    override fun onCharacteristicWrite(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
      post {
        if (g !== gatt || characteristic.uuid != INBOX_CHAR_UUID) return@post
        val promise = writing
        writing = null
        if (status == BluetoothGatt.GATT_SUCCESS) {
          promise?.resolve()
        } else {
          promise?.reject("ERR_BLE_WRITE", "No se pudo escribir (estado $status).", null)
        }
        pumpWrite()
      }
    }

    // API 33+: llega el valor; no se llama a super para que no se repita en el método antiguo
    override fun onCharacteristicChanged(
      g: BluetoothGatt,
      characteristic: BluetoothGattCharacteristic,
      value: ByteArray
    ) {
      onStateValue(g, characteristic.uuid, value)
    }

    @Deprecated("Android ≤ 12")
    @Suppress("DEPRECATION")
    override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return
      val value = characteristic.value ?: return
      onStateValue(g, characteristic.uuid, value.copyOf())
    }
  }

  private fun onStateValue(g: BluetoothGatt, uuid: UUID, value: ByteArray) {
    if (uuid != STATE_CHAR_UUID) return
    post {
      if (g !== gatt || !connected) return@post
      send("onNotify", mapOf("chunk" to String(value, Charsets.UTF_8)))
    }
  }

  // ── Ciclo de vida ──

  fun shutdown() {
    if (destroyed) return
    val done = CountDownLatch(1)
    handler.post {
      try {
        stopScanning()
        failConnect("Módulo destruido.")
        closeGuest("Módulo destruido.")
        closeHost()
      } catch (e: Throwable) {
        Log.w(TAG, "shutdown", e)
      } finally {
        done.countDown()
      }
    }
    // Espera un poco a que se suelten los recursos, sin bloquear para siempre
    if (Looper.myLooper() != thread.looper) done.await(1, TimeUnit.SECONDS)
    destroyed = true
    try {
      context.unregisterReceiver(stateReceiver)
    } catch (e: Exception) {
      // ya no estaba registrado
    }
    thread.quitSafely()
  }

  private fun truncateUtf8(s: String, maxBytes: Int): ByteArray {
    val bytes = s.toByteArray(Charsets.UTF_8)
    if (bytes.size <= maxBytes) return bytes
    var end = maxBytes
    // No cortar un carácter multibyte a medias
    while (end > 0 && (bytes[end].toInt() and 0xC0) == 0x80) end--
    return bytes.copyOf(end)
  }
}
