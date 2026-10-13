import type { ImageSourcePropType } from 'react-native';
import { PAPEL_POSTAL } from '@/lib/ink';
import { postmarkXml, rng } from '@/lib/rubber';

/*
 * Postal de una ruta (guía de sellos, § 08): 900 × 600, papel #f5eedb con
 * grano y sombra suave, perforado r 8 cada 24 px, ilustración 832 × 444 en
 * (34, 34), marco doble en el acento, «ESPAÑA», valor, título, subtítulo y
 * matasellos. La ilustración es una imagen (con la textura de imprenta ya
 * aplicada); esto genera el papel de debajo y lo que va encima.
 */

/** Miniaturas de las postales (scripts/shrink-assets.py), para lo que se pinta pequeño o difuminado */
export const POSTCARD_THUMB: Record<string, ImageSourcePropType> = {
  'tomares-4-paradas': require('../../assets/postcards/thumb/tomares.jpg'),
  'sevilla-centro': require('../../assets/postcards/thumb/sevilla.jpg'),
  'sevilla-arenal': require('../../assets/postcards/thumb/sevilla-arenal.jpg'),
};

export const POSTCARD = { w: 900, h: 600, art: { x: 34, y: 34, w: 832, h: 444 } };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function perforation(id: string) {
  let holes = '';
  for (let x = 12; x < 900; x += 24) holes += `<circle cx="${x}" cy="0" r="8"/><circle cx="${x}" cy="600" r="8"/>`;
  for (let y = 12; y < 600; y += 24) holes += `<circle cx="0" cy="${y}" r="8"/><circle cx="900" cy="${y}" r="8"/>`;
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="940" height="640"><rect x="-20" y="-20" width="940" height="640" fill="#fff"/><g fill="#000">${holes}</g></mask>`;
}

/** Papel perforado con grano y sombra suave (va debajo de la ilustración) */
export function postcardPaperXml(id: string) {
  const r = rng(91);
  let grain = '';
  for (let i = 0; i < 700; i++) {
    grain += `<circle cx="${(r() * 900).toFixed(1)}" cy="${(r() * 600).toFixed(1)}" r="${(0.5 + r() * 1.1).toFixed(2)}"/>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -10 928 628">` +
    `<defs>${perforation(`${id}p`)}</defs>` +
    // sombra suave: el mismo papel desplazado, en capas
    `<g mask="url(#${id}p)" transform="translate(0 6)"><rect width="900" height="600" fill="#000" opacity="0.06"/></g>` +
    `<g mask="url(#${id}p)" transform="translate(0 3)"><rect width="900" height="600" fill="#000" opacity="0.06"/></g>` +
    `<g mask="url(#${id}p)"><rect width="900" height="600" fill="${PAPEL_POSTAL}"/><g fill="#8a7650" opacity="0.13">${grain}</g></g>` +
    '</svg>'
  );
}

/** Lo que va encima de la ilustración: marco, «ESPAÑA», valor, título, subtítulo y matasellos */
export function postcardFaceXml({ id, title, subtitle, value, accent, city, date }: { id: string; title: string; subtitle: string; value: string; accent: string; city: string; date: string }) {
  const titleSize = Math.min(30, 760 / Math.max(1, title.length) / 0.68);
  const subSize = Math.min(13, 820 / Math.max(1, subtitle.length) / 0.68 - 4 * 0.5);
  const mark = postmarkXml({ city, date }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/id="/g, `id="${id}`).replace(/href="#/g, `href="#${id}`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -10 928 628">` +
    `<g fill="none" stroke="${accent}"><rect x="26" y="26" width="848" height="460" stroke-width="4"/><rect x="33.5" y="33.5" width="833" height="445" stroke-width="1.4"/></g>` +
    `<text x="50" y="64" font-family="Fraunces_800ExtraBold" font-size="17" letter-spacing="1.5" fill="none" stroke="${accent}" stroke-width="3.2" stroke-linejoin="round">ESPAÑA</text>` +
    `<text x="50" y="64" font-family="Fraunces_800ExtraBold" font-size="17" letter-spacing="1.5" fill="#fff">ESPAÑA</text>` +
    `<text x="850" y="462" text-anchor="end" font-family="Fraunces_800ExtraBold" font-size="24" fill="none" stroke="${accent}" stroke-width="3.6" stroke-linejoin="round">${esc(value)}</text>` +
    `<text x="850" y="462" text-anchor="end" font-family="Fraunces_800ExtraBold" font-size="24" fill="#fff">${esc(value)}</text>` +
    `<text x="450" y="532" text-anchor="middle" font-family="Fraunces_800ExtraBold" font-size="${titleSize.toFixed(1)}" letter-spacing="1.5" fill="${accent}">${esc(title.toUpperCase())}</text>` +
    `<text x="450" y="560" text-anchor="middle" font-family="Nunito_800ExtraBold" font-size="${subSize.toFixed(1)}" letter-spacing="4" fill="${accent}">${esc(subtitle)}</text>` +
    `<g transform="translate(621 39) scale(1.35)">${mark}</g>` +
    '</svg>'
  );
}

/** Postal todavía sin ganar: el hueco de la ilustración en blanco y el título */
export function postcardBlankXml({ title, accent }: { title: string; accent: string }) {
  const titleSize = Math.min(30, 760 / Math.max(1, title.length) / 0.68);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -10 928 628">` +
    `<rect x="34" y="34" width="832" height="444" fill="none" stroke="#b9ab88" stroke-width="2.4" stroke-dasharray="10 8"/>` +
    `<text x="450" y="532" text-anchor="middle" font-family="Fraunces_800ExtraBold" font-size="${titleSize.toFixed(1)}" letter-spacing="1.5" fill="${accent}" opacity="0.55">${esc(title.toUpperCase())}</text>` +
    '</svg>'
  );
}
