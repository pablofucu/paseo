# Visita en grupo (especificación)

Un **anfitrión** (host) abre un grupo desde la portada de un tour; los **invitados** se unen escaneando su QR. Cada uno escucha la audioguía **en su propio móvil**, sincronizada con la del anfitrión, y todos hacen la ruta juntos.

## Decisiones

| Tema | Decisión |
|---|---|
| Transporte con datos | **Supabase Realtime** (canal *broadcast* + *presence*). Se configura con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Sin ellas, el modo con datos no existe y se usa solo Bluetooth. No hay tablas ni servidor propio. |
| Transporte sin datos | **Bluetooth LE**: el anfitrión es periférico GATT, los invitados son centrales. Módulo Expo local `modules/paseo-ble` (Swift + Kotlin). |
| Elección | El anfitrión abre **los dos a la vez** (internet si hay conexión y Supabase está configurado; Bluetooth si hay permiso). El invitado prueba internet primero (3 s) y si no, Bluetooth. Lo decide la app; el usuario solo ve el estado. |
| Sincronía | **El anfitrión guía y el invitado puede soltarse.** El anfitrión decide parada, play/pausa, posición y velocidad; a los invitados les suena lo mismo a la vez. Si un invitado toca su reproductor queda «a su aire» y aparece **«Volver al ritmo del grupo»**. |
| Tours de pago | **Basta con que el anfitrión lo tenga.** Solo puede abrir grupo de un tour quien puede hacerlo por sí mismo (gratis o comprado, nunca por estar de invitado). Mientras el invitado está en el grupo, ese tour queda desbloqueado para él. |
| Pasaporte del invitado | **Lo gana todo**: sellos de goma de cada parada y, al completar, el sello de correos de la ruta (cuenta para el pack). La ruta guarda `via: 'grupo'` como recuerdo. Lo que se gana se queda aunque luego se salga del grupo. |
| Tamaño | **Máximo 8 personas** (anfitrión + 7 invitados), en los dos transportes. |
| Sellar | Cada uno sella en su móvil. Cuando el anfitrión llega a una parada (GPS, «¿Ya estás en…?» o «Llegar» en modo prueba), la llegada vale para todo el grupo: los invitados pueden sellar esa parada aunque su GPS no lo diga. |

El contenido de los tours de pago va dentro de la app (o descargado): la compra solo lo desbloquea. Así un invitado sin datos puede hacer el tour por Bluetooth.

## Código y QR

- **Código de grupo**: 6 caracteres de `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin 0/O/1/I/L). Se puede teclear a mano.
- **QR**: un enlace `paseo://unirse?c=<código>&t=<tourId>&h=<nombre del anfitrión, urlencoded>&m=<n|b|nb>` (`m`: qué transportes abrió el anfitrión: `n` internet, `b` Bluetooth). La cámara del sistema lo abre en la app (esquema `paseo` de app.json); dentro de la app también se escanea desde «Unirse a un grupo».
- Canal de Supabase: `paseo-grupo-<código>`.
- Bluetooth: se anuncia el servicio `PASEO_SERVICE_UUID` y el nombre local `PSO<código>` (iOS solo deja anunciar nombre y UUIDs).

## Protocolo (`src/lib/group/protocol.ts`)

Mensajes JSON con versión `v: 1`. Todos llevan `k` (tipo).

```ts
type Member = { id: string; name: string };          // id: aleatorio por instalación (8 chars)

// Anfitrión → todos. Es el estado completo (se reenvía al cambiar y cada 5 s; quien entra tarde se pone al día con él).
type StateMsg = {
  v: 1; k: 'state';
  seq: number;                    // sube con cada cambio
  tourId: string;
  host: Member;
  members: Member[];              // invitados conectados (sin el anfitrión)
  target: number;                 // índice de la parada a la que va el grupo
  arrived: string | null;         // stopId al que ha llegado el anfitrión (vale para todos)
  audio: AudioState | null;       // lo que suena en el grupo
  ended: boolean;                 // el anfitrión ha cerrado el grupo
};
type AudioState = {
  key: string;                    // qué pista: `stop:<stopId>` o `way:<afterStop>:<índice>` (lo que cuente el tramo)
  playing: boolean;
  position: number;               // segundos en `at`
  rate: number;
  at: number;                     // reloj del anfitrión (ms) en que `position` era cierta
};

// Invitado → anfitrión
type HelloMsg = { v: 1; k: 'hello'; member: Member };          // al entrar; el anfitrión responde con `state` o `full`
type ByeMsg   = { v: 1; k: 'bye'; id: string };
type PingMsg  = { v: 1; k: 'ping'; id: string; t0: number };   // sincronía de reloj
// Anfitrión → invitado
type PongMsg  = { v: 1; k: 'pong'; id: string; t0: number; t1: number };
type FullMsg  = { v: 1; k: 'full'; id: string };               // grupo lleno (8)
```

