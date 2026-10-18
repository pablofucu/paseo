import { ClockSync } from './clock';
import { CLOCK_PINGS, GUEST_LOST_MS, GUEST_STALE_MS, PING_EVERY_MS, PROTOCOL_VERSION, STATE_EVERY_MS, type GroupMsg, type Member, type StateMsg } from './protocol';
import { Listeners, type GuestTransport, type TransportKind } from './transport';

/** Cómo va la conexión del invitado (lo que ve en la pastilla «Con <anfitrión>») */
export type GuestStatus = 'connecting' | 'connected' | 'reconnecting' | 'lost';
/** Por qué terminó: el anfitrión cerró, se perdió, estaba lleno o el invitado se fue */
export type GuestEnd = 'ended' | 'lost' | 'full' | 'left';
export type JoinResult = 'ok' | 'notFound' | 'full';

/** Un transporte a probar y cuánto esperarle */
export interface GuestAttempt {
  kind: TransportKind;
  make: () => GuestTransport;
  timeoutMs: number;
}

export interface GuestOptions {
  code: string;
  member: Member;
  /** En orden: internet (3 s) y luego Bluetooth */
  attempts: GuestAttempt[];
  now?: () => number;
}

/** Tras conectar, cuánto se espera el primer `state` (o `full`) */
const FIRST_STATE_MS = 5_000;
/** Entre los pings del principio */
const PING_GAP_MS = 250;
/** Entre vueltas de reconexión sin suerte */
const RETRY_MS = 2_000;

/**
 * Lógica del invitado: prueba los transportes en orden, saluda, sincroniza el
 * reloj y guarda el último estado del anfitrión. Sin `state` en 15 s pasa a
 * «reconectando» y vuelve a probar; a los 2 min sin anfitrión, el grupo se pierde.
 */
export class GroupGuest {
  readonly code: string;
  readonly member: Member;
  status: GuestStatus = 'connecting';
  via: TransportKind | null = null;
  state: StateMsg | null = null;
  ended: GuestEnd | null = null;
  readonly clock: ClockSync;
  private attempts: GuestAttempt[];
  private now: () => number;
  private current: GuestTransport | null = null;
  private offs: (() => void)[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private lastStateAt = 0;
  private lastHelloAt = 0;
  private reconnecting = false;
  private firstReply: ((r: 'state' | 'full' | null) => void) | null = null;
  private changes = new Listeners<[GroupGuest]>();

  constructor({ code, member, attempts, now = Date.now }: GuestOptions) {
    this.code = code;
    this.member = member;
    this.attempts = attempts;
    this.now = now;
    this.clock = new ClockSync(now);
  }

  subscribe(cb: (g: GroupGuest) => void) {
    return this.changes.add(cb);
  }

  /** Busca al anfitrión. Con 'ok' ya hay estado; con lo demás, el invitado queda terminado. */
  async start(): Promise<JoinResult> {
    const r = await this.tryConnect();
    if (r !== 'ok') { this.finish(r === 'full' ? 'full' : 'lost'); return r; }
    this.watchdog = setInterval(() => this.watch(), 1_000);
    return 'ok';
  }

  /** Salir del grupo (avisa al anfitrión) */
  async leave() {
    if (this.ended) return;
    this.current?.send({ v: PROTOCOL_VERSION, k: 'bye', id: this.member.id });
    await this.finish('left');
  }

  private emit() {
    this.changes.emit(this);
  }

  private async tryConnect(): Promise<JoinResult> {
    let full = false;
    for (const a of this.attempts) {
      if (this.ended) return 'notFound';
      const t = a.make();
      try {
        await t.connect(this.code, a.timeoutMs);
      } catch {
        continue;
      }
      if (this.ended) { t.disconnect().catch(() => {}); return 'notFound'; }
      this.attach(t);
      const reply = await new Promise<'state' | 'full' | null>(resolve => {
        this.firstReply = resolve;
        this.later(() => resolve(null), FIRST_STATE_MS);
        this.hello();
        for (let i = 0; i < CLOCK_PINGS; i++) this.later(() => this.ping(), i * PING_GAP_MS);
      });
      this.firstReply = null;
      if (reply === 'state') {
        this.via = t.kind;
        this.status = 'connected';
        this.pingTimer = setInterval(() => this.ping(), PING_EVERY_MS);
        this.emit();
        return 'ok';
      }
      await this.detach();
      if (reply === 'full') full = true;
    }
    return full ? 'full' : 'notFound';
  }

  private attach(t: GuestTransport) {
    this.current = t;
    this.offs.push(
      t.onMessage(msg => this.receive(t, msg)),
      t.onLost(() => { if (this.current === t) this.reconnect(); }),
    );
  }

  private async detach() {
    for (const off of this.offs) off();
    this.offs = [];
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const t = this.current;
    this.current = null;
    this.via = null;
    await t?.disconnect().catch(() => {});
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(fn, ms));
  }

  private hello() {
    this.lastHelloAt = this.now();
    this.current?.send({ v: PROTOCOL_VERSION, k: 'hello', member: this.member });
  }

  private ping() {
    this.current?.send({ v: PROTOCOL_VERSION, k: 'ping', id: this.member.id, t0: this.now() });
  }

  private receive(t: GuestTransport, msg: GroupMsg) {
    if (this.current !== t || this.ended) return;
    switch (msg.k) {
      case 'state': {
        // Un estado viejo que llega tarde no deshace uno más nuevo
        if (this.state && msg.seq < this.state.seq && !msg.ended) return;
        this.state = msg;
        this.lastStateAt = this.now();
        this.firstReply?.('state');
        if (msg.ended) { this.finish('ended'); return; }
        if (this.status === 'reconnecting' && this.via) this.status = 'connected';
        // El anfitrión nos quitó (p. ej. tras un corte) pero le seguimos oyendo: volvemos a saludar
        if (!msg.members.some(m => m.id === this.member.id) && this.now() - this.lastHelloAt > STATE_EVERY_MS) this.hello();
        this.emit();
        return;
      }
      case 'pong':
        if (msg.id === this.member.id) this.clock.addSample(msg.t0, msg.t1);
        return;
      case 'full':
        if (msg.id === this.member.id) this.firstReply?.('full');
        return;
      default:
        return;
    }
  }

  private watch() {
    if (this.ended) return;
    const quiet = this.now() - this.lastStateAt;
    if (quiet > GUEST_LOST_MS) { this.finish('lost'); return; }
    if (quiet > GUEST_STALE_MS && !this.reconnecting) this.reconnect();
  }

  /** Vuelve a probar los transportes hasta dar con el anfitrión (o hasta que el grupo se pierda) */
  private async reconnect() {
    if (this.reconnecting || this.ended) return;
    this.reconnecting = true;
    this.status = 'reconnecting';
    this.emit();
    await this.detach();
    while (!this.ended) {
      const r = await this.tryConnect();
      if (r === 'ok') break;
      if (r === 'full') { await this.finish('full'); break; }
      await new Promise(res => setTimeout(res, RETRY_MS));
    }
    this.reconnecting = false;
  }

  private async finish(reason: GuestEnd) {
    if (this.ended) return;
    this.ended = reason;
    this.status = reason === 'lost' ? 'lost' : this.status;
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
    this.firstReply?.(null);
    await this.detach();
    this.emit();
    this.changes.clear();
  }
}
