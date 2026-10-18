/*
 * Protocolo de la visita en grupo (docs/visita-en-grupo.md). Mensajes JSON
 * pequeños con versión `v: 1` y tipo `k`, iguales por internet y por Bluetooth.
 */

export const PROTOCOL_VERSION = 1;
/** Máximo de personas en un grupo, contando al anfitrión */
export const MAX_MEMBERS = 8;
/** Letras del código de grupo: sin 0/O/1/I/L para poder teclearlo sin dudas */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** El anfitrión reenvía el estado completo cada 5 s aunque no cambie (latido) */
export const STATE_EVERY_MS = 5_000;
/** Sin `state` en 15 s, el invitado se marca «reconectando» y vuelve a probar los transportes */
export const GUEST_STALE_MS = 15_000;
/** Tras 2 min sin anfitrión, el grupo se da por perdido */
export const GUEST_LOST_MS = 120_000;
/** El anfitrión quita al invitado que no da señales en 20 s */
export const PEER_TIMEOUT_MS = 20_000;
/** Pings de reloj al entrar y cada cuánto se repite uno (también sirve de latido del invitado) */
export const CLOCK_PINGS = 5;
export const PING_EVERY_MS = 10_000;
/** Cuánto espera el invitado a cada transporte: internet primero (3 s), luego Bluetooth */
export const NET_TIMEOUT_MS = 3_000;
export const BLE_TIMEOUT_MS = 10_000;

export interface Member {
  /** Aleatorio por instalación (8 caracteres) */
  id: string;
  name: string;
}

/** Lo que suena en el grupo */
export interface AudioState {
  /** Qué pista: `stop:<stopId>` o `way:<afterStop>:<índice>` */
  key: string;
  playing: boolean;
  /** Segundos en `at` */
  position: number;
  rate: number;
  /** Reloj del anfitrión (ms) en que `position` era cierta */
  at: number;
}

/** Anfitrión → todos: el estado completo (al cambiar y cada 5 s) */
export interface StateMsg {
  v: 1;
  k: 'state';
  /** Sube con cada cambio */
  seq: number;
  tourId: string;
  host: Member;
  /** Invitados conectados (sin el anfitrión) */
  members: Member[];
  /** Índice de la parada a la que va el grupo */
  target: number;
  /** Parada a la que ha llegado el anfitrión (vale para todos) */
  arrived: string | null;
  audio: AudioState | null;
  /** El anfitrión ha cerrado el grupo */
  ended: boolean;
}
export interface HelloMsg { v: 1; k: 'hello'; member: Member }
export interface ByeMsg { v: 1; k: 'bye'; id: string }
export interface PingMsg { v: 1; k: 'ping'; id: string; t0: number }
export interface PongMsg { v: 1; k: 'pong'; id: string; t0: number; t1: number }
export interface FullMsg { v: 1; k: 'full'; id: string }

export type GroupMsg = StateMsg | HelloMsg | ByeMsg | PingMsg | PongMsg | FullMsg;

/** Lo que el anfitrión puede cambiar del estado */
export type StatePatch = Partial<Pick<StateMsg, 'target' | 'arrived' | 'audio'>>;

/** Cadena aleatoria de `n` caracteres del alfabeto del código */
export function randomId(n: number, rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < n; i++) out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return out;
}

/** Código de grupo nuevo (6 caracteres) */
export const newCode = (rand: () => number = Math.random) => randomId(CODE_LENGTH, rand);

/** Lo tecleado a mano, en mayúsculas y sin espacios ni guiones ni letras que no existen */
export function normalizeCode(input: string): string {
  return input.toUpperCase().split('').filter(c => CODE_ALPHABET.includes(c)).join('').slice(0, CODE_LENGTH);
}

export const isCode = (s: unknown): s is string => typeof s === 'string' && s.length === CODE_LENGTH && s.split('').every(c => CODE_ALPHABET.includes(c));

/** Canal de Supabase del grupo */
export const channelName = (code: string) => `paseo-grupo-${code}`;
/** Nombre local que anuncia el anfitrión por Bluetooth */
export const bleName = (code: string) => `PSO${code}`;

