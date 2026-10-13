// Portada de «La Sevilla de Murillo» (design/banners/murillo.svg, 960 × 600):
// atardecer magenta en la plaza de Santa Cruz. En el centro la Cruz de la
// Cerrajería, de hierro forjado, recortada contra el sol bajo y rodeada de
// naranjos; detrás a la izquierda la fachada del Hospital de la Caridad (portada
// con frontón, paneles de azulejo y espadaña); a la derecha la torre de una
// iglesia barroca y casas encaladas con rejas y balcones (la casa de Murillo);
// en primer término un caballete de pintor como guiño al artista.
//
//   node scripts/draw-banner-murillo.mjs
import { W, H, paletteFor, bandedSky, R, P, S, Ci, arch, dome, mix, cloud, tree, save } from './banner-kit.mjs';

const C = paletteFor('murillo');
const wall = mix(C.white, C.m6, 0.3), wallSh = mix(C.white, C.m4, 0.45), wallDk = mix(C.m5, C.m3, 0.4);
let s = bandedSky([[0, C.m1], [130, C.m2], [230, C.m3], [320, C.m4], [390, C.m5], [440, C.m6]], 450);

/* Sol bajo con su halo, y nubes alargadas */
for (const [r, c] of [[120, C.m4], [92, C.m5], [66, C.m6]]) s += Ci(560, 345, r, c);
s += Ci(560, 345, 44, C.sun);
for (const [x, y, w] of [[40, 190, 260], [690, 150, 240], [760, 250, 170], [300, 120, 200]]) s += R(x, y, w, 6, C.m4) + R(x + 30, y + 9, w * 0.6, 4, C.m5);
s += cloud(120, 300, 1, C.m5) + cloud(820, 330, 0.8, C.m5);

/* Ciudad lejana en sombra */
{
  let x = 0, k = 0;
  while (x < W) { const w = 30 + (k * 17) % 34, h = 14 + (k * 11) % 26; s += R(x, 410 - h, w, h + 40, k % 2 ? C.m3 : C.m4); x += w; k++; }
  s += R(838, 340, 14, 72, C.m3) + P('M836,340 L845,320 L854,340 Z', C.m2);
}

/* Hospital de la Caridad: fachada blanca con paneles de azulejo, portada y espadaña */
{
  const b = 446, x0 = 100, x1 = 470;
  s += R(x0, 334, x1 - x0, b - 334, wall) + R(x0 - 4, 326, x1 - x0 + 8, 10, C.m2) + R(x0, 336, x1 - x0, 4, wallDk);
  for (let x = x0 - 2; x < x1 + 2; x += 10) s += R(x, 322, 7, 5, C.m1);
  // paneles de azulejo (turquesa) con cenefa
  const panel = (x, y, w, h) => {
    let p = R(x, y, w, h, C.altDk) + R(x + 3, y + 3, w - 6, h - 6, C.alt);
    for (let yy = y + 6; yy < y + h - 8; yy += 12) for (let xx = x + 6; xx < x + w - 8; xx += 12) p += R(xx, yy, 6, 6, (xx + yy) % 24 < 12 ? C.altLt : C.white);
    return p + R(x, y + h - 2, w, 2, C.altDk);
  };
  for (const px of [114, 190, 358, 418]) s += panel(px, 360, px === 114 || px === 418 ? 36 : 40, 66);
  // ventanas con reja y balcón
  for (const wx of [166, 340, 150]) if (wx !== 150) s += R(wx, 358, 14, 28, wallDk) + arch(wx + 2, 384, 10, 22, C.m1) + R(wx - 3, 386, 20, 3, C.m1);
  for (const wx of [118, 428]) s += R(wx, 346, 20, 6, wallSh);
  // portada: pilastras, arco, hornacina y frontón
  const cx = 285;
  s += R(cx - 46, 284, 92, b - 284, wall) + R(cx - 46, 284, 6, b - 284, wallSh) + R(cx + 40, 284, 6, b - 284, wallSh);
  s += R(cx - 52, 276, 104, 9, C.m2) + P(`M${cx - 54},276 L${cx},248 L${cx + 54},276 Z`, wallSh) + P(`M${cx - 38},274 L${cx},254 L${cx + 38},274 Z`, wall) + Ci(cx, 268, 4.5, C.alt);
  s += arch(cx - 17, b, 34, 82, wallDk) + arch(cx - 13, b, 26, 76, C.m1) + R(cx - 13, b - 20, 26, 20, C.m2);
  s += arch(cx - 8, 340, 16, 30, C.altDk) + arch(cx - 5, 338, 10, 24, C.alt) + Ci(cx, 328, 3, C.altLt);
  for (const dx of [-36, 28]) s += R(cx + dx, 306, 8, 14, C.alt) + arch(cx + dx + 1, 346, 6, 24, C.m3);
  s += R(cx - 46, 359, 92, 3, C.gold);
  // espadaña con dos huecos y remate
  s += R(cx - 20, 190, 40, 58, wall) + R(cx - 20, 190, 5, 58, wallSh) + R(cx - 24, 244, 48, 6, C.m2);
  s += arch(cx - 15, 236, 12, 28, C.m1) + arch(cx + 3, 236, 12, 28, C.m1) + Ci(cx - 9, 222, 2.5, C.gold) + Ci(cx + 9, 222, 2.5, C.gold);
  s += R(cx - 24, 186, 48, 6, C.m2) + P(`M${cx - 18},186 L${cx},166 L${cx + 18},186 Z`, wall) + Ci(cx, 176, 3.5, C.alt);
  s += S(`M${cx},166 V148 M${cx - 6},156 H${cx + 6}`, C.m1, 2.4);
}

