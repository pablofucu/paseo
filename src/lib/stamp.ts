import type { StampShape } from '@/data/types';

/**
 * Genera el SVG de un sello (caja 120 × 120) a partir de su forma,
 * el pictograma de la parada y los textos. Se pinta con <SvgXml>.
 */
export interface StampSpec {
  shape: StampShape;
  pictogram: string;
  name: string;
  sub: string;
  color: string;
  /** Sin conseguir: contorno punteado y sin textos */
  ghost?: boolean;
}

let uid = 0;
/** Generador pseudoaleatorio estable a partir de un texto (misma textura para el mismo sello) */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Máscara de tinta sobre papel: quita tinta donde no llegó (poros y fibras),
 * deja zonas con menos presión y manchas más claras. Es lo que hace que el
 * sello no parezca un color plano.
 */
export function inkMask(id: string, seed: string, w: number, h: number): string {
  const r = rng(seed);
  const a = r() * Math.PI * 2;
  const x1 = 0.5 + Math.cos(a) * 0.5, y1 = 0.5 + Math.sin(a) * 0.5;
  const light = Math.round(150 + r() * 40).toString(16);
  let dots = '';
  for (let i = 0; i < Math.round((w * h) / 95); i++) {
    dots += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.25 + r() ** 2 * 1.1).toFixed(2)}" fill="#000" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`;
  }
  let fibers = '';
  for (let i = 0; i < 9; i++) {
    const x = r() * w, y = r() * h, len = 3 + r() * 9, ang = r() * Math.PI;
    fibers += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(ang) * len).toFixed(1)} ${(Math.sin(ang) * len).toFixed(1)}" stroke="#000" stroke-width="${(0.25 + r() * 0.35).toFixed(2)}" opacity="${(0.35 + r() * 0.4).toFixed(2)}"/>`;
  }
  let blotches = '';
  for (let i = 0; i < 4; i++) {
    blotches += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(4 + r() * 10).toFixed(1)}" fill="#000" opacity="${(0.1 + r() * 0.14).toFixed(2)}"/>`;
  }
  return `<defs>
    <linearGradient id="${id}p" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${(1 - x1).toFixed(2)}" y2="${(1 - y1).toFixed(2)}">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f2f2f2"/><stop offset="1" stop-color="#${light}${light}${light}"/>
    </linearGradient>
    <mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="url(#${id}p)"/>${blotches}${fibers}${dots}
    </mask>
  </defs>`;
}

