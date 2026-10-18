import { bleName, parseMsg, encodeMsg, type GroupMsg } from './protocol';
import { DEFAULT_CHUNK_BYTES, Reassembler, toFrames } from './frames';
import { Listeners, withTimeout, type GuestTransport, type HostTransport } from './transport';

/*
 * Transporte Bluetooth LE (modules/paseo-ble): el anfitrión es periférico GATT y
 * anuncia `PSO<código>`; los invitados son centrales. `state` va por *notify* a
 * todos; los invitados escriben en la característica `inbox`. Cada mensaje viaja
 * troceado (frames.ts).
 */

export type BleState = 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn' | 'unknown';

/** La API de modules/paseo-ble/index.ts que usa la app (docs/visita-en-grupo.md) */
interface PaseoBle {
  isAvailable(): boolean;
  getState(): Promise<BleState>;
  requestPermissions(): Promise<boolean>;
  startHost(localName: string): Promise<void>;
  stopHost(): Promise<void>;
  notify(chunk: string): Promise<void>;
  notifyTo(deviceId: string, chunk: string): Promise<void>;
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<{ mtu: number }>;
  write(chunk: string): Promise<void>;
  disconnect(): Promise<void>;
  addListener(event: string, cb: (e: never) => void): { remove(): void };
}

let mod: PaseoBle | null | undefined;

/** El módulo nativo, si está (en web, Expo Go y pruebas no hay) */
function ble(): PaseoBle | null {
  if (mod === undefined) {
    try {
      // Se carga a la hora de usarlo: sin módulo nativo la app sigue funcionando, solo sin Bluetooth
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('../../../modules/paseo-ble') as PaseoBle;
      mod = m && typeof m.isAvailable === 'function' && m.isAvailable() ? m : null;
    } catch {
      mod = null;
    }
  }
  return mod;
}

function need(): PaseoBle {
  const m = ble();
  if (!m) throw new Error('Bluetooth no disponible');
  return m;
}

function on<E>(m: PaseoBle, event: string, cb: (e: E) => void) {
  return m.addListener(event, cb as (e: never) => void);
}

/** Por qué no se puede usar Bluetooth (o 'ok') */
export type BleAvailability = 'ok' | 'unsupported' | 'unauthorized' | 'poweredOff';

/** Hay módulo nativo de Bluetooth (no dice nada del permiso) */
export const bleSupported = () => !!ble();

/**
 * Pide el permiso y espera (como mucho 3 s) a que la radio diga cómo está:
 * en iOS el estado empieza en `unknown` hasta que el sistema contesta.
 */
export async function bleAvailability(): Promise<BleAvailability> {
  const m = ble();
  if (!m) return 'unsupported';
  try {
    if (!(await m.requestPermissions())) return 'unauthorized';
    let state = await m.getState();
    if (state === 'unknown') {
      state = await new Promise<BleState>(resolve => {
        const sub = on<{ state: BleState }>(m, 'onStateChange', e => { if (e.state !== 'unknown') { sub.remove(); clearTimeout(t); resolve(e.state); } });
        const t = setTimeout(() => { sub.remove(); resolve('unknown'); }, 3_000);
      });
    }
    return state === 'poweredOn' ? 'ok' : state === 'unknown' ? 'unsupported' : state;
  } catch {
    return 'unsupported';
  }
}

/** Manda los trozos de uno en uno y en orden (el nativo encola, pero el orden lo garantizamos aquí) */
function serial() {
  let chain = Promise.resolve();
  return (task: () => Promise<void>) => { chain = chain.then(task).catch(() => {}); };
}

class BleHost implements HostTransport {
  kind = 'ble' as const;
  private subs: { remove(): void }[] = [];
  private frames = new Reassembler();
  private messages = new Listeners<[GroupMsg, string]>();
  private left = new Listeners<[string]>();
  private queue = serial();

