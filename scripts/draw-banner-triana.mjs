// Portada de «Triana: cerámica y flamenco» (design/banners/triana.svg, 960 × 600):
// atardecer violeta sobre el Guadalquivir. El puente de Isabel II (puente de
// Triana) cruza el río con sus tres arcos de hierro y los anillos en las
// enjutas; en su extremo derecho, la Capillita del Carmen (ladrillo y cúpula de
// azulejos) y, detrás, las casas de colores de la calle Betis. En primer término,
// a la izquierda, una fachada de los talleres de la calle Alfarería con
// azulejos y platos de cerámica colgados. El mercado y el corral quedan en la
// fila de casas de Betis (tejados, azoteas y un patio con ropa tendida).
import { W, H, paletteFor, R, P, S, Ci, arch, dome, mix, f, bandedSky, save } from './banner-kit.mjs';
const C = paletteFor('triana');
let s = '';

/* Cielo del atardecer en bandas y sol bajo detrás del puente */
s += bandedSky([[0, C.m1], [70, C.m2], [160, C.m4], [240, C.m6], [305, C.m7], [350, mix(C.m7, C.sun, 0.45)]], 370);
const sx = 300, sy = 318;
for (const [r, t] of [[130, 0.18], [92, 0.3], [60, 0.5]]) s += Ci(sx, sy, r, mix(C.m6, C.sun, t));
s += Ci(sx, sy, 30, C.sun);
for (const [x, y, w] of [[40, 130, 230], [600, 100, 260], [740, 190, 190], [120, 220, 150]]) s += R(x, y, w, 6, mix(C.m4, C.m6, 0.5)) + R(x + 36, y + 8, w * 0.6, 4, mix(C.m4, C.m6, 0.5));
for (const [x, y] of [[80, 40], [220, 80], [470, 30], [700, 60], [860, 30], [900, 110], [560, 90]]) s += Ci(x, y, 1.6, C.m7);

s += '<g transform="translate(-57.6 -116.6) scale(1.12)">';
/* Sevilla lejana a la izquierda (Torre del Oro, azoteas, espadañas) */
{
  const y0 = 410;
  let x = 0, k = 0;
  while (x < 600) { const w = 30 + (k * 17) % 30, h = 12 + (k * 11) % 20; s += R(x, y0 - h, w, h + 6, k % 2 ? C.m3 : C.m4); if (k % 3 === 0) s += R(x + 6, y0 - h + 5, 4, 5, C.win); x += w; k++; }
  for (const tx of [210, 470]) s += R(tx, y0 - 50, 8, 50, C.m3) + P(`M${tx},${y0 - 50} L${tx + 4},${y0 - 62} L${tx + 8},${y0 - 50} Z`, C.m3);
}

/* Casas de la calle Betis sobre el muro del río (derecha): mercado, corral, fachadas de colores */
{
  const q = 430, fac = [[470, 66, 66, C.cream], [536, 52, 84, C.alt], [588, 60, 60, C.white], [676, 0, 0, C.cream], [750, 56, 92, mix(C.stone, C.sun, 0.45)], [806, 64, 70, C.altLt], [870, 58, 100, C.cream], [928, 70, 74, C.alt]];
  s += R(450, q - 8, 510, 190, C.m2);
  fac.forEach(([x, w, h, col], i) => {
    const y = q - h;
    s += R(x, y, w, h + 6, col);
    const roof = i % 2 ? C.alt : C.altDk;
    s += i === 2 ? R(x - 3, y - 6, w + 6, 8, C.m3) + R(x + 6, y - 14, w - 12, 8, C.m4) : P(`M${x - 4},${y} L${x + 10},${y - 14} H${x + w - 10} L${x + w + 4},${y} Z`, roof);
    for (let wy = y + 12; wy < q - 14; wy += 24) for (let wx = x + 9; wx < x + w - 14; wx += 20) s += R(wx, wy, 9, 14, (wx + wy + i) % 3 ? C.win : C.m2) + R(wx - 2, wy + 14, 13, 2.5, C.m3);
    s += arch(x + w / 2 - 6, q + 4, 12, 20, C.m1);
  });
  // Corral de vecinos: patio abierto con ropa tendida y macetas
  s += R(748, q - 30, 8, 30, C.m3) + S(`M${762},${q - 40} Q${780},${q - 34} ${798},${q - 40}`, C.white, 1.6) + R(772, q - 38, 7, 9, C.altLt) + R(783, q - 36, 7, 9, C.m6);
  // Muro de piedra del Betis con sus arcos
  s += R(450, q, 510, 18, C.stoneDk) + R(450, q - 2, 510, 4, C.stone);
  for (let x = 530; x < 960; x += 36) s += arch(x, q + 18, 14, 14, C.m2);
}

