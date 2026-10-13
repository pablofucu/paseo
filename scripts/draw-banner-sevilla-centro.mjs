// Portada de «Del río a la judería» (design/banners/sevilla-centro.svg, 960 × 600):
// el centro de Sevilla de día, en teal. La Giralda grande domina el centro con la
// nave de la Catedral y su Archivo de Indias de fondo; a la izquierda, la Torre del
// Oro de doce lados junto al Guadalquivir, con una barca; a la derecha, en primer
// término, la muralla almenada del Real Alcázar con naranjos del Barrio de Santa Cruz.
//
//   node scripts/draw-banner-sevilla-centro.mjs
import { W, H, paletteFor, R, P, S, Ci, arch, horse, dome, mix, cloud, bandedSky, tree, save } from './banner-kit.mjs';

const C = paletteFor('sevilla-centro');
let s = bandedSky([[0, C.m4], [140, C.m5], [300, C.m6], [430, C.m7]], 460);
s += cloud(60, 120, 1.2, C.m7) + cloud(690, 90, 1.4, C.m7) + cloud(820, 190, 0.9, C.m5);
s += Ci(850, 70, 22, C.sun);

s += '<g transform="translate(0,-70)">';
/* Ciudad lejana en teal */
{
  let x = 0, k = 0;
  while (x < W) {
    const w = 28 + (k * 19) % 36, h = 22 + (k * 13) % 30;
    s += R(x, 410 - h, w, h + 60, k % 2 ? C.m4 : C.m3);
    if (k % 3 === 0) s += R(x + 6, 410 - h + 6, 5, 7, C.m5);
    x += w; k++;
  }
}

/* Archivo de Indias: bloque sobrio de piedra, con ventanas, a la izquierda de la Catedral */
{
  const x = 250, y = 360;
  s += R(x, y, 120, 70, C.stone) + R(x - 3, y - 5, 126, 7, C.cream);
  for (let i = 0; i < 6; i++) s += R(x + 8 + i * 19, y + 12, 9, 14, C.m3) + arch(x + 8 + i * 19, y + 56, 9, 16, C.m2);
  for (let i = 0; i < 12; i++) s += R(x + 2 + i * 10, y - 11, 5, 7, C.cream);
}

/* Catedral: gran nave alta con contrafuertes, pináculos, arbotantes y cimborrio */
{
  const y = 350;
  s += R(370, y, 360, 84, C.stone) + R(370, y, 360, 8, C.cream) + R(370, y + 26, 360, 4, C.stoneDk);
  for (let x = 374; x < 728; x += 24) s += R(x, y + 8, 8, 76, C.stoneDk) + R(x - 1, y - 4, 10, 6, C.cream) + P(`M${x - 1},${y - 4} L${x + 4},${y - 34} L${x + 9},${y - 4} Z`, C.cream) + Ci(x + 4, y - 36, 2, C.gold);
  for (let x = 388; x < 728; x += 24) s += arch(x, y + 82, 9, 34, C.m2) + arch(x, y + 36, 9, 20, C.m3);
  s += R(620, y - 44, 76, 46, C.stone) + P(`M620,${y - 44} L658,${y - 70} L696,${y - 44} Z`, C.stoneDk) + dome(658, y - 70, 10, C.cream) + R(656, y - 90, 4, 12, C.gold);
  for (let x = 626; x < 692; x += 13) s += arch(x, y - 8, 7, 24, C.m2);
}

/* Torre del Oro: tres cuerpos, el primero dodecagonal ancho (caras en tonos distintos), con almenas y cúpula dorada */
{
  const cx = 150, base = 452;
  s += R(cx - 62, base - 8, 124, 12, C.stoneDk);
  const faces = (w, y, h) => { const cs = [C.goldDk, C.stone, C.gold, C.stone, C.stoneDk], ws = [0.14, 0.24, 0.24, 0.24, 0.14]; let p = '', x = cx - w / 2; ws.forEach((q, i) => { p += R(x, y, w * q + 0.6, h, mix(cs[i], C.stoneDk, 0.12)); x += w * q; }); return p; };
  const crown = (w, y) => { let p = R(cx - w / 2 - 3, y - 4, w + 6, 6, C.goldDk); for (let x = cx - w / 2 - 3; x < cx + w / 2 + 2; x += 9) p += R(x, y - 12, 5, 9, C.gold); return p; };
  s += faces(84, base - 66, 60) + crown(84, base - 66);
  for (const dx of [-26, -2, 22]) s += arch(cx + dx, base - 16, 9, 24, C.m1);
  s += R(cx - 42, base - 10, 84, 3, C.goldDk);
  s += faces(60, base - 112, 46) + crown(60, base - 112);
  for (const dx of [-17, 7]) s += R(cx + dx, base - 100, 10, 14, C.m1) + R(cx + dx - 2, base - 86, 14, 3, C.sun);
  s += faces(38, base - 148, 36) + R(cx - 22, base - 152, 44, 5, C.goldDk);
  s += Ci(cx, base - 132, 5, C.m1);
  s += dome(cx, base - 152, 16, C.gold) + dome(cx, base - 152, 9, C.sun) + R(cx - 1.5, base - 178, 3, 12, C.goldDk) + Ci(cx, base - 180, 3, C.sun);
}

