import { channelName, parseMsg, type GroupMsg } from './protocol';
import { Listeners, withTimeout, type GuestTransport, type HostTransport } from './transport';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/*
 * Transporte por internet: un canal de Supabase Realtime por grupo
 * (`paseo-grupo-<código>`), con *broadcast* para los mensajes y *presence* para
 * saber quién sigue ahí. No hay tablas ni sesión de usuario: solo la clave anónima.
 * Todos los mensajes van en el evento `m` como `{ from, to?, msg }`.
 */

const SB_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
/** Clave de presencia del anfitrión (la de cada invitado es su `memberId`) */
const HOST_KEY = 'host';
const EVENT = 'm';
/** Cuánto espera el anfitrión a entrar en su canal antes de dar internet por no disponible */
const HOST_JOIN_MS = 6_000;

interface Envelope {
  from: string;
  to?: string;
  msg: unknown;
}

/** El modo con datos solo existe si la app se compiló con las variables de Supabase */
export const netConfigured = () => !!SB_URL && !!KEY;

let client: SupabaseClient | null = null;

/** El cliente, creado a la primera (la librería no se carga si no hay grupo por internet) */
function getClient(): SupabaseClient {
  if (!SB_URL || !KEY) throw new Error('Supabase sin configurar');
  if (!client) {
    // Se carga a la hora de usarlo: sin variables (o en pruebas) no hace falta
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    client = createClient(SB_URL, KEY, {
      // Sin cuentas: nada que guardar ni refrescar
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

const envelope = (x: unknown): Envelope | null => {
  const e = x as Envelope | null;
  return e && typeof e === 'object' && typeof e.from === 'string' ? e : null;
};

/** Entra en el canal y espera a `SUBSCRIBED`; cualquier otro estado antes de eso rechaza */
function join(ch: RealtimeChannel, onLaterDrop?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    let joined = false;
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') { joined = true; resolve(); }
      else if (!joined) reject(new Error(status));
      else onLaterDrop?.();
    });
  });
}

class NetHost implements HostTransport {
  kind = 'net' as const;
  private ch: RealtimeChannel | null = null;
  private messages = new Listeners<[GroupMsg, string]>();
  private left = new Listeners<[string]>();

  async start(code: string) {
    const sb = getClient();
    const ch = sb.channel(channelName(code), { config: { broadcast: { self: false, ack: false }, presence: { key: HOST_KEY, enabled: true } } });
    ch.on('broadcast', { event: EVENT }, ({ payload }) => {
      const e = envelope(payload);
      if (!e || e.to !== HOST_KEY) return;
      const msg = parseMsg(e.msg);
      if (msg) this.messages.emit(msg, e.from);
    });
    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (key && key !== HOST_KEY) this.left.emit(key);
    });
    this.ch = ch;
    try {
      // Si se cae más tarde, la librería vuelve a entrar sola
      await withTimeout(join(ch), HOST_JOIN_MS);
      await ch.track({ role: 'host' });
    } catch (e) {
      this.ch = null;
      sb.removeChannel(ch).catch(() => {});
      throw e;
    }
  }
  private push(env: Envelope) {
    this.ch?.send({ type: 'broadcast', event: EVENT, payload: env }).catch(() => {});
  }
  broadcast(msg: GroupMsg) { this.push({ from: HOST_KEY, msg }); }
  sendTo(id: string, msg: GroupMsg) { this.push({ from: HOST_KEY, to: id, msg }); }
  onMessage(cb: (msg: GroupMsg, from: string) => void) { return this.messages.add(cb); }
  onPeerLeft(cb: (from: string) => void) { return this.left.add(cb); }
  async stop() {
    const ch = this.ch;
    this.ch = null;
    this.messages.clear();
    this.left.clear();
    if (ch && client) await client.removeChannel(ch).catch(() => {});
  }
}

class NetGuest implements GuestTransport {
  kind = 'net' as const;
  private ch: RealtimeChannel | null = null;
  private messages = new Listeners<[GroupMsg]>();
  private lost = new Listeners<[]>();

  constructor(private memberId: string) {}

  async connect(code: string, timeoutMs: number) {
    const sb = getClient();
    const ch = sb.channel(channelName(code), { config: { broadcast: { self: false, ack: false }, presence: { key: this.memberId, enabled: true } } });
    let hostSeen: () => void = () => {};
    const seen = new Promise<void>(r => { hostSeen = r; });
    const checkHost = () => { if (ch.presenceState()[HOST_KEY]?.length) hostSeen(); };
    ch.on('broadcast', { event: EVENT }, ({ payload }) => {
      const e = envelope(payload);
      if (!e || e.from !== HOST_KEY || (e.to && e.to !== this.memberId)) return;
      hostSeen();
      const msg = parseMsg(e.msg);
      if (msg) this.messages.emit(msg);
    });
    ch.on('presence', { event: 'sync' }, checkHost);
    ch.on('presence', { event: 'join' }, checkHost);
    this.ch = ch;
    const cleanup = () => { this.ch = null; sb.removeChannel(ch).catch(() => {}); };
    try {
      await withTimeout((async () => {
        await join(ch, () => { if (this.ch === ch) this.lost.emit(); });
        await ch.track({ role: 'guest' });
        // Hay canal, pero ¿hay anfitrión?
        checkHost();
        await seen;
      })(), timeoutMs);
    } catch (e) {
      cleanup();
      throw e;
    }
  }
  send(msg: GroupMsg) {
    this.ch?.send({ type: 'broadcast', event: EVENT, payload: { from: this.memberId, to: HOST_KEY, msg } satisfies Envelope }).catch(() => {});
  }
  onMessage(cb: (msg: GroupMsg) => void) { return this.messages.add(cb); }
  onLost(cb: () => void) { return this.lost.add(cb); }
  async disconnect() {
    const ch = this.ch;
    this.ch = null;
    if (ch && client) await client.removeChannel(ch).catch(() => {});
  }
}

export const createNetHost = (): HostTransport => new NetHost();
export const createNetGuest = (memberId: string): GuestTransport => new NetGuest(memberId);
