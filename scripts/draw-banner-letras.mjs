// Dibuja la ilustración de portada del tour «El Barrio de las Letras»
// (design/banners/letras.svg, 960 × 600): anochecer azul en una calle del
// barrio, con casas estrechas de balcones de hierro y ventanas encendidas
// (las de Cervantes, Lope de Vega y Quevedo), el Teatro Español de fachada
// neoclásica al fondo de la plaza de Santa Ana, farolas fernandinas y, en el
// suelo del primer término, las franjas doradas de los versos de la calle Huertas.
//
//   node scripts/draw-banner-letras.mjs
import { paletteFor, R, P, S, Ci, arch, mix, bandedSky, save } from './banner-kit.mjs';

const C = paletteFor('letras');
let s = '';

/* Cielo del anochecer en bandas, de azul casi noche a azul claro en el horizonte */
s += bandedSky([[0, C.m1], [90, C.m2], [190, C.m3], [290, C.m4], [380, C.m5]], 440);
for (const [x, y, r] of [[80, 30, 1.8], [210, 70, 1.4], [330, 24, 1.6], [650, 40, 1.8], [770, 20, 1.4], [890, 80, 1.8], [560, 90, 1.2], [140, 120, 1.2]]) s += Ci(x, y, r, C.m8);
s += Ci(715, 92, 17, C.cream) + Ci(722, 88, 15, C.m2); // luna menguante
for (const [x, y, w] of [[330, 190, 200], [600, 160, 150]]) s += R(x, y, w, 5, C.m4) + R(x + 24, y + 8, w * 0.6, 3, C.m4);

/* Casco antiguo lejano detrás de la plaza */
for (let x = 250, k = 0; x < 760; x += 34 + (k * 11) % 20, k++) { const h = 40 + (k * 17) % 50; s += R(x, 380 - h, 40, h + 40, k % 2 ? C.m3 : C.m2); if (k % 2) s += R(x + 14, 380 - h + 10, 6, 8, C.win); }

/* Teatro Español: fachada neoclásica con pórtico, frontón y cuerpos laterales */
{
  const y = 430, x = 392, w = 216;
  s += R(x - 70, y - 86, 70, 86, C.stone) + R(x + w, y - 86, 70, 86, C.stone) + R(x - 74, y - 92, 78, 8, C.stoneDk) + R(x + w - 4, y - 92, 78, 8, C.stoneDk);
  for (const bx of [x - 58, x - 32, x + w + 14, x + w + 40]) s += arch(bx, y - 40, 14, 30, C.m2) + R(bx + 3, y - 62, 8, 12, C.win);
  s += R(x, y - 150, w, 150, C.cream) + R(x - 6, y - 156, w + 12, 8, C.stone);
  s += P(`M${x - 10},${y - 156} L${x + w / 2},${y - 204} L${x + w + 10},${y - 156} Z`, C.cream) + P(`M${x + 14},${y - 160} L${x + w / 2},${y - 196} L${x + w - 14},${y - 160} Z`, C.stone) + Ci(x + w / 2, y - 172, 8, C.win);
  s += R(x + w / 2 - 3, y - 214, 6, 12, C.stoneDk) + Ci(x + w / 2, y - 217, 4, C.gold);
  s += R(x + 12, y - 150, w - 24, 126, C.stoneDk);
  for (let i = 0; i < 4; i++) s += arch(x + 34 + i * 42, y - 24, 22, 58, C.win);
  for (let i = 0; i < 6; i++) s += R(x + 12 + i * 38, y - 150, 10, 126, C.white) + R(x + 9 + i * 38, y - 154, 16, 5, C.stone);
  s += R(x - 4, y - 24, w + 8, 24, C.stone) + R(x - 10, y - 8, w + 20, 8, C.stoneDk);
  for (let i = 0; i < 5; i++) s += R(x + 40 + i * 34, y - 134, 20, 6, C.goldDk);
}

