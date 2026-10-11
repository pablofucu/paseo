import type { RubberArt, RubberShape } from '@/data/types';

/**
 * Sellos de goma de la «Guía de sellos, pasaporte y postales».
 *
 * Una sola tinta (el acento de la ruta), anillos según la forma, textos con el
 * sitio, la ciudad y la fecha real, y la escena dibujada en línea de cada
 * parada (src/data/stamps/scenes.ts). La textura de goma (poros, presión
 * desigual) es una máscara con semilla: cambia en cada estampado.
 */

/** Caja (viewBox) de cada forma, centrada en 0,0 como en la guía */
export const RUBBER_BOX: Record<RubberShape, { x: number; y: number; w: number; h: number }> = {
  circle: { x: -150, y: -150, w: 300, h: 300 },
  oval: { x: -160, y: -110, w: 320, h: 220 },
  rect: { x: -160, y: -120, w: 320, h: 240 },
  octagon: { x: -160, y: -160, w: 320, h: 320 },
};
/** Sello de ruta completada: 400 × 228 */
export const SEAL_BOX = { x: -200, y: -114, w: 400, h: 228 };

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

/** Anillos, textos y estrellas de cada forma (medidas de la guía) */
function frame(shape: RubberShape, t: FrameText, p: string) {
  switch (shape) {
    case 'circle':
      return (
        '<circle r="138" stroke-width="5"/><circle r="130" stroke-width="1.2"/><circle r="104" stroke-width="2.6"/>' +
        `<path id="${p}top" d="M-111,0 A111,111 0 0 1 111,0" stroke="none"/><path id="${p}bot" d="M-124,0 A124,124 0 0 0 124,0" stroke="none"/>` +
        arcText(`${p}top`, t.title, fit(t.title, 16, 330, 3), 3) +
        arcText(`${p}bot`, t.bottom, fit(t.bottom, 13, 360, 2.5), 2.5) +
        star(-117, 0, 6.5) + star(117, 0, 6.5)
      );
    case 'oval':
      return (
        '<ellipse rx="148" ry="100" stroke-width="5"/><ellipse rx="140" ry="92" stroke-width="1.2"/><ellipse rx="118" ry="71" stroke-width="2.6"/>' +
        `<path id="${p}top" d="M-123,0 A123,76 0 0 1 123,0" stroke="none"/><path id="${p}bot" d="M-134,0 A134,87 0 0 0 134,0" stroke="none"/>` +
        arcText(`${p}top`, t.title, fit(t.title, 13, 290, 3), 3) +
        arcText(`${p}bot`, t.bottom, fit(t.bottom, 11.5, 330, 2), 2) +
        star(-129, 0, 5.5) + star(129, 0, 5.5)
      );
    case 'rect':
      return (
        '<rect x="-146" y="-106" width="292" height="212" rx="14" stroke-width="4.5"/><rect x="-138" y="-98" width="276" height="196" rx="8" stroke-width="1.4"/>' +
        text(0, -74, t.title, fit(t.title, 18.5, 225, 1), 1) +
        star(-128, -80, 5) + star(128, -80, 5) +
        '<line x1="-138" y1="-66" x2="138" y2="-66" stroke-width="1.6"/><line x1="-138" y1="68" x2="138" y2="68" stroke-width="1.6"/>' +
        text(0, 90, t.bottom, fit(t.bottom, 12.5, 262, 1.5), 1.5)
      );
    case 'octagon':
      return (
        `<polygon points="${octagon(150)}" stroke-width="5"/><polygon points="${octagon(141)}" stroke-width="1.2"/>` +
        '<line x1="-88.2" y1="-96" x2="88.2" y2="-96" stroke-width="2.4"/><line x1="-88.2" y1="96" x2="88.2" y2="96" stroke-width="2.4"/>' +
        text(0, -120, t.kicker ?? '', 8.5, 4, NARROW) +
        text(0, -104, t.title, fit(t.title, 13, 165, 1.2), 1.2) +
        text(0, 113, t.label ?? '', fit(t.label ?? '', 10, 160, 2), 2) +
        text(0, 127, t.date, 9, 2, NARROW) +
        star(-46, -123, 3.5) + star(46, -123, 3.5)
      );
  }
}

