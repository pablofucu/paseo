// Dibuja la ilustración de portada de Sevilla (design/banners/sevilla.svg,
// 960 × 600): la ciudad al anochecer vista desde lo alto de las Setas, con la
// Giralda grande e iluminada en el centro, la Catedral detrás, el edificio rojo
// y blanco, el árbol redondo y la iglesia barroca dorada a la derecha.
// Es la portada de la ruta y de la ciudad, no la postal ni el sello.
// scripts/render-banners.cjs la tiñe con los colores de cada ruta y la guarda
// en assets/banners/*.jpg.
//
//   node scripts/draw-banner-sevilla.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 960, H = 600;
const f = n => +n.toFixed(1);
const C = {
  sky0: '#232457', sky1: '#3d3478', sky2: '#6a4b8f', sky3: '#b0679a', sky4: '#e59a86', glow: '#f6c98a',
  far: '#4b3f6e', far2: '#5c4a78', farLit: '#c98f6a',
  gold: '#f4c766', gold2: '#e0a84a', goldLt: '#fbe3a0', goldDk: '#a66f35', stone: '#d9b27a', stoneDk: '#8f6a4c',
  white: '#d6cbc0', whiteDk: '#aea29a', red: '#c43c4a', redDk: '#8e2836', dark: '#2a2140', win: '#ffd98a',
  green: '#1d4632', green2: '#2a5a40', green3: '#143224', setas: '#6f8fe0', setas2: '#a9bff2', setasDk: '#3d4f9e',
};
const R = (x, y, w, h, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;
const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const S = (d, stroke, w, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
const Ci = (x, y, r, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"/>`;
const arch = (x, y, w, h, fill) => P(`M${f(x)},${f(y)} V${f(y - h + w / 2)} A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(x + w)},${f(y - h + w / 2)} V${f(y)} Z`, fill);
const dome = (cx, y, r, fill) => P(`M${f(cx - r)},${f(y)} A${f(r)},${f(r * 1.1)} 0 0 1 ${f(cx + r)},${f(y)} Z`, fill);
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');

let s = '';
/* Cielo del anochecer en bandas: añil arriba, malva y un resplandor cálido en el horizonte */
{
  const stops = [[0, C.sky0], [120, C.sky1], [220, C.sky2], [290, C.sky3], [340, C.sky4], [372, C.glow]];
  for (let y = 0; y < 400; y += 10) {
    const j = stops.findIndex((q, i) => y >= q[0] && (!stops[i + 1] || y < stops[i + 1][0]));
    const [y0, c0] = stops[j], [y1, c1] = stops[j + 1] ?? [400, C.glow];
    s += R(0, y, W, 11, mix(c0, c1, Math.min(1, (y - y0) / (y1 - y0))));
  }
  for (const [x, y, r] of [[70, 40, 1.8], [190, 90, 1.4], [300, 30, 1.6], [640, 60, 1.8], [760, 30, 1.4], [880, 100, 1.8], [600, 140, 1.2], [140, 160, 1.2], [900, 190, 1.2]]) s += Ci(x, y, r, '#f3e6c8');
  // Nubes alargadas, finas
  for (const [x, y, w] of [[40, 250, 240], [640, 228, 280], [780, 300, 180]]) s += R(x, y, w, 5, mix(C.sky3, C.sky4, 0.5)) + R(x + 30, y + 7, w * 0.6, 3, mix(C.sky3, C.sky4, 0.5));
}

/* Ciudad lejana en el horizonte: azoteas y torres pequeñas con ventanas encendidas */
{
  const y0 = 392;
  let x = 0, k = 0;
  while (x < W) {
    const w = 26 + (k * 19) % 34, h = 14 + (k * 13) % 22;
    s += R(x, y0 - h, w, h + 40, k % 2 ? C.far : C.far2);
    if (k % 2 === 0) s += R(x + 6, y0 - h + 5, 4, 4, C.farLit);
    x += w; k++;
  }
  for (const [tx, th] of [[188, 54], [238, 40], [290, 34]]) s += R(tx, y0 - th, 10, th, C.far) + P(`M${tx},${y0 - th} L${tx + 5},${y0 - th - 14} L${tx + 10},${y0 - th} Z`, C.farLit);
}

/* Tejados del centro entre el horizonte y el primer término, con ventanas encendidas */
{
  s += R(0, 400, W, H - 400, C.far);
  let x = 0, k = 0;
  while (x < W) {
    const w = 40 + (k * 23) % 50, y = 404 + (k * 17) % 30;
    s += R(x, y, w, H - y, k % 2 ? C.far2 : mix(C.far, C.far2, 0.5)) + R(x, y, w, 4, mix(C.far2, C.sky3, 0.4));
    for (let wy = y + 14; wy < H; wy += 26) for (let wx = x + 8; wx < x + w - 10; wx += 18) if ((wx * 7 + wy * 3 + k) % 5 < 2) s += R(wx, wy, 6, 9, C.farLit);
    x += w; k++;
  }
}

/* Catedral: la gran nave con pináculos, iluminada, a los dos lados de la Giralda */
{
  const y = 370;
  s += R(330, y, 400, 50, C.gold2) + R(330, y - 6, 400, 8, C.goldLt);
  for (let x = 336; x < 730; x += 22) s += P(`M${x},${y - 6} L${x + 4},${y - 26} L${x + 8},${y - 6} Z`, C.gold) + Ci(x + 4, y - 27, 1.6, C.goldLt);
  for (let x = 344; x < 730; x += 34) s += arch(x, y + 36, 12, 24, C.goldDk);
  // Crucero con su cimborrio
  s += R(612, y - 34, 70, 36, C.gold) + P(`M612,${y - 34} L647,${y - 52} L682,${y - 34} Z`, C.gold2);
  for (let x = 616; x < 682; x += 12) s += P(`M${x},${y - 34} L${x + 3},${y - 48} L${x + 6},${y - 34} Z`, C.goldLt);
}

/* Iglesia de cúpula blanca, delante de la Catedral */
{
  const y = 362;
  s += R(560, y, 150, 70, C.white) + R(556, y - 4, 158, 6, C.whiteDk);
  s += R(610, y - 34, 50, 34, C.white) + dome(635, y - 34, 28, C.white) + R(631, y - 76, 8, 14, C.white) + dome(635, y - 74, 6, C.whiteDk);
  for (const x of [620, 634, 648]) s += arch(x, y - 6, 6, 16, C.stoneDk);
  for (const x of [574, 596, 674, 694]) s += arch(x, y + 48, 10, 22, C.win);
  for (const tx of [564, 694]) s += R(tx, y - 22, 12, 24, C.white) + dome(tx + 6, y - 22, 6, C.whiteDk);
}

/* La Giralda: grande, centrada y encendida en dorado */
{
  const cx = 470, top = 218, base = 480, w = 76;
  const x0 = cx - w / 2;
  // resplandor cálido detrás de la torre
  for (const [r, t] of [[150, 0.25], [110, 0.5], [74, 0.75]]) s += Ci(cx, top - 40, r, mix(C.sky2, C.sky4, t));
  // Fuste almohade
  s += R(x0, top, w, base - top, C.gold) + R(x0, top, 8, base - top, C.goldLt) + R(x0 + w - 10, top, 10, base - top, C.gold2);
  // Paños de sebka (rombos) arriba y ventanas geminadas abajo
  const sebka = (y, h) => {
    let p = R(x0 + 14, y, w - 28, h, C.gold2);
    const n = 4, cw = (w - 28) / n;
    for (let i = 0; i < n; i++) for (let yy = y + 4; yy < y + h - 10; yy += 16) {
      const xx = x0 + 14 + i * cw;
      p += P(`M${f(xx + cw / 2)},${yy} L${f(xx + cw - 2)},${yy + 8} L${f(xx + cw / 2)},${yy + 16} L${f(xx + 2)},${yy + 8} Z`, C.goldDk);
      p += P(`M${f(xx + cw / 2)},${yy + 4} L${f(xx + cw - 6)},${yy + 8} L${f(xx + cw / 2)},${yy + 12} L${f(xx + 6)},${yy + 8} Z`, C.gold2);
    }
    return p + R(x0 + 12, y - 3, w - 24, 3, C.goldLt);
  };
  s += sebka(top + 14, 58) + sebka(top + 84, 42);
  for (const y of [top + 132, top + 182]) s += arch(cx - 9, y + 24, 7, 22, C.goldDk) + arch(cx + 2, y + 24, 7, 22, C.goldDk) + R(cx - 13, y + 24, 26, 3, C.goldLt);
  for (const y of [top + 150, top + 204, top + 250]) s += arch(x0 + 12, y, 6, 14, C.goldDk) + arch(x0 + w - 18, y, 6, 14, C.goldDk);
  // Cornisa y campanario renacentista
  s += R(x0 - 6, top - 6, w + 12, 8, C.goldLt);
  const bw = w - 6, bx = cx - bw / 2, cw = (bw - 12) / 3;
  s += R(bx, top - 50, bw, 44, C.stone);
  for (let i = 0; i < 3; i++) s += arch(bx + 6 + i * cw, top - 10, cw - 6, 32, C.dark) + Ci(bx + 6 + i * cw + (cw - 6) / 2, top - 30, 4, C.goldDk);
  s += R(bx - 4, top - 54, bw + 8, 6, C.goldLt);
  for (let x = bx - 2; x < bx + bw + 2; x += 9) s += R(x, top - 62, 4, 8, C.goldLt);
  // Cuerpos del reloj, de las estrellas y de la azucena, cada vez más estrechos
  const t1 = 54, t2 = 40, t3 = 28;
  s += R(cx - t1 / 2, top - 96, t1, 34, C.stone) + arch(cx - 9, top - 66, 18, 24, C.dark) + R(cx - t1 / 2 - 3, top - 98, t1 + 6, 5, C.goldLt);
  s += R(cx - t2 / 2, top - 124, t2, 26, C.stone) + Ci(cx, top - 111, 7, C.dark) + R(cx - t2 / 2 - 3, top - 126, t2 + 6, 4, C.goldLt);
  s += R(cx - t3 / 2, top - 142, t3, 18, C.stone) + arch(cx - 5, top - 126, 10, 13, C.dark);
  s += dome(cx, top - 142, 14, C.gold2) + R(cx - 2, top - 160, 4, 6, C.goldLt);
  // Giraldillo con su estandarte
  s += S(`M${cx},${top - 158} V${top - 176}`, C.goldLt, 2) + Ci(cx, top - 162, 3.4, C.gold);
  s += P(`M${cx - 4},${top - 176} h8 l-1,-10 h-6 Z`, C.goldLt) + Ci(cx, top - 189, 3.2, C.goldLt) + P(`M${cx + 3},${top - 184} L${cx + 18},${top - 190} L${cx + 16},${top - 178} Z`, C.goldLt);
}

/* Edificio rojo y blanco en primer término, con balcones encendidos */
{
  const x = 300, y = 430, w = 190, h = H - y;
  s += R(x, y, w, h, C.red) + R(x - 4, y - 12, w + 8, 14, C.white) + R(x, y + 2, w, 6, C.white);
  s += R(x + 70, y - 34, 50, 24, C.white) + P(`M${x + 66},${y - 34} L${x + 95},${y - 50} L${x + 124},${y - 34} Z`, C.white);
  for (let col = 0; col < 5; col++) for (let row = 0; row < 4; row++) {
    const wx = x + 14 + col * 36, wy = y + 22 + row * 46;
    s += R(wx - 4, wy - 4, 26, 38, C.white) + R(wx, wy, 18, 30, (col + row) % 3 === 0 ? C.dark : C.win);
    s += R(wx - 6, wy + 30, 30, 4, C.redDk) + S(`M${wx - 4},${wy + 30} V${wy + 22} M${wx + 22},${wy + 30} V${wy + 22} M${wx - 4},${wy + 22} H${wx + 22}`, C.redDk, 1.4);
  }
  for (let r = 0; r < 4; r++) s += R(x, y + 60 + r * 46, w, 3, C.white);
}

/* Iglesia barroca dorada a la derecha: muro, torre con linterna y dos cúpulas */
{
  s += R(700, 430, 260, 170, C.stoneDk) + R(700, 420, 260, 12, C.stone);
  for (let x = 704; x < 960; x += 14) s += R(x, 410, 6, 12, C.stoneDk);
  for (let x = 712; x < 960; x += 46) s += R(x, 450, 4, 150, C.goldDk);
  s += arch(760, 600, 40, 90, C.goldDk) + arch(840, 570, 28, 50, C.dark);
  const tx = 760, tw = 70;
  s += R(tx, 340, tw, 92, C.stone) + R(tx - 4, 334, tw + 8, 8, C.gold2);
  s += arch(tx + 22, 420, 26, 56, C.dark) + Ci(tx + 35, 356, 8, C.goldDk);
  s += R(tx + 8, 280, tw - 16, 56, C.stone) + arch(tx + 22, 328, 26, 38, C.goldDk);
  for (const xx of [tx + 6, tx + tw - 12]) s += R(xx, 290, 6, 46, C.gold2);
  s += dome(tx + 35, 280, 24, C.gold2) + R(tx + 29, 242, 12, 18, C.goldLt) + dome(tx + 35, 242, 8, C.gold);
  s += S(`M${tx + 35},234 V216 M${tx + 29},223 H${tx + 41}`, C.goldLt, 2.2);
  s += R(850, 390, 80, 34, C.stone) + dome(890, 390, 40, C.goldDk) + S('M862,378 Q890,340 918,378', C.goldLt, 2) + R(885, 340, 10, 12, C.goldLt);
  s += dome(960, 480, 70, C.goldDk) + S('M900,462 Q940,428 960,426', C.goldLt, 2);
  for (const x of [720, 940]) s += Ci(x, 480, 12, mix(C.stone, C.win, 0.6)) + Ci(x, 480, 6, C.win);
}

/* Árbol redondo y frondoso abajo a la izquierda */
{
  const blobs = [[200, 560, 110, C.green], [120, 600, 90, C.green3], [290, 590, 70, C.green3], [170, 500, 70, C.green2], [250, 520, 60, C.green], [90, 530, 60, C.green]];
  for (const [x, y, r, c] of blobs) s += Ci(x, y, r, c);
  for (let i = 0; i < 40; i++) {
    const a = (i * 137.5) * Math.PI / 180, rr = 20 + (i * 7) % 90;
    s += Ci(190 + Math.cos(a) * rr, 560 + Math.sin(a) * rr * 0.7, 6, i % 2 ? C.green2 : '#5b9e70');
  }
}

/* Borde de las Setas a la izquierda: la retícula de madera, iluminada en azul */
{
  const edge = 'M0,318 C70,300 130,312 168,346 C120,372 70,420 40,480 C28,505 14,530 0,548';
  s += `<clipPath id="setasClip"><path d="${edge} Z"/></clipPath>` + P(`${edge} Z`, C.setas);
  let g = '';
  for (let i = -6; i < 16; i++) g += S(`M${i * 16},300 Q${i * 16 - 30},430 ${i * 16 - 90},560`, C.setas2, 2.2);
  for (let j = 0; j < 14; j++) g += S(`M-20,${300 + j * 20} Q80,${300 + j * 22} 180,${330 + j * 14}`, C.setasDk, 1.4);
  s += `<g clip-path="url(#setasClip)">${g}</g>` + S(edge, C.setas2, 4);
}

mkdirSync(new URL('../design/banners/', import.meta.url), { recursive: true });
writeFileSync(new URL('../design/banners/sevilla.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<defs><clipPath id="clipBan"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>\n<g id="sevilla-banner" clip-path="url(#clipBan)">\n${s}\n</g>\n</svg>\n`);
console.log('design/banners/sevilla.svg');
