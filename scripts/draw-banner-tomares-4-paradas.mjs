// Portada de «Tomares en 4 paradas» (design/banners/tomares-4-paradas.svg, 960 × 600):
// el pueblo blanco en la ladera del Aljarafe. Detrás, colinas verdes con olivares;
// en la ladera, la Parroquia de Nuestra Señora de Belén (espadaña con campanas) y
// el Ayuntamiento (casa señorial encalada con balcones); en primer término la
// rotonda de la Arboleda con las letras blancas TOMARES sobre el césped.
//
//   node scripts/draw-banner-tomares-4-paradas.mjs
import { paletteFor, bandedSky, R, P, S, Ci, arch, mix, cloud, tree, save } from './banner-kit.mjs';

const C = paletteFor('tomares-4-paradas');
const f0 = n => +n.toFixed(1);
let s = bandedSky([[0, C.m6], [150, C.m7], [300, C.m8], [380, C.m8]], 400);
s += cloud(120, 120, 1.1, C.m8) + cloud(700, 90, 1.3, C.m8) + cloud(470, 160, 0.8, mix(C.m8, C.m7, 0.5));
s += Ci(860, 70, 22, C.sun);

/* Colinas lejanas y olivares */
s += P('M0,300 C120,250 260,240 380,285 C520,230 700,230 960,290 V420 H0 Z', C.m5);
s += P('M0,340 C160,290 300,300 440,330 C600,280 800,290 960,330 V430 H0 Z', C.m4);
for (let x = 10; x < 960; x += 34) s += Ci(x, 322 + 12 * Math.sin(x / 70), 9, mix(C.m4, C.m3, 0.5));
// ladera principal donde se asienta el pueblo
s += P('M0,370 C120,350 240,340 360,352 C480,345 640,330 780,336 C860,340 920,350 960,356 V440 H0 Z', C.m3);
s += P('M0,420 C200,392 360,400 480,396 C660,388 820,394 960,410 V470 H0 Z', C.m2);

/* Casas blancas lejanas */
const house = (x, y, w, h, roof = true) => R(x, y, w, h, C.white) + R(x + w * 0.65, y, w * 0.35, h, C.cream) + (roof ? P(`M${x - 3},${y} h${w + 6} l-4,-7 h${-w + 2} Z`, C.alt) : R(x - 2, y - 3, w + 4, 3, C.stone)) + R(x + 5, y + 6, 5, 7, C.m3);
// pueblo escalonado en la ladera: tres terrazas de casitas encaladas con tejas, rejas y macetas
s += P('M0,300 C150,262 330,252 480,282 C640,250 800,258 960,296 V420 H0 Z', C.m4);
const casa = (x, y, w, h, k) => {
  let q = R(x, y, w, h, C.white) + R(x + w * 0.68, y, w * 0.32, h, C.cream);
  q += k % 3 ? P(`M${x - 3},${y} h${w + 6} l-5,-9 h${-w + 4} Z`, C.alt) : R(x - 2, y - 4, w + 4, 4, C.stone);
  q += R(x + 5, y + 7, 6, 9, C.m1) + R(x + 5, y + 7, 6, 2, C.m3);
  if (w > 34) q += R(x + w * 0.45, y + h - 14, 8, 14, C.m2) + R(x + 5, y + 16, 7, 2, C.alt) + Ci(x + 8, y + 15, 2, C.altLt);
  return q;
};
for (const [x0, y0, step, sc] of [[-10, 276, 38, 0.8], [-20, 318, 44, 0.95], [-10, 350, 50, 1.1]]) {
  let k = 0;
  for (let x = x0; x < 980; x += step * (0.9 + (k % 3) * 0.2)) {
    const h = (22 + (k * 7) % 14) * sc, w = (28 + (k * 11) % 16) * sc, y = y0 + 22 * sc - h + Math.sin(x / 90 + y0) * 6;
    if (!(x > 90 && x < 380 && y0 > 300) && !(x > 500 && x < 820 && y0 > 300) || y0 < 300) s += casa(x, y, w, h, k);
    k++;
  }
}
// banderines de feria entre casas
s += S('M372,346 Q440,372 520,340', C.stoneDk, 1.6);
for (let i = 0; i < 9; i++) { const x = 380 + i * 15, y = 350 + 11 * Math.sin((i + 0.5) / 9 * Math.PI); s += P(`M${x},${f0(y)} h9 l-4.5,10 Z`, [C.alt, C.sun, C.white, C.m6, C.altLt][i % 5]); }