- **Reloj**: el invitado manda 5 `ping` al entrar y uno cada 30 s; se queda con el `offset = t1 - (t0 + rtt/2)` de menor RTT. `hostNow() = Date.now() + offset`.
- **Posición esperada** del audio en el invitado: `playing ? position + (hostNow() - at)/1000 * rate : position`. Si su reproductor se desvía más de **2 s** (la voz del sistema no dura igual en todos los móviles) y no está «a su aire», hace `seek`.
- **Caída**: si un invitado no oye `state` en 15 s, se marca «reconectando» y vuelve a probar los transportes; tras 2 min sin anfitrión, «El grupo se ha perdido» (sale del grupo sin perder sellos). El anfitrión quita a un invitado que no da señales en 20 s (*presence* en Supabase, desconexión en BLE).

### Bluetooth: tramas

El módulo nativo mueve cadenas UTF‑8 pequeñas; `src/lib/group/frames.ts` parte cada mensaje en trozos de como mucho `mtu - 3` bytes (por defecto 180) con cabecera `<msgId>|<i>|<n>|` y los vuelve a juntar (descarta mensajes incompletos a los 5 s). `state` se manda como *notify* a todos; los invitados escriben en la característica `inbox`.

## Módulo nativo `modules/paseo-ble`

Módulo Expo local (autolinking de `modules/`), con su *config plugin* para permisos: iOS `NSBluetoothAlwaysUsageDescription` («Paseo usa Bluetooth para las visitas en grupo sin conexión a internet.») y `UIBackgroundModes` `bluetooth-peripheral` + `bluetooth-central`; Android `BLUETOOTH_SCAN` (`neverForLocation`), `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE` y, para Android ≤ 11, `BLUETOOTH` / `BLUETOOTH_ADMIN` / `ACCESS_FINE_LOCATION`.

API en JS (`modules/paseo-ble/index.ts`), la única que usa el resto de la app:

```ts
export const PASEO_SERVICE_UUID = '7b1e0001-5a5e-4f0a-9c3d-2a1f50a5e000';
export const STATE_CHAR_UUID    = '7b1e0002-5a5e-4f0a-9c3d-2a1f50a5e000'; // notify + read
export const INBOX_CHAR_UUID    = '7b1e0003-5a5e-4f0a-9c3d-2a1f50a5e000'; // write (with response)

export type BleState = 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn' | 'unknown';
export function isAvailable(): boolean;                         // false en web / Expo Go / sin módulo
export function getState(): Promise<BleState>;
export function requestPermissions(): Promise<boolean>;          // Android 12+: SCAN/CONNECT/ADVERTISE; iOS: dispara el permiso

// Anfitrión (periférico)
export function startHost(localName: string): Promise<void>;     // publica el servicio y anuncia
export function stopHost(): Promise<void>;
export function notify(chunk: string): Promise<void>;            // a todas las centrales suscritas (encola si el buffer está lleno)
export function notifyTo(deviceId: string, chunk: string): Promise<void>; // usado para pong/full

// Invitado (central)
export function startScan(): Promise<void>;                      // filtra por PASEO_SERVICE_UUID
export function stopScan(): Promise<void>;
export function connect(deviceId: string): Promise<{ mtu: number }>; // conecta, pide MTU 185, descubre y se suscribe a STATE
export function write(chunk: string): Promise<void>;             // escribe en INBOX
export function disconnect(): Promise<void>;

// Eventos (EventSubscription de expo-modules-core)
addListener('onStateChange', (e: { state: BleState }) => void)
addListener('onCentralConnected', (e: { deviceId: string }) => void)     // anfitrión
addListener('onCentralDisconnected', (e: { deviceId: string }) => void)  // anfitrión
addListener('onInbox', (e: { deviceId: string; chunk: string }) => void) // anfitrión
addListener('onDeviceFound', (e: { deviceId: string; name: string | null; rssi: number }) => void) // invitado
addListener('onNotify', (e: { chunk: string }) => void)                  // invitado
addListener('onDisconnected', (e: { reason?: string }) => void)          // invitado
```

Sin módulo nativo (web, Expo Go, pruebas) `isAvailable()` es `false` y el resto rechaza: la app nunca debe fallar por eso.

## Código en JS

