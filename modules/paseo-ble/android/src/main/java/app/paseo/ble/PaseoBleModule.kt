package app.paseo.ble

import android.Manifest
import android.os.Build
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Módulo Expo: la API JS está en modules/paseo-ble/index.ts y el contrato en docs/visita-en-grupo.md.
class PaseoBleModule : Module() {
  private var manager: PaseoBleManager? = null

  // Las AsyncFunction pueden llegar desde varios hilos
  @Synchronized
  private fun ble(): PaseoBleManager {
    manager?.let { return it }
    val context = appContext.reactContext?.applicationContext
      ?: throw IllegalStateException("No hay contexto de Android")
    return PaseoBleManager(context) { name, body -> sendEvent(name, body) }.also {
      manager = it
    }
  }

  override fun definition() = ModuleDefinition {
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
      // Crea el gestor y registra el receptor de encendido/apagado
      runCatching { ble() }
    }

    OnDestroy {
      val m = synchronized(this@PaseoBleModule) { manager.also { manager = null } }
      m?.shutdown()
    }

    AsyncFunction("getState") { promise: Promise ->
      ble().getState(promise)
    }

    AsyncFunction("requestPermissions") { promise: Promise ->
      val permissions = appContext.permissions
      if (permissions == null) {
        promise.reject("ERR_BLE_PERMISSIONS", "No está el gestor de permisos de Expo", null)
        return@AsyncFunction
      }
      val wanted = requiredPermissions()
      if (permissions.hasGrantedPermissions(*wanted)) {
        promise.resolve(true)
        return@AsyncFunction
      }
      permissions.askForPermissions(
        { result ->
          promise.resolve(wanted.all { result[it]?.status == PermissionsStatus.GRANTED })
        },
        *wanted
      )
    }

    // Anfitrión (periférico)
    AsyncFunction("startHost") { localName: String, promise: Promise ->
      ble().startHost(localName, promise)
    }

    AsyncFunction("stopHost") { promise: Promise ->
      ble().stopHost(promise)
    }

    AsyncFunction("notify") { chunk: String, promise: Promise ->
      ble().notify(chunk, null, promise)
    }

    AsyncFunction("notifyTo") { deviceId: String, chunk: String, promise: Promise ->
      ble().notify(chunk, deviceId, promise)
    }

    // Invitado (central)
    AsyncFunction("startScan") { promise: Promise ->
      ble().startScan(promise)
    }

    AsyncFunction("stopScan") { promise: Promise ->
      ble().stopScan(promise)
    }

    AsyncFunction("connect") { deviceId: String, promise: Promise ->
      ble().connect(deviceId, promise)
    }

    AsyncFunction("write") { chunk: String, promise: Promise ->
      ble().write(chunk, promise)
    }

    AsyncFunction("disconnect") { promise: Promise ->
      ble().disconnect(promise)
    }
  }

  companion object {
    /** Android 12+: los tres permisos «de dispositivos cercanos»; antes, la ubicación para escanear. */
    fun requiredPermissions(): Array<String> =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        arrayOf(
          Manifest.permission.BLUETOOTH_SCAN,
          Manifest.permission.BLUETOOTH_CONNECT,
          Manifest.permission.BLUETOOTH_ADVERTISE
        )
      } else {
        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
      }
  }
}
