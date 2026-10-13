// Portada de «Del Retiro al Prado» (design/banners/retiro-prado.svg, 960 × 600):
// el estanque grande del Retiro de día, con barcas de remos en primer término y
// el monumento a Alfonso XII al fondo (columnata semicircular, pabellones en los
// extremos y estatua ecuestre sobre el pedestal central), entre una arboleda
// verde frondosa. A la izquierda asoma el Palacio de Cristal (hierro, vidrio y
// cúpula) y a la derecha la Puerta de Alcalá (arco de cinco vanos); Cibeles y el
// Paseo del Prado quedan implícitos en la fila de árboles del horizonte.
//
//   node scripts/draw-banner-retiro-prado.mjs
import { R, P, S, Ci, arch, dome, mix, cloud, bandedSky, tree, save, paletteFor } from './banner-kit.mjs';

const C = paletteFor('retiro-prado');
let s = bandedSky([[0, C.m6], [140, C.m7], [300, C.m8], [400, C.m8]]);
s += Ci(150, 70, 26, C.white) + Ci(150, 70, 18, C.win);
s += cloud(560, 96, 1.3, C.white) + cloud(780, 150, 1, C.white) + cloud(300, 60, 0.9, C.m8);

/* Masa lejana de arbolado en el horizonte */
const blobs = (x0, x1, y, r, cols, step = 0.8) => { let t = '', k = 0; for (let x = x0; x < x1; x += r * step, k++) t += Ci(x, y + ((k * 7) % 9) - 4, r + ((k * 5) % 7), cols[k % cols.length]); return t; };
s += blobs(-20, 980, 372, 34, [C.m5, C.m4, C.m5]) + R(0, 372, 960, 40, C.m4);
s += blobs(-10, 980, 392, 28, [C.m4, C.m3, C.m4]) + R(0, 392, 960, 20, C.m3);

/* Palacio de Cristal (izquierda): nave de vidrio y hierro con cúpula central */
{
  const y = 400;
  s += R(96, y - 52, 160, 52, C.white) + R(96, y - 6, 160, 6, C.stone);
  for (let x = 100; x < 252; x += 8) s += R(x, y - 46, 5, 40, mix(C.m6, C.white, 0.4));
  for (let yy = y - 46; yy < y - 6; yy += 10) s += R(96, yy, 160, 1.6, C.m5);
  s += R(100, y - 50, 152, 3, C.m4);
  s += R(144, y - 82, 64, 82, C.white) + arch(150, y - 6, 52, 80, mix(C.m6, C.white, 0.35));
  for (let x = 154; x < 200; x += 8) s += R(x, y - 80, 1.8, 70, C.m5);
  for (let yy = y - 70; yy < y - 6; yy += 12) s += R(150, yy, 52, 1.6, C.m5);
  s += R(140, y - 86, 72, 6, C.stoneDk);
  s += P(`M144,${y - 86} Q176,${y - 130} 208,${y - 86} Z`, mix(C.m6, C.white, 0.5));
  for (const dx of [-18, -6, 6, 18]) s += S(`M176,${y - 86} Q${176 + dx * 1.3},${y - 112} ${176 + dx},${y - 88}`, C.m4, 1.6);
  s += S(`M176,${y - 128} V${y - 142}`, C.m3, 2) + Ci(176, y - 143, 3, C.gold);
}

/* Puerta de Alcalá (derecha): tres arcos centrales, dos vanos rectangulares, columnas y ático con frontón y escudo */
{
  const x = 700, y = 402, w = 146, c = x + w / 2;
  s += R(x, y - 64, w, 64, C.cream) + R(x - 4, y - 68, w + 8, 6, C.white) + R(x, y - 6, w, 6, C.stone);
  s += R(x + 4, y - 64, w - 8, 3, C.stoneDk);
  s += arch(c - 12, y - 6, 24, 54, C.m2) + arch(c - 39, y - 6, 18, 40, C.m2) + arch(c + 21, y - 6, 18, 40, C.m2);
  for (const dx of [-56, 50]) s += R(c + dx, y - 34, 12, 28, C.m2);
  for (const dx of [-47, -17, 12, 42]) s += R(c + dx - 3, y - 62, 6, 56, C.white) + R(c + dx - 3, y - 62, 2, 56, C.stone);
  s += R(x + 28, y - 100, w - 56, 32, C.cream) + R(x + 24, y - 104, w - 48, 6, C.white);
  s += P(`M${x + 44},${y - 104} L${c},${y - 130} L${x + w - 44},${y - 104} Z`, C.white) + P(`M${x + 54},${y - 106} L${c},${y - 124} L${x + w - 54},${y - 106} Z`, C.stone);
  s += Ci(c, y - 88, 9, C.stoneDk) + Ci(c, y - 88, 5.5, C.gold) + R(c - 1.5, y - 96, 3, 4, C.goldDk);
  for (const dx of [-30, 22]) s += R(c + dx, y - 98, 8, 22, C.stone);
  for (const dx of [-36, 28]) s += R(c + dx, y - 118, 8, 14, C.stoneDk) + Ci(c + dx + 4, y - 122, 3.5, C.stoneDk);
}

