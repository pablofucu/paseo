import { MAX_MEMBERS, PEER_TIMEOUT_MS, PROTOCOL_VERSION, STATE_EVERY_MS, type GroupMsg, type Member, type StateMsg, type StatePatch } from './protocol';
import { Listeners, type HostTransport, type TransportKind } from './transport';

interface Peer {
  member: Member;
  transport: HostTransport;
  /** Id del dispositivo o de presencia en ese transporte */
  from: string;
  lastSeen: number;
}

export interface HostOptions {
  code: string;
  tourId: string;
  host: Member;
  /** Paradas de partida del grupo */
  target?: number;
  now?: () => number;
}

/**
 * Lógica del anfitrión: guarda el estado del grupo, lo reenvía al cambiar y
 * cada 5 s por todos sus transportes a la vez, admite como mucho 7 invitados
 * (8 con él), contesta los pings de reloj y quita a quien lleva 20 s sin dar señales.
 */
export class GroupHost {
  readonly code: string;
  state: StateMsg;
  transports: HostTransport[] = [];
  private peers = new Map<string, Peer>();
  private offs: (() => void)[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private changes = new Listeners<[GroupHost]>();
  private now: () => number;
  private stopped = false;

  constructor({ code, tourId, host, target = 0, now = Date.now }: HostOptions) {
    this.code = code;
    this.now = now;
    this.state = { v: PROTOCOL_VERSION, k: 'state', seq: 0, tourId, host, members: [], target, arrived: null, audio: null, ended: false };
  }

  /** Invitados conectados (sin el anfitrión) */
  get members(): Member[] {
    return this.state.members;
  }

  /** Transportes abiertos */
  get kinds(): TransportKind[] {
    return this.transports.map(t => t.kind);
  }

  /** Abre los transportes a la vez; se queda con los que arrancan. Devuelve sus tipos. */
  async start(transports: HostTransport[]): Promise<TransportKind[]> {
    await Promise.all(transports.map(t => this.addTransport(t)));
    if (!this.timer && !this.stopped) this.timer = setInterval(() => this.tick(), STATE_EVERY_MS);
    return this.kinds;
  }

  /** Abre un transporte más (p. ej. el de memoria para «Simular invitado»). false si no arranca. */
  async addTransport(t: HostTransport): Promise<boolean> {
    if (this.stopped || this.transports.some(x => x.kind === t.kind)) return false;
    try {
      await t.start(this.code);
    } catch {
      return false;
    }
    if (this.stopped) { t.stop().catch(() => {}); return false; }
    this.transports.push(t);
    this.offs.push(
      t.onMessage((msg, from) => this.receive(t, msg, from)),
      t.onPeerLeft(from => this.removePeer(`${t.kind}:${from}`)),
    );
    t.broadcast(this.state);
    this.emitChange();
    return true;
  }

  /** Cambia la parada, la llegada o el audio del grupo y lo manda a todos */
  update(patch: StatePatch) {
    if (this.stopped) return;
    const next = { ...this.state, ...patch };
    const same = next.target === this.state.target && next.arrived === this.state.arrived && sameAudio(next.audio, this.state.audio);
    if (same) return;
    this.commit(next);
  }

  subscribe(cb: (h: GroupHost) => void) {
    return this.changes.add(cb);
  }

  /** Cierra el grupo: avisa a todos (`ended`) y cierra los transportes */
  async end() {
    if (this.stopped) return;
    this.commit({ ...this.state, ended: true });
    // Una vuelta para que el último estado salga antes de cerrar
    await new Promise(r => setTimeout(r, 300));
    await this.stop();
  }

  /** Cierra los transportes sin avisar */
  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const off of this.offs) off();
    this.offs = [];
    const ts = this.transports;
    this.transports = [];
    this.peers.clear();
    await Promise.all(ts.map(t => t.stop().catch(() => {})));
    this.emitChange();
    this.changes.clear();
  }

  private commit(next: StateMsg) {
    this.state = { ...next, seq: this.state.seq + 1 };
    this.broadcast();
    this.emitChange();
  }

  private broadcast() {
    for (const t of this.transports) t.broadcast(this.state);
  }

  private emitChange() {
    this.changes.emit(this);
  }

  /** Latido: reenvía el estado y quita a quien no da señales */
  private tick() {
    const t = this.now();
    let changed = false;
    for (const [key, p] of this.peers) if (t - p.lastSeen > PEER_TIMEOUT_MS) { this.peers.delete(key); changed = true; }
    if (changed) this.commitMembers();
    else this.broadcast();
  }

  private commitMembers() {
    this.commit({ ...this.state, members: [...this.peers.values()].map(p => p.member) });
  }

  private removePeer(key: string) {
    if (this.peers.delete(key)) this.commitMembers();
  }

  private receive(t: HostTransport, msg: GroupMsg, from: string) {
    if (this.stopped) return;
    const key = `${t.kind}:${from}`;
    const peer = this.peers.get(key);
    if (peer) peer.lastSeen = this.now();
    switch (msg.k) {
      case 'hello': {
        const member: Member = { id: msg.member.id, name: msg.member.name.slice(0, 24) };
        // El mismo invitado que vuelve (por otro transporte o con otro id de dispositivo) no ocupa dos sitios
        for (const [k, p] of this.peers) if (p.member.id === member.id && k !== key) this.peers.delete(k);
        if (!this.peers.has(key) && this.peers.size >= MAX_MEMBERS - 1) {
          t.sendTo(from, { v: PROTOCOL_VERSION, k: 'full', id: member.id });
          return;
        }
        this.peers.set(key, { member, transport: t, from, lastSeen: this.now() });
        this.commitMembers();
        return;
      }
      case 'ping':
        t.sendTo(from, { v: PROTOCOL_VERSION, k: 'pong', id: msg.id, t0: msg.t0, t1: this.now() });
        return;
      case 'bye':
        this.removePeer(key);
        return;
      default:
        // Lo que manda el anfitrión (state, pong, full) no le llega a él
        return;
    }
  }
}

const sameAudio = (a: StateMsg['audio'], b: StateMsg['audio']) =>
  a === b || (!!a && !!b && a.key === b.key && a.playing === b.playing && a.position === b.position && a.rate === b.rate && a.at === b.at);
