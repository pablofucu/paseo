// Dibuja la ilustración de la postal de la ruta «Del río a la judería»
// (design/postcards/sevilla-centro.svg, 832 × 444): Sevilla al atardecer vista
// desde la orilla de Triana, con el río, el puente de Isabel II, una barca y
// palmeras. Es una escena, no una fila de paradas; la Giralda es solo una
// silueta lejana porque el protagonista del sello de la ruta es el Giraldillo.
// scripts/render-postcards.cjs le pone la textura de imprenta y la guarda en
// assets/postcards/sevilla.jpg.
//
//   node scripts/draw-postcard-sevilla-centro.mjs
import { writeFileSync } from 'node:fs';

const f = n => +n.toFixed(1);
const C = {
  sky1: '#9db4d8', sky2: '#d9b9c4', sky3: '#f0c79a', sky4: '#f4d9a0', sun: '#fbe7a8', cloud: '#e9b9a4', cloud2: '#f3cfae',
  dark: '#4a3a32', far: '#c79a86', far2: '#b98777', farTower: '#c98f78', brick: '#b45a3e', terra: '#b8724f', ochre: '#d4a548', albero: '#e3b85a',
  orange: '#e0892e', blue: '#3f63a0', cream: '#efe6d2', white: '#f5f1e6', stone: '#d6c096', trunk: '#7a5f45', frond: '#3f8a3a', green: '#3f7d3a', green2: '#5a9a48',
  water: '#8fa5cc', water2: '#b79bb4', waterWarm: '#f0b37c', waterLt: '#f6d29a', iron: '#6d5058', yellow: '#e8c26a', pink: '#e0a590',
};
const R = (x, y, w, h, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;
const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const S = (d, stroke, w, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
const Ci = (x, y, r, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"/>`;
const arch = (x, y, w, h, fill) => P(`M${f(x)},${f(y)} V${f(y - h + w / 2)} A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(x + w)},${f(y - h + w / 2)} V${f(y)} Z`, fill);
const cloud = (x, y, s, fill) => P(`M${x},${y} h${90 * s} a${14 * s},${14 * s} 0 0 0 -${22 * s},-${14 * s} a${18 * s},${18 * s} 0 0 0 -${34 * s},-${4 * s} a${14 * s},${14 * s} 0 0 0 -${34 * s},${18 * s} Z`, fill);
function palm(x, ground, h, lean = 6, col = C.frond) {
  const tx = x + lean, ty = ground - h;
  let s = S(`M${x},${ground} Q${f(x - lean * 0.4)},${f(ground - h / 2)} ${tx},${ty}`, C.trunk, 7);
  for (let y = ground - 8; y > ty + 6; y -= 8) s += S(`M${f(x + lean * ((ground - y) / h) - 3.5)},${y} h7`, '#5a4532', 1);
  const fr = [[-44, 18], [-38, -6], [-20, -26], [4, -32], [26, -22], [42, -2], [46, 20], [-24, 28], [24, 30]];
  for (const [dx, dy] of fr) s += S(`M${tx},${ty} Q${f(tx + dx * 0.5)},${f(ty + dy * 0.5 - 10)} ${tx + dx},${ty + dy}`, col, 6.5);
  return s;
}
const win = (x, y, w, h, frame = C.white) => R(x - 2, y - 2, w + 4, h + 4, frame) + R(x, y, w, h, C.dark);

let s = '';
/* Cielo de atardecer en bandas y el sol bajo, detrás del puente */
const stops = [[0, C.sky1], [90, '#c3b4cf'], [150, C.sky2], [200, C.sky3], [240, C.sky4]];
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
for (let y = 0; y < 262; y += 12) {
  const j = stops.findIndex((q, i) => y >= q[0] && (!stops[i + 1] || y < stops[i + 1][0]));
  const [y0, c0] = stops[j], [y1, c1] = stops[j + 1] ?? [262, C.sky4];
  s += R(0, y, 832, 13, mix(c0, c1, (y - y0) / (y1 - y0)));
}
s += Ci(590, 236, 78, '#f6d9a8') + Ci(590, 236, 52, C.sun);
s += cloud(90, 112, 1.1, C.cloud) + cloud(330, 80, 0.8, C.cloud2) + cloud(640, 130, 0.9, C.cloud) + cloud(450, 170, 0.6, C.cloud2) + cloud(20, 188, 0.7, C.cloud2);
// Vencejos
for (const [x, y] of [[300, 120], [322, 108], [346, 124], [700, 70], [722, 82]]) s += S(`M${x},${y} q6,-6 12,0 q6,-6 12,0`, C.dark, 1.5);

/* Orilla de enfrente, lejana y en neblina: azoteas, cúpulas y la Giralda pequeña */
{
  const y0 = 262;
  s += R(0, 236, 832, 28, C.far2);
  let x = 0, k = 0;
  while (x < 832) {
    const w = 34 + (k * 17) % 30, h = 22 + (k * 11) % 26;
    s += R(x, y0 - h, w, h + 4, k % 2 ? C.far : C.far2);
    if (k % 3 === 0) s += R(x + 6, y0 - h + 6, 5, 7, '#9a6c66');
    x += w; k++;
  }
  // Catedral y Giralda, diminutas
  s += R(320, 214, 96, 50, C.far) + P('M320,214 L336,204 L354,214 Z', C.far2) + P('M368,214 L386,202 L406,214 Z', C.far2);
  s += R(422, 178, 18, 86, C.farTower) + R(420, 176, 22, 5, '#d9a994') + R(424, 162, 14, 16, C.farTower) + P('M425,162 Q431,148 437,162 Z', '#d9a994') + S('M431,148 V140', C.dark, 1.5);
  for (const y of [190, 206, 222]) s += R(428, y, 5, 8, '#8f6460');
  // Torre del Oro, pequeña junto al agua
  s += R(268, 232, 22, 32, '#d6b78a') + R(271, 224, 16, 10, '#d6b78a') + P('M272,224 Q279,214 286,224 Z', C.ochre);
  s += R(0, 258, 832, 6, '#a47a72');
}

/* Puente de hierro de tres arcos (Isabel II), a contraluz */
{
  const y = 266;
  s += R(486, y - 8, 346, 6, C.iron) + R(486, y - 2, 346, 8, '#7a5c62');
  for (let i = 0; i < 3; i++) {
    const x0 = 508 + i * 118, x1 = x0 + 112;
    s += S(`M${x0},${y + 6} Q${(x0 + x1) / 2},${y - 46} ${x1},${y + 6}`, C.iron, 5);
    s += S(`M${x0},${y + 6} Q${(x0 + x1) / 2},${y - 28} ${x1},${y + 6}`, C.iron, 2);
    for (let t = 0.15; t < 0.9; t += 0.14) {
      const bx = x0 + (x1 - x0) * t, by = y + 6 - 4 * t * (1 - t) * 26 * 1.0;
      s += S(`M${f(bx)},${f(by)} V${y - 2}`, C.iron, 1.6);
    }
    s += R(x1 - 6, y - 6, 12, 40, '#8a6a68');
  }
  s += R(502, y - 6, 12, 40, '#8a6a68');
  for (let x = 492; x < 832; x += 12) s += R(x, y - 18, 2, 10, C.iron);
  s += R(486, y - 18, 346, 2, C.iron);
}

/* Río: bandas del cielo reflejado y el rastro del sol */
s += R(0, 262, 832, 120, C.water);
s += R(0, 262, 832, 38, C.water2) + R(0, 300, 832, 20, '#cfa7a8');
for (let i = 0; i < 9; i++) {
  const w = 120 - i * 9, y = 280 + i * 10;
  s += R(590 - w / 2, y, w, 4, i % 2 ? C.waterWarm : C.waterLt);
}
for (let x = 20, k = 0; x < 832; x += 46, k++) s += S(`M${x + (k % 2) * 16},${326 + (k % 4) * 11} q7,-4 14,0 t14,0`, '#d8bcc6', 2);
// Reflejo de la silueta lejana
s += R(270, 272, 170, 10, '#a98ba6') + R(420, 272, 22, 22, '#a58ca8');
/* Barca de remos con dos remeros y la vela de un velero lejano */
s += P('M410,330 h96 l-14,18 h-68 Z', C.orange) + R(417, 328, 86, 4, C.terra);
s += Ci(440, 306, 7, C.dark) + R(433, 313, 14, 18, C.blue) + Ci(474, 308, 6.5, C.dark) + R(467, 314, 13, 17, C.white);
s += S('M446,322 L404,346 M468,322 L514,346', C.trunk, 3);
s += P('M610,310 L638,310 L626,280 Z', C.white) + P('M622,312 L624,280 L604,310 Z', C.cream) + P('M596,312 h50 l-8,9 h-34 Z', C.brick);

/* Orilla de Triana en primer término: casas de colores, palmeras y la barandilla */
{
  // casas a la izquierda, sobre el muro
  s += R(0, 282, 190, 70, C.white) + R(0, 274, 190, 9, C.terra);
  s += R(0, 282, 70, 70, C.pink) + R(0, 274, 70, 9, '#a85a40') + R(0, 336, 190, 16, C.yellow);
  for (const [x, y] of [[14, 294], [42, 294], [96, 296], [146, 296]]) s += win(x, y, 16, 24);
  for (const x of [96, 146]) s += R(x - 4, 320, 24, 3, C.dark) + R(x - 4, 320, 24, 2, '#2f6a3a');
  for (const x of [14, 42]) s += R(x - 3, 318, 22, 3, C.dark);
  s += arch(110, 352, 26, 40, '#2f6a3a') + arch(114, 352, 18, 34, C.dark);
  // naranjo junto a las casas
  s += R(214, 336, 6, 30, C.trunk) + Ci(217, 322, 26, C.green) + Ci(200, 334, 17, C.green) + Ci(234, 336, 17, C.green2);
  for (const [x, y] of [[210, 316], [230, 326], [196, 338], [240, 342], [220, 306]]) s += Ci(x, y, 3.2, C.orange);
  // palmeras contra el cielo
  s += palm(262, 372, 150, -8) + palm(800, 380, 170, -10);
  // murete del paseo, con azulejo y balaustrada
  s += R(0, 0, 0, 0, C.stone) + R(0, 352, 190, 30, C.stone);
  s += R(0, 388, 832, 56, C.stone) + R(0, 382, 832, 8, C.cream) + R(0, 390, 832, 3, C.terra);
  for (let x = 0; x < 832; x += 9) s += R(x, 394, 6, 6, (x / 9) % 2 ? C.blue : C.albero);
  for (let x = 8; x < 832; x += 22) s += R(x, 362, 8, 20, C.cream) + R(x - 1, 360, 10, 3, C.stone);
  s += R(0, 358, 832, 4, C.cream) + R(0, 362, 832, 2, C.stone);
  // adoquinado del paseo en primer término
  s += R(0, 408, 832, 36, '#e2cfa6');
  for (let y = 414, r = 0; y < 444; y += 14, r++) {
    s += R(0, y, 832, 1.6, '#c9b184');
    for (let x = (r % 2) * 18; x < 832; x += 36) s += R(x, y, 1.6, 14, '#c9b184');
  }
}
/* Farola de fundición, a la derecha, y dos personas paseando */
{
  s += R(694, 262, 5, 150, C.dark) + R(688, 398, 17, 14, C.dark) + R(690, 262, 13, 6, C.dark);
  s += P('M684,252 h25 l-4,-14 h-17 Z', '#f6d9a0') + R(682, 250, 29, 4, C.dark) + P('M690,238 L696,228 L702,238 Z', C.dark);
  const walker = (x, y, shirt, hair) => Ci(x, y, 6, hair) + R(x - 7, y + 6, 14, 26, shirt) + R(x - 6, y + 32, 5, 14, C.dark) + R(x + 1, y + 32, 5, 14, C.dark);
  s += walker(120, 396, C.blue, C.dark) + walker(142, 400, '#c8553d', '#6a4a30');
}

writeFileSync(new URL('../design/postcards/sevilla-centro.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 832 444" width="832" height="444">\n<defs><clipPath id="clipSev"><rect x="0" y="0" width="832" height="444"/></clipPath></defs>\n<g id="sevilla-art" clip-path="url(#clipSev)">\n${s}\n</g>\n</svg>\n`);
console.log('design/postcards/sevilla-centro.svg');