/* Torre de la iglesia barroca y casa de Murillo, a la derecha */
{
  const tx = 690, b = 446;
  s += R(tx, 250, 64, b - 250, wallSh) + R(tx, 250, 8, b - 250, wall) + R(tx - 4, 244, 72, 7, C.m2);
  s += R(tx + 8, 190, 48, 56, wallSh) + arch(tx + 18, 240, 28, 40, C.m1) + R(tx + 4, 186, 56, 6, C.m2);
  s += dome(tx + 32, 186, 24, C.alt) + R(tx + 28, 150, 8, 12, C.altLt) + dome(tx + 32, 150, 6, C.altDk) + S(`M${tx + 32},144 V128 M${tx + 26},134 H${tx + 38}`, C.m1, 2.2);
  for (const y of [270, 310]) s += arch(tx + 26, y + 22, 12, 22, C.m2) + R(tx + 8, y + 6, 10, 3, C.alt);
  s += arch(tx + 16, b, 32, 52, C.m2);
  // casas encaladas con rejas y balcones
  const house = (x, w, top, tile) => {
    s += R(x, top, w, b - top, wall) + R(x + w - 10, top, 10, b - top, wallSh) + R(x - 3, top - 7, w + 6, 8, tile) + R(x - 3, top - 2, w + 6, 3, C.m1);
    for (let wx = x + 12; wx < x + w - 24; wx += 34) {
      s += R(wx, top + 18, 18, 28, C.m1) + R(wx - 4, top + 46, 26, 4, C.m1) + R(wx - 8, top + 48, 34, 3, C.m2);
      for (let rx = wx - 6; rx < wx + 24; rx += 6) s += R(rx, top + 36, 1.6, 12, C.m1);
      s += R(wx + 2, top + 21, 14, 20, C.win) ;
      s += arch(wx, b - 4, 16, 36, C.m2) + S(`M${wx + 3},${b - 18} H${wx + 13}`, C.m5, 1.5);
      for (let rx = wx + 2; rx < wx + 16; rx += 5) s += R(rx, b - 38, 1.4, 14, C.m1);
    }
  };
  house(770, 130, 318, C.m2);
  house(600, 90, 344, C.altDk);
  house(900, 90, 296, C.m2);
  s += R(770, 318, 130, 6, C.alt);
}

/* Plaza: suelo en sombra con adoquines */
s += R(0, 446, W, 154, C.m3) + R(0, 446, W, 6, C.m5);
for (let y = 462, k = 0; y < H; y += 20 + k * 3, k++) for (let x = (k % 2) * 15; x < W; x += 30) s += R(x, y, 14, 3, k % 3 ? C.m2 : C.m4);
s += P('M0,600 V552 Q300,520 480,560 T960,540 V600 Z', C.m2);