  async start(code: string) {
    const m = need();
    const avail = await bleAvailability();
    if (avail !== 'ok') throw new Error(avail);
    this.subs.push(
      on<{ deviceId: string; chunk: string }>(m, 'onInbox', e => {
        const text = this.frames.push(e.chunk, e.deviceId);
        const msg = text ? parseMsg(text) : null;
        if (msg) this.messages.emit(msg, e.deviceId);
      }),
      on<{ deviceId: string }>(m, 'onCentralDisconnected', e => { this.frames.drop(e.deviceId); this.left.emit(e.deviceId); }),
    );
    try {
      await m.startHost(bleName(code));
    } catch (e) {
      this.unsubscribe();
      throw e;
    }
  }
  broadcast(msg: GroupMsg) {
    const m = ble();
    if (!m) return;
    for (const f of toFrames(encodeMsg(msg), DEFAULT_CHUNK_BYTES)) this.queue(() => m.notify(f));
  }
  sendTo(deviceId: string, msg: GroupMsg) {
    const m = ble();
    if (!m) return;
    for (const f of toFrames(encodeMsg(msg), DEFAULT_CHUNK_BYTES)) this.queue(() => m.notifyTo(deviceId, f));
  }
  onMessage(cb: (msg: GroupMsg, from: string) => void) { return this.messages.add(cb); }
  onPeerLeft(cb: (from: string) => void) { return this.left.add(cb); }
  async stop() {
    this.unsubscribe();
    this.messages.clear();
    this.left.clear();
    await ble()?.stopHost().catch(() => {});
  }
  private unsubscribe() {
    for (const s of this.subs) s.remove();
    this.subs = [];
  }
}

class BleGuest implements GuestTransport {
  kind = 'ble' as const;
  private subs: { remove(): void }[] = [];
  private frames = new Reassembler();
  private messages = new Listeners<[GroupMsg]>();
  private lost = new Listeners<[]>();
  private queue = serial();
  private chunk = DEFAULT_CHUNK_BYTES;
  private connected = false;

  async connect(code: string, timeoutMs: number) {
    const m = need();
    const avail = await bleAvailability();
    if (avail !== 'ok') throw new Error(avail);
    this.unsubscribe();
    const name = bleName(code);
    let found: (id: string) => void = () => {};
    const device = new Promise<string>(r => { found = r; });
    this.subs.push(
      on<{ deviceId: string; name: string | null }>(m, 'onDeviceFound', e => { if (e.name === name) found(e.deviceId); }),
      on<{ chunk: string }>(m, 'onNotify', e => {
        const text = this.frames.push(e.chunk);
        const msg = text ? parseMsg(text) : null;
        if (msg) this.messages.emit(msg);
      }),
      on<{ reason?: string }>(m, 'onDisconnected', () => {
        if (!this.connected) return;
        this.connected = false;
        this.lost.emit();
      }),
    );
    try {
      await withTimeout((async () => {
        await m.startScan();
        const id = await device;
        await m.stopScan().catch(() => {});
        const { mtu } = await m.connect(id);
        this.chunk = Math.max(20, Math.min(512, (mtu || 23) - 3));
        this.connected = true;
      })(), timeoutMs);
    } catch (e) {
      this.unsubscribe();
      await m.stopScan().catch(() => {});
      await m.disconnect().catch(() => {});
      throw e;
    }
  }
  send(msg: GroupMsg) {
    const m = ble();
    if (!m || !this.connected) return;
    for (const f of toFrames(encodeMsg(msg), this.chunk)) this.queue(() => m.write(f));
  }
  onMessage(cb: (msg: GroupMsg) => void) { return this.messages.add(cb); }
  onLost(cb: () => void) { return this.lost.add(cb); }
  async disconnect() {
    this.connected = false;
    this.unsubscribe();
    await ble()?.disconnect().catch(() => {});
  }
  private unsubscribe() {
    for (const s of this.subs) s.remove();
    this.subs = [];
  }
}

export const createBleHost = (): HostTransport => new BleHost();
export const createBleGuest = (): GuestTransport => new BleGuest();
