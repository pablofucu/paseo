// Dibuja la ilustración de la postal de la ruta «Tomares en 4 paradas»
// (design/postcards/tomares-4-paradas.svg, 832 × 444): una calle encalada del
// Aljarafe con la espadaña de la ermita, macetas, banderines y una luz cálida.
// Es una escena, no las cuatro paradas en fila. El olivo queda al fondo, de
// secundario, porque el sello de la ruta (draw-route-stamps.mjs) es la rama de
// olivo. scripts/render-postcards.cjs le pone la textura de imprenta y la
// guarda en assets/postcards/tomares.jpg.
//
//   node scripts/draw-postcard-tomares.mjs
import { writeFileSync } from 'node:fs';

const f = n => +n.toFixed(1);
const C = {
  sky1: '#8fbadd', sky2: '#c9dbe4', sky3: '#f4e2bd', sun: '#fbeab8', cloud: '#e6eef0',
  dark: '#4a3a32', brick: '#b45a3e', terra: '#b8724f', tile: '#c2663f', tile2: '#a9532f', almagra: '#b23a2e', ochre: '#d4a548', albero: '#e3b85a', orange: '#e0892e',
  blue: '#3f63a0', cream: '#efe6d2', white: '#f7f3e8', shade: '#e4dccb', shade2: '#d8cdb8', stone: '#d6c096', trunk: '#7a5f45',
  green: '#3f7d3a', green2: '#5a9a48', olive: '#6f8a58', olive2: '#8aa070', shutter: '#2f6a3a', pink: '#d9577a', red: '#c8402f', bell: '#c98a14', hill: '#c9b98a', hill2: '#a9b27c',
};
const R = (x, y, w, h, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;
const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const S = (d, stroke, w, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
const Ci = (x, y, r, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"/>`;
const arch = (x, y, w, h, fill) => P(`M${f(x)},${f(y)} V${f(y - h + w / 2)} A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(x + w)},${f(y - h + w / 2)} V${f(y)} Z`, fill);
const cloud = (x, y, s) => P(`M${x},${y} h${90 * s} a${14 * s},${14 * s} 0 0 0 -${22 * s},-${14 * s} a${18 * s},${18 * s} 0 0 0 -${34 * s},-${4 * s} a${14 * s},${14 * s} 0 0 0 -${34 * s},${18 * s} Z`, C.cloud);
/** Maceta de barro con geranios */
const pot = (x, y, w = 18, bloom = C.red) => {
  let s = P(`M${f(x)},${f(y - w * 0.7)} h${f(w)} l-${f(w * 0.12)},${f(w * 0.7)} h-${f(w * 0.76)} Z`, C.terra) + R(x - 1.5, y - w * 0.78, w + 3, w * 0.14, C.brick);
  s += Ci(x + w * 0.2, y - w * 1.0, w * 0.34, C.green2) + Ci(x + w * 0.62, y - w * 1.05, w * 0.38, C.green) + Ci(x + w * 0.84, y - w * 0.92, w * 0.28, C.green2);
  for (const [dx, dy] of [[0.2, 1.2], [0.5, 1.4], [0.74, 1.22], [0.9, 1.05]]) s += Ci(x + w * dx, y - w * dy, w * 0.14, bloom);
  return s;
};
/** Ventana con reja de forja y postigos */
const window_ = (x, y, w, h, shutters = true) => {
  let s = R(x - 3, y - 3, w + 6, h + 6, C.white) + R(x, y, w, h, C.dark);
  if (shutters) s += R(x - 9, y - 1, 9, h + 2, C.shutter) + R(x + w, y - 1, 9, h + 2, C.shutter);
  for (let b = x + 4; b < x + w - 1; b += 6) s += R(b, y, 1.6, h, '#8a7a6a');
  s += R(x - 3, y + h + 1, w + 6, 4, C.stone);
  return s;
};

let s = R(0, 0, 832, 444, C.sky3) + R(0, 0, 832, 60, C.sky1) + R(0, 60, 832, 50, '#a9c9e0') + R(0, 110, 832, 45, C.sky2) + R(0, 155, 832, 40, '#e3e6d6');
s += Ci(560, 180, 56, '#f7ecc8') + Ci(560, 180, 36, C.sun);
s += cloud(120, 90, 0.9) + cloud(640, 60, 0.8) + cloud(470, 120, 0.5) + cloud(30, 160, 0.6);
for (const [x, y] of [[420, 70], [442, 58], [464, 74]]) s += S(`M${x},${y} q6,-6 12,0 q6,-6 12,0`, C.dark, 1.5);

/* Al fondo, al final de la calle: el cerro del Aljarafe con olivar y casas blancas */
{
  s += P('M300,260 Q360,190 440,214 Q520,232 560,250 V300 H300 Z', C.hill);
  s += P('M300,276 Q380,230 470,246 Q540,256 580,270 V310 H300 Z', C.hill2);
  // hileras de olivos pequeños
  for (let i = 0; i < 12; i++) {
    const x = 330 + i * 21, y = 262 + (i % 3) * 7 - Math.sin(i / 2) * 6;
    s += Ci(x, y, 6.5, i % 2 ? C.olive : C.olive2) + R(x - 0.8, y + 4, 1.6, 5, C.trunk);
  }
  // casitas lejanas
  for (const [x, y, w, h] of [[400, 284, 26, 22], [432, 290, 22, 18], [366, 292, 20, 16]]) s += R(x, y, w, h, C.white) + P(`M${x - 2},${y} l${w / 2 + 2},-8 l${w / 2 + 2},8 Z`, C.tile);
}

s += R(300, 306, 170, 44, '#ecd9a4') + P('M300,350 H470 L410,308 H360 Z', '#f1dd9e');
for (const x of [330, 446]) s += R(x, 300, 14, 6, C.white);

/* Edificio de la izquierda: ermita encalada con espadaña */
{
  const x1 = 300;
  s += R(0, 100, x1, 250, C.white);
  s += R(x1 - 26, 100, 26, 250, C.shade);
  // cornisa de teja a la derecha
  s += P('M0,100 H224 L214,88 H0 Z', C.tile) + R(0, 100, 224, 4, C.tile2);
  s += P('M224,104 H300 V92 L230,92 Z', C.tile) + R(224, 104, 76, 4, C.tile2);
  s += '<g transform="translate(0,24)">';
  // espadaña: muro que sube con dos huecos de campana y remate escalonado
  s += R(70, 38, 150, 66, C.white) + R(70, 38, 6, 66, C.shade) + P('M70,38 q4,-10 10,-4 l0,6 Z', C.white);
  s += P('M70,38 L82,26 H92 L110,12 H180 L198,26 H208 L220,38 Z', C.white);
  s += P('M110,12 H180 L170,2 H120 Z', C.white);
  s += arch(100, 102, 34, 52, C.dark) + arch(156, 102, 34, 52, C.dark);
  s += S('M117,60 L117,80', C.bell, 2) + P('M108,100 q9,-26 18,0 Z', C.bell) + P('M164,100 q9,-26 18,0 Z', C.bell);
  s += Ci(117, 102, 3, C.dark) + Ci(173, 102, 3, C.dark);
  // adornos del remate: bolas y cruz
  for (const x of [84, 206]) s += Ci(x, 22, 4, C.stone) + R(x - 1.5, 24, 3, 6, C.stone);
  s += R(144, -18, 3, 20, C.dark) + R(137, -12, 17, 3, C.dark);
  s += '</g>';
  // marco de almagra en el hueco de la puerta y zócalo
  s += R(0, 306, x1, 44, C.almagra) + R(0, 302, x1, 4, C.brick);
  s += arch(112, 306, 62, 96, C.almagra) + arch(120, 306, 46, 84, '#3d5d8a') + arch(124, 306, 38, 74, '#33507a');
  s += R(142, 232, 2, 74, '#27405f') + Ci(134, 276, 2.5, C.ochre) + Ci(152, 276, 2.5, C.ochre);
  // ventanas con macetas
  s += window_(30, 180, 26, 40, false) + window_(222, 180, 26, 40, false);
  for (const x of [26, 218]) s += R(x, 224, 38, 4, C.dark) + pot(x + 2, 224, 16, C.pink) + pot(x + 20, 224, 16, C.red);
  // maceteros colgados en la pared: una hilera azul
  s += S('M10,150 H98', '#7a6a58', 1.4) + S('M200,150 H290', '#7a6a58', 1.4);
  for (const x of [14, 40, 66]) s += R(x, 142, 14, 12, C.blue) + Ci(x + 7, 140, 8, C.green2) + Ci(x + 4, 138, 3, C.pink) + Ci(x + 11, 137, 3, C.red);
  for (const x of [206, 232, 258]) s += R(x, 142, 14, 12, C.blue) + Ci(x + 7, 140, 8, C.green2) + Ci(x + 4, 138, 3, C.red) + Ci(x + 11, 137, 3, C.pink);
  // farol de forja
  s += R(284, 118, 3, 38, C.dark) + R(272, 118, 14, 3, C.dark) + P('M270,126 h10 l-2,12 h-6 Z', '#f6d9a0');
}

/* Edificio de la derecha: casa de dos plantas con balcón, a la sombra */
{
  const x0 = 470;
  // olivo tras el muro, secundario: se pinta antes que la casa y el muro
  s += S('M792,270 Q784,238 794,214', C.trunk, 9) + S('M794,222 Q808,206 820,192', C.trunk, 5) + S('M790,238 Q772,222 764,210', C.trunk, 5);
  for (const [x, y, r] of [[794, 200, 26], [766, 208, 20], [822, 188, 20], [780, 176, 16], [810, 214, 17]]) s += Ci(x, y, r, C.olive) + Ci(x + 5, y - 4, r * 0.55, C.olive2);
  s += R(x0, 120, 270, 230, C.white) + R(x0, 120, 14, 230, C.shade2);
  s += R(x0 - 8, 112, 278, 16, C.tile) + R(x0 - 8, 126, 278, 4, C.tile2);
  s += R(x0, 302, 270, 48, C.ochre) + R(x0, 298, 270, 4, C.albero);
  // balcón corrido con barandilla de hierro y geranios
  s += R(x0 + 36, 196, 210, 6, C.stone) + R(x0 + 36, 148, 210, 3, C.dark);
  for (let x = x0 + 40; x < x0 + 246; x += 8) s += R(x, 150, 1.8, 46, C.dark);
  s += window_(x0 + 70, 154, 30, 38, true) + window_(x0 + 170, 154, 30, 38, true);
  // el balcón tapa la parte baja del hueco
  s += R(x0 + 36, 188, 210, 8, C.stone);
  for (let x = x0 + 46; x < x0 + 240; x += 40) s += pot(x, 188, 16, x % 80 < 40 ? C.red : C.pink);
  // planta baja: puerta de madera con arco y dos ventanas enrejadas
  s += arch(x0 + 114, 302, 44, 80, C.shutter) + arch(x0 + 120, 302, 32, 68, '#26503a') + R(x0 + 135, 246, 2, 56, '#1c3d2b') + Ci(x0 + 128, 280, 2.2, C.ochre);
  s += window_(x0 + 26, 232, 30, 46, false) + window_(x0 + 206, 232, 30, 46, false);
  s += R(x0 + 20, 280, 42, 4, C.dark) + R(x0 + 200, 280, 42, 4, C.dark);
  s += pot(x0 + 24, 284, 15, C.pink) + pot(x0 + 42, 284, 15, C.red) + pot(x0 + 204, 284, 15, C.red) + pot(x0 + 222, 284, 15, C.pink);
  // muro bajo de la derecha, con el olivo asomando por detrás
  s += R(x0 + 270, 262, 832 - x0 - 270, 88, C.white) + R(x0 + 266, 256, 832 - x0 - 266, 8, C.stone) + R(x0 + 270, 262, 8, 88, C.shade2);
  s += R(x0 + 270, 306, 832 - x0 - 270, 44, C.ochre) + R(x0 + 270, 302, 832 - x0 - 270, 4, C.albero);
}

/* Banderines de fiesta cruzando la calle */
{
  const ax = 288, ay = 146, bx = 484, by = 134;
  const pt = t => [ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(Math.PI * t) * 26];
  let d = `M${ax},${ay}`;
  for (let t = 0.05; t <= 1.001; t += 0.05) { const [x, y] = pt(t); d += ` L${f(x)},${f(y)}`; }
  s += S(d, C.dark, 1.2);
  const cols = [C.red, C.albero, C.blue, C.white, C.pink, C.green2];
  for (let i = 0; i < 12; i++) {
    const [x, y] = pt((i + 0.6) / 12.4);
    s += P(`M${f(x - 6)},${f(y)} h12 l-6,16 Z`, cols[i % cols.length]);
  }
}

/* Calle de albero con adoquines y la sombra de las casas */
{
  s += R(0, 350, 832, 94, C.albero);
  s += P('M0,350 H832 V370 H0 Z', '#d9ac52');
  s += P('M0,350 H300 L330 444 H0 Z', '#d2a54e'); // sombra de la ermita
  s += P('M470,350 H832 V444 H500 Z', '#d9ac52');
  // franja de rodadura
  s += P('M300,350 H470 L560 444 H250 Z', '#ecc66e');
  for (let y = 360, r = 0; y < 444; y += 14 + r * 2, r++) {
    for (let x = (r % 2) * 14; x < 832; x += 28) s += R(x, y, 10 + r, 2, 'rgba(120,80,30,0.25)');
  }
  // bordillo encalado en la base de la ermita
  s += R(0, 346, 300, 6, C.shade);
}
/* Primer término: macetas en la fachada, un gato y un banco */
{
  for (const [x, c] of [[10, C.red], [44, C.pink], [78, C.red], [250, C.pink], [276, C.red]]) s += pot(x, 366, 22, c);
  s += R(190, 358, 56, 8, C.shade2) + R(194, 366, 6, 12, C.dark) + R(236, 366, 6, 12, C.dark);
  // gato sentado sobre el adoquín
  s += P('M392,420 q-14,-2 -12,-22 q2,-14 14,-14 q14,0 14,14 q2,20 -10,22 Z', '#6a5a4a') + Ci(394, 380, 9, '#6a5a4a');
  s += P('M386,374 l-2,-9 l7,4 Z', '#6a5a4a') + P('M402,374 l2,-9 l-7,4 Z', '#6a5a4a');
  s += Ci(391, 380, 1.4, C.albero) + Ci(398, 380, 1.4, C.albero) + S('M406,420 q22,2 24,-14', '#6a5a4a', 4);
  // sombra de la farola de la derecha y el pretil
  s += R(0, 430, 832, 14, '#d9ac52');
}

writeFileSync(new URL('../design/postcards/tomares-4-paradas.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 832 444" width="832" height="444">\n<defs><clipPath id="clipTom"><rect x="0" y="0" width="832" height="444"/></clipPath></defs>\n<g id="tomares-art" clip-path="url(#clipTom)">\n${s}\n</g>\n</svg>\n`);
console.log('design/postcards/tomares-4-paradas.svg');