/* Naranjos con fruta a los lados de la cruz */
s += tree(380, 520, 34, C, 8) + tree(748, 512, 30, C, 8) + tree(60, 500, 30, C, 7);

/* Cruz de la Cerrajería: plinto circular escalonado, fuste, cruz de hierro forjado y verja */
{
  const x = 560, b = 500, c = C.m0;
  s += P(`M${x - 62},${b + 10} h124 l-8,-12 h-108 Z`, C.m6) + R(x - 50, b - 14, 100, 10, wallSh) + R(x - 38, b - 26, 76, 12, wall) + R(x - 28, b - 38, 56, 12, wallSh);
  s += R(x - 8, b - 90, 16, 54, wall) + R(x - 12, b - 96, 24, 8, wallSh);
  s += R(x - 3, b - 220, 6, 130, c) + R(x - 36, b - 188, 72, 6, c);
  s += R(x - 44, b - 192, 10, 14, c) + R(x + 34, b - 192, 10, 14, c) + R(x - 9, b - 232, 18, 12, c);
  for (const [dx, dy] of [[-24, -160], [24, -160], [-24, -214], [24, -214]]) s += S(`M${x},${b + dy + 16} Q${x + dx * 0.9},${b + dy + 10} ${x + dx},${b + dy}`, c, 2.6) + Ci(x + dx, b + dy - 2, 3.2, c);
  for (const dx of [-14, 14]) s += S(`M${x},${b - 166} q${dx},-8 ${dx},-22`, c, 2.2);
  s += Ci(x, b - 238, 5, c) + Ci(x, b - 186, 6, C.gold);
  s += S(`M${x - 96},${b + 22} H${x + 96}`, C.m1, 3);
  for (let rx = x - 96; rx <= x + 96; rx += 12) s += R(rx - 1, b + 2, 2.4, 20, C.m1) + Ci(rx, b + 2, 2.6, C.m1);
}

/* Siluetas pequeñas, como en las postales */
for (const [x, y, h, k] of [[470, 520, 40, 0], [486, 523, 34, 1], [650, 522, 38, 0], [300, 546, 32, 1]]) {
  s += R(x - 5, y - h + 12, 10, h - 12, C.m0) + Ci(x, y - h + 7, 5.2, C.m0) + R(x - 5, y - 4, 4, 8, C.m0) + R(x + 1, y - 4, 4, 8, C.m0);
  if (k) s += P(`M${x - 5},${y - h + 14} L${x - 9},${y - 2} H${x + 9} L${x + 5},${y - h + 14} Z`, C.m1);
}

/* Caballete de pintor con un lienzo sin terminar, en primer término */
{
  const x = 190, b = 590;
  const g0 = s; s = '';
  s += S(`M${x - 50},${b} L${x - 8},${b - 150} M${x + 50},${b} L${x + 8},${b - 150} M${x},${b} L${x},${b - 130}`, C.stoneDk, 6);
  s += R(x - 56, b - 96, 112, 7, C.stoneDk);
  s += R(x - 44, b - 214, 88, 118, C.stone) + R(x - 38, b - 208, 76, 106, C.m8);
  s += R(x - 38, b - 208, 76, 56, C.m6) + Ci(x + 8, b - 176, 11, C.sun) + R(x - 38, b - 152, 76, 36, C.m4) + P(`M${x - 38},${b - 152} L${x - 14},${b - 176} L${x + 6},${b - 152} Z`, C.m2);
  s += R(x - 20, b - 132, 22, 22, C.alt) + R(x + 10, b - 128, 18, 14, C.m3) + R(x - 38, b - 106, 76, 4, C.m5);
  s += Ci(x + 74, b - 8, 5, C.m3) + Ci(x + 82, b - 10, 4, C.alt) + Ci(x + 66, b - 6, 4, C.sun);
  s = g0 + `<g transform="translate(850,590) scale(0.74) translate(-190,-590)">${s}</g>`;
}

save('murillo', s);
