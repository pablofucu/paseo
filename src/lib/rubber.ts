import type { RubberArt, RubberShape } from '@/data/types';

/**
 * Sellos de goma de la «Guía de sellos, pasaporte y postales».
 *
 * Cada sello tiene dos partes:
 * - El dibujo fijo (escena de la parada, anillos, título y estrellas), que
 *   scripts/build-stamps.mjs hornea en assets/stamps/<parada>.png con la
 *   textura de goma real de la guía (feTurbulence, que el móvil no tiene). Va
 *   en negro sobre transparente y la app lo tiñe con la tinta de la parada.
 * - La fecha real del estampado, que se pinta encima con un SVG mínimo.
 * Así una hoja con cinco sellos son diez vistas en lugar de miles de nodos SVG.
 */

/** Caja (viewBox) de cada forma, centrada en 0,0 como en la guía */
export const RUBBER_BOX: Record<RubberShape, { x: number; y: number; w: number; h: number }> = {
  circle: { x: -150, y: -150, w: 300, h: 300 },
  oval: { x: -160, y: -110, w: 320, h: 220 },
  rect: { x: -160, y: -120, w: 320, h: 240 },
  octagon: { x: -160, y: -160, w: 320, h: 320 },
};

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** «10 OCT 2026» */
export const fechaSello = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};
/** «10 · X · 2026» */
export const fechaRomana = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} · ${ROMANOS[d.getMonth()]} · ${d.getFullYear()}`;
};

/** Generador pseudoaleatorio con semilla entera (mulberry32) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const BLACK = 'Nunito_900Black';
const NARROW = 'Nunito_800ExtraBold';
const f1 = (n: number) => n.toFixed(1);

/** Tamaño de letra para que un texto quepa en `avail` unidades */
function fit(text: string, base: number, avail: number, ls: number) {
  const n = Math.max(1, text.length);
  return Math.min(base, (avail / n - ls) / 0.74);
}

function star(cx: number, cy: number, R: number) {
  let pts = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.42 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts += `${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))} `;
  }
  return `<polygon points="${pts.trim()}" fill="currentColor" stroke="none"/>`;
}

const text = (x: number, y: number, s: string, size: number, ls: number, family = BLACK) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${family}" font-size="${size.toFixed(2)}" letter-spacing="${ls}" fill="currentColor" stroke="none">${esc(s)}</text>`;

const arcText = (id: string, s: string, size: number, ls: number) =>
  `<text font-family="${BLACK}" font-size="${size.toFixed(2)}" letter-spacing="${ls}" fill="currentColor" stroke="none"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(s)}</textPath></text>`;

function octagon(R: number) {
  let pts = '';
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    pts += `${f1(R * Math.cos(a))},${f1(R * Math.sin(a))} `;
  }
  return pts.trim();
}

interface FrameText {
  title: string;
  kicker?: string;
  label?: string;
  bottom: string;
  date: string;
}

/**
 * Anillos, textos y estrellas de cada forma (medidas de la guía). `fixed` es
 * lo que se hornea en la imagen; `dated` es el texto que lleva la fecha.
 */
function frame(shape: RubberShape, t: FrameText, p: string): { fixed: string; dated: string } {
  switch (shape) {
    case 'circle':
      return {
        fixed:
          '<circle r="138" stroke-width="5"/><circle r="130" stroke-width="1.2"/><circle r="104" stroke-width="2.6"/>' +
          `<path id="${p}top" d="M-111,0 A111,111 0 0 1 111,0" stroke="none"/>` +
          arcText(`${p}top`, t.title, fit(t.title, 16, 330, 3), 3) +
          star(-117, 0, 6.5) + star(117, 0, 6.5),
        dated: `<path id="${p}bot" d="M-124,0 A124,124 0 0 0 124,0" stroke="none"/>` + arcText(`${p}bot`, t.bottom, fit(t.bottom, 13, 360, 2.5), 2.5),
      };
    case 'oval':
      return {
        fixed:
          '<ellipse rx="148" ry="100" stroke-width="5"/><ellipse rx="140" ry="92" stroke-width="1.2"/><ellipse rx="118" ry="71" stroke-width="2.6"/>' +
          `<path id="${p}top" d="M-123,0 A123,76 0 0 1 123,0" stroke="none"/>` +
          arcText(`${p}top`, t.title, fit(t.title, 13, 290, 3), 3) +
          star(-129, 0, 5.5) + star(129, 0, 5.5),
        dated: `<path id="${p}bot" d="M-134,0 A134,87 0 0 0 134,0" stroke="none"/>` + arcText(`${p}bot`, t.bottom, fit(t.bottom, 11.5, 330, 2), 2),
      };
    case 'rect':
      return {
        fixed:
          '<rect x="-146" y="-106" width="292" height="212" rx="14" stroke-width="4.5"/><rect x="-138" y="-98" width="276" height="196" rx="8" stroke-width="1.4"/>' +
          text(0, -74, t.title, fit(t.title, 18.5, 225, 1), 1) +
          star(-128, -80, 5) + star(128, -80, 5) +
          '<line x1="-138" y1="-66" x2="138" y2="-66" stroke-width="1.6"/><line x1="-138" y1="68" x2="138" y2="68" stroke-width="1.6"/>',
        dated: text(0, 90, t.bottom, fit(t.bottom, 12.5, 262, 1.5), 1.5),
      };
    case 'octagon':
      return {
        fixed:
          `<polygon points="${octagon(150)}" stroke-width="5"/><polygon points="${octagon(141)}" stroke-width="1.2"/>` +
          '<line x1="-88.2" y1="-96" x2="88.2" y2="-96" stroke-width="2.4"/><line x1="-88.2" y1="96" x2="88.2" y2="96" stroke-width="2.4"/>' +
          text(0, -120, t.kicker ?? '', 8.5, 4, NARROW) +
          text(0, -104, t.title, fit(t.title, 13, 165, 1.2), 1.2) +
          text(0, 113, t.label ?? '', fit(t.label ?? '', 10, 160, 2), 2) +
          star(-46, -123, 3.5) + star(46, -123, 3.5),
        dated: text(0, 127, t.date, 9, 2, NARROW),
      };
  }
}