const fit = (s: string, max: number, w: number, ls = 1.2) => Math.min(max, (w / Math.max(1, s.length) - ls) / 0.7).toFixed(2);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function chapaPath() {
  let d = '';
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2, r = i % 2 ? 51.5 : 56.5;
    d += (i ? 'L' : 'M') + (60 + r * Math.cos(a)).toFixed(2) + ' ' + (60 + r * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}

function scallopPath() {
  let d = 'M14 14';
  const r = 3.2, step = 8;
  for (let x = 14; x < 106; x += step) d += ` a${r} ${r} 0 0 0 ${step} 0`;
  for (let y = 14; y < 106; y += step) d += ` a${r} ${r} 0 0 0 0 ${step}`;
  for (let x = 106; x > 14; x -= step) d += ` a${r} ${r} 0 0 0 -${step} 0`;
  for (let y = 106; y > 14; y -= step) d += ` a${r} ${r} 0 0 0 0 -${step}`;
  return d + 'Z';
}

export function stampXml({ shape, pictogram, name, sub, color, ghost }: StampSpec): string {
  const id = `s${uid++}`;
  const ink = ghost ? '#CDBFAD' : color;
  const n = esc(name), s = esc(sub);
  const stroke = (w: number, extra = '') => `fill="none" stroke="${ink}" stroke-width="${w}"${ghost ? ' stroke-dasharray="4 3"' : ''} ${extra}`;
  const txt = (t: string, x: number, y: number, size: string, weight = 900, ls = 1.2) =>
    ghost ? '' : `<text x="${x}" y="${y}" text-anchor="middle" font-family="Nunito_900Black" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${ink}">${t}</text>`;
  // El pictograma (caja 60 × 40) se coloca con una transformación: los <svg> anidados
  // con x/y no se posicionan igual en iOS y Android. Se centra en (cx, cy) con ancho w.
  const pict = (cx: number, cy: number, w: number) => {
    const k = w / 60;
    return `<g transform="translate(${(cx - w / 2).toFixed(2)} ${(cy - (40 * k) / 2).toFixed(2)}) scale(${k.toFixed(4)})" opacity="${ghost ? 0.7 : 1}">${pictogram.replace(/currentColor/g, ink)}</g>`;
  };
  let body = '';
  switch (shape) {
    case 'round':
      body = `<defs><path id="${id}a" d="M16.5 60 a43.5 43.5 0 1 1 87 0"/><path id="${id}b" d="M9.5 60 a50.5 50.5 0 0 0 101 0"/><clipPath id="${id}c"><circle cx="60" cy="60" r="35.5"/></clipPath></defs>
        <circle cx="60" cy="60" r="56" ${stroke(3)}/><circle cx="60" cy="60" r="37" ${stroke(1.3)}/>
        ${ghost ? '' : `<text font-family="Nunito_900Black" font-size="${fit(name, 10.5, 125, 1.4)}" letter-spacing="1.4" fill="${ink}"><textPath href="#${id}a" startOffset="50%" text-anchor="middle">${n}</textPath></text>
        <text font-family="Nunito_900Black" font-size="${fit(sub, 8.4, 150)}" letter-spacing="1.2" fill="${ink}"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${s}</textPath></text>`}
        <g clip-path="url(#${id}c)">${pict(60, 60, 56)}</g>`;
      break;
    case 'ticket':
      body = `<path d="M12 22 H108 a6 6 0 0 1 6 6 V53 a7 7 0 0 0 0 14 V92 a6 6 0 0 1 -6 6 H12 a6 6 0 0 1 -6 -6 V67 a7 7 0 0 0 0 -14 V28 a6 6 0 0 1 6 -6 Z" ${stroke(3)}/>
        <path d="M15 40 H105 M15 85 H105" ${stroke(1.1, 'stroke-dasharray="3 2.5"')}/>
        ${txt(n, 60, 35, fit(name, 10, 92))}${txt(s, 60, 94, fit(sub, 7.6, 92, 1), 800, 1)}${pict(60, 62.5, 58)}`;
      break;
    case 'arch':
      body = `<path d="M14 106 V54 A46 46 0 0 1 106 54 V106 Z" ${stroke(3)}/><path d="M21 99 V55 A39 39 0 0 1 99 55 V99 Z" ${stroke(1.2)}/>
        ${txt(n, 60, 84, fit(name, 9.6, 68))}${txt(s, 60, 94, fit(sub, 7, 66, 1), 800, 1)}${pict(60, 48.6667, 56)}`;
      break;
    case 'postal':
      body = `<path d="${scallopPath()}" ${stroke(2.4)}/><rect x="20" y="20" width="80" height="80" ${stroke(1.2)}/>
        ${txt(n, 60, 84, fit(name, 9.6, 72))}${txt(s, 60, 94, fit(sub, 7, 72, 1), 800, 1)}${pict(60, 47.3333, 58)}`;
      break;
    case 'oval':
      body = `<ellipse cx="60" cy="60" rx="56" ry="42" ${stroke(3)}/><ellipse cx="60" cy="60" rx="48" ry="34" ${stroke(1.2)}/>
        ${txt(n, 60, 80, fit(name, 9, 76))}${txt(s, 60, 88.5, fit(sub, 6.8, 64, 1), 800, 1)}${pict(60, 50.6667, 50)}`;
      break;
    case 'chapa':
      body = `<path d="${chapaPath()}" ${stroke(2.6, 'stroke-linejoin="round"')}/><circle cx="60" cy="60" r="44" ${stroke(1.2)}/>
        ${txt(s, 60, 31, fit(sub, 7, 60, 1), 800, 1)}${txt(n, 60, 88, fit(name, 9.6, 62))}${pict(60, 57, 54)}`;
      break;
  }
  if (ghost) return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${inkMask(id, name + sub, 120, 120)}<g mask="url(#${id}m)" opacity="0.93">${body}</g></svg>`;
}

export interface VisaSpec {
  city: string;
  title: string;
  date: string;
  /** Pictograma del emblema del tour (caja 60 × 40) */
  pictogram: string;
  /** Una casilla por parada: true si tiene sello */
  stops: boolean[];
  color: string;
  accent: string;
  ghost?: boolean;
}

/**
 * Sello del tour: un visado de pasaporte (170 × 120), distinto de los sellos de
 * parada: rectangular, con banda de cabecera, nombre del tour, casillas de paradas
 * y fecha de entrada en un segundo color.
 */
export function visaXml({ city, title, date, pictogram, stops, color, accent, ghost }: VisaSpec): string {
  const ink = ghost ? '#CDBFAD' : color;
  const acc = ghost ? '#CDBFAD' : accent;
  const dash = ghost ? ' stroke-dasharray="5 4"' : '';
  const font = 'font-family="Nunito_900Black" font-weight="900"';
  const n = stops.length;
  const step = Math.min(17, 92 / Math.max(1, n));
  const dots = stops
    .map((on, i) => {
      const cx = 22 + i * step;
      return `<circle cx="${cx}" cy="99" r="6.4" fill="${on && !ghost ? ink : 'none'}" stroke="${ink}" stroke-width="1.4"/>` +
        `<text x="${cx}" y="102.2" text-anchor="middle" ${font} font-size="8.5" fill="${on && !ghost ? '#FBF6EC' : ink}">${i + 1}</text>`;
    })
    .join('');
  const k = 46 / 60;
  const id = `v${uid++}`;
  return `<svg viewBox="0 0 170 120" xmlns="http://www.w3.org/2000/svg">${ghost ? '' : inkMask(id, city + title + date, 170, 120)}<g${ghost ? '' : ` mask="url(#${id}m)" opacity="0.94"`}>
    <rect x="3" y="3" width="164" height="114" rx="10" fill="none" stroke="${ink}" stroke-width="3"${dash}/>
    <rect x="9" y="9" width="152" height="102" rx="6" fill="none" stroke="${ink}" stroke-width="1" stroke-dasharray="2 2.5"/>
    ${ghost ? '' : `<rect x="9" y="9" width="152" height="20" rx="5" fill="${ink}"/>
    <text x="85" y="23" text-anchor="middle" ${font} font-size="7.4" letter-spacing="1.6" fill="#FBF6EC">PASEO · VISADO DE RUTA</text>
    <text x="17" y="52" ${font} font-size="${Math.min(19, 92 / (0.72 * Math.max(1, city.length))).toFixed(2)}" letter-spacing="0.5" fill="${ink}">${esc(city.toUpperCase())}</text>
    <text x="17" y="66" ${font} font-size="${Math.min(9, 92 / (0.56 * Math.max(1, title.length))).toFixed(2)}" fill="${ink}">${esc(title)}</text>
    <text x="17" y="83" ${font} font-size="7" letter-spacing="1.4" fill="${ink}">PARADAS</text>`}
    ${dots}
    <g transform="translate(${(128 - 23).toFixed(2)} ${(56 - 40 * k / 2).toFixed(2)}) scale(${k.toFixed(4)})" opacity="${ghost ? 0.7 : 1}">${pictogram.replace(/currentColor/g, ink)}</g>
    <g transform="rotate(-8 128 96)">
      <rect x="103" y="85" width="52" height="22" rx="4" fill="none" stroke="${acc}" stroke-width="2"${dash}/>
      ${ghost ? '' : `<text x="129" y="94" text-anchor="middle" ${font} font-size="6.4" letter-spacing="1.2" fill="${acc}">ENTRADA</text>
      <text x="129" y="103.5" text-anchor="middle" ${font} font-size="9" letter-spacing="0.6" fill="${acc}">${esc(date)}</text>`}
    </g>
  </g></svg>`;
}
