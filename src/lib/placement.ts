/**
 * Dónde cae un sello en la hoja del pasaporte. El usuario elige el sitio; la
 * app solo pone límites suaves (guía de sellos, § 04):
 * - 16 px de margen con los bordes, sin pisar la cabecera ni el pie;
 * - nunca un sello encima de otro, y entre dos siempre un pequeño hueco
 *   (`gap`); si cae encima, se desplaza lo justo hacia el hueco libre más
 *   cercano. Para que quepan todos, sheet.ts reduce el tamaño de los sellos de
 *   las hojas con muchas paradas.
 * Todo en píxeles de la hoja; el centro del sello es (x, y).
 */

export interface Sheet {
  w: number;
  h: number;
  /** Alto de la cabecera y del pie, que no se pueden pisar */
  top: number;
  bottom: number;
  margin: number;
  /** Hueco mínimo entre dos sellos */
  gap: number;
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

/** Parte del sello pequeño que puede quedar tapada: ninguna */
export const MAX_OVERLAP = 0;

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

/** Lo peor que tapa `b` a otro sello, dejando `gap` libre alrededor de `b` */
const worst = (b: Box, others: Box[], gap: number) => {
  const g = { ...b, w: b.w + 2 * gap, h: b.h + 2 * gap };
  return others.reduce((m, o) => Math.max(m, overlap(g, o)), 0);
};

/**
 * Sitio final para un sello soltado en (x, y): dentro de la zona segura y, si
 * tapa a otro (o queda a menos de `gap`), en el hueco libre más cercano. Solo si
 * no hay hueco (no debería pasar: la hoja reduce los sellos para que quepan
 * todos) devuelve el sitio que menos tapa.
 */
export function settle(x: number, y: number, w: number, h: number, others: Box[], s: Sheet, max = MAX_OVERLAP) {
  const start = clampToSafe(x, y, w, h, s);
  if (worst({ ...start, w, h }, others, s.gap) <= max) return start;
  let best = start, bestScore = Infinity;
  const step = 6;
  const reach = Math.hypot(s.w, s.h);
  for (let r = step; r < reach; r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = clampToSafe(start.x + Math.cos(a) * r, start.y + Math.sin(a) * r, w, h, s);
      const score = worst({ ...c, w, h }, others, s.gap);
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
    const score = worst({ ...c, w, h }, others, s.gap);
    if (score <= max) return c;
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return settle(best.x, best.y, w, h, others, s, max);
}