/** Da a cada id un prefijo propio para que dos sellos en la misma pantalla no se pisen */
const scope = (svg: string, p: string) =>
  svg.replace(/\bid="/g, `id="${p}`).replace(/url\(#/g, `url(#${p}`).replace(/href="#/g, `href="#${p}`);

let uid = 0;
const nextId = () => `r${(uid++).toString(36)}_`;

function frameText(art: RubberArt, city: string, date: string): FrameText {
  const place = (art.place ?? city).toUpperCase();
  return {
    title: art.title,
    kicker: art.kicker ?? city.toUpperCase(),
    label: art.label,
    bottom: art.shape === 'rect' && art.place ? `${city.toUpperCase()} · ${fechaSello(date)} · ${place}` : `${place} · ${fechaSello(date)}`,
    date: fechaRomana(date),
  };
}

const open = (shape: RubberShape) => {
  const b = RUBBER_BOX[shape];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}">`;
};

/**
 * Dibujo fijo del sello (escena, anillos, título, estrellas) en negro, para
 * hornearlo. `filter` es el id de un filtro de textura ya definido, si lo hay.
 */
export function rubberArtXml({ art, scene, city, filter }: { art: RubberArt; scene: string; city: string; filter?: string }) {
  const p = nextId();
  const { fixed } = frame(art.shape, frameText(art, city, '2000-01-01T12:00:00Z'), p);
  return (
    open(art.shape) +
    `<g color="#000"${filter ? ` filter="url(#${filter})"` : ''}><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">` +
    fixed + scope(scene, p) +
    '</g></g></svg>'
  );
}

/** El texto con la fecha real, en la tinta del sello, para pintarlo encima de la imagen horneada */
export function rubberDateXml({ art, city, date, color }: { art: RubberArt; city: string; date: string; color: string }) {
  const { dated } = frame(art.shape, frameText(art, city, date), nextId());
  return `${open(art.shape)}<g color="${color}" fill="none" stroke="none">${dated}</g></svg>`;
}

/** Matasellos del sello de carta: círculo doble con ciudad y fecha, y ondas a la izquierda */
export function postmarkXml({ city, date, color = '#2f3440' }: { city: string; date: string; color?: string }) {
  const p = nextId();
  const d = new Date(date);
  let waves = '';
  for (let i = 0; i < 4; i++) {
    const y = 26 + i * 9;
    waves += `<path d="M0 ${y} q10 -6 20 0 t20 0 t20 0 t20 0 t18 0" />`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 90" width="170" height="90">` +
    `<g fill="none" stroke="${color}" stroke-linecap="round" opacity="0.82">` +
    `<g stroke-width="2.2">${waves}</g>` +
    '<circle cx="125" cy="45" r="38" stroke-width="2.6"/><circle cx="125" cy="45" r="27" stroke-width="1.4"/>' +
    `<path id="${p}a" d="M92 45 A33 33 0 0 1 158 45" stroke="none"/>` +
    `<text font-family="${BLACK}" font-size="8.5" letter-spacing="2" fill="${color}" stroke="none"><textPath href="#${p}a" startOffset="50%" text-anchor="middle">${esc(city.toUpperCase())}</textPath></text>` +
    `<text x="125" y="44" text-anchor="middle" font-family="${BLACK}" font-size="11" fill="${color}" stroke="none">${d.getDate()} ${MESES[d.getMonth()]}</text>` +
    `<text x="125" y="58" text-anchor="middle" font-family="${BLACK}" font-size="11" fill="${color}" stroke="none">${d.getFullYear()}</text>` +
    '</g></svg>'
  );
}
