// Portada de «El Madrid de los Austrias» (design/banners/austrias.svg, 960 × 600):
// la Plaza Mayor al atardecer, vista desde el centro de la plaza. Al fondo la
// Casa de la Panadería con sus dos torres de chapiteles de pizarra (turquesa)
// y las fachadas rojizas de tres alturas con balcones sobre los soportales;
// delante, la estatua ecuestre de Felipe III. Asoman detrás, a lo lejos, la
// cúpula de la Almudena (izquierda) y la fachada blanca del Palacio Real (derecha).
//
//   node scripts/draw-banner-austrias.mjs
import { W, H, paletteFor, R, P, S, Ci, arch, dome, mix, cloud, bandedSky, save } from './banner-kit.mjs';

const C = paletteFor('austrias');
let s = bandedSky([[0, C.m6], [150, C.m7], [260, C.m8], [330, mix(C.m8, C.win, 0.35)]], 460);
s += Ci(250, 280, 46, mix(C.m8, C.win, 0.6)) + Ci(250, 280, 26, C.sun);
s += cloud(120, 90, 1.2, C.m8) + cloud(700, 70, 1.4, C.m8) + cloud(520, 150, 0.9, mix(C.m7, C.m8, 0.5));

/* Almudena a lo lejos: tambor, cúpula y cruz sobre las azoteas de la izquierda */
{
  const cx = 150, y = 300;
  s += R(cx - 60, y, 120, 50, C.m5) + R(cx - 34, y - 34, 68, 36, mix(C.m5, C.white, 0.3));
  for (let x = cx - 28; x < cx + 28; x += 14) s += arch(x, y - 4, 7, 20, C.m4);
  s += dome(cx, y - 34, 40, C.m5) + dome(cx, y - 34, 40, mix(C.m5, C.m6, 0.5)).replace('/>', ' opacity="0.5"/>');
  for (let a = -24; a <= 24; a += 12) s += S(`M${cx + a},${y - 34} Q${cx + a * 0.9},${y - 58} ${cx + a * 0.1},${y - 72}`, C.m4, 1.4);
  s += R(cx - 6, y - 86, 12, 14, C.m5) + S(`M${cx},${y - 104} V${y - 86} M${cx - 6},${y - 97} H${cx + 6}`, C.m3, 2.4);
  for (const dx of [-52, 52]) s += R(cx + dx - 7, y - 24, 14, 26, C.m5) + dome(cx + dx, y - 24, 7, C.m4);
}
/* Palacio Real a lo lejos, a la derecha: muy horizontal, piedra clara con columnas y balaustrada */
{
  const x = 690, y = 322, w = 250;
  s += R(x, y - 22, w, 62, C.stone) + R(x, y + 24, w, 16, mix(C.stone, C.m6, 0.5)) + R(x - 4, y - 28, w + 8, 8, C.cream);
  for (let i = x; i < x + w; i += 6) s += R(i, y - 40, 3, 12, C.cream) + R(i + 3, y - 40, 1.5, 12, C.m6);
  s += R(x + 80, y - 52, 90, 26, C.cream) + P(`M${x + 76},${y - 52} L${x + 125},${y - 66} L${x + 174},${y - 52} Z`, C.stone) + R(x + 76, y - 54, 98, 3, C.m6);
  for (let i = x + 8; i < x + w - 8; i += 12) s += R(i, y - 14, 6, 14, C.m5) + R(i, y + 8, 6, 14, C.m5);
  for (let i = x + 4; i < x + w; i += 16) s += R(i, y - 22, 3, 62, C.cream) + R(i + 3, y - 22, 1.5, 62, C.m6);
  for (const i of [x + 86, x + 106, x + 126, x + 146]) s += R(i, y - 48, 5, 18, C.m5);
}