/* Parroquia de Nuestra Señora de Belén: nave baja y fachada con espadaña barroca de tres vanos */
{
  const x = 190, y = 400;
  s += `<g transform="translate(${x},${y + 8}) scale(1.4) translate(${-x},${-y})">`;
  s += R(x - 74, y - 70, 74, 70, C.cream) + P(`M${x - 80},${y - 70} h86 l-8,-12 h-70 Z`, C.alt) + R(x - 64, y - 52, 8, 16, C.m1) + R(x - 38, y - 52, 8, 16, C.m1);
  for (const wx of [x - 64, x - 38]) s += R(wx + 3, y - 52, 1.5, 16, C.m3) + R(wx - 2, y - 36, 12, 4, C.alt) + Ci(wx + 2, y - 39, 2, C.altLt) + Ci(wx + 7, y - 39, 2, C.altLt);
  s += R(x, y - 120, 130, 120, C.white) + R(x + 108, y - 120, 22, 120, C.cream);
  s += P(`M${x},${y - 120} h130 l-16,-10 h-98 Z`, C.alt) + R(x + 20, y - 186, 90, 68, C.white) + R(x + 90, y - 186, 20, 68, C.cream);
  s += P(`M${x + 14},${y - 184} h102 l-6,-8 h-90 Z`, C.stone);
  // remate curvo barroco con cruz y bolas
  s += P(`M${x + 20},${y - 188} H${x + 110} C${x + 110},${y - 202} ${x + 92},${y - 198} ${x + 88},${y - 212} C${x + 84},${y - 226} ${x + 74},${y - 224} ${x + 65},${y - 240} C${x + 56},${y - 224} ${x + 46},${y - 226} ${x + 42},${y - 212} C${x + 38},${y - 198} ${x + 20},${y - 202} ${x + 20},${y - 188} Z`, C.white);
  s += R(x + 63.5, y - 262, 3, 24, C.stoneDk) + R(x + 57, y - 255, 16, 3, C.stoneDk) + Ci(x + 20, y - 192, 4, C.stone) + Ci(x + 110, y - 192, 4, C.stone) + Ci(x + 65, y - 214, 5, C.stone);
  for (const ax of [x + 28, x + 57, x + 86]) s += arch(ax, y - 126, 16, 46, C.m1) + Ci(ax + 8, y - 142, 6, C.gold) + P(`M${ax + 3},${y - 142} h10 v8 h-10 Z`, C.sun) + R(ax + 7, y - 156, 2, 6, C.goldDk);
  s += R(x + 22, y - 124, 86, 4, C.stone);
  s += arch(x + 41, y, 48, 70, C.alt) + arch(x + 46, y, 38, 62, C.m2) + R(x + 64, y - 52, 2, 52, C.m1) + Ci(x + 60, y - 28, 1.6, C.gold) + Ci(x + 70, y - 28, 1.6, C.gold);
  for (const wx of [x + 14, x + 98]) { s += R(wx, y - 62, 14, 22, C.m1) + R(wx - 2, y - 40, 18, 4, C.alt); for (let g = 2; g < 14; g += 4) s += R(wx + g, y - 62, 1.2, 22, C.m3); }
  s += R(x - 74, y - 6, 204, 6, C.stone) + '</g>';
}

/* Ayuntamiento: casa señorial de dos plantas, balcones corridos, frontón y torreón del reloj */
{
  const x = 560, y = 400, w = 230;
  s += `<g transform="translate(${x + w / 2 + 20},${y + 8}) scale(1.35) translate(${-x - w / 2},${-y})">`;
  s += R(x, y - 110, w, 110, C.white) + R(x + w - 26, y - 110, 26, 110, C.cream) + R(x - 4, y - 118, w + 8, 10, C.alt) + R(x - 4, y - 122, w + 8, 4, C.altDk);
  s += R(x + 84, y - 150, 62, 40, C.white) + P(`M${x + 78},${y - 150} h74 l-37,-22 Z`, C.alt) + Ci(x + 115, y - 134, 11, C.cream) + Ci(x + 115, y - 134, 8, C.m1) + S(`M${x + 115},${y - 140} v6 h4`, C.win, 1.8);
  s += R(x + 112, y - 190, 6, 18, C.stoneDk) + P(`M${x + 118},${y - 190} h22 v10 h-22 Z`, C.alt);
  for (const dx of [18, 56, 150, 188]) {
    s += arch(x + dx, y - 62, 22, 40, C.m1) + R(x + dx - 2, y - 40, 26, 4, C.alt) + R(x + dx + 5, y - 50, 12, 10, C.altLt);
  }
  s += R(x + 12, y - 66, w - 24, 5, C.stone);
  for (let bx = x + 14; bx < x + w - 14; bx += 7) s += R(bx, y - 78, 2, 12, C.m1);
  s += R(x + 12, y - 80, w - 24, 2.5, C.m1);
  for (const dx of [18, 56, 150, 188]) s += R(x + dx + 2, y - 106, 18, 22, C.m1) + R(x + dx + 2, y - 106, 5, 22, C.m3);
  s += arch(x + 96, y, 38, 66, C.m1) + arch(x + 101, y, 28, 56, C.alt) + R(x + 84, y - 66, 62, 5, C.stone);
  s += R(x - 4, y - 6, w + 8, 6, C.stone);
  // balcón central
  s += R(x + 94, y - 100, 42, 4, C.stone);
  // maceta de geranios
  for (const dx of [20, 150]) s += R(x + dx, y - 36, 20, 8, C.alt) + Ci(x + dx + 6, y - 40, 4, C.altLt) + Ci(x + dx + 14, y - 41, 4, C.altLt);
  s += '</g>';
}