/* Monumento a Alfonso XII: columnata semicircular, pabellones y pedestal con estatua */
{
  const cx = 480, y = 402;
  s += R(268, y - 6, 424, 12, C.stoneDk) + R(284, y - 14, 392, 10, C.stone);
  // Columnata (fondo en sombra y fustes en dos filas alternas)
  s += R(318, y - 76, 324, 64, C.m2);
  for (let i = 0; i < 17; i++) { const x = 322 + i * 19.4; s += R(x, y - 74, 7, 62, i % 2 ? C.white : C.cream) + R(x + 5, y - 74, 2, 62, C.stoneDk) + R(x - 2, y - 78, 11, 4, C.stone) + R(x - 2, y - 16, 11, 4, C.stone); }
  s += R(310, y - 90, 340, 14, C.cream) + R(306, y - 94, 348, 6, C.white) + R(310, y - 80, 340, 3, C.stoneDk);
  for (let x = 318; x < 640; x += 16) s += R(x, y - 99, 8, 5, C.stone);
  // Pabellones de los extremos
  for (const px of [270, 626]) {
    s += R(px, y - 98, 64, 92, C.cream) + R(px - 4, y - 104, 72, 8, C.white) + R(px + 44, y - 98, 20, 92, C.stoneDk);
    s += P(`M${px - 2},${y - 104} L${px + 32},${y - 128} L${px + 66},${y - 104} Z`, C.white) + P(`M${px + 8},${y - 106} L${px + 32},${y - 122} L${px + 56},${y - 106} Z`, C.stone);
    s += arch(px + 16, y - 10, 30, 62, C.m2) + Ci(px + 31, y - 110, 3.5, C.stoneDk);
  }
  // Pedestal central alto, con friso y hornacina
  s += R(cx - 46, y - 150, 92, 140, C.cream) + R(cx - 46, y - 150, 14, 140, C.white) + R(cx + 30, y - 150, 16, 140, C.stone);
  s += R(cx - 54, y - 156, 108, 10, C.white) + R(cx - 52, y - 146, 104, 4, C.stoneDk) + R(cx - 58, y - 22, 116, 12, C.stone);
  s += arch(cx - 16, y - 40, 32, 62, C.m2) + R(cx - 38, y - 118, 76, 10, C.stone);
  for (const dx of [-30, 20]) s += Ci(cx + dx + 5, y - 94, 5, C.stoneDk);
  s += R(cx - 40, y - 190, 80, 34, C.cream) + R(cx - 44, y - 194, 88, 6, C.white) + R(cx + 24, y - 190, 16, 34, C.stone);
  s += R(cx - 30, y - 184, 60, 20, C.stoneDk) + Ci(cx, y - 174, 6, C.gold);
  s += R(cx - 26, y - 206, 52, 12, C.white) + R(cx - 22, y - 216, 44, 12, C.stone);
  // Estatua ecuestre: caballo de perfil con cuatro patas, cuello, cola y jinete
  const e = C.m1, yb = y - 216;
  s += P(`M${cx - 28},${yb - 26} q0,-12 28,-12 q22,0 30,8 l6,-18 l12,-4 l6,10 l-8,16 l-8,-6 q-4,4 -8,12 q-2,14 -12,14 h-6 l-2,-10 h-18 l-2,10 h-6 q-10,0 -10,-10 Z`, e);
  for (const dx of [-26, -18, 8, 17]) s += R(cx + dx, yb - 16, 5, 16, e) + R(cx + dx - 1, yb - 3, 7, 3, C.m0);
  s += S(`M${cx - 28},${yb - 30} q-14,2 -12,22 q1,6 -3,8`, e, 4);
  s += P(`M${cx - 8},${yb - 40} h14 l2,18 h-14 Z`, C.m0) + Ci(cx - 1, yb - 48, 6, C.m0) + R(cx - 8, yb - 56, 14, 3, C.m0) + S(`M${cx + 5},${yb - 36} L${cx + 22},${yb - 40}`, C.m0, 3);
  // Leones y escalinata hacia el agua
  for (const lx of [cx - 76, cx + 58]) s += R(lx, y - 28, 20, 18, C.stoneDk) + Ci(lx + 10, y - 36, 7, C.stone);
  for (let i = 0; i < 4; i++) s += R(cx - 86 - i * 10, y + 6 + i * 6, 172 + i * 20, 6, i % 2 ? C.stoneDk : C.stone);
}

