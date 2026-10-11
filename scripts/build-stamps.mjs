// Extrae la escena de cada sello de goma de design/stamps/<parada>.svg y la
// guarda en src/data/stamps/scenes.ts. El marco (anillos, textos, estrellas)
// lo genera la app (src/lib/rubber.ts) con la ciudad y la fecha reales.
//
// Contrato de los SVG: la escena empieza en el primer <clipPath> y termina
// antes del último "\n</g></g>" (como en los sellos de la guía).
//
// Uso: node scripts/build-stamps.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../design/stamps/', import.meta.url);
const fonts = s => s
  .replace(/font-family="([^"]*)"/g, (_, f) => `font-family="${/Georgia|Times/.test(f) ? 'Fraunces_700Bold' : 'Nunito_900Black'}"`)
  .replace(/\s(font-weight|font-style)="[^"]*"/g, '');

const out = {};
for (const f of readdirSync(dir).filter(f => f.endsWith('.svg')).sort()) {
  const s = readFileSync(new URL(f, dir), 'utf8');
  const a = s.indexOf('<clipPath'), b = s.lastIndexOf('\n</g></g>');
  if (a < 0 || b < a) throw new Error(`${f}: no sigue el contrato`);
  out[f.replace('.svg', '')] = fonts(s.slice(a, b)).replace(/\s*\n\s*/g, '').replace(/ {2,}/g, ' ').replace(/ \/>/g, '/>').replace(/ >/g, '>');
}
const body = Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
writeFileSync(new URL('../src/data/stamps/scenes.ts', import.meta.url),
  `// Generado por scripts/build-stamps.mjs a partir de design/stamps/*.svg. No editar a mano.\nexport const SCENES: Record<string, string> = {\n${body}\n};\n`);
console.log(Object.keys(out).map(k => `${k} ${out[k].length}`).join('\n'));
