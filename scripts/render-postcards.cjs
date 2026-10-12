// Pasa la ilustración de cada postal (design/postcards/<tour>.svg, 832 × 444)
// a assets/postcards/*.jpg con la textura de tinta de imprenta de la guía
// (feTurbulence + feDisplacementMap, que react-native-svg no tiene en nativo).
// El marco, los textos y el matasellos los pinta la app encima.
//
// También hornea el sello de correos de cada ruta (design/route-stamps/<tour>.svg,
// 164 × 200) en assets/route-stamps/<tour>.png con la misma tinta. El borde
// dentado lo pone la app.
//
// Necesita Playwright con Chromium: node scripts/render-postcards.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = { 'tomares-4-paradas': 'tomares', 'sevilla-centro': 'sevilla', 'sevilla-arenal': 'sevilla-arenal' };
const FILTER = `<filter id="tinta" x="-3%" y="-3%" width="106%" height="106%">
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="SEED" result="n1"/>
<feColorMatrix in="n1" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -5 0 0 0 3.75" result="moteado"/>
<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="SEED11" result="n2"/>
<feColorMatrix in="n2" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.6 0 0 0 0.05" result="carga"/>
<feComposite in="moteado" in2="carga" operator="arithmetic" k2="1" k3="0.55" k4="-0.45" result="mascara"/>
<feComposite in="SourceGraphic" in2="mascara" operator="in" result="entintado"/>
<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="SEED5" result="warp"/>
<feDisplacementMap in="entintado" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 832, height: 444 }, deviceScaleFactor: 2 });
  let seed = 7;
  for (const [id, name] of Object.entries(OUT)) {
    const art = fs.readFileSync(path.join(__dirname, '../design/postcards', `${id}.svg`), 'utf8');
    const inner = art.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const f = FILTER.replace('SEED11', seed + 11).replace('SEED5', seed + 5).replace('SEED', seed);
    await p.setContent(`<html><body style="margin:0;background:#f5eedb"><svg xmlns="http://www.w3.org/2000/svg" width="832" height="444" viewBox="0 0 832 444"><defs>${f}</defs><g filter="url(#tinta)">${inner}</g></svg></body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, '../assets/postcards', `${name}.jpg`), type: 'jpeg', quality: 86 });
    seed += 13;
  }

  // Sellos de ruta: llevan texto, así que se incrustan las fuentes de la app
  const face = (name, file) => `@font-face{font-family:${name};src:url(data:font/ttf;base64,${fs.readFileSync(path.join(__dirname, '../node_modules/@expo-google-fonts', file)).toString('base64')})}`;
  const css = face('Nunito_900Black', 'nunito/900Black/Nunito_900Black.ttf');
  const SW = 164, SH = 200;
  await p.setViewportSize({ width: SW, height: SH });
  fs.mkdirSync(path.join(__dirname, '../assets/route-stamps'), { recursive: true });
  for (const file of fs.readdirSync(path.join(__dirname, '../design/route-stamps')).filter(f => f.endsWith('.svg')).sort()) {
    const art = fs.readFileSync(path.join(__dirname, '../design/route-stamps', file), 'utf8');
    const inner = art.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const f = FILTER.replace('SEED11', seed + 11).replace('SEED5', seed + 5).replace('SEED', seed);
    await p.setContent(`<html><head><style>${css}</style></head><body style="margin:0;background:#fbf7ec"><svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"><defs>${f}</defs><g filter="url(#tinta)">${inner}</g></svg></body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(__dirname, '../assets/route-stamps', file.replace('.svg', '.png')) });
    seed += 13;
  }
  await b.close();
})();