/* Olivos del Aljarafe en la ladera y a los lados */
const olive = (x, y, r) => R(x - 2, y - r * 0.5, 4, r * 0.7, C.m1) + Ci(x, y - r * 0.9, r, C.m5) + Ci(x - r * 0.6, y - r * 0.6, r * 0.7, C.m4) + Ci(x + r * 0.6, y - r * 0.7, r * 0.7, mix(C.m4, C.m6, 0.5));
for (const [x, y, r] of [[500, 382, 13], [530, 380, 11], [800, 372, 14], [850, 378, 13], [900, 376, 16], [940, 372, 12], [120, 388, 14], [60, 394, 12], [352, 386, 12]]) s += olive(x, y, r);
// hileras de olivar en la ladera media
for (let row = 0; row < 3; row++) for (let x = 30 + row * 14; x < 960; x += 46) if (x < 330 || x > 860 || (x > 470 && x < 540)) s += Ci(x, 410 + row * 12, 6 - row, row % 2 ? C.m1 : C.m2);

/* Rotonda de la Arboleda: césped en elipse con bordillo, y las letras TOMARES */
s += R(0, 440, 960, 160, C.m1) + P('M0,440 C240,424 700,424 960,440 V456 C700,440 240,440 0,456 Z', C.m2);
s += P('M0,560 H960 V600 H0 Z', C.m0);
for (let x = 0; x < 960; x += 60) s += R(x + 20, 580, 24, 4, C.m1);
s += `<ellipse cx="480" cy="528" rx="270" ry="52" fill="${C.stone}"/><ellipse cx="480" cy="524" rx="262" ry="47" fill="${C.cream}"/><ellipse cx="480" cy="527" rx="254" ry="43" fill="${C.m3}"/>`;
s += `<ellipse cx="480" cy="531" rx="244" ry="34" fill="${C.m4}"/><ellipse cx="480" cy="527" rx="236" ry="31" fill="${C.m3}"/>`;
for (let i = 0; i < 22; i++) { const a = i * 2.4, rr = 0.9 * Math.sqrt((i + 1) / 22); s += R(480 + 225 * rr * Math.cos(a), 527 + 26 * rr * Math.sin(a), 8, 2.5, C.m4); }
{
  const w = 32, h = 36, t = 7.5, gap = 5, y = 509, W7 = 7 * w + 6 * gap;
  const L = {
    T: x => R(x, y, w, t, C.white) + R(x + w / 2 - t / 2, y, t, h, C.white),
    O: x => R(x, y, w, h, C.white) + R(x + t, y + t, w - 2 * t, h - 2 * t, C.m3),
    M: x => R(x, y, t, h, C.white) + R(x + w - t, y, t, h, C.white) + P(`M${x},${y} h${t} l${w / 2 - t / 2},${h * 0.6} l${w / 2 - t / 2},${-h * 0.6} h${t} l${-w / 2},${h * 0.8} h${-t / 2} Z`, C.white),
    A: x => P(`M${x},${y + h} L${x + w / 2 - t / 2},${y} h${t} L${x + w},${y + h} h${-t} L${x + w / 2},${y + t * 1.3} L${x + t},${y + h} Z`, C.white) + R(x + 7, y + h * 0.6, w - 14, t * 0.7, C.white),
    R: x => R(x, y, t, h, C.white) + R(x, y, w - 4, t, C.white) + R(x + w - t - 4, y, t, h * 0.55, C.white) + R(x, y + h * 0.45, w - 4, t * 0.8, C.white) + P(`M${x + 12},${y + h * 0.5} h${t + 2} L${x + w},${y + h} h${-t - 2} Z`, C.white),
    E: x => R(x, y, t, h, C.white) + R(x, y, w, t, C.white) + R(x, y + h / 2 - t / 2, w - 6, t * 0.8, C.white) + R(x, y + h - t, w, t, C.white),
    S: x => R(x, y, w, t, C.white) + R(x, y, t, h / 2, C.white) + R(x, y + h / 2 - t / 2, w, t, C.white) + R(x + w - t, y + h / 2, t, h / 2, C.white) + R(x, y + h - t, w, t, C.white),
  };
  [...'TOMARES'].forEach((ch, i) => { const x = 480 - W7 / 2 + i * (w + gap); s += L[ch](x); });
}
// olivos y arbolillos del primer término
s += tree(70, 585, 26, C, 9) + tree(895, 590, 28, C, 10) + olive(180, 590, 16) + olive(790, 592, 16) + tree(250, 560, 15, C, 5) + tree(715, 560, 15, C, 5);
// farolas y gente pequeña
for (const x of [190, 770]) s += R(x, 488, 3, 36, C.stoneDk) + Ci(x + 1.5, 486, 5, C.win);
for (const [x, c] of [[330, C.alt], [640, C.altLt]]) s += Ci(x, 560, 5, C.cream) + R(x - 5, 565, 10, 18, c) + R(x - 4, 583, 3, 8, C.m0) + R(x + 1, 583, 3, 8, C.m0);
save('tomares-4-paradas', s);
