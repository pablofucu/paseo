// Hornea la portada de cada tour (assets/banners/<tour>.jpg) con la textura
// de tinta de las postales. Cada tour tiene su ilustración propia
// (design/banners/<tour>.svg, la dibuja scripts/draw-banner-<tour>.mjs con las
// piezas de scripts/banner-kit.mjs): una escena con algunos de sus sitios en
// la que manda el color de acento del tour, con colores de apoyo.
// En «Elegir ciudad» va la ilustración de la ciudad (assets/banners/ciudad-<ciudad>.jpg).
//
// Necesita Playwright con Chromium: node scripts/render-banners.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const BANNERS = ['sevilla-centro', 'sevilla-arenal', 'tomares-4-paradas', 'triana', 'murillo', 'austrias', 'letras', 'retiro-prado'];
// Portadas de ciudad para «Elegir ciudad»: el mismo dibujo a todo color, sin teñir
const CITIES = { sevilla: 'design/banners/sevilla.svg' };
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

module.exports = { INK };
if (require.main === module) (async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  fs.mkdirSync(path.join(root, 'assets/banners'), { recursive: true });
  let seed = 23;
  const jobs = [
    ...BANNERS.map(id => ({ file: `design/banners/${id}.svg`, out: `${id}.jpg` })),
    ...Object.entries(CITIES).map(([id, file]) => ({ file, out: `ciudad-${id}.jpg` })),
  ];
  for (const { file, out } of jobs) {
    const art = fs.readFileSync(path.join(root, file), 'utf8');
    const [, w, h] = art.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
    const inner = art.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const under = inner.replace(/id="([^"]+)"/g, 'id="u-$1"').replace(/url\(#([^)]+)\)/g, 'url(#u-$1)');
    const ink = INK.replace('SEED11', seed + 11).replace('SEED5', seed + 5).replace('SEED', seed);
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${ink}</defs><g><rect width="${w}" height="${h}" fill="#f5eedb"/><g opacity="0.75">${under}</g><g filter="url(#tinta)">${inner}</g></g></svg></body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(root, 'assets/banners', out), type: 'jpeg', quality: 86 });
    seed += 13;
  }
  await b.close();
})();
