import type { OnTheWay, Stop } from '@/data/types';

/*
 * Texto para la voz del sistema: los números y los siglos en romanos se
 * escriben con letras («siglo XVIII» → «siglo dieciocho», 1749 → «mil
 * setecientos cuarenta y nueve»), porque la voz los lee mal o a trompicones.
 * Si una parada trae su propio `spoken`, se usa tal cual.
 */

const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
const ORDINALES = ['', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];

/** Un número entero de 0 a 9999 en palabras */
export function numberToSpanish(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) return String(n);
  if (n < 30) return UNIDADES[n];
  if (n < 100) return DECENAS[Math.floor(n / 10)] + (n % 10 ? ` y ${UNIDADES[n % 10]}` : '');
  if (n < 1000) {
    if (n === 100) return 'cien';
    return CENTENAS[Math.floor(n / 100)] + (n % 100 ? ` ${numberToSpanish(n % 100)}` : '');
  }
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  return (miles === 1 ? 'mil' : `${numberToSpanish(miles)} mil`) + (resto ? ` ${numberToSpanish(resto)}` : '');
}

/** Número romano (I–XXXIX) a entero; null si no es un romano válido */
export function romanToInt(s: string): number | null {
  if (!s || !/^X{0,3}(IX|IV|V?I{0,3})$/.test(s)) return null;
  const v: Record<string, number> = { I: 1, V: 5, X: 10 };
  let total = 0;
  for (let i = 0; i < s.length; i++) total += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
  return total;
}

const ROMAN = '[IVX]+';

/** Siglos, reyes, años y cifras sueltas en palabras */
export function toSpeech(text: string): string {
  return text
    // «siglo XVIII», «siglos XVI y XVII»
    .replace(new RegExp(`\\b(siglos?)\\s+(${ROMAN})(?:(\\s+y\\s+)(${ROMAN}))?\\b`, 'g'), (m, w: string, a: string, y?: string, b?: string) => {
      const x = romanToInt(a), z = b ? romanToInt(b) : null;
      if (x == null || (b && z == null)) return m;
      return `${w} ${numberToSpanish(x)}${b ? `${y}${numberToSpanish(z!)}` : ''}`;
    })
    // Reyes: «Carlos III» → «Carlos tercero», «Alfonso XIII» → «Alfonso trece»
    .replace(new RegExp(`\\b(Alfonso|Carlos|Felipe|Pedro|Fernando|Juan)\\s+(${ROMAN})\\b`, 'g'), (m, name: string, r: string) => {
      const x = romanToInt(r);
      if (x == null) return m;
      return `${name} ${x <= 10 ? ORDINALES[x] : numberToSpanish(x)}`;
    })
    // Años y cifras sueltas (sin tocar horas, decimales ni miles con punto)
    .replace(/(?<![\d.,:])\d{1,4}(?![\d.,:]?\d)/g, d => numberToSpanish(Number(d)));
}

/** Lo que dice la voz en una parada: `spoken` si existe, y si no el texto de la ficha */
export function stopScript(stop: Stop): string {
  if (stop.spoken) return stop.spoken;
  const look = `${stop.look.charAt(0).toLowerCase()}${stop.look.slice(1)}`;
  return toSpeech(`${stop.name}. ${stop.p1} Fíjate en ${look} ${stop.p2} ¿Sabías que…? ${stop.fact}`);
}

/** Lo que dice la voz en un «de camino» al tocarlo */
export function wayScript(way: OnTheWay): string {
  return way.spoken ?? toSpeech(way.story ?? way.text.replace(/^De camino:\s*/i, ''));
}