/** Qué transportes abrió el anfitrión (`m` del enlace) */
export interface JoinModes {
  net: boolean;
  ble: boolean;
}

export interface JoinLink {
  code: string;
  tourId?: string;
  hostName?: string;
  modes?: JoinModes;
}

const enc = (s: string) => encodeURIComponent(s);
const dec = (s: string) => {
  try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; }
};

/** Enlace del QR: `paseo://unirse?c=<código>&t=<tourId>&h=<anfitrión>&m=<n|b|nb>` */
export function buildJoinLink({ code, tourId, hostName, modes }: JoinLink): string {
  const q = [`c=${enc(code)}`];
  if (tourId) q.push(`t=${enc(tourId)}`);
  if (hostName) q.push(`h=${enc(hostName)}`);
  if (modes && (modes.net || modes.ble)) q.push(`m=${modes.net ? 'n' : ''}${modes.ble ? 'b' : ''}`);
  return `paseo://unirse?${q.join('&')}`;
}

/**
 * Lee un enlace de unirse (el del QR, o el de Expo Go con `/--/unirse`). También
 * acepta el código tecleado tal cual. Devuelve null si no hay código válido.
 */
export function parseJoinLink(input: string): JoinLink | null {
  const raw = input.trim();
  const qi = raw.indexOf('?');
  if (qi < 0) {
    const code = normalizeCode(raw);
    return !/[/:]/.test(raw) && isCode(code) ? { code } : null;
  }
  if (!/unirse\/?$/.test(raw.slice(0, qi))) return null;
  const params: Record<string, string> = {};
  for (const part of raw.slice(qi + 1).split('#')[0].split('&')) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq)] = dec(part.slice(eq + 1));
  }
  const code = normalizeCode(params.c ?? '');
  if (!isCode(code)) return null;
  const link: JoinLink = { code };
  if (params.t) link.tourId = params.t;
  if (params.h) link.hostName = params.h.slice(0, 24);
  if (params.m && /^[nb]+$/.test(params.m)) link.modes = { net: params.m.includes('n'), ble: params.m.includes('b') };
  return link;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown, max = 64): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isMember = (x: unknown): x is Member => isObj(x) && isStr(x.id, 32) && typeof x.name === 'string' && x.name.length <= 40;
const isAudio = (x: unknown): x is AudioState =>
  isObj(x) && isStr(x.key, 120) && typeof x.playing === 'boolean' && isNum(x.position) && x.position >= 0 && isNum(x.rate) && x.rate > 0 && x.rate <= 4 && isNum(x.at);

/** Valida un mensaje (cadena JSON u objeto). Lo que no cuadra con el protocolo devuelve null. */
export function parseMsg(input: unknown): GroupMsg | null {
  let m: unknown = input;
  if (typeof input === 'string') {
    try { m = JSON.parse(input); } catch { return null; }
  }
  if (!isObj(m) || m.v !== PROTOCOL_VERSION) return null;
  switch (m.k) {
    case 'state':
      return isNum(m.seq) && isStr(m.tourId) && isMember(m.host) && Array.isArray(m.members) && m.members.length < MAX_MEMBERS && m.members.every(isMember)
        && Number.isInteger(m.target) && (m.target as number) >= 0 && (m.arrived === null || isStr(m.arrived)) && (m.audio === null || isAudio(m.audio)) && typeof m.ended === 'boolean'
        ? (m as unknown as StateMsg) : null;
    case 'hello':
      return isMember(m.member) ? (m as unknown as HelloMsg) : null;
    case 'bye':
    case 'full':
      return isStr(m.id, 32) ? (m as unknown as ByeMsg | FullMsg) : null;
    case 'ping':
      return isStr(m.id, 32) && isNum(m.t0) ? (m as unknown as PingMsg) : null;
    case 'pong':
      return isStr(m.id, 32) && isNum(m.t0) && isNum(m.t1) ? (m as unknown as PongMsg) : null;
    default:
      return null;
  }
}

export const encodeMsg = (msg: GroupMsg) => JSON.stringify(msg);
