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
  const pict = (x: number, y: number, w: number) =>
    `<svg x="${x}" y="${y}" width="${w}" height="${(w * 2) / 3}" viewBox="0 0 60 40" color="${ink}" opacity="${ghost ? 0.7 : 1}">${pictogram.replace(/currentColor/g, ink)}</svg>`;
  let body = '';
  switch (shape) {
    case 'round':
      body = `<defs><path id="${id}a" d="M16.5 60 a43.5 43.5 0 1 1 87 0"/><path id="${id}b" d="M9.5 60 a50.5 50.5 0 0 0 101 0"/><clipPath id="${id}c"><circle cx="60" cy="60" r="35.5"/></clipPath></defs>
        <circle cx="60" cy="60" r="56" ${stroke(3)}/><circle cx="60" cy="60" r="37" ${stroke(1.3)}/>
        ${ghost ? '' : `<text font-family="Nunito_900Black" font-size="${fit(name, 10.5, 125, 1.4)}" letter-spacing="1.4" fill="${ink}"><textPath href="#${id}a" startOffset="50%" text-anchor="middle">${n}</textPath></text>
        <text font-family="Nunito_900Black" font-size="${fit(sub, 8.4, 150)}" letter-spacing="1.2" fill="${ink}"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${s}</textPath></text>`}
        <g clip-path="url(#${id}c)">${pict(32, 42, 56)}</g>`;
      break;
    case 'ticket':
      body = `<path d="M12 22 H108 a6 6 0 0 1 6 6 V53 a7 7 0 0 0 0 14 V92 a6 6 0 0 1 -6 6 H12 a6 6 0 0 1 -6 -6 V67 a7 7 0 0 0 0 -14 V28 a6 6 0 0 1 6 -6 Z" ${stroke(3)}/>
        <path d="M15 40 H105 M15 85 H105" ${stroke(1.1, 'stroke-dasharray="3 2.5"')}/>
        ${txt(n, 60, 35, fit(name, 10, 92))}${txt(s, 60, 94, fit(sub, 7.6, 92, 1), 800, 1)}${pict(31, 43.5, 58)}`;
      break;
    case 'arch':
      body = `<path d="M14 106 V54 A46 46 0 0 1 106 54 V106 Z" ${stroke(3)}/><path d="M21 99 V55 A39 39 0 0 1 99 55 V99 Z" ${stroke(1.2)}/>
        ${txt(n, 60, 84, fit(name, 9.6, 68))}${txt(s, 60, 94, fit(sub, 7, 66, 1), 800, 1)}${pict(32, 30, 56)}`;
      break;
    case 'postal':
      body = `<path d="${scallopPath()}" ${stroke(2.4)}/><rect x="20" y="20" width="80" height="80" ${stroke(1.2)}/>
        ${txt(n, 60, 84, fit(name, 9.6, 72))}${txt(s, 60, 94, fit(sub, 7, 72, 1), 800, 1)}${pict(31, 28, 58)}`;
      break;
    case 'oval':
      body = `<ellipse cx="60" cy="60" rx="56" ry="42" ${stroke(3)}/><ellipse cx="60" cy="60" rx="48" ry="34" ${stroke(1.2)}/>
        ${txt(n, 60, 82, fit(name, 9, 76))}${txt(s, 60, 91, fit(sub, 6.8, 68, 1), 800, 1)}${pict(35, 34, 50)}`;
      break;
    case 'chapa':
      body = `<path d="${chapaPath()}" ${stroke(2.6, 'stroke-linejoin="round"')}/><circle cx="60" cy="60" r="44" ${stroke(1.2)}/>
        ${txt(s, 60, 31, fit(sub, 7, 60, 1), 800, 1)}${txt(n, 60, 88, fit(name, 9.6, 62))}${pict(33, 36, 54)}`;
      break;
  }
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
