// Dibuja la ilustración de portada de «Del Arenal a la Plaza de España»
// (design/banners/sevilla-arenal.svg, 960 × 600): la hora dorada en la Plaza de
// España, con sus dos torres de ladrillo, la galería semicircular, el canal con
// una barca y el puente de azulejos; a la izquierda la curva blanca y ocre de la
// Real Maestranza con su portada barroca, y las palmeras del Parque de María Luisa.
// Ocre domina (cielo, ladrillo, albero, sombras); el turquesa solo en azulejos,
// barca y agua.
//
//   node scripts/draw-banner-sevilla-arenal.mjs
import { R, P, S, Ci, arch, dome, mix, palm, tree, bandedSky, save, paletteFor, f } from './banner-kit.mjs';

const C = paletteFor('sevilla-arenal');
let s = '';

/* Cielo de atardecer en bandas ocre, con el sol bajo y su halo */
s += bandedSky([[0, mix(C.m5, C.sun, 0.25)], [90, mix(C.m5, C.sun, 0.3)], [180, mix(C.m5, C.sun, 0.35)], [270, mix(C.m6, C.gold, 0.5)], [350, mix(C.sun, C.m8, 0.35)], [430, mix(C.m6, C.gold, 0.4)]], 460);
for (const [r, t] of [[150, 0.25], [105, 0.5], [68, 0.75]]) s += Ci(450, 250, r, mix(C.gold, C.sun, t));
s += Ci(450, 250, 40, mix(C.sun, C.white, 0.35));
for (const [x, y, w] of [[60, 120, 220], [640, 100, 260], [760, 190, 170], [90, 215, 150]]) s += R(x, y, w, 5, mix(C.m5, C.sun, 0.5)) + R(x + 30, y + 8, w * 0.6, 3, mix(C.m5, C.sun, 0.5));

/* Ciudad lejana y copas del parque, en ocre apagado */
{ let x = 0, k = 0;
  while (x < 960) { const w = 30 + (k * 19) % 36, h = 16 + (k * 13) % 26; s += R(x, 400 - h, w, h + 30, k % 2 ? C.m4 : mix(C.m4, C.m5, 0.5)); x += w; k++; }
  for (const x of [380, 560, 890]) s += Ci(x, 392, 24, mix(C.m5, C.leaf, 0.35)); }

/* Torre de la Plaza de España: fuste de ladrillo, campanario y cúpula */
const tower = (cx, base) => {
  const top = base - 230;
  let t = R(cx - 31, top, 62, 230, C.m3) + R(cx - 31, top, 12, 230, C.m4) + R(cx + 20, top, 11, 230, C.m2);
  for (let y = top + 6; y < base; y += 8) t += R(cx - 31, y, 62, 1.3, C.m2);
  t += R(cx - 33, top - 3, 66, 7, C.cream);
  // paños de azulejo y balcones con ventana
  t += R(cx - 22, base - 120, 44, 12, C.alt);
  for (let x = cx - 22; x < cx + 22; x += 8) t += R(x + 2, base - 117, 4, 6, C.altLt);
  for (const y of [top + 28, top + 78, base - 82]) t += arch(cx - 9, y + 30, 18, 30, C.m1) + R(cx - 13, y + 30, 26, 4, C.cream) + R(cx - 11, y + 22, 22, 2, C.cream);
  t += arch(cx - 11, base, 22, 36, C.m1);
  // campanario con arcos y cornisa
  t += R(cx - 24, top - 52, 48, 50, C.m4) + R(cx - 24, top - 52, 8, 50, C.m5);
  for (const dx of [-17, -4, 9]) t += arch(cx + dx, top - 4, 9, 30, C.m1);
  t += R(cx - 28, top - 58, 56, 7, C.cream);
  for (let x = cx - 26; x < cx + 26; x += 9) t += R(x, top - 66, 4, 8, C.cream);
  // cúpula con remate
  t += dome(cx, top - 58, 22, C.m2) + P(`M${cx - 22},${top - 58} A22,24 0 0 1 ${cx - 12},${top - 76} L${cx - 6},${top - 58} Z`, C.m3);
  t += R(cx - 4, top - 90, 8, 14, C.cream) + dome(cx, top - 90, 5, C.goldDk) + S(`M${cx},${top - 94} V${top - 108}`, C.goldDk, 2) + Ci(cx, top - 110, 3, C.sun);
  return t;
};

