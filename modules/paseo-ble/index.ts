// API JS de Bluetooth LE para la visita en grupo (docs/visita-en-grupo.md).
// El anfitrión es periférico GATT (publica STATE e INBOX); los invitados son centrales.
// Sin módulo nativo (web, Expo Go, jest) `isAvailable()` es false y todo lo demás rechaza.
import native from './src/PaseoBleModule';
import type { BleState, EventSubscription, PaseoBleEvents } from './src/PaseoBle.types';

export type {
  BleState,
  CentralEvent,
  DeviceFoundEvent,
  DisconnectedEvent,
  EventSubscription,
  InboxEvent,
  NotifyEvent,
  PaseoBleEventName,
  PaseoBleEvents,
  StateChangeEvent,
} from './src/PaseoBle.types';

export const PASEO_SERVICE_UUID = '7b1e0001-5a5e-4f0a-9c3d-2a1f50a5e000';
export const STATE_CHAR_UUID = '7b1e0002-5a5e-4f0a-9c3d-2a1f50a5e000'; // notify + read
export const INBOX_CHAR_UUID = '7b1e0003-5a5e-4f0a-9c3d-2a1f50a5e000'; // write (with response)

const UNAVAILABLE = 'Bluetooth no disponible: el módulo nativo paseo-ble no está en esta app (web, Expo Go o pruebas).';

function mod() {
  if (!native) throw new Error(UNAVAILABLE);
  return native;
}

// Envuelve cada llamada para que, sin módulo, rechace (y no lance de forma síncrona)
async function call<T>(fn: (m: NonNullable<typeof native>) => Promise<T>): Promise<T> {
  return fn(mod());
}

/** false en web / Expo Go / sin módulo. Nunca lanza. */
export function isAvailable(): boolean {
  return native != null;
}

export function getState(): Promise<BleState> {
  return call((m) => m.getState());
}

/** Android 12+: SCAN/CONNECT/ADVERTISE (≤ 11: ubicación). iOS: dispara el permiso de Bluetooth. */
export function requestPermissions(): Promise<boolean> {
  return call((m) => m.requestPermissions());
}

// ── Anfitrión (periférico) ──

/** Publica el servicio y anuncia `localName` (p. ej. `PSO<código>`). */
export function startHost(localName: string): Promise<void> {
  return call((m) => m.startHost(localName));
}

export function stopHost(): Promise<void> {
  return call((m) => m.stopHost());
}

/** A todas las centrales suscritas a STATE (encola si el buffer está lleno). */
export function notify(chunk: string): Promise<void> {
  return call((m) => m.notify(chunk));
}

/** Solo a una central suscrita (pong / full). */
export function notifyTo(deviceId: string, chunk: string): Promise<void> {
  return call((m) => m.notifyTo(deviceId, chunk));
}

// ── Invitado (central) ──

/** Busca anfitriones (filtra por PASEO_SERVICE_UUID). Cada uno llega por `onDeviceFound`. */
export function startScan(): Promise<void> {
  return call((m) => m.startScan());
}

export function stopScan(): Promise<void> {
  return call((m) => m.stopScan());
}

/** Conecta, pide MTU 185, descubre el servicio y se suscribe a STATE. */
export function connect(deviceId: string): Promise<{ mtu: number }> {
  return call((m) => m.connect(deviceId));
}

/** Escribe (con respuesta) en INBOX. Las escrituras se hacen de una en una. */
export function write(chunk: string): Promise<void> {
  return call((m) => m.write(chunk));
}

export function disconnect(): Promise<void> {
  return call((m) => m.disconnect());
}

// ── Eventos ──

const noop: EventSubscription = { remove() {} };

/** Sin módulo nativo devuelve una suscripción que no hace nada. */
export function addListener<E extends keyof PaseoBleEvents>(
  eventName: E,
  listener: PaseoBleEvents[E],
): EventSubscription {
  if (!native) return noop;
  return native.addListener(eventName, listener);
}
