// Hornea el sello de goma de cada parada en assets/stamps/<parada>.png:
// la escena de design/stamps/<parada>.svg con el marco de src/lib/rubber.ts
// (anillos, título, estrellas) y la textura de goma de la guía (feTurbulence +
// feDisplacementMap, que react-native-svg no tiene en el móvil). Sale en negro
// sobre transparente; la app lo tiñe con la tinta de la parada y pinta la
// fecha encima. También escribe src/data/stamps/images.ts.
//
// Contrato de los SVG: la escena empieza en el primer <clipPath> y termina
// antes del último "\n</g></g>" (como en los sellos de la guía).
//
// Necesita Node ≥ 22.18 (importa TypeScript) y Playwright con Chromium:
//   NODE_PATH=$(npm root -g) node scripts/build-stamps.mjs
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { RUBBER_BOX, rubberArtXml } from '../src/lib/rubber.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url);
const SCALE = 2;

const fonts = s => s
  .replace(/font-family="([^"]*)"/g, (_, f) => `font-family="${/Georgia|Times/.test(f) ? 'Fraunces_700Bold' : 'Nunito_900Black'}"`)
  .replace(/\s(font-weight|font-style)="[^"]*"/g, '');

const scenes = {};
for (const f of readdirSync(new URL('design/stamps/', root)).filter(f => f.endsWith('.svg')).sort()) {
  const s = readFileSync(new URL(`design/stamps/${f}`, root), 'utf8');
  const a = s.indexOf('<clipPath'), b = s.lastIndexOf('\n</g></g>');
  if (a < 0 || b < a) throw new Error(`${f}: no sigue el contrato`);
  scenes[f.replace('.svg', '')] = fonts(s.slice(a, b));
}

// Paradas de cada ruta: su id, su sello y la ciudad (leídos de src/data/tours/*.ts)
const stops = [];
for (const f of readdirSync(new URL('src/data/tours/', root)).filter(f => /^[a-z]+\.ts$/.test(f) && f !== 'index.ts')) {
  const src = readFileSync(new URL(`src/data/tours/${f}`, root), 'utf8');
  const city = /\bcity: ['"]([^'"]+)['"]/.exec(src)[1];
  for (const m of src.matchAll(/\bid: ['"]([\w-]+)['"],(?:(?!\bid: ['"])[\s\S])*?\brubber: (\{[^}]*\})/g)) {
    stops.push({ id: m[1], city, art: Function(`return (${m[2]})`)() });
  }
}

// Textura de goma de la guía (§ 05): presión desigual, poros y bordes comidos
const filter = seed => `<filter id="goma" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceGraphic" stdDeviation="0.35" result="soft"/>
<feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed="${seed}" result="fine"/>
<feColorMatrix in="fine" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -7 0 0 0 4.55" result="speck"/>
<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="${seed + 7}" result="big"/>
<feColorMatrix in="big" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.1 0 0 0 -0.12" result="press"/>
<feComposite in="speck" in2="press" operator="arithmetic" k1="1.05" k2="0" k3="0" k4="0" result="mask"/>
<feComposite in="soft" in2="mask" operator="in" result="inked"/>
<feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="${seed + 3}" result="warp"/>
<feDisplacementMap in="inked" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;

// Incrustadas: una página hecha con setContent no puede cargar file://
const face = (name, file) => `@font-face{font-family:${name};src:url(data:font/ttf;base64,${readFileSync(new URL(`node_modules/@expo-google-fonts/${file}`, root)).toString('base64')})}`;
const css = [
  face('Nunito_900Black', 'nunito/900Black/Nunito_900Black.ttf'),
  face('Nunito_800ExtraBold', 'nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
  face('Fraunces_700Bold', 'fraunces/700Bold/Fraunces_700Bold.ttf'),
].join('');

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: SCALE });
let seed = 90;
const done = [];
for (const st of stops) {
  if (!scenes[st.id]) throw new Error(`${st.id}: falta design/stamps/${st.id}.svg`);
  const box = RUBBER_BOX[st.art.shape];
  const svg = rubberArtXml({ art: st.art, scene: scenes[st.id], city: st.city, filter: 'goma' })
    .replace(/(<svg[^>]*>)/, `$1<defs>${filter(seed)}</defs>`);
  await page.setViewportSize({ width: box.w, height: box.h });
  await page.setContent(`<html><head><style>${css} body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: new URL(`assets/stamps/${st.id}.png`, root).pathname, omitBackground: true });
  done.push(st.id);
  seed += 17;
}
await browser.close();

writeFileSync(new URL('src/data/stamps/images.ts', root),
  '// Generado por scripts/build-stamps.mjs. No editar a mano.\n' +
  'import type { ImageSourcePropType } from \'react-native\';\n\n' +
  '/** Dibujo horneado de cada sello de goma (negro sobre transparente, se tiñe con la tinta) */\n' +
  'export const STAMP_ART: Record<string, ImageSourcePropType> = {\n' +
  done.sort().map(id => `  ${JSON.stringify(id)}: require('../../../assets/stamps/${id}.png'),`).join('\n') +
  '\n};\n');
console.log(done.join('\n'));