/* Puente de Isabel II: tres arcos de hierro con anillos en las enjutas */
{
  const deck = 338, spr = 424, xs = [30, 240, 450, 660], iron = C.m0;
  // pilas de piedra con tajamar
  for (const x of xs.slice(1, 3)) s += P(`M${x - 11},${spr + 18} V${deck + 4} H${x + 11} V${spr + 18} L${x},${spr + 30} Z`, C.m3);
  for (let i = 0; i < 3; i++) {
    const a = xs[i], b = xs[i + 1], mx = (a + b) / 2, cr = deck + 22;
    // enjuta: relleno con anillos
    s += P(`M${a},${spr} Q${mx},${cr - 52} ${b},${spr} V${deck + 6} H${a} Z`, mix(C.m1, C.m3, 0.35));
    for (let k = 1; k < 8; k++) {
      const t = k / 8, x = a + (b - a) * t, top = deck + 10, bot = spr - 4 * Math.sin(Math.PI * t) * 0 - (spr - (cr - 26)) * Math.sin(Math.PI * t) * 0.0;
      const archY = (1 - t) ** 2 * spr + 2 * t * (1 - t) * (cr - 52) + t * t * spr, r = Math.max(4, (archY - top - 5) / 2);
      s += Ci(x, top + r + 1, r, mix(C.m4, C.m6, 0.25)) + Ci(x, top + r + 1, r * 0.62, mix(C.m1, C.m3, 0.35));
    }
    // costillas del arco (doble) y luz bajo el arco
    s += S(`M${a + 2},${spr} Q${mx},${cr - 52} ${b - 2},${spr}`, iron, 7) + S(`M${a + 2},${spr + 8} Q${mx},${cr - 40} ${b - 2},${spr + 8}`, iron, 4);
  }
  s += R(xs[0], deck - 2, xs[3] - xs[0], 10, C.m1) + R(xs[0], deck - 5, xs[3] - xs[0], 3, C.m5);
  for (let x = xs[0]; x < xs[3]; x += 12) s += R(x, deck - 17, 2.4, 13, C.m1);
  s += R(xs[0], deck - 18, xs[3] - xs[0], 3, C.m1);
  for (let x = xs[0] + 40; x < xs[3]; x += 105) s += R(x - 1.5, deck - 40, 3, 24, C.m1) + Ci(x, deck - 42, 4.5, C.win);
  // tranvía y gente sobre el tablero, pequeños
  for (const [x, c] of [[160, C.m5], [420, C.alt], [650, C.m6]]) s += R(x, deck - 14, 7, 10, c) + Ci(x + 3.5, deck - 17, 2.8, C.stoneDk);
}

/* Capillita del Carmen en el extremo del puente: ladrillo, cúpula de azulejos, espadaña */
{
  const x = 676, y = 338, w = 74, bt = y - 52;
  s += R(x - 6, y - 6, w + 12, 100, C.m3) + R(x, bt, w, 52 + 16, C.altDk);
  for (let yy = bt + 6; yy < y + 10; yy += 8) s += R(x, yy, w, 1.5, C.alt);
  s += R(x - 4, bt - 4, w + 8, 6, C.cream) + R(x + 12, bt - 24, w - 24, 22, C.altDk) + R(x + 10, bt - 26, w - 20, 4, C.cream);
  s += dome(x + w / 2, bt - 24, 24, C.m5);
  for (let i = -2; i <= 2; i++) s += S(`M${f(x + w / 2 + i * 8)},${bt - 24} Q${f(x + w / 2 + i * 9)},${bt - 40} ${f(x + w / 2 + i * 3)},${bt - 46}`, i % 2 ? C.white : C.m3, 3);
  s += R(x + w / 2 - 3, bt - 56, 6, 10, C.cream) + dome(x + w / 2, bt - 56, 4.5, C.gold) + S(`M${x + w / 2},${bt - 61} v-8 M${x + w / 2 - 3},${bt - 66} h6`, C.goldDk, 1.8);
  s += arch(x + w / 2 - 11, y + 8, 22, 40, C.m1) + arch(x + w / 2 - 7, y + 8, 14, 34, C.win) + R(x + 8, bt + 8, 10, 16, C.cream) + R(x + w - 18, bt + 8, 10, 16, C.cream);
  s += R(x + 11, bt + 11, 4, 10, C.m3) + R(x + w - 15, bt + 11, 4, 10, C.m3);
  s += S(`M${x - 8},${y + 90} H${x + w + 8}`, C.stone, 3);
}

