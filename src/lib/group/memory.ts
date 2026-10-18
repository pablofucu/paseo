import { parseMsg, type GroupMsg } from './protocol';
import { Listeners, type GuestTransport, type HostTransport } from './transport';

/*
 * Transporte en memoria: anfitrión e invitados en la misma app. Sirve para las
 * pruebas y para «Simular invitado» en modo prueba. Los mensajes pasan por JSON
 * (como por los de verdad) y llegan en otra vuelta del bucle, nunca en la misma llamada.
 */

interface Hub {
  host: MemoryHost;
  guests: Map<string, MemoryGuest>;
  /** Con la línea caída no pasa ningún mensaje (para probar la caída sin desconectar) */
  up: boolean;
}

const hubs = new Map<string, Hub>();
let peerSeq = 0;

const later = (fn: () => void) => { Promise.resolve().then(fn).catch(() => {}); };
const roundTrip = (msg: GroupMsg) => parseMsg(JSON.stringify(msg));

class MemoryHost implements HostTransport {
  kind = 'memory' as const;
  code: string | null = null;
  messages = new Listeners<[GroupMsg, string]>();
  left = new Listeners<[string]>();

  async start(code: string) {
    if (hubs.has(code)) throw new Error('Ya hay un grupo con ese código');
    this.code = code;
    hubs.set(code, { host: this, guests: new Map(), up: true });
  }
  private hub() {
    return this.code ? hubs.get(this.code) : undefined;
  }
  broadcast(msg: GroupMsg) {
    const hub = this.hub();
    if (!hub?.up) return;
    for (const g of hub.guests.values()) g.deliver(msg);
  }
  sendTo(id: string, msg: GroupMsg) {
    const hub = this.hub();
    if (hub?.up) hub.guests.get(id)?.deliver(msg);
  }
  onMessage(cb: (msg: GroupMsg, from: string) => void) { return this.messages.add(cb); }
  onPeerLeft(cb: (from: string) => void) { return this.left.add(cb); }
  async stop() {
    const hub = this.hub();
    if (hub && hub.host === this) {
      hubs.delete(this.code!);
      for (const g of hub.guests.values()) g.lose();
    }
    this.code = null;
  }
  /** Mensaje de un invitado */
  deliver(msg: GroupMsg, from: string) {
    const m = roundTrip(msg);
    if (m) later(() => this.messages.emit(m, from));
  }
}

class MemoryGuest implements GuestTransport {
  kind = 'memory' as const;
  readonly peerId = `mem${++peerSeq}`;
  private code: string | null = null;
  private messages = new Listeners<[GroupMsg]>();
  private lost = new Listeners<[]>();

  async connect(code: string, _timeoutMs: number) {
    await Promise.resolve();
    const hub = hubs.get(code);
    if (!hub || !hub.up) throw new Error('No hay anfitrión');
    this.code = code;
    hub.guests.set(this.peerId, this);
  }
  send(msg: GroupMsg) {
    const hub = this.code ? hubs.get(this.code) : undefined;
    if (hub?.up && hub.guests.get(this.peerId) === this) hub.host.deliver(msg, this.peerId);
  }
  onMessage(cb: (msg: GroupMsg) => void) { return this.messages.add(cb); }
  onLost(cb: () => void) { return this.lost.add(cb); }
  async disconnect() {
    this.detach();
  }
  /** Simula que se corta la conexión de este invitado (los dos lados se enteran) */
  drop() {
    if (this.detach()) this.lose();
  }
  deliver(msg: GroupMsg) {
    const m = roundTrip(msg);
    if (m) later(() => this.messages.emit(m));
  }
  lose() {
    this.code = null;
    later(() => this.lost.emit());
  }
  private detach() {
    const hub = this.code ? hubs.get(this.code) : undefined;
    this.code = null;
    if (!hub || hub.guests.get(this.peerId) !== this) return false;
    hub.guests.delete(this.peerId);
    later(() => hub.host.left.emit(this.peerId));
    return true;
  }
}

export type { MemoryGuest, MemoryHost };

export const createMemoryHost = (): MemoryHost => new MemoryHost();
export const createMemoryGuest = (): MemoryGuest => new MemoryGuest();

/** Corta o restablece la línea de un grupo en memoria (los mensajes se pierden, nadie se desconecta) */
export function setMemoryLink(code: string, up: boolean) {
  const hub = hubs.get(code);
  if (hub) hub.up = up;
}

/** Hay un anfitrión en memoria con ese código */
export const hasMemoryHost = (code: string) => hubs.has(code);
