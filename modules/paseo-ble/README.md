# paseo-ble

Módulo Expo local (Swift + Kotlin) que mueve cadenas UTF‑8 pequeñas por Bluetooth LE para la **visita en grupo** sin internet. El contrato completo está en [`docs/visita-en-grupo.md`](../../docs/visita-en-grupo.md) («Módulo nativo» y «Bluetooth: tramas»). El resto de la app solo usa `index.ts`, a través de `src/lib/group/ble.ts`.

- **Anfitrión = periférico GATT.** Publica el servicio `PASEO_SERVICE_UUID` con dos características: `STATE` (read + notify; el anfitrión manda por aquí) e `INBOX` (write con respuesta; los invitados escriben aquí).
- **Invitado = central.** Busca el servicio, conecta, se suscribe a `STATE` y escribe en `INBOX`.
- Los trozos ya vienen cortados por JS (`frames.ts`, como mucho `mtu - 3` bytes). El módulo no trocea.

## API

```ts
import * as Ble from '../../modules/paseo-ble';

Ble.isAvailable();                 // false en web / Expo Go / jest (nunca lanza)
await Ble.getState();              // 'poweredOn' | 'poweredOff' | 'unauthorized' | 'unsupported' | 'unknown'
await Ble.requestPermissions();    // true si hay permiso

// Anfitrión
await Ble.startHost('PSO' + code); // publica y anuncia
await Ble.notify(chunk);           // a todas las centrales suscritas
await Ble.notifyTo(deviceId, chunk);
await Ble.stopHost();

// Invitado
await Ble.startScan();             // → onDeviceFound
const { mtu } = await Ble.connect(deviceId);
await Ble.write(chunk);
await Ble.disconnect();

const sub = Ble.addListener('onNotify', ({ chunk }) => { /* … */ });
sub.remove();
```

Eventos: `onStateChange`, `onCentralConnected` / `onCentralDisconnected` / `onInbox` (anfitrión), `onDeviceFound` / `onNotify` / `onDisconnected` (invitado). Sin módulo nativo todas las funciones rechazan con un `Error` claro y `addListener` devuelve una suscripción que no hace nada.

Detalles:

- `onCentralConnected` llega cuando la central **se suscribe** a `STATE` (no al conectar), y `onCentralDisconnected` cuando se desuscribe o se cae. `notifyTo` solo vale para centrales suscritas.
- `notify` y `notifyTo` resuelven al encolar: si el buffer del sistema está lleno, el trozo sale en cuanto se libera (iOS `peripheralManagerIsReady`, Android `onNotificationSent`, de uno en uno).
- `write` hace las escrituras de una en una y resuelve con la confirmación del anfitrión.
- `onDisconnected` solo se emite si la conexión se pierde; tras `disconnect()` no.
- `deviceId`: en iOS el UUID que da CoreBluetooth a cada dispositivo (distinto en cada móvil), en Android la dirección MAC.
- Nombre anunciado (`PSO<código>`): iOS lo anuncia como nombre local; Android, como *service data* del servicio en la respuesta al escaneo (el nombre local de Android es el del móvil). `onDeviceFound.name` lee los dos.
- `connect` pide MTU 185 en Android; en iOS lo negocia el sistema. El `mtu` que devuelve va de 23 a 185.

Los permisos los añade el *config plugin* `app.plugin.js` (registrado en `app.json`): `NSBluetoothAlwaysUsageDescription` y los modos de fondo `bluetooth-peripheral` / `bluetooth-central` en iOS; `BLUETOOTH_SCAN` (`neverForLocation`), `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE`, y `BLUETOOTH` / `BLUETOOTH_ADMIN` hasta Android 11 en Android. `ACCESS_FINE_LOCATION` (necesaria para escanear en Android ≤ 11) no se limita con `maxSdkVersion` porque la app la usa para el GPS en todas las versiones.

## Probar con dos móviles

Hace falta un **build de desarrollo** (Expo Go no trae este módulo), y Bluetooth no funciona en el simulador de iOS ni en la mayoría de emuladores de Android.

1. Build: `npx expo run:ios --device` / `npx expo run:android --device`, o `npx eas-cli@latest build --profile development` e instalarlo en los dos móviles. `ios/` y `android/` se generan (CNG): no se tocan a mano.
2. `npx expo start --dev-client` y abrir la app en los dos.
3. Móvil A: portada de un tour → «Pasear en grupo» (abre internet y Bluetooth). Para probar solo Bluetooth, poner A y B en modo avión y volver a encender Bluetooth.
4. Móvil B: «Unirse a un grupo» → escanear el QR de A. Aceptar el permiso de Bluetooth (y en Android ≤ 11 el de ubicación, con la ubicación del sistema encendida).
5. Comprobar: B aparece en la lista de A; play/pausa/posición de A se siguen en B; «Llegar» en A deja sellar en B; al cerrar el grupo B va a su final.

Para depurar: `adb logcat -s PaseoBle` en Android; en iOS, la consola de Xcode. Una app como nRF Connect sirve para ver el anuncio y las características del anfitrión.

## Límites conocidos

- **iOS en segundo plano**: con la app de fondo, iOS deja de anunciar el nombre local y mueve el UUID del servicio a un área de «desbordamiento» que solo ven otros iPhone que escaneen ese UUID; un Android no encuentra a un anfitrión iPhone con la pantalla apagada, aunque las conexiones ya hechas siguen vivas (`bluetooth-peripheral`). El escaneo de fondo en iOS es lento y sin duplicados. No hay restauración de estado (`CBManagerOptionRestoreIdentifierKey`): si iOS mata la app, el grupo se corta.
- **Android**: se escanea con `SCAN_MODE_LOW_LATENCY`; Android bloquea en silencio a quien arranca más de 5 escaneos en 30 s. Algunos móviles no pueden anunciar (`isMultipleAdvertisementSupported`): `startHost` rechaza. En Android ≤ 11 escanear exige la ubicación del sistema encendida.
- Una sola conexión de invitado a la vez; el máximo de 7 invitados lo pone la app, no el módulo.
- La lectura de `STATE` devuelve el último trozo mandado con `notify` (no se usa en el protocolo).