s += '</g>';
/* Río: bandas violetas con reflejos del sol y de las casas (entre el paseo y el puente) */
{
  for (let y = 358; y < H; y += 10) s += R(0, y, W, 11, mix(C.m3, C.m1, Math.min(1, (y - 358) / 200)));
  for (let i = 0; i < 8; i++) { const y = 368 + i * 12, w = 120 - i * 9; s += R(sx - w / 2 + (i % 2) * 14, y, w, 3.5, i % 2 ? C.sun : mix(C.m7, C.sun, 0.5)); }
  for (const [x, w, c] of [[560, 56, C.cream], [640, 56, C.alt], [800, 60, C.stone], [870, 56, C.altLt], [940, 56, C.cream]]) s += R(x, 372, w, 4, mix(c, C.m3, 0.55)) + R(x + 8, 383, w - 14, 3, mix(c, C.m2, 0.6));
  for (let k = 0; k < 22; k++) s += R((k * 83) % 900, 395 + (k * 37) % 100, 28 + (k * 13) % 40, 2.5, mix(C.m3, C.m6, 0.35));
  s += P('M420,430 H470 L462,439 H428 Z', C.alt) + R(443, 412, 2.4, 18, C.cream) + P('M446,412 L464,428 H446 Z', C.white);
}

/* Primer término: paseo de Triana con pretil; sobre él, la fachada de un taller de cerámica de la calle Alfarería */
{
  s += R(0, 500, W, 100, mix(C.m2, C.m3, 0.45));
  for (let x = 0; x < W; x += 60) s += R(x, 540 + (x / 60 % 2) * 20, 38, 3, mix(C.m3, C.m4, 0.5)) + R(x + 24, 575, 30, 3, C.m2);
  // pretil con barandilla sobre el río
  s += R(290, 488, 670, 14, C.m4) + R(290, 484, 670, 5, C.m5);
  for (let x = 300; x < 960; x += 22) s += R(x, 462, 3.5, 24, C.m1) + Ci(x + 1.7, 460, 3.5, C.m1);
  s += R(290, 458, 670, 3, C.m1);
  // fachada del taller
  const w = 290, y = 410, b = 540;
  s += R(0, y, w, b - y, C.cream) + R(0, y, w, 8, C.altDk) + P(`M-4,${y} L-4,${y - 22} L${w - 20},${y - 8} L${w + 4},${y} Z`, C.alt);
  for (let tx = 0; tx < w; tx += 16) s += R(tx, y + 8, 14, 5, C.alt);
  for (let r = 0; r < 4; r++) for (let c = 0; c * 20 < w; c++) {
    const tx = c * 20, ty = b - 80 + r * 20, odd = (r + c) % 2;
    s += R(tx, ty, 19, 19, odd ? C.m4 : C.white) + Ci(tx + 9.5, ty + 9.5, 5, odd ? C.white : C.m3) + Ci(tx + 9.5, ty + 9.5, 2, odd ? C.m3 : C.sun);
  }
  s += R(0, b - 84, w, 4, C.m1) + R(0, b, w + 4, 6, C.stoneDk);
  for (const [px, py, r, c1, c2] of [[40, 448, 24, C.m3, C.m6], [92, 432, 15, C.alt, C.altLt], [138, 456, 22, C.m5, C.white], [196, 436, 18, C.m3, C.sun], [246, 452, 24, C.alt, C.cream]]) {
    s += Ci(px, py, r + 3, C.stoneDk) + Ci(px, py, r, C.white) + Ci(px, py, r * 0.8, c1) + Ci(px, py, r * 0.52, c2) + Ci(px, py, r * 0.22, c1);
    for (let a = 0; a < 8; a++) s += Ci(px + Math.cos(a * 0.785) * r * 0.66, py + Math.sin(a * 0.785) * r * 0.66, r * 0.07 + 0.8, C.white);
  }
  // macetas apoyadas en el paseo
  for (const [px, ph, c] of [[350, 34, C.alt], [420, 28, C.m5], [600, 38, C.alt], [840, 30, C.m5]]) { const g = 582; s += P(`M${px - 16},${g - ph} H${px + 16} L${px + 12},${g} H${px - 12} Z`, c) + R(px - 18, g - ph - 4, 36, 6, mix(c, C.white, 0.35)) + Ci(px, g - ph - 16, 12, C.leaf) + Ci(px + 8, g - ph - 22, 8, C.leafDk); }
}
save('triana', s);
