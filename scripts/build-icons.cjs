// Iconos de la app a partir de la brújula de la bienvenida (src/app/bienvenida.tsx):
// icon.png (iOS), las tres capas del icono adaptable de Android, splash y favicon.
//
// Necesita Playwright con Chromium: node scripts/build-icons.cjs
const { chromium } = require('playwright');
const path = require('path');

const NAVY = '#1D2B4F';
const SUN = '#FFC53D';
const CORAL = '#F25C3B';

/** La brújula, igual que el emblema de la bienvenida (viewBox 0 0 100 100) */
const compass = (mono = false) => `
  <circle cx="50" cy="50" r="46" fill="none" stroke="${mono ? '#fff' : SUN}" stroke-width="3"/>
  <circle cx="50" cy="50" r="39" fill="none" stroke="${mono ? '#fff' : SUN}" stroke-width="1.2" stroke-dasharray="2 4"/>
  <path d="M50 16 L57 50 L50 84 L43 50 Z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M50 16 L57 50 L43 50 Z" fill="${mono ? '#fff' : CORAL}"/>
  <path d="M16 50 L50 44 L84 50 L50 56 Z" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`;

/** size: lado del PNG; scale: diámetro de la brújula respecto al lado; bg: fondo (null = transparente) */
const svg = ({ size, scale, bg = null, mono = false, radius = 0 }) => {
  const d = 100 / (scale || 1);
  const o = (d - 100) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-o} ${-o} ${d} ${d}">
    ${bg ? `<rect x="${-o}" y="${-o}" width="${d}" height="${d}" rx="${radius * d}" fill="${bg}"/>` : ''}
    ${scale ? compass(mono) : ''}
  </svg>`;
};

const ICONS = {
  // iOS recorta las esquinas por su cuenta: fondo a sangre
  'icon.png': svg({ size: 1024, scale: 0.62, bg: NAVY }),
  // Android adaptable: la brújula dentro de la zona segura (66 de 108 dp)
  'android-icon-foreground.png': svg({ size: 512, scale: 0.56 }),
  'android-icon-background.png': svg({ size: 512, scale: 0, bg: NAVY }),
  'android-icon-monochrome.png': svg({ size: 432, scale: 0.56, mono: true }),
  // Splash sobre fondo navy (app.json): solo la brújula
  'splash-icon.png': svg({ size: 1024, scale: 1 }),
  'favicon.png': svg({ size: 48, scale: 0.7, bg: NAVY, radius: 0.22 }),
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, markup] of Object.entries(ICONS)) {
    const size = Number(markup.match(/width="(\d+)"/)[1]);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.locator('svg').screenshot({ path: path.join(__dirname, '..', 'assets', file), omitBackground: true });
    console.log('assets/' + file);
  }
  await browser.close();
})();