/* Estanque: agua verdosa con el reflejo de la columnata y rizos */
s += R(0, 430, 960, 170, C.m5);
for (let y = 430; y < 600; y += 10) s += R(0, y, 960, 5, mix(C.m5, C.m4, (y - 430) / 170 * 0.7));
for (let i = 0; i < 22; i++) { const y = 436 + i * 5, w = 240 - i * 7 + (i % 3) * 14; s += R(480 - w / 2 + ((i * 17) % 23) - 11, y, w, 2.6, mix(C.m5, C.cream, i % 2 ? 0.45 : 0.3)); }
for (const [x, y, w] of [[60, 470, 90], [200, 520, 120], [780, 480, 110], [660, 560, 140], [330, 575, 100], [880, 540, 60]]) s += R(x, y, w, 3, C.m6) + R(x + 18, y + 7, w * 0.6, 2.5, C.m4);

/* Barcas de remos */
const boat = (x, y, k, hull) => {
  let b = P(`M${x - 46 * k},${y} h${92 * k} q-6,${14 * k} -${22 * k},${14 * k} h-${48 * k} q-${16 * k},0 -${22 * k},-${14 * k} Z`, hull);
  b += R(x - 40 * k, y + 2, 80 * k, 3, C.white) + R(x - 30 * k, y + 9 * k, 60 * k, 2.4, C.altDk);
  b += R(x - 19 * k, y - 11 * k, 12 * k, 11 * k, C.altDk) + Ci(x - 13 * k, y - 17 * k, 5 * k, C.sun);
  b += R(x + 8 * k, y - 11 * k, 12 * k, 11 * k, C.m2) + Ci(x + 14 * k, y - 17 * k, 5 * k, C.altLt);
  b += S(`M${x - 30 * k},${y - 6 * k} L${x - 64 * k},${y + 12 * k} M${x + 34 * k},${y - 6 * k} L${x + 68 * k},${y + 12 * k}`, C.stoneDk, 2.4);
  return b + R(x - 50 * k, y + 15 * k, 100 * k, 3, C.m4);
};
s += boat(330, 468, 0.8, C.alt) + boat(640, 500, 1, C.altLt) + boat(520, 565, 1.3, C.alt);
s += boat(160, 540, 0.9, C.altDk);

/* Arboleda frondosa que enmarca la escena, a izquierda y derecha */
const crown = (cx, cy, r, base) => Ci(cx, cy, r, base) + Ci(cx - r * 0.45, cy + r * 0.3, r * 0.65, C.m2) + Ci(cx + r * 0.5, cy - r * 0.35, r * 0.6, C.m4) + Ci(cx + r * 0.1, cy - r * 0.55, r * 0.35, C.m5);
for (const [x, w] of [[-10, 52], [900, 74]]) s += R(x, 340, w, 270, C.m1);
s += R(30, 360, 16, 240, C.m0) + R(930, 330, 18, 270, C.m0);
s += crown(20, 300, 90, C.m3) + crown(86, 250, 74, C.m2) + crown(70, 470, 80, C.m2) + crown(-10, 520, 90, C.m1);
s += crown(962, 280, 90, C.m3) + crown(900, 340, 56, C.m2) + crown(900, 500, 90, C.m2) + crown(840, 590, 70, C.m1);
for (const [x, y] of [[40, 230], [110, 290], [906, 250], [850, 300], [60, 450]]) s += Ci(x, y, 4, C.m6);
for (const [x, y, r] of [[360, 395, 30], [600, 396, 28], [200, 408, 26], [730, 410, 24]]) s += Ci(x, y, r, C.m3) + Ci(x - r * 0.4, y + r * 0.2, r * 0.6, C.m2);
/* Hierba de la orilla en primer término */
s += blobs(-10, 980, 604, 26, [C.m2, C.m1, C.m2]);
s += blobs(100, 400, 612, 22, [C.m3, C.m2]);

save('retiro-prado', s);