/* Real Maestranza a la izquierda: plaza de toros baja y curva, blanca con bandas de albero, arcadas en dos pisos, balaustrada y portada barroca de piedra */
{
  const b = 430, al = mix(C.m4, C.gold, 0.45);
  s += P(`M-40,${b} V352 H290 Q326,360 326,${b} Z`, C.white) + P(`M290,352 Q326,360 326,${b} H300 Z`, C.stone);
  s += R(-40, 346, 340, 10, C.m3) + R(-40, 374, 340, 9, al) + R(-40, 404, 340, 8, al) + R(-40, b - 6, 340, 6, C.m4);
  for (let x = -30; x < 300; x += 20) s += arch(x, 402, 12, 24, C.m2) + R(x + 2, 358, 8, 14, C.m1) + arch(x, b - 6, 12, 20, C.m1);
  s += R(-40, 336, 340, 4, C.white);
  for (let x = -38; x < 300; x += 8) s += R(x, 326, 4, 12, C.white);
  s += R(-40, 322, 340, 5, C.stone);
  s += P(`M-40,322 H300 Q312,324 316,340 H-40 Z`, C.m2).replace('<path','<path opacity="0"');
  // Puerta del Príncipe: portada de piedra, más baja que las torres
  const px = 124;
  s += R(px, 300, 84, b - 300, C.stone) + R(px, 300, 12, b - 300, C.stoneDk) + R(px + 72, 300, 12, b - 300, C.stoneDk);
  s += R(px - 4, 294, 92, 8, C.cream) + P(`M${px + 12},294 L${px + 42},272 L${px + 72},294 Z`, C.cream) + Ci(px + 42, 286, 5, C.m3);
  s += arch(px + 26, b - 6, 32, 54, C.m1) + R(px + 22, b - 62, 40, 4, C.cream);
  s += arch(px + 30, 356, 24, 40, C.m2) + R(px + 26, 358, 32, 4, C.goldDk) + R(px + 24, 362, 36, 3, C.cream);
  for (const x of [px + 14, px + 64]) s += R(x, 330, 6, 36, C.cream);
  s += R(px - 6, b - 6, 96, 6, C.stoneDk) + Ci(px + 42, 268, 4, C.goldDk) + R(px + 40, 254, 4, 14, C.m2);
}

/* Galería semicircular de la Plaza: arcos de ladrillo, balaustrada y pabellón central con cúpula */
{
  const b = 424, x0 = 300, x1 = 830;
  s += R(x0, 296, x1 - x0, b - 296, C.m3) + R(x0, 296, x1 - x0, 40, C.m4);
  s += R(x0 - 2, 288, x1 - x0 + 4, 8, C.cream);
  for (let x = x0; x < x1; x += 14) s += R(x + 2, 276, 5, 12, C.cream) + Ci(x + 4.5, 274, 3, C.stone);
  // galería alta de arcos con columnas
  for (let x = x0 + 12; x < x1 - 18; x += 30) s += R(x, 308, 22, 40, C.m2) + arch(x, 348, 22, 40, C.m1) + R(x - 4, 308, 4, 40, C.cream) + R(x + 22, 308, 4, 40, C.cream);
  s += R(x0, 348, x1 - x0, 8, C.cream) + R(x0, 356, x1 - x0, 5, C.m2);
  // planta baja: arcos de medio punto con azulejos de provincia en el zócalo
  for (let x = x0 + 8; x < x1 - 24; x += 34) s += arch(x, b - 10, 26, 54, C.m1) + R(x - 5, 366, 5, b - 376, C.cream) + R(x + 26, 366, 5, b - 376, C.cream);
  s += R(x0, b - 10, x1 - x0, 12, C.m2);
  for (let x = x0 + 6; x < x1 - 20; x += 34) s += R(x, b - 8, 22, 8, C.alt) + R(x + 3, b - 6, 5, 4, C.altLt) + R(x + 13, b - 6, 5, 4, C.altLt);
  // pabellón central
  const cx = 565;
  s += R(cx - 52, 236, 104, 60, C.m3) + R(cx - 52, 236, 14, 60, C.m4) + R(cx + 40, 236, 12, 60, C.m2) + R(cx - 56, 230, 112, 8, C.cream);
  for (const dx of [-36, -12, 12]) s += arch(cx + dx, 288, 24, 44, C.m1) + R(cx + dx - 3, 244, 2, 44, C.cream);
  s += dome(cx, 230, 40, C.m2) + P(`M${cx - 40},230 A40,44 0 0 1 ${cx - 18},194 L${cx - 8},230 Z`, C.m3) + R(cx - 5, 180, 10, 12, C.cream) + dome(cx, 180, 6, C.goldDk) + Ci(cx, 168, 3, C.sun);
  for (let a = -30; a <= 30; a += 15) s += R(cx + a - 1, 200, 2, 30, C.m1);
}
s += tower(300, 424) + tower(830, 424);

