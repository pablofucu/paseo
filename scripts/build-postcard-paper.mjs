// Hornea el papel de las postales (perforado, grano y sombra suave) en
// assets/postcards/paper.png. En el móvil se pintaba con máscaras SVG y
// cientos de círculos por postal, y en Android cerraba la app. Ahora la app
// pone esta imagen debajo de la ilustración y encima solo el marco y los textos.
//
//   NODE_PATH=$(npm root -g) node scripts/build-postcard-paper.mjs
import { createRequire, register } from 'node:module';

register('./ts-alias.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { postcardPaperXml } = await import('../src/lib/postcard.ts');

const SCALE = 1.5;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 928, height: 628 }, deviceScaleFactor: SCALE });
await page.setContent(`<html><body style="margin:0;background:transparent">${postcardPaperXml('p').replace('<svg ', '<svg width="928" height="628" ')}</body></html>`);
await page.screenshot({ path: new URL('../assets/postcards/paper.png', import.meta.url).pathname, omitBackground: true });
await browser.close();
console.log('assets/postcards/paper.png');