/* Fachadas de la plaza: tres alturas rojizas con balcones; soportales en sombra */
const gy = 455, roofY = 335;
function wing(x0, x1, tall) {
  const top = roofY + (tall ? -8 : 0), h = gy - top;
  s += R(x0, top, x1 - x0, h, C.m3) + R(x0, top - 8, x1 - x0, 10, C.m2);
  for (let x = x0 + 3; x < x1 - 8; x += 11) s += P(`M${x},${top - 8} l4,-8 l4,8 Z`, C.m2);
  s += R(x0, top + 8, x1 - x0, 130 - 8 - 14, mix(C.m3, C.m2, 0.15)).replace(/fill="[^"]+"/, `fill="${C.m3}"`);
  // soportales: arcos en sombra con pilares
  const a0 = gy - 44;
  s += R(x0, a0 - 6, x1 - x0, 50, C.m4) + R(x0, a0 - 8, x1 - x0, 4, C.m5);
  for (let x = x0 + 6; x < x1 - 20; x += 28) s += arch(x, gy, 20, 40, C.m1) + arch(x + 4, gy, 12, 30, C.m0);
  // tres alturas de balcones
  for (let row = 0; row < 3; row++) {
    const wy = top + 14 + row * 34;
    for (let x = x0 + 10; x < x1 - 24; x += 28) {
      s += R(x, wy, 14, 22, (x + row) % 3 === 0 ? C.win : C.m1) + R(x - 2, wy + 20, 18, 3, C.m2) + R(x - 2, wy + 17, 18, 1.6, C.altDk);
      s += R(x - 2, wy - 2, 18, 2, C.m5);
    }
  }
}
wing(60, 345, false); wing(615, 900, false);
wing(0, 60, true); wing(900, 960, true);

/* Casa de la Panadería: cuerpo central con pinturas, balcones y dos torres con chapiteles */
{
  const x0 = 335, x1 = 625, top = 318, tw = 52;
  s += R(x0, top, x1 - x0, gy - top, C.m4) + R(x0, top - 8, x1 - x0, 10, C.m2);
  // friso de pinturas
  s += R(x0 + 56, top + 8, x1 - x0 - 112, 64, C.cream) + R(x0 + 60, top + 12, x1 - x0 - 120, 56, C.stone);
  for (let i = 0; i < 5; i++) {
    const px = x0 + 63 + i * 33;
    s += R(px, top + 16, 28, 48, mix(C.m6, C.m5, i % 2 * 0.6)) + Ci(px + 14, top + 30, 6, i % 2 ? C.gold : C.altLt) + R(px + 5, top + 40, 18, 18, i % 2 ? C.m3 : C.alt);
  }
  for (let row = 0; row < 2; row++) for (let x = x0 + 64; x < x1 - 70; x += 30) s += R(x, top + 82 + row * 32, 14, 22, C.m1) + R(x - 2, top + 102 + row * 32, 18, 3, C.m2);
  // soportal central
  s += R(x0, gy - 44, x1 - x0, 46, C.m4);
  for (let x = x0 + 62; x < x1 - 66; x += 30) s += arch(x, gy, 22, 42, C.m1) + arch(x + 4, gy, 14, 32, C.m0);
  // torres
  for (const tx of [x0 - 6, x1 - tw + 6]) {
    s += R(tx, 250, tw, gy - 250, C.m3) + R(tx, 250, 8, gy - 250, C.m4) + R(tx - 3, 244, tw + 6, 8, C.m2);
    s += R(tx + 14, 262, 24, 34, C.m1) + arch(tx + 14, 296, 24, 34, C.m1) + Ci(tx + 26, 276, 5, C.gold);
    for (let r = 0; r < 3; r++) s += R(tx + 8, 320 + r * 34, 12, 18, C.m1) + R(tx + 32, 320 + r * 34, 12, 18, C.m1) + R(tx + 6, 336 + r * 34, 16, 3, C.m2) + R(tx + 30, 336 + r * 34, 16, 3, C.m2);
    // chapitel de pizarra: aguja con buhardilla y bola
    const cx = tx + tw / 2, sd = mix(C.alt, C.altDk, 0.2);
    s += P(`M${tx - 5},244 L${cx},146 L${tx + tw + 5},244 Z`, C.alt) + P(`M${cx},146 L${tx + tw + 5},244 L${cx + 6},244 Z`, C.altDk);
    s += P(`M${tx - 8},244 L${cx},222 L${tx + tw + 8},244 Z`, sd);
    s += R(cx - 7, 190, 14, 16, C.altDk) + P(`M${cx - 9},190 L${cx},176 L${cx + 9},190 Z`, C.alt) + R(cx - 3, 194, 6, 10, C.win);
    s += S(`M${cx},146 V124`, C.goldDk, 2) + Ci(cx, 140, 3.4, C.gold) + Ci(cx, 124, 2.6, C.sun);
  }
}

/* Plaza: suelo claro con adoquinado y sombra de los soportales */
s += R(0, gy, W, H - gy, C.m5) + R(0, gy, W, 10, C.m2);
for (let y = gy + 22, k = 0; y < H; y += 20 + k * 3, k++) for (let x = (k % 2) * 17; x < W; x += 34 + k * 3) s += R(x, y, 15 + k, 3, C.m4);
s += P(`M0,${H} L0,520 Q480,470 ${W},520 L${W},${H} Z`, mix(C.m5, C.m6, 0.5));

