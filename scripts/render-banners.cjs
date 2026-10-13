// Hornea la portada de cada ruta (assets/banners/<tour>.jpg): una ilustración
// con la textura de tinta de las postales, teñida con los colores de la ruta
// por luminancia (deep → t → claro → soft), para que todas las portadas se
// lean como una familia aunque vengan de dibujos distintos.
//
// Sevilla usa su ilustración propia (design/banners/sevilla.svg, la dibuja
// scripts/draw-banner-sevilla.mjs); las demás rutas, el dibujo de su postal.
// Los colores se leen de la paleta de cada ruta en src/data/tours/<tour>.ts.
//
// Necesita Playwright con Chromium: node scripts/render-banners.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const BANNERS = {
  sevilla: 'design/banners/sevilla.svg',
  tomares: 'design/postcards/tomares-4-paradas.svg',
  'sevilla-arenal': 'design/postcards/sevilla-arenal.svg',
};
// La misma tinta de imprenta que scripts/render-postcards.cjs. Debajo va el
// dibujo sin tinta, algo transparente, para que el moteado no aclare las
// zonas oscuras (el cielo de noche) y la portada no pierda contraste.
const INK = `<filter id="tinta" x="-3%" y="-3%" width="106%" height="106%">
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="SEED" result="n1"/>
<feColorMatrix in="n1" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -5 0 0 0 3.75" result="moteado"/>
<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="SEED11" result="n2"/>
<feColorMatrix in="n2" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.6 0 0 0 0.05" result="carga"/>
<feComposite in="moteado" in2="carga" operator="arithmetic" k2="1" k3="0.55" k4="-0.45" result="mascara"/>
<feComposite in="SourceGraphic" in2="mascara" operator="in" result="entintado"/>
<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="SEED5" result="warp"/>
<feDisplacementMap in="entintado" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
function palette(id) {
  const src = fs.readFileSync(path.join(root, 'src/data/tours', `${id}.ts`), 'utf8');
  const m = src.match(/palette:\s*\{([^}]*)\}/);
  const get = k => m[1].match(new RegExp(`\\b${k}:\\s*'(#[0-9A-Fa-f]{6})'`))[1];
  return { t: get('t'), soft: get('soft'), deep: get('deep') };
}
// Mapa de degradado: luminancia → deep, t, un claro entre t y soft, soft
function gradientMap(p) {
  const stops = [rgb(p.deep), rgb(p.t), mix(rgb(p.t), rgb(p.soft), 0.4), rgb(p.soft)];
  const ch = i => stops.map(s => s[i].toFixed(4)).join(' ');
  return `<filter id="tono" color-interpolation-filters="sRGB">
<feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0"/>
<feComponentTransfer><feFuncR type="table" tableValues="${ch(0)}"/><feFuncG type="table" tableValues="${ch(1)}"/><feFuncB type="table" tableValues="${ch(2)}"/></feComponentTransfer>
</filter>`;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  fs.mkdirSync(path.join(root, 'assets/banners'), { recursive: true });
  let seed = 23;
  for (const [id, file] of Object.entries(BANNERS)) {
    const art = fs.readFileSync(path.join(root, file), 'utf8');
    const [, w, h] = art.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
    const inner = art.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const ink = INK.replace('SEED11', seed + 11).replace('SEED5', seed + 5).replace('SEED', seed);
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${ink}${gradientMap(palette(id))}</defs><g filter="url(#tono)"><rect width="${w}" height="${h}" fill="#f5eedb"/><g opacity="0.75">${inner.replace(/id="([^"]+)"/g, 'id="u-$1"').replace(/url\(#([^)]+)\)/g, 'url(#u-$1)')}</g><g filter="url(#tinta)">${inner}</g></g></svg></body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(root, 'assets/banners', `${id}.jpg`), type: 'jpeg', quality: 86 });
    seed += 13;
  }
  await b.close();
})();