/* Suelo de albero y paseo ante la galería */
s += R(0, 424, 960, 40, mix(C.m5, C.gold, 0.4)) + R(0, 424, 960, 4, C.m4);
for (let x = 20; x < 960; x += 70) s += R(x, 440 + (x % 3) * 6, 26, 3, mix(C.m5, C.sun, 0.5));

/* Canal: agua en sombra con el reflejo de la Plaza y el cielo, rizos turquesa */
const wt = C.altDk;
s += R(0, 462, 960, 138, wt) + R(0, 462, 960, 14, mix(C.m5, C.altLt, 0.4));
for (let y = 478; y < 600; y += 11) s += R(0, y, 960, 5, mix(wt, C.alt, 0.15 + 0.15 * ((y / 11) % 3)));
s += R(310, 476, 520, 36, mix(C.alt, C.m3, 0.35)) + R(300, 506, 540, 20, mix(wt, C.alt, 0.4));
for (let i = 0; i < 70; i++) { const x = (i * 163) % 960, y = 484 + (i * 29) % 108; s += R(x, y, 24 + (i * 7) % 30, 3, i % 3 ? C.alt : C.altLt); }
s += Ci(450, 540, 3, C.sun) + R(430, 540, 40, 2, C.sun);

/* Puente de azulejos sobre el canal */
{
  const x0 = 380, x1 = 800, y = 456;
  s += R(x0, y + 16, x1 - x0, 66, C.m3) + R(x0, y + 16, x1 - x0, 6, C.m4);
  for (let x = x0 + 14; x < x1 - 40; x += 90) s += arch(x, y + 82, 62, 52, C.m1) + arch(x + 8, y + 82, 46, 42, C.m2);
  // pretil con paneles de azulejo
  s += R(x0 - 6, y - 8, x1 - x0 + 12, 6, C.cream);
  s += R(x0 - 6, y - 2, x1 - x0 + 12, 22, C.white);
  for (let x = x0 + 4; x < x1 - 26; x += 30) s += R(x, y + 1, 24, 15, C.alt) + R(x + 3, y + 4, 18, 9, C.altLt) + R(x + 9, y + 6, 6, 5, C.altDk) + R(x + 2, y, 3, 17, C.white);
  s += R(x0 - 10, y - 14, 14, 36, C.cream) + R(x1 - 4, y - 14, 14, 36, C.cream) + Ci(x0 - 3, y - 17, 5, C.goldDk) + Ci(x1 + 3, y - 17, 5, C.goldDk);
}

/* Barca de remos con un paseante, abajo a la izquierda */
{
  const x = 190, y = 548;
  s += P(`M${x - 62},${y - 8} H${x + 62} Q${x + 50},${y + 22} ${x + 24},${y + 22} H${x - 24} Q${x - 50},${y + 22} ${x - 62},${y - 8} Z`, C.alt);
  s += R(x - 56, y - 8, 112, 5, C.altLt) + R(x - 40, y + 8, 80, 4, C.altDk);
  s += R(x - 14, y - 36, 14, 28, C.m4) + Ci(x - 7, y - 42, 7, C.cream) + R(x + 18, y - 30, 12, 22, C.cream) + Ci(x + 24, y - 36, 6, C.m2);
  s += S(`M${x - 4},${y - 22} L${x - 80},${y + 6}`, C.m1, 2.4);
  s += R(x - 90, y + 20, 180, 3, C.altLt) + R(x - 60, y + 28, 120, 3, C.altDk);
}

/* Parque de María Luisa: palmeras y árboles en primer término */
s += tree(40, 480, 34, { ...C, trunk: C.m1 }) + tree(110, 470, 24, { ...C, trunk: C.m1 });
s += palm(900, 500, 170, 18, { ...C, trunk: C.m1 }) + palm(850, 470, 120, -14, { ...C, trunk: C.m1 }) + palm(936, 470, 100, 8, { ...C, trunk: C.m1 });
s += R(0, 560, 960, 40, C.m3) + R(0, 556, 960, 8, C.m4) + R(0, 560, 960, 3, C.m2);
for (let x = 0; x < 960; x += 24) s += R(x + 2, 570, 20, 8, C.m4) + R(x + 12, 582, 20, 8, C.m2);

save('sevilla-arenal', s);