```
src/lib/group/
  protocol.ts        tipos, parse/validate, crear código, enlace del QR (build/parse)
  clock.ts           sincronía de reloj y posición esperada
  frames.ts          trocear y juntar para BLE
  transport.ts       interfaz común
  supabase.ts        transporte por internet (@supabase/supabase-js, carga perezosa)
  ble.ts             transporte Bluetooth (usa modules/paseo-ble)
  memory.ts          transporte en memoria (pruebas y modo prueba: «Simular invitado»)
  host.ts            lógica del anfitrión (estado, miembros, máximo 8, reenvío cada 5 s)
  guest.ts           lógica del invitado (elige transporte, reloj, caída/reconexión)
  useGroupAudio.ts   hook que une el NarrationPlayer con el grupo (publica en el anfitrión, sigue en el invitado)
src/store/group.ts   zustand: sesión actual (rol, código, tour, miembros, transportes activos, «a su aire», estado de conexión). No se persiste salvo `memberId`.
src/store/purchases.ts  compras (de momento sin pagos: `owned`, y «Simular compra» en modo prueba)
src/lib/entitlements.ts  canPlay / canHost / useCanPlay(tourId)
```

```ts
// transport.ts
export type TransportKind = 'net' | 'ble' | 'memory';
export interface HostTransport {
  kind: TransportKind;
  start(code: string): Promise<void>;
  broadcast(msg: GroupMsg): void;
  sendTo(memberOrDeviceId: string, msg: GroupMsg): void;
  onMessage(cb: (msg: GroupMsg, from: string) => void): () => void;  // `from`: id de dispositivo/presencia
  onPeerLeft(cb: (from: string) => void): () => void;
  stop(): Promise<void>;
}
export interface GuestTransport {
  kind: TransportKind;
  connect(code: string, timeoutMs: number): Promise<void>;          // rechaza si no encuentra al anfitrión
  send(msg: GroupMsg): void;
  onMessage(cb: (msg: GroupMsg) => void): () => void;
  onLost(cb: () => void): () => void;
  disconnect(): Promise<void>;
}
```

### Tours de pago

- `Tour` gana `eur?: number` (precio; sin él es gratis).
- `canPlay(tourId)`: gratis, o comprado (`purchases.owned`), o invitado en un grupo vivo de ese tour.
- `canHost(tourId)`: gratis o comprado (nunca por estar de invitado).
- `UserRoute.via?: 'grupo'` cuando la ruta se empezó como invitado.
- Los tours de `LOCKED_TOURS` (sin contenido) siguen sin contar nunca.

## Interfaz

- **Portada del tour** (`tour/[id]/index.tsx`): junto a «Empezar», un botón secundario **«Pasear en grupo»** (si `canHost`). Abre `grupo/[id].tsx`.
- **`grupo/[id].tsx`** (anfitrión, antes de salir): QR grande sobre papel, el código en letras grandes, «Por internet ✓ / Bluetooth ✓» (o por qué no), lista de quién se ha unido (máx. 8) y **«Empezar el paseo»**. Si el tour es de pago: «Tus invitados lo hacen gratis contigo».
- **Unirse**: en Inicio, un enlace **«Unirse a un grupo»** → `unirse.tsx`: cámara para el QR (`expo-camera`) y campo para teclear el código. El enlace del QR (`paseo://unirse?...`) abre la misma pantalla y se une directamente. Pide el nombre si el pasaporte aún no tiene titular. Al unirse, va al paseo del tour.
- **En el paseo** (`walk.tsx`):
  - Anfitrión: una pastilla «Grupo · N» arriba; al tocarla, hoja con el QR (para que se una alguien más), la lista y «Cerrar el grupo».
  - Invitado: pastilla «Con <anfitrión>» (con estado: conectado por internet/Bluetooth, reconectando). Su parada objetivo sigue la del anfitrión; cuando el anfitrión llega, al invitado le sale la llegada («Has llegado» + «▶ Escuchar»). Su reproductor sigue el del anfitrión; si lo toca: «Volver al ritmo del grupo». «Salir del grupo» en la hoja.
  - Fin: cuando el anfitrión cierra o termina, el invitado va a su propia pantalla de final (con su sello de correos).
- **Modo prueba**: en `grupo/[id].tsx`, «Simular invitado» (transporte en memoria) para probarlo con un solo móvil, y en Inicio «Simular compra» de los tours de pago.
- **Ajustes**: nada nuevo; el nombre del grupo es el titular del pasaporte.

## Pruebas

`src/lib/__tests__/group.test.ts`: códigos y enlace del QR (ida y vuelta), validación de mensajes, tramas (trocear/juntar, desorden, incompletos), reloj y posición esperada, anfitrión+invitados con el transporte en memoria (entrar tarde, lleno a los 8, caída), `canPlay`/`canHost`.