/* La Giralda: fuste almohade, paños de sebka, campanario renacentista y Giraldillo */
{
  const cx = 505, top = 278, base = 470, w = 76, x0 = cx - w / 2;
  s += R(x0, top, w, base - top, C.stone) + R(x0, top, 8, base - top, C.cream) + R(x0 + w - 10, top, 10, base - top, C.stoneDk);
  const sebka = (y, h) => {
    let p = R(x0 + 14, y, w - 28, h, C.stoneDk);
    const cw = (w - 28) / 4;
    for (let i = 0; i < 4; i++) for (let yy = y + 4; yy < y + h - 10; yy += 16) {
      const xx = x0 + 14 + i * cw;
      p += P(`M${xx + cw / 2},${yy} L${xx + cw - 2},${yy + 8} L${xx + cw / 2},${yy + 16} L${xx + 2},${yy + 8} Z`, C.cream) + P(`M${xx + cw / 2},${yy + 4} L${xx + cw - 6},${yy + 8} L${xx + cw / 2},${yy + 12} L${xx + 6},${yy + 8} Z`, C.stoneDk);
    }
    return p + R(x0 + 12, y - 3, w - 24, 3, C.cream);
  };
  s += sebka(top + 14, 58) + sebka(top + 84, 42);
  for (const y of [top + 132, top + 180]) s += arch(cx - 9, y + 24, 7, 22, C.m2) + arch(cx + 2, y + 24, 7, 22, C.m2) + R(cx - 13, y + 24, 26, 3, C.cream);
  for (const y of [top + 150, top + 200]) s += arch(x0 + 12, y, 6, 14, C.m2) + arch(x0 + w - 18, y, 6, 14, C.m2);
  s += R(x0 - 6, top - 6, w + 12, 8, C.cream);
  const bw = w - 6, bx = cx - bw / 2, cw = (bw - 12) / 3;
  s += R(bx, top - 50, bw, 44, C.stone);
  for (let i = 0; i < 3; i++) s += arch(bx + 6 + i * cw, top - 10, cw - 6, 32, C.m1) + Ci(bx + 6 + i * cw + (cw - 6) / 2, top - 30, 4, C.gold);
  s += R(bx - 4, top - 54, bw + 8, 6, C.cream);
  for (let x = bx - 2; x < bx + bw + 2; x += 9) s += R(x, top - 62, 4, 8, C.cream);
  const t1 = 54, t2 = 40, t3 = 28;
  s += R(cx - t1 / 2, top - 96, t1, 34, C.stone) + arch(cx - 9, top - 66, 18, 24, C.m1) + R(cx - t1 / 2 - 3, top - 98, t1 + 6, 5, C.gold);
  s += R(cx - t2 / 2, top - 124, t2, 26, C.stone) + Ci(cx, top - 111, 7, C.m1) + R(cx - t2 / 2 - 3, top - 126, t2 + 6, 4, C.gold);
  s += R(cx - t3 / 2, top - 142, t3, 18, C.stone) + arch(cx - 5, top - 126, 10, 13, C.m1);
  s += dome(cx, top - 142, 14, C.gold) + R(cx - 2, top - 160, 4, 6, C.sun);
  s += S(`M${cx},${top - 158} V${top - 176}`, C.sun, 2) + Ci(cx, top - 162, 3.4, C.gold);
  s += P(`M${cx - 4},${top - 176} h8 l-1,-10 h-6 Z`, C.sun) + Ci(cx, top - 189, 3.2, C.sun) + P(`M${cx + 3},${top - 184} L${cx + 18},${top - 190} L${cx + 16},${top - 178} Z`, C.sun);
}

/* Río Guadalquivir y muelle */
s += R(0, 452, W, 230, C.m3) + R(0, 452, W, 6, C.m2);
for (let i = 0; i < 14; i++) { const y = 470 + i * 10, x = (i * 97) % 700; s += R(x, y, 70 + (i * 13) % 40, 2.5, C.m4) + R(x + 300, y + 4, 50, 2.5, C.m2); }
s += R(0, 446, 330, 10, C.stoneDk) + R(0, 456, 330, 4, C.m2);
// Reflejos de la Torre del Oro y la Giralda
s += R(120, 470, 60, 4, C.gold) + R(130, 484, 40, 3, C.goldDk) + R(480, 470, 50, 3, C.m4);

s += '</g>';
s += '<g transform="translate(0,-20)">' + (()=>{ let s = ""; s += P('M36,520 H150 Q138,544 112,546 H70 Q48,544 36,520 Z', C.alt) + R(36, 520, 114, 5, C.altLt) + R(86, 500, 3, 20, C.altDk) + P('M89,500 L89,518 L124,518 Z', C.cream); return s; })() + '</g>';
/* Muralla almenada del Alcázar en primer término, con puerta de arco y naranjos asomando */
{
  s += tree(660, 400, 38, C, 7) + tree(900, 398, 34, C, 6);
  const x = 580, y = 400;
  const wl = mix(C.stone, C.m3, 0.55); s += R(x, y, W - x, H - y, wl) + R(x, y, W - x, 8, C.m6);
  for (let mx = x; mx < W; mx += 26) s += R(mx, y - 16, 14, 18, wl) + R(mx, y - 16, 14, 4, C.m6);
  for (let ry = y + 24; ry < H; ry += 22) for (let rx = x + (ry % 44 ? 0 : 20); rx < W; rx += 40) s += R(rx, ry, 18, 3, C.m4);
  s += R(x, y + 8, 10, H - y, C.m2) + R(x + 10, y + 8, 5, H - y, C.stoneDk);
  s += horse(740, 600, 70, 100, C.m1) + horse(752, 600, 46, 80, C.m2);
  for (const wx of [650, 850]) s += arch(wx, y + 70, 20, 40, C.m2) + R(wx - 4, y + 70, 28, 4, C.altDk);
  for (let i = 0; i < 5; i++) s += R(600 + i * 74, 584, 40, 16, C.alt) + R(600 + i * 74, 584, 40, 4, C.altLt);
}
save('sevilla-centro', s);