/* Estatua ecuestre de Felipe III: pedestal de piedra apoyado en el suelo, caballo al paso y jinete con sombrero */
{
  const cx = 480, b = 566, k = C.m0, k2 = C.m1;
  s += `<ellipse cx="${cx}" cy="${b + 2}" rx="78" ry="8" fill="${C.m3}"/>`;
  s += R(cx - 66, b - 10, 132, 12, C.stoneDk) + R(cx - 58, b - 62, 116, 54, C.stone) + R(cx - 64, b - 68, 128, 8, C.cream) + R(cx - 44, b - 52, 88, 30, C.cream) + R(cx - 40, b - 48, 80, 22, C.m6);
  s += R(cx - 58, b - 62, 12, 54, C.stoneDk).replace('/>', ' opacity="0.35"/>');
  const y0 = b - 68;
  // cola, cuerpo, cuello y cabeza
  s += P(`M${cx - 46},${y0 - 58} Q${cx - 66},${y0 - 44} ${cx - 62},${y0 - 18} Q${cx - 56},${y0 - 40} ${cx - 40},${y0 - 50} Z`, k);
  s += `<ellipse cx="${cx - 4}" cy="${y0 - 52}" rx="46" ry="17" fill="${k}"/>`;
  s += P(`M${cx + 28},${y0 - 56} Q${cx + 40},${y0 - 84} ${cx + 52},${y0 - 90} L${cx + 70},${y0 - 80} L${cx + 66},${y0 - 72} L${cx + 56},${y0 - 74} Q${cx + 52},${y0 - 56} ${cx + 44},${y0 - 44} Z`, k);
  s += P(`M${cx + 48},${y0 - 90} L${cx + 52},${y0 - 98} L${cx + 56},${y0 - 90} Z`, k) + S(`M${cx + 34},${y0 - 76} Q${cx + 38},${y0 - 64} ${cx + 32},${y0 - 52}`, k2, 3);
  // patas: traseras apoyadas, delantera derecha levantada
  s += S(`M${cx - 32},${y0 - 44} L${cx - 38},${y0 - 22} L${cx - 36},${y0 - 2}`, k, 7) + S(`M${cx - 18},${y0 - 40} L${cx - 14},${y0 - 20} L${cx - 20},${y0 - 2}`, k2, 6);
  s += S(`M${cx + 20},${y0 - 40} L${cx + 22},${y0 - 20} L${cx + 20},${y0 - 2}`, k2, 6) + S(`M${cx + 34},${y0 - 44} L${cx + 52},${y0 - 36} L${cx + 56},${y0 - 22}`, k, 6.5);
  // jinete: torso erguido, brazo con bastón de mando, cabeza y sombrero
  s += P(`M${cx - 6},${y0 - 64} L${cx + 8},${y0 - 64} L${cx + 6},${y0 - 98} L${cx - 4},${y0 - 98} Z`, k2) + P(`M${cx - 10},${y0 - 66} L${cx + 14},${y0 - 66} L${cx + 12},${y0 - 76} L${cx - 8},${y0 - 76} Z`, k2);
  s += S(`M${cx + 6},${y0 - 92} L${cx + 22},${y0 - 98}`, k2, 3.4) + S(`M${cx + 22},${y0 - 98} L${cx + 30},${y0 - 112}`, C.goldDk, 2);
  s += S(`M${cx - 4},${y0 - 62} L${cx - 2},${y0 - 44}`, k, 4.5);
  s += Ci(cx + 1, y0 - 104, 6, k2) + R(cx - 9, y0 - 108, 20, 3, k2) + P(`M${cx - 5},${y0 - 108} Q${cx + 1},${y0 - 124} ${cx + 8},${y0 - 108} Z`, k2) + S(`M${cx + 6},${y0 - 118} Q${cx + 14},${y0 - 122} ${cx + 16},${y0 - 114}`, C.m4, 2);
}
/* Gente pequeña paseando y farolas */
for (const [x, y, c] of [[250, 505, C.alt], [290, 520, C.cream], [680, 510, C.gold], [730, 530, C.altLt], [820, 505, C.cream]])
  s += R(x - 4, y - 18, 8, 16, c) + Ci(x, y - 23, 4.2, C.stone) + R(x - 3, y - 2, 2.6, 8, C.m1) + R(x + 0.5, y - 2, 2.6, 8, C.m1);
for (const x of [200, 760]) s += R(x - 1.5, 440, 3, 70, C.m1) + R(x - 7, 436, 14, 6, C.m1) + Ci(x, 430, 6, C.win) + P(`M${x - 7},424 h14 l-7,-9 Z`, C.m1);

save('austrias', s);