/* Edificios de la calle a los dos lados: estrechos, con balcones de hierro */
function casa(x, top, w, fill, tejado, nplantas, opts = {}) {
  const base = 520, dark = opts.dark ?? C.m1, lit = opts.lit ?? 3;
  let g = R(x, top, w, base - top, fill) + R(x - 3, top - 8, w + 6, 10, tejado) + R(x, top + 2, w, 3, mix(fill, C.white, 0.25));
  const step = (base - top - 40) / nplantas, cols = Math.max(1, Math.floor(w / 34)), cw = w / cols;
  for (let r = 0; r < nplantas; r++) for (let c = 0; c < cols; c++) {
    const wx = x + c * cw + cw / 2 - 8, wy = top + 20 + r * step, on = (c * 3 + r * 5 + Math.floor(x)) % 7 < lit;
    g += R(wx - 3, wy - 3, 22, 34, mix(fill, C.white, 0.35)) + R(wx, wy, 16, 28, on ? C.win : dark);
    if (r > 0 || opts.balc) g += R(wx - 6, wy + 24, 28, 3, C.m0) + S(`M${wx - 5},${wy + 24} V${wy + 14} M${wx + 21},${wy + 24} V${wy + 14} M${wx + 8},${wy + 24} V${wy + 14} M${wx - 5},${wy + 14} H${wx + 21}`, C.m0, 1.3);
  }
  return g + R(x, base - 34, w, 34, mix(fill, C.m0, 0.35));
}
// Lado izquierdo (más cerca, más alto)
s += casa(0, 120, 96, C.m2, C.m0, 5, { balc: 1 }) + casa(96, 170, 84, C.cream, C.altDk, 4, { lit: 4 }) + casa(180, 214, 74, C.m3, C.m1, 3) + casa(254, 262, 70, C.alt, C.altDk, 3, { lit: 4 }) + casa(324, 320, 70, C.m4, C.m2, 2);
// Lado derecho
s += casa(866, 130, 94, C.m2, C.m0, 5, { balc: 1 }) + casa(780, 190, 86, C.stone, C.altDk, 4, { lit: 4 }) + casa(712, 244, 68, C.m3, C.m1, 3) + casa(650, 290, 62, C.cream, C.alt, 3, { lit: 4 }) + casa(606, 332, 46, C.m4, C.m2, 2);
// Placas con el nombre de las casas-museo (solo rectángulos)
s += R(110, 250, 20, 8, C.gold) + R(792, 262, 20, 8, C.gold);

/* Plaza y calle: adoquín en sombra azul */
s += R(0, 506, 960, 94, C.m1) + R(0, 506, 960, 6, C.m3);
s += P('M392,440 H608 L780,600 H180 Z', C.m2);
s += P('M392,440 H608 L640,470 H360 Z', C.m3);
for (let i = 0; i < 6; i++) s += R(150 + i * 26, 566 - (i % 2) * 20, 18, 3, C.m3) + R(700 - i * 24, 560 + (i % 2) * 14, 16, 3, C.m3);
// Versos dorados en el suelo (trazos sin letras) a lo largo de la calle Huertas
for (const [y, x0, x1] of [[480, 330, 640], [510, 280, 690], [546, 230, 740], [584, 170, 800]]) {
  s += R(x0, y, x1 - x0, 6, C.gold);
  for (let x = x0 + 8, k = 0; x < x1 - 10; x += 12 + (k * 5) % 14, k++) s += R(x, y - 5, 4 + (k * 3) % 8, 4, C.sun) + R(x + 3, y + 8, 3 + (k * 7) % 9, 3, C.goldDk);
}

/* Farolas fernandinas */
function farola(x, y, h) {
  let g = R(x - 5, y - 8, 10, 8, C.m0) + R(x - 2, y - h, 4, h, C.m0) + R(x - 4, y - 28, 8, 6, C.m0);
  g += S(`M${x},${y - h + 14} Q${x - 18},${y - h + 14} ${x - 22},${y - h + 2} M${x},${y - h + 14} Q${x + 18},${y - h + 14} ${x + 22},${y - h + 2}`, C.m0, 3);
  for (const lx of [x - 22, x + 22]) g += Ci(lx, y - h - 6, 14, mix(C.m4, C.win, 0.3)) + R(lx - 6, y - h - 12, 12, 16, C.win) + P(`M${lx - 9},${y - h - 12} L${lx},${y - h - 22} L${lx + 9},${y - h - 12} Z`, C.m0);
  return g + Ci(x, y - h - 6, 6, C.win) + R(x - 2, y - h - 22, 4, 14, C.m0);
}
s += farola(130, 560, 190) + farola(836, 556, 200) + farola(344, 480, 110) + farola(646, 480, 110);

/* Árbol de la plaza y gente pequeña paseando */
s += R(512, 436, 6, 30, C.m0) + Ci(515, 424, 22, C.leafDk) + Ci(502, 432, 15, C.leaf) + Ci(530, 430, 15, C.leafDk);
for (const [x, y, c] of [[438, 500, C.altLt], [450, 502, C.m6], [560, 506, C.cream], [572, 504, C.alt]]) s += R(x - 4, y - 18, 8, 18, c) + Ci(x, y - 23, 4.5, C.stone);

save('letras', s);