/** Da a cada id un prefijo propio para que dos sellos en la misma pantalla no se pisen */
const scope = (svg: string, p: string) =>
  svg.replace(/\bid="/g, `id="${p}`).replace(/url\(#/g, `url(#${p}`).replace(/href="#/g, `href="#${p}`);

/**
 * Textura de goma con semilla: presión desigual (zonas más claras), poros
 * finos y alguna fibra. Es una máscara: donde es oscura, no llega la tinta.
 */
export function rubberMask(id: string, seed: number, box: { x: number; y: number; w: number; h: number }, density = 1) {
  const r = rng(seed);
  const { x, y, w, h } = box;
  let grads = '';
  let press = '';
  for (let i = 0; i < 5; i++) {
    const cx = x + r() * w, cy = y + r() * h, rad = 35 + r() * 85, o = 0.3 + r() * 0.4;
    grads += `<radialGradient id="${id}g${i}" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rad)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="${o.toFixed(2)}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
    press += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}g${i})"/>`;
  }
  let pores = '';
  // Poros: muchos pequeños y algunos más grandes (a tamaño de hoja, un sello mide ~120 px para 300 u.)
  const n = Math.round(((w * h) / 70) * density);
  for (let i = 0; i < n; i++) {
    pores += `<circle cx="${f1(x + r() * w)}" cy="${f1(y + r() * h)}" r="${(0.8 + r() ** 3 * 2.2).toFixed(2)}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  }
  let fibers = '';
  for (let i = 0; i < 10; i++) {
    const fx = x + r() * w, fy = y + r() * h, len = 4 + r() * 12, a = r() * Math.PI;
    fibers += `<path d="M${f1(fx)} ${f1(fy)} l${f1(Math.cos(a) * len)} ${f1(Math.sin(a) * len)}" stroke-width="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
  }
  return (
    `<defs>${grads}<mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${press}<g fill="#000" stroke="none">${pores}</g><g stroke="#000" fill="none" stroke-linecap="round">${fibers}</g>` +
    `</mask></defs>`
  );
}

let uid = 0;
const nextId = () => `r${(uid++).toString(36)}_`;

export interface RubberSpec {
  art: RubberArt;
  /** Escena dibujada de la parada (SVG interior) */
  scene: string;
  city: string;
  /** Fecha ISO del estampado */
  date: string;
  color: string;
  seed: number;
}

/** SVG completo del sello de goma de una parada, listo para <SvgXml> */
export function rubberXml({ art, scene, city, date, color, seed }: RubberSpec): string {
  const p = nextId();
  const box = RUBBER_BOX[art.shape];
  const place = (art.place ?? city).toUpperCase();
  const t: FrameText = {
    title: art.title,
    kicker: art.kicker ?? city.toUpperCase(),
    label: art.label,
    bottom: art.shape === 'rect' && art.place ? `${city.toUpperCase()} · ${fechaSello(date)} · ${place}` : `${place} · ${fechaSello(date)}`,
    date: fechaRomana(date),
  };
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">` +
    rubberMask(`${p}ink`, seed, box) +
    `<g color="${color}" mask="url(#${p}ink)"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">` +
    frame(art.shape, t, p) +
    scope(scene, p) +
    '</g></g></svg>'
  );
}

/** Sello grande de «Ruta completada» (plantilla 400 × 228 de la guía) */
export function sealXml({ title, stops, date, color, seed }: { title: string; stops: number; date: string; color: string; seed: number }) {
  const p = nextId();
  const name = title.toUpperCase();
  const size = fit(name, name.length > 14 ? 23 : 32, 360, 0.5);
  const foot = `${stops} / ${stops} PARADAS · ${fechaSello(date)}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SEAL_BOX.x} ${SEAL_BOX.y} ${SEAL_BOX.w} ${SEAL_BOX.h}" width="${SEAL_BOX.w}" height="${SEAL_BOX.h}">` +
    rubberMask(`${p}ink`, seed, SEAL_BOX, 0.9) +
    `<g color="${color}" mask="url(#${p}ink)"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">` +
    '<rect x="-190" y="-104" width="380" height="208" rx="12" stroke-width="6"/><rect x="-180" y="-94" width="360" height="188" rx="7" stroke-width="1.6"/>' +
    text(0, -58, 'RUTA COMPLETADA', 20, 3) +
    star(-160, -65, 6.5) + star(160, -65, 6.5) +
    '<line x1="-180" y1="-42" x2="180" y2="-42" stroke-width="2"/><line x1="-180" y1="-37" x2="180" y2="-37" stroke-width="0.8"/>' +
    text(0, 12, name, size, 0.5) +
    '<line x1="-180" y1="40" x2="180" y2="40" stroke-width="0.8"/><line x1="-180" y1="45" x2="180" y2="45" stroke-width="2"/>' +
    text(0, 76, foot, fit(foot, 15, 340, 3), 3) +
    '</g></g></svg>'
  );
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
