// Piezas comunes de las ilustraciones de portada de cada tour
// (design/banners/<tour>.svg, 960 × 600). Todas salen de aquí para que se
// lean como una familia: las mismas formas planas que las postales y la misma
// receta de color.
//
// Receta de color de cada portada:
//   · el color de acento del tour manda: su escala m0 (casi negro) … m3 (el
//     acento, palette.t) … m8 (casi blanco) cubre el cielo y las masas grandes
//     (unos dos tercios de la imagen);
//   · los blancos y cremas comunes (cream, white, stone) para fachadas;
//   · de apoyo y en poco sitio: el amarillo sol compartido (palette.t2), un
//     color de contraste por tour (alt*) y el verde de los árboles (leaf*).
//
// scripts/render-banners.cjs le pone la tinta de imprenta y la guarda en
// assets/banners/<tour>.jpg.
import { mkdirSync, writeFileSync } from 'node:fs';

export const W = 960, H = 600;

/** Escala del acento de cada tour (OKLCH, mismo tono), contraste y verde */
export const PALETTES = {
  'sevilla-centro': { hue: 214, m0: '#04242b', m1: '#023d47', m2: '#015766', m3: '#096f81', m4: '#478c9b', m5: '#7caab5', m6: '#adcad1', m7: '#d5e4e8', m8: '#edf3f5', alt: '#c76749', altDk: '#8a3e26', altLt: '#e8b7a8', leaf: '#59894f', leafDk: '#2f5831' },
  'tomares-4-paradas': { hue: 142, m0: '#042702', m1: '#024200', m2: '#0d5e06', m3: '#0b7900', m4: '#479540', m5: '#7db277', m6: '#adcfa9', m7: '#d5e7d3', m8: '#edf4ec', alt: '#c76749', altDk: '#8a3e26', altLt: '#e8b7a8', leaf: '#479540', leafDk: '#0d5e06' },
  'sevilla-arenal': { hue: 69, m0: '#2e1a02', m1: '#4d2d00', m2: '#6d4200', m3: '#8a5601', m4: '#a4763f', m5: '#bc9b75', m6: '#d6c0a8', m7: '#ebdfd2', m8: '#f6f1ec', alt: '#1a989e', altDk: '#056569', altLt: '#96d0d3', leaf: '#59894f', leafDk: '#2f5831' },
  'triana': { hue: 286, m0: '#1d1741', m1: '#33276e', m2: '#4a399a', m3: '#5f4dbd', m4: '#7a70d1', m5: '#9c98de', m6: '#c0bfed', m7: '#dfdff7', m8: '#f1f1fb', alt: '#c76749', altDk: '#8a3e26', altLt: '#e8b7a8', leaf: '#59894f', leafDk: '#2f5831' },
  'murillo': { hue: 358, m0: '#3a0b1f', m1: '#610e35', m2: '#88174d', m3: '#a92963', m4: '#c25680', m5: '#d586a1', m6: '#e8b3c4', m7: '#f6d8e1', m8: '#faeef2', alt: '#1a989e', altDk: '#056569', altLt: '#96d0d3', leaf: '#59894f', leafDk: '#2f5831' },
  'austrias': { hue: 358, m0: '#3a0b1f', m1: '#610e35', m2: '#88174d', m3: '#a92963', m4: '#c25680', m5: '#d586a1', m6: '#e8b3c4', m7: '#f6d8e1', m8: '#faeef2', alt: '#1a989e', altDk: '#056569', altLt: '#96d0d3', leaf: '#59894f', leafDk: '#2f5831' },
  'letras': { hue: 250, m0: '#03203c', m1: '#013663', m2: '#004f8b', m3: '#0465af', m4: '#4384c5', m5: '#79a6d5', m6: '#abc7e6', m7: '#d4e3f4', m8: '#ecf3f9', alt: '#c76749', altDk: '#8a3e26', altLt: '#e8b7a8', leaf: '#59894f', leafDk: '#2f5831' },
  'retiro-prado': { hue: 142, m0: '#042702', m1: '#024200', m2: '#0d5e06', m3: '#0b7900', m4: '#479540', m5: '#7db277', m6: '#adcfa9', m7: '#d5e7d3', m8: '#edf4ec', alt: '#c76749', altDk: '#8a3e26', altLt: '#e8b7a8', leaf: '#479540', leafDk: '#0d5e06' },
};

