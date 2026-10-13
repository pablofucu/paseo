// Hornea el papel de las hojas del pasaporte (guilloche, viñeteado ocre y
// sombra del lomo) en assets/passport/paper-face.png y paper-back.png, sobre
// transparente: la app pone debajo el color del papel (o el velo de la ruta).
// También el grano de la piel de la tapa (assets/passport/cover-grain.png).
// En el móvil se dibujaba como SVG en cada hoja y en cada tramo de la hoja que
// se curva al pasarla (hasta ~22 copias a la vez), y el pasaporte iba lentísimo.
//
//   NODE_PATH=$(npm root -g) node scripts/build-passport-paper.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// Hoja de un móvil normal (360 de ancho, proporción 0,7) a 2×
const W = 360, H = Math.round(360 / 0.7), SCALE = 2;

function guilloche(width, height) {
  const out = [];
  const rows = Math.round(height / 22);
  for (let k = 0; k < rows; k++) {
    const y0 = (height / rows) * k + 8;
    let d = `M0 ${y0.toFixed(1)}`;
    for (let x = 0; x <= width + 6; x += 6) {
      const y = y0 + Math.sin(x / 17 + k * 0.7) * 4 + Math.sin(x / 43 + k) * 2.5;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    out.push(d);
  }
  return out.join(' ');
}

const svg = back => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="vig" cx="50%" cy="48%" r="72%">
      <stop offset="0.55" stop-color="#b8893a" stop-opacity="0" />
      <stop offset="1" stop-color="#b8893a" stop-opacity="0.32" />
    </radialGradient>
    <linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5a4320" stop-opacity="0.32" />
      <stop offset="0.07" stop-color="#5a4320" stop-opacity="0.1" />
      <stop offset="0.16" stop-color="#5a4320" stop-opacity="0" />
    </linearGradient>
  </defs>
  ${back ? '' : `<path d="${guilloche(W, H)}" stroke="#9b8a62" stroke-width="0.6" fill="none" opacity="0.28" />`}
  <rect width="${W}" height="${H}" fill="url(#vig)" />
  <rect width="${W}" height="${H}" fill="url(#spine)" />
</svg>`;

// Grano de la piel: puntos sueltos oscuros y algún brillo (el mismo sorteo que tenía la tapa)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function grain() {
  const r = rng(23);
  let d = '', l = '';
  for (let i = 0; i < 900; i++) {
    const x = (r() * W).toFixed(1), y = (r() * H).toFixed(1);
    if (i % 2) d += `M${x} ${y}h0.8`; else l += `M${x} ${y}h0.8`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <path d="${d}" stroke="#000" stroke-opacity="0.35" stroke-width="1" stroke-linecap="round" />
  <path d="${l}" stroke="#fff" stroke-opacity="0.07" stroke-width="1" stroke-linecap="round" />
</svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
for (const [name, xml] of [['paper-face', svg(false)], ['paper-back', svg(true)], ['cover-grain', grain()]]) {
  await page.setContent(`<html><body style="margin:0;background:transparent">${xml}</body></html>`);
  const path = new URL(`../assets/passport/${name}.png`, import.meta.url).pathname;
  await page.screenshot({ path, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`assets/passport/${name}.png`);
}
await browser.close();
