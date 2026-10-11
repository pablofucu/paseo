/** Papel del pasaporte: la tinta de cada ruta tiene que leerse sobre él */
export const PAPEL = '#f1ead6';
/** Papel de las postales */
export const PAPEL_POSTAL = '#f5eedb';

function luminancia(hex: string) {
  const c = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Contraste WCAG entre dos colores #rrggbb */
export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * La tinta de una ruta es su color de acento. Si es demasiado claro para
 * leerse como tinta sobre el papel (contraste < 4,5:1), se oscurece en pasos
 * del 4 % hasta que cumple.
 */
export function tintaDeRuta(accent: string, papel = PAPEL) {
  let [r, g, b] = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16));
  let hex = accent.toLowerCase();
  while (contraste(hex, papel) < 4.5) {
    [r, g, b] = [r, g, b].map(v => Math.round(v * 0.96));
    hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  return hex;
}

const hex = (n: number[]) => '#' + n.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

/** Mezcla dos colores #rrggbb (t = 0 → a, t = 1 → b) */
export function mezcla(a: string, b: string, t: number) {
  const [x, y] = [rgb(a), rgb(b)];
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}

/**
 * Papel de la hoja de una ruta: el del pasaporte con un velo muy suave del
 * color claro de la ruta, para que cada hoja se reconozca sin gritar.
 */
export const papelDeRuta = (soft: string) => mezcla(PAPEL, soft, 0.55);

/**
 * Tinta de cada parada: las tintas de la ruta por turnos (o su acento si no
 * tiene), corregidas para leerse sobre el papel de su hoja.
 */
export function tintaDeParada(inks: string[] | undefined, accent: string, index: number, papel = PAPEL) {
  const list = inks?.length ? inks : [accent];
  return tintaDeRuta(list[index % list.length], papel);
}
