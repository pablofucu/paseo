/*
 * Tramas para Bluetooth: el módulo nativo mueve cadenas UTF-8 pequeñas (como
 * mucho `mtu - 3` bytes). Cada mensaje se parte en trozos con cabecera
 * `<msgId>|<i>|<n>|` y al otro lado se vuelven a juntar.
 */

/** Trozo por defecto cuando aún no se sabe el MTU (MTU 183 - 3) */
export const DEFAULT_CHUNK_BYTES = 180;
/** Un mensaje a medias se descarta a los 5 s */
export const FRAME_TTL_MS = 5_000;

/** Bytes de un carácter (punto de código) en UTF-8 */
const cpBytes = (cp: number) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);

/** Largo en bytes UTF-8 de una cadena */
export function utf8Length(s: string): number {
  let n = 0;
  for (const ch of s) n += cpBytes(ch.codePointAt(0)!);
  return n;
}

let counter = 0;
/** Id corto de mensaje (base 36), distinto en cada llamada */
export const newMsgId = () => ((Date.now() % 1_000_000) * 100 + (counter++ % 100)).toString(36);

/** Parte `text` en trozos de como mucho `maxBytes` bytes, cabecera incluida, sin partir caracteres */
export function toFrames(text: string, maxBytes: number = DEFAULT_CHUNK_BYTES, msgId: string = newMsgId()): string[] {
  const total = utf8Length(text);
  let digits = 1;
  let budget = 0;
  let n = 1;
  for (;;) {
    budget = maxBytes - (msgId.length + 3 + 2 * digits);
    if (budget < 4) throw new Error('Trama demasiado pequeña');
    n = Math.max(1, Math.ceil(total / budget));
    if (String(n).length <= digits) break;
    digits++;
  }
  const parts: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of text) {
    const b = cpBytes(ch.codePointAt(0)!);
    if (curBytes + b > budget) { parts.push(cur); cur = ''; curBytes = 0; }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.map((p, i) => `${msgId}|${i}|${parts.length}|${p}`);
}

interface Pending {
  parts: (string | undefined)[];
  got: number;
  at: number;
}

/** Junta trozos (pueden llegar desordenados, y de varios emisores a la vez) */
export class Reassembler {
  private pending = new Map<string, Pending>();

  constructor(private now: () => number = Date.now, private ttlMs = FRAME_TTL_MS) {}

  /** Añade un trozo; devuelve el mensaje entero cuando está completo, si no null */
  push(frame: string, from = ''): string | null {
    this.gc();
    const m = /^([0-9a-z]{1,16})\|(\d{1,4})\|(\d{1,4})\|/.exec(frame);
    if (!m) return null;
    const i = Number(m[2]);
    const n = Number(m[3]);
    if (n < 1 || i >= n) return null;
    const body = frame.slice(m[0].length);
    if (n === 1) return body;
    const key = `${from}\u0000${m[1]}`;
    let p = this.pending.get(key);
    if (!p || p.parts.length !== n) {
      p = { parts: new Array(n), got: 0, at: this.now() };
      this.pending.set(key, p);
    }
    if (p.parts[i] === undefined) { p.parts[i] = body; p.got++; }
    if (p.got < n) return null;
    this.pending.delete(key);
    return p.parts.join('');
  }

  /** Mensajes a medias que siguen esperando */
  get size() {
    this.gc();
    return this.pending.size;
  }

  /** Olvida lo que estuviera a medias de un emisor (al desconectarse) */
  drop(from: string) {
    for (const k of [...this.pending.keys()]) if (k.startsWith(`${from}\u0000`)) this.pending.delete(k);
  }

  private gc() {
    const t = this.now();
    for (const [k, p] of this.pending) if (t - p.at > this.ttlMs) this.pending.delete(k);
  }
}
