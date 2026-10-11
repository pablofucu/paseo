/**
 * Dónde cae un sello en la hoja del pasaporte. El usuario elige el sitio; la
 * app solo pone límites suaves (guía de sellos, § 04):
 * - 16 px de margen con los bordes, sin pisar la cabecera ni el pie;
 * - como mucho un 35 % del sello encima de otro; si se pasa, se desplaza lo
 *   justo hacia el hueco libre más cercano.
 * Todo en píxeles de la hoja; el centro del sello es (x, y).
 */

export interface Sheet {
  w: number;
  h: number;
  /** Alto de la cabecera y del pie, que no se pueden pisar */
  top: number;
  bottom: number;
  margin: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Giro de un sello: entre 4° y 12° hacia un lado o el otro, para que nunca
 * quede recto (un sello puesto a mano siempre sale algo torcido).
 */
export function stampRotation(rand: () => number) {
  const deg = 4 + rand() * 8;
  return rand() < 0.5 ? -deg : deg;
}

export const MAX_OVERLAP = 0.35;

/** Lleva el centro a la zona segura (si el sello no cabe, lo centra en ese eje) */
export function clampToSafe(x: number, y: number, w: number, h: number, s: Sheet) {
  const minX = s.margin + w / 2, maxX = s.w - s.margin - w / 2;
  const minY = s.top + s.margin / 2 + h / 2, maxY = s.h - s.bottom - s.margin / 2 - h / 2;
  return {
    x: minX > maxX ? s.w / 2 : Math.min(maxX, Math.max(minX, x)),
    y: minY > maxY ? (s.top + s.h - s.bottom) / 2 : Math.min(maxY, Math.max(minY, y)),
  };
}

/** Parte del sello más pequeño de los dos que queda tapada por el otro (0–1) */
export function overlap(a: Box, b: Box) {
  const ix = Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2));
  const iy = Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));
  return (ix * iy) / Math.min(a.w * a.h, b.w * b.h);
}

const worst = (b: Box, others: Box[]) => others.reduce((m, o) => Math.max(m, overlap(b, o)), 0);

/**
 * Sitio final para un sello soltado en (x, y): dentro de la zona segura y, si
 * tapa demasiado a otro, en el hueco válido más cercano. Si la hoja está tan
 * llena que no hay hueco, el sitio que menos tapa.
 */
export function settle(x: number, y: number, w: number, h: number, others: Box[], s: Sheet, max = MAX_OVERLAP) {
  const start = clampToSafe(x, y, w, h, s);
  if (worst({ ...start, w, h }, others) <= max) return start;
  let best = start, bestScore = Infinity;
  const step = 6;
  const reach = Math.hypot(s.w, s.h);
  for (let r = step; r < reach; r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = clampToSafe(start.x + Math.cos(a) * r, start.y + Math.sin(a) * r, w, h, s);
      const score = worst({ ...c, w, h }, others);
      if (score <= max) return c;
      if (score < bestScore) { bestScore = score; best = c; }
    }
  }
  return best;
}

/** «Colócalo tú»: un hueco libre al azar con las mismas reglas */
export function randomSpot(w: number, h: number, others: Box[], s: Sheet, rand: () => number, max = MAX_OVERLAP) {
  let best = clampToSafe(s.w / 2, s.h / 2, w, h, s), bestScore = Infinity;
  for (let i = 0; i < 160; i++) {
    const c = clampToSafe(rand() * s.w, rand() * s.h, w, h, s);
    const score = worst({ ...c, w, h }, others);
    if (score <= max) return c;
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return settle(best.x, best.y, w, h, others, s, max);
}
