// Vista previa de una portada de tour mientras se dibuja: la pinta con la
// tinta de imprenta y la enseña entera, recortada como en la tarjeta de
// «Elige tu ruta» (370 × 112) y como en la cabecera del tour (400 × 290).
//
//   node scripts/preview-banner.cjs <tour> [salida.png]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const id = process.argv[2];
const out = path.resolve(process.argv[3] ?? `/tmp/banner-${id}.png`);
const { INK } = require('./render-banners.cjs');

(async () => {
  const art = fs.readFileSync(path.join(root, 'design/banners', `${id}.svg`), 'utf8');
  const inner = art.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const under = inner.replace(/id="([^"]+)"/g, 'id="u-$1"').replace(/url\(#([^)]+)\)/g, 'url(#u-$1)');
  const ink = INK.replace('SEED11', 34).replace('SEED5', 28).replace('SEED', 23);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><defs>${ink}</defs><rect width="960" height="600" fill="#f5eedb"/><g opacity="0.75">${under}</g><g filter="url(#tinta)">${inner}</g></svg>`;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 640 } });
  const url = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  const box = (w, h, label) => `<div><div style="width:${w}px;height:${h}px;border-radius:18px;overflow:hidden;background:url(${url}) no-repeat;background-size:cover;background-position:50% 35%"></div><p>${label}</p></div>`;
  await p.setContent(`<body style="margin:0;padding:16px;display:flex;gap:20px;font:14px sans-serif;background:#eee"><div><img src="${url}" width="960" height="600"/><p>${id} · 960 × 600</p></div><div>${box(370, 112, 'Tarjeta de «Elige tu ruta»')}${box(400, 290, 'Cabecera del tour')}</div></body>`);
  await p.waitForTimeout(400);
  await p.screenshot({ path: out });
  await b.close();
  console.log(out);
})();