/** Colores compartidos por todas las portadas */
export const SHARED = {
  sun: '#fec84b', gold: '#e8a93a', goldDk: '#b97a22',
  cream: '#f4ead6', white: '#fbf7ee', stone: '#e3d3b4', stoneDk: '#bfa982',
  win: '#ffe08a',
};

/** Paleta completa de un tour: escala m0…m8 + compartidos */
export const paletteFor = id => ({ ...SHARED, ...PALETTES[id] });

export const f = n => +n.toFixed(1);
export const R = (x, y, w, h, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;
export const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
export const S = (d, stroke, w, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
export const Ci = (x, y, r, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"/>`;
/** Arco de medio punto apoyado en y (de abajo arriba) */
export const arch = (x, y, w, h, fill) => P(`M${f(x)},${f(y)} V${f(y - h + w / 2)} A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(x + w)},${f(y - h + w / 2)} V${f(y)} Z`, fill);
/** Arco de herradura */
export const horse = (x, y, w, h, fill) => { const r = w / 2, cy = y - h + r * 1.15; return P(`M${f(x + w * 0.08)},${f(y)} V${f(cy + r * 0.45)} A${f(r)},${f(r)} 0 1 1 ${f(x + w * 0.92)},${f(cy + r * 0.45)} V${f(y)} Z`, fill); };
/** Cúpula de media naranja apoyada en y */
export const dome = (cx, y, r, fill) => P(`M${f(cx - r)},${f(y)} A${f(r)},${f(r * 1.1)} 0 0 1 ${f(cx + r)},${f(y)} Z`, fill);
export const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
/** Nube plana como las de las postales */
export const cloud = (x, y, s, fill) => P(`M${x},${y} h${90 * s} a${14 * s},${14 * s} 0 0 0 -${22 * s},-${14 * s} a${18 * s},${18 * s} 0 0 0 -${34 * s},-${4 * s} a${14 * s},${14 * s} 0 0 0 -${34 * s},${18 * s} Z`, fill);

/** Cielo en bandas horizontales de 10 px, como el de la portada de Sevilla. stops: [[y, color], …] */
export function bandedSky(stops, to = H) {
  let s = '';
  for (let y = 0; y < to; y += 10) {
    const j = Math.max(0, stops.findIndex((q, i) => y >= q[0] && (!stops[i + 1] || y < stops[i + 1][0])));
    const [y0, c0] = stops[j], [y1, c1] = stops[j + 1] ?? [to, stops[j][1]];
    s += R(0, y, W, 11, mix(c0, c1, Math.min(1, (y - y0) / Math.max(1, y1 - y0))));
  }
  return s;
}

/** Palmera */
export function palm(x, ground, h, lean, C) {
  const tx = x + lean, ty = ground - h;
  let s = S(`M${x},${ground} Q${f(x - lean * 0.4)},${f(ground - h / 2)} ${tx},${ty}`, C.trunk ?? C.stoneDk, 7);
  for (const [dx, dy] of [[-40, 16], [-32, -6], [-16, -22], [4, -27], [22, -18], [36, -2], [40, 18], [-20, 26], [20, 28]])
    s += S(`M${tx},${ty} Q${f(tx + dx * 0.5)},${f(ty + dy * 0.5 - 9)} ${tx + dx},${ty + dy}`, C.leafDk, 6);
  return s;
}

/** Árbol redondo de copa */
export function tree(x, ground, r, C, fruit = 0) {
  let s = R(x - 4, ground - r - 10, 8, r + 10, C.trunk ?? C.stoneDk) + Ci(x, ground - r - 12, r, C.leaf) + Ci(x - r * 0.6, ground - r * 0.8 - 12, r * 0.7, C.leafDk) + Ci(x + r * 0.6, ground - r * 0.8 - 12, r * 0.7, C.leaf);
  for (let i = 0; i < fruit; i++) { const a = i * 2.4, rr = r * 0.75 * Math.sqrt((i + 0.5) / fruit); s += Ci(x + rr * Math.cos(a), ground - r - 12 + rr * Math.sin(a), 3.5, C.sun); }
  return s;
}

/** Guarda design/banners/<id>.svg */
export function save(id, body, defs = '') {
  mkdirSync(new URL('../design/banners/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`../design/banners/${id}.svg`, import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<defs><clipPath id="clip-${id}"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>${defs}</defs>\n<g id="${id}-banner" clip-path="url(#clip-${id})">\n${body}\n</g>\n</svg>\n`);
  console.log(`design/banners/${id}.svg`);
}
