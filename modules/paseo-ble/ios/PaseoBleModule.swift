import CoreBluetooth
import ExpoModulesCore

// Módulo Expo: la API JS está en ../index.ts y el contrato en docs/visita-en-grupo.md.
public class PaseoBleModule: Module {
  private let ble = PaseoBleManager()

  public func definition() -> ModuleDefinition {
    Name("PaseoBle")

    Events(
      "onStateChange",
      "onCentralConnected",
      "onCentralDisconnected",
      "onInbox",
      "onDeviceFound",
      "onNotify",
      "onDisconnected"
    )

    OnCreate {
      let emit: (String, [String: Any?]) -> Void = { [weak self] name, body in
        self?.sendEvent(name, body)
      }
      // `emit` solo se lee en la cola de Bluetooth
      self.ble.queue.async { self.ble.emit = emit }
    }

    OnDestroy {
      self.ble.shutdown()
    }

    AsyncFunction("getState") { (promise: Promise) in
      self.ble.getState(promise)
    }

    AsyncFunction("requestPermissions") { (promise: Promise) in
      self.ble.requestPermissions(promise)
    }

    // Anfitrión (periférico)
    AsyncFunction("startHost") { (localName: String, promise: Promise) in
      self.ble.startHost(localName, promise)
    }

    AsyncFunction("stopHost") { (promise: Promise) in
      self.ble.stopHost(promise)
    }

    AsyncFunction("notify") { (chunk: String, promise: Promise) in
      self.ble.notify(chunk, to: nil, promise)
    }

    AsyncFunction("notifyTo") { (deviceId: String, chunk: String, promise: Promise) in
      self.ble.notify(chunk, to: deviceId, promise)
    }

    // Invitado (central)
    AsyncFunction("startScan") { (promise: Promise) in
      self.ble.startScan(promise)
    }

    AsyncFunction("stopScan") { (promise: Promise) in
      self.ble.stopScan(promise)
    }

    AsyncFunction("connect") { (deviceId: String, promise: Promise) in
      self.ble.connect(deviceId, promise)
    }

    AsyncFunction("write") { (chunk: String, promise: Promise) in
      self.ble.write(chunk, promise)
    }

    AsyncFunction("disconnect") { (promise: Promise) in
      self.ble.disconnect(promise)
    }
  }
}
