// Dibuja el sello de correos de cada ruta en design/route-stamps/<tour>.svg
// (164 × 200). Es un dibujo exclusivo que simboliza la ruta entera, no un
// recorte de su postal. scripts/render-postcards.cjs lo hornea con la textura
// de imprenta en assets/route-stamps/<tour>.png; el borde dentado lo pone la app.
// Incluye también las rutas de pago aún bloqueadas (src/data/tours/locked.ts).
//
//   node scripts/draw-route-stamps.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 164, H = 200;
const f = n => +n.toFixed(1);
const R = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const S = (d, stroke, w) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const Ci = (x, y, r, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"/>`;
const T = (x, y, s, size, fill, { anchor = 'middle', family = 'Nunito_900Black', ls = 0 } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" letter-spacing="${ls}" fill="${fill}">${s}</text>`;
/** Marco interior blanco fino, como en los sellos de correos impresos */
const frame = color => `<rect x="5" y="5" width="${W - 10}" height="${H - 10}" fill="none" stroke="${color}" stroke-width="1.6"/>`;

const stamps = {};

/* Sevilla centro · «Del río a la judería»: el Giraldillo sobre azulejo y NO8DO */
{
  const blue = '#1f4fa8', deep = '#0f2650', gold = '#e5a823', cream = '#f5f1e6', tile = '#3f63a0';
  let s = R(0, 0, W, H, blue);
  // Azulejo de fondo: rombos y estrellas de cuatro puntas
  for (let y = 0; y < 170; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < W + 12; x += 24) {
    s += P(`M${x},${y - 9} L${x + 9},${y} L${x},${y + 9} L${x - 9},${y} Z`, tile);
    s += P(`M${x},${y - 4} L${x + 1.4},${y - 1.4} L${x + 4},${y} L${x + 1.4},${y + 1.4} L${x},${y + 4} L${x - 1.4},${y + 1.4} L${x - 4},${y} L${x - 1.4},${y - 1.4} Z`, '#8fb0de');
  }
  // Sol detrás de la figura
  s += Ci(82, 88, 48, '#2a5bb5');
  // El Giraldillo: la Fe con el lábaro en alto y una palma, sobre la bola
  s += Ci(82, 146, 9, gold) + R(78, 152, 8, 10, gold) + R(72, 160, 20, 4, gold);
  s += P('M70,138 Q74,112 78,96 L86,96 Q90,112 94,138 Z', gold); // túnica
  s += P('M79,98 Q70,104 66,116 L70,118 Q74,108 81,104 Z', gold); // manto
  s += Ci(82, 90, 5.2, gold) + P('M77,88 Q82,80 87,88 Z', '#c98a14'); // cabeza y casco
  s += S('M86,100 L100,74', gold, 3) + S('M100,74 V36', gold, 2.6); // brazo y asta
  s += P('M100,38 L126,44 L120,52 L127,60 L100,58 Z', cream) + S('M104,46 h14 M104,52 h12', blue, 1.6); // lábaro
  s += S('M78,104 L62,92', gold, 3) + S('M62,92 Q54,80 58,66', '#5a9a48', 2.4); // palma
  for (const [x, y] of [[56, 84], [55, 77], [57, 70]]) s += S(`M${x + 2},${y} l-7,-3 M${x + 2},${y} l6,-4`, '#5a9a48', 1.6);
  // Banda con el lema
  s += R(0, 170, W, 30, cream) + R(0, 170, W, 3, gold);
  s += T(82, 193, 'NO<tspan fill="' + gold + '">8</tspan>DO', 20, deep, { ls: 2 });
  s += T(10, 22, '3,20€', 13, cream, { anchor: 'start' }) + T(154, 22, 'SEVILLA', 8, cream, { anchor: 'end', ls: 1.4 });
  stamps['sevilla-centro'] = s + frame(cream);
}

/* Tomares en 4 paradas: rama de olivo del Aljarafe sobre almagra */
{
  const red = '#b23a2e', deep = '#4a1610', cream = '#f5f1e6', ochre = '#e8b33a', leaf = '#4f6e2c', leaf2 = '#6f8f3c', olive = '#2f3a1c';
  let s = R(0, 0, W, H, red);
  for (let y = 10; y < 170; y += 14) s += S(`M0,${y} q20,-5 41,0 t41,0 t41,0 t41,0`, '#a3332a', 4);
  s += Ci(82, 92, 56, ochre) + Ci(82, 92, 48, '#f0c457');
  // Rama: tallo curvo y hojas alargadas por pares
  s += S('M40,150 Q70,110 120,46', '#6b4a2a', 4);
  const leafAt = (x, y, ang, len, col) => {
    const a = (ang * Math.PI) / 180, ex = x + len * Math.cos(a), ey = y + len * Math.sin(a);
    const nx = -Math.sin(a) * len * 0.2, ny = Math.cos(a) * len * 0.2, mx = (x + ex) / 2, my = (y + ey) / 2;
    return P(`M${f(x)},${f(y)} Q${f(mx + nx)},${f(my + ny)} ${f(ex)},${f(ey)} Q${f(mx - nx)},${f(my - ny)} ${f(x)},${f(y)} Z`, col);
  };
  const pts = [[46, 141], [56, 128], [66, 116], [77, 103], [89, 89], [101, 75], [112, 61]];
  pts.forEach(([x, y], i) => { s += leafAt(x, y, -150 + (i % 2) * 8, 26 - i, i % 2 ? leaf : leaf2) + leafAt(x, y, -10 - (i % 2) * 10, 26 - i, i % 2 ? leaf2 : leaf); });
  s += leafAt(120, 46, -60, 18, leaf);
  // Aceitunas
  for (const [x, y] of [[68, 128], [74, 132], [96, 100], [102, 104], [58, 138]]) s += `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="6" fill="${olive}" transform="rotate(-20 ${x} ${y})"/>` + Ci(x - 1.4, y - 2, 1.2, '#6b7a4a');
  // Cuatro paradas: cuatro puntos en el camino
  s += S('M24,162 Q82,150 140,162', cream, 2.2);
  [30, 64, 100, 134].forEach(x => { s += Ci(x, 158.5 + Math.abs(x - 82) * 0.04, 4.2, cream) + Ci(x, 158.5 + Math.abs(x - 82) * 0.04, 2, deep); });
  s += R(0, 170, W, 30, cream) + R(0, 170, W, 3, ochre);
  s += T(82, 192, 'TOMARES', 17, deep, { ls: 2.4 });
  s += T(10, 22, '4,50€', 13, cream, { anchor: 'start' }) + T(154, 22, 'ALJARAFE', 8, cream, { anchor: 'end', ls: 1.4 });
  stamps['tomares-4-paradas'] = s + frame(cream);
}

/* Del Arenal a la Plaza de España: carabela del puerto de Indias en un azulejo de 1929 */
{
  const albero = '#e5a823', blue = '#1f4fa8', brick = '#a8432c', cream = '#f5f1e6', deep = '#44170d', wood = '#7a4a2a', sea = '#3f63a0';
  let s = R(0, 0, W, H, brick);
  // Cenefa de azulejo: cuadros de albero con flor azul
  for (let y = 0; y < 170; y += 16) for (const x of [0, 148]) s += R(x, y, 16, 16, y % 32 ? albero : cream) + Ci(x + 8, y + 8, 3.4, blue);
  for (let x = 16; x < 148; x += 16) s += R(x, 0, 16, 16, x % 32 ? cream : albero) + Ci(x + 8, 8, 3.4, blue);
  // Cartela de azulejo con la carabela
  s += `<ellipse cx="82" cy="94" rx="58" ry="68" fill="${albero}"/>` + `<ellipse cx="82" cy="94" rx="52" ry="62" fill="${cream}"/>`;
  s += `<clipPath id="ar_c"><ellipse cx="82" cy="94" rx="52" ry="62"/></clipPath><g clip-path="url(#ar_c)">`;
  s += R(20, 122, 130, 40, sea);
  for (let y = 128; y < 160; y += 8) s += S(`M24,${y} q6,-4 12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0`, '#8fb0de', 1.6);
  // Casco y castillos
  s += P('M46,116 L118,116 L110,132 L56,132 Z', wood) + P('M42,106 L58,106 L58,116 L46,116 Z', wood) + P('M104,110 L122,108 L118,116 L104,116 Z', wood);
  s += S('M50,124 H112', '#c98a14', 1.6);
  // Mástiles y velas con la cruz
  s += S('M68,116 V46 M90,116 V54 M110,116 V78', deep, 2.2) + S('M110,90 L126,100', deep, 1.6);
  const sail = (x, y, w, h) => P(`M${x - w / 2},${y} Q${x},${y + 4} ${x + w / 2},${y} L${x + w / 2 + 2},${y + h} Q${x},${y + h + 6} ${x - w / 2 - 2},${y + h} Z`, '#fbf7ec') + S(`M${x},${y + 4} V${y + h} M${x - w * 0.3},${y + h * 0.45} H${x + w * 0.3}`, brick, 2.4);
  s += sail(68, 56, 30, 26) + sail(68, 88, 34, 20) + sail(90, 62, 26, 24) + sail(90, 92, 30, 18);
  s += P('M110,80 L110,104 L96,104 Z', '#fbf7ec');
  s += P('M68,46 l10,3 -10,3 Z', brick) + P('M90,54 l9,3 -9,3 Z', blue);
  s += '</g>';
  // Cinta con el año de la Exposición
  s += P('M30,148 H134 L128,156 L134,164 H30 L36,156 Z', blue) + T(82, 160.5, '1929', 12, cream, { ls: 3 });
  s += R(0, 170, W, 30, cream) + R(0, 170, W, 3, albero);
  s += T(82, 191, 'EL ARENAL', 15, deep, { ls: 2.4 });
  s += R(18, 18, 40, 16, brick) + T(22, 30, '3,90€', 11, cream, { anchor: 'start' });
  stamps['sevilla-arenal'] = s + frame(cream);
}

/* ---- Rutas de pago aún bloqueadas: un sello exclusivo para cada una ---- */
const el = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra}/>`;
const band = (acc, deep, name, size, price, place) => R(0, 170, W, 30, '#f5f1e6') + R(0, 170, W, 3, acc) + T(82, 192, name, size, deep, { ls: 2 })
  + T(10, 22, price, 13, '#f5f1e6', { anchor: 'start' }) + T(154, 22, place, 8, '#f5f1e6', { anchor: 'end', ls: 1.4 });

/* Triana: plato de cerámica con flor de azulejo, sobre fondo de cuerda seca */
{
  const bg = '#1E7A6E', deep = '#0C3A33', gold = '#F0B23E', cream = '#f5f1e6', blue = '#1f4fa8', dark = '#13594f';
  let s = R(0, 0, W, H, bg);
  for (let y = 0; y < 170; y += 20) for (let x = (y / 20) % 2 ? 10 : 0; x < W + 10; x += 20) s += P(`M${x},${y - 6} L${x + 6},${y} L${x},${y + 6} L${x - 6},${y} Z`, dark);
  s += Ci(82, 92, 62, gold) + Ci(82, 92, 55, cream) + Ci(82, 92, 49, blue) + Ci(82, 92, 44, cream);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, ca = Math.cos(a), sa = Math.sin(a);
    s += el(82 + ca * 24, 92 + sa * 24, 15, 7, i % 2 ? bg : gold, ` transform="rotate(${i * 45} ${f(82 + ca * 24)} ${f(92 + sa * 24)})"`);
  }
  s += Ci(82, 92, 11, blue) + Ci(82, 92, 6, gold);
  for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8; s += Ci(82 + Math.cos(a) * 46.5, 92 + Math.sin(a) * 46.5, 1.8, i % 2 ? gold : bg); }
  s += band(gold, deep, 'TRIANA', 17, '4,99€', 'SEVILLA');
  stamps['triana'] = s + frame(cream);
}

/* La Sevilla de Murillo: paleta y pincel bajo un rompimiento de gloria */
{
  const bg = '#8A3B5C', deep = '#3D1428', gold = '#E9B44C', cream = '#f5f1e6';
  let s = R(0, 0, W, H, bg);
  for (let i = 0; i < 18; i++) { const a = (i * Math.PI) / 9 - Math.PI / 2; s += P(`M82,96 L${f(82 + Math.cos(a - 0.09) * 130)},${f(96 + Math.sin(a - 0.09) * 130)} L${f(82 + Math.cos(a + 0.09) * 130)},${f(96 + Math.sin(a + 0.09) * 130)} Z`, i % 2 ? '#7a3150' : '#9a4668'); }
  s += Ci(82, 92, 60, gold) + Ci(82, 92, 53, '#f4d58a');
  for (const [x, y, r] of [[40, 74, 9], [124, 70, 11], [118, 128, 8], [46, 124, 10]]) s += Ci(x, y, r, cream) + Ci(x - 3, y + 3, r * 0.7, '#f0e4cf');
  // paleta de pintor con huecos y manchas
  s += P('M44,100 Q38,66 78,60 Q124,56 128,92 Q130,124 96,126 Q84,127 84,116 Q84,106 72,108 Q54,112 44,100 Z', '#8d5a34');
  s += P('M48,98 Q43,70 78,65 Q120,62 124,92 Q126,120 96,121 Q80,122 80,114 Q80,102 70,103 Q54,106 48,98 Z', '#b9854f');
  s += Ci(66, 92, 4, '#ece0c8');
  for (const [x, y, c] of [[62, 78, '#c8402f'], [80, 72, '#1f4fa8'], [100, 72, '#e5a823'], [114, 84, '#2f6a3a'], [112, 100, '#f5f1e6']]) s += Ci(x, y, 7, c) + Ci(x - 2, y - 2, 2, '#ffffff" fill-opacity="0.45');
  // pincel cruzado
  s += S('M52,150 L132,66', '#5a3a22', 5) + P('M126,72 L138,58 L142,62 L130,76 Z', '#d6c096') + P('M138,58 L150,44 Q154,46 152,52 L142,62 Z', '#c8402f');
  s += band(gold, deep, 'MURILLO', 16, '3,99€', 'SEVILLA');
  stamps['murillo'] = s + frame(cream);
}

/* El Madrid de los Austrias: el oso y el madroño, escudo de la villa */
{
  const bg = '#B5462E', deep = '#4A1A10', gold = '#F2C14E', cream = '#f5f1e6', bear = '#5a3a28', leaf = '#2f6a3a', fruit = '#d8301f';
  let s = R(0, 0, W, H, bg);
  for (let x = 0; x < W; x += 20) s += R(x, 0, 10, 170, '#a63f29');
  s += Ci(82, 92, 62, gold) + Ci(82, 92, 55, cream);
  // madroño
  s += S('M116,142 Q112,118 118,86', '#5a4430', 6);
  for (const [x, y, r] of [[118, 76, 20], [100, 88, 15], [136, 90, 15], [112, 60, 14], [128, 66, 13]]) s += Ci(x, y, r, leaf);
  for (const [x, y] of [[108, 70], [124, 62], [132, 86], [100, 90], [118, 82], [126, 76], [110, 94]]) s += Ci(x, y, 3.4, fruit) + Ci(x - 1, y - 1, 1, '#f09a8a');
  // oso a cuatro patas
  s += P('M42,122 Q38,94 62,90 Q84,86 98,98 Q106,108 100,124 Z', bear);
  s += Ci(48, 96, 14, bear) + Ci(38, 88, 6, bear) + Ci(54, 84, 5, bear) + el(36, 100, 8, 6, '#8a6a52') + Ci(32, 99, 2.2, '#1c120c') + Ci(46, 93, 1.6, cream);
  s += R(46, 118, 11, 28, bear) + R(60, 120, 11, 26, '#4a2e20') + R(86, 118, 11, 28, bear) + R(100, 116, 10, 30, '#4a2e20');
  s += band(gold, deep, 'AUSTRIAS', 14, '4,99€', 'MADRID');
  stamps['austrias'] = s + frame(cream);
}

/* El Barrio de las Letras: pluma, tintero y un libro abierto con versos */
{
  const bg = '#2F5D8C', deep = '#132A42', gold = '#E8A93B', cream = '#f5f1e6', page = '#fbf3de';
  let s = R(0, 0, W, H, bg);
  for (let y = 12; y < 170; y += 14) s += R(10, y, 144, 1.4, '#3a6b9e');
  s += Ci(82, 92, 62, gold) + Ci(82, 92, 55, '#244a72');
  // libro abierto
  s += P('M30,118 Q56,106 82,118 Q108,106 134,118 V134 Q108,122 82,134 Q56,122 30,134 Z', '#8a5a34');
  s += P('M34,84 Q58,74 82,86 V122 Q58,110 34,118 Z', page) + P('M130,84 Q106,74 82,86 V122 Q106,110 130,118 Z', '#efe4c8');
  for (let i = 0; i < 5; i++) s += S(`M42,${92 + i * 6.5} Q58,${88 + i * 6.5} ${72 - (i % 2) * 6},${95 + i * 6.5}`, '#6a5a4a', 1.4) + S(`M92,${95 + i * 6.5} Q106,${88 + i * 6.5} ${122 - (i % 2) * 8},${92 + i * 6.5}`, '#6a5a4a', 1.4);
  // pluma
  s += P('M70,100 Q104,48 138,26 Q134,62 104,86 Q92,96 82,108 Z', cream) + S('M82,108 Q112,60 138,26', '#b6a888', 1.8);
  for (let i = 0; i < 6; i++) s += S(`M${96 + i * 6},${78 - i * 8} l-8,6`, '#d8ccb0', 1.2);
  s += S('M70,100 L56,126', deep, 2.6);
  // tintero
  s += R(106, 112, 22, 18, deep) + R(110, 106, 14, 8, '#0c1c2e') + Ci(117, 121, 4, gold);
  s += band(gold, deep, 'LAS LETRAS', 13, '3,99€', 'MADRID');
  stamps['letras'] = s + frame(cream);
}

/* Del Retiro al Prado: barca de remos en el estanque, bajo un castaño */
{
  const bg = '#3E7B46', deep = '#16351A', gold = '#E5B94A', cream = '#f5f1e6', water = '#6fa5c4', waterLt = '#a9cde0';
  let s = R(0, 0, W, H, bg);
  for (let x = 0; x < W; x += 24) for (let y = (x / 24) % 2 ? 6 : 18; y < 168; y += 24) s += `<ellipse cx="${x}" cy="${y}" rx="10" ry="5" fill="#4a8a52" transform="rotate(-30 ${x} ${y})"/>`;
  s += Ci(82, 92, 62, gold) + Ci(82, 92, 55, '#cfe6ee');
  s += `<clipPath id="rp_c"><circle cx="82" cy="92" r="55"/></clipPath><g clip-path="url(#rp_c)">`;
  s += R(20, 100, 130, 60, water);
  for (let y = 108; y < 156; y += 9) s += S(`M24,${y} q6,-4 12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0`, waterLt, 1.6);
  s += Ci(112, 54, 12, '#f7ecc8');
  // castaño de orilla
  s += R(32, 66, 6, 36, '#6b4a2a') + Ci(35, 56, 20, '#2f6a3a') + Ci(24, 70, 13, '#3f7d3a') + Ci(48, 68, 12, '#4f8f48');
  // barca
  s += P('M56,118 h66 l-10,14 h-46 Z', '#c8553d') + R(60, 116, 58, 3, '#f5f1e6');
  s += Ci(80, 100, 6, '#5a3a28') + R(75, 106, 11, 12, '#1f4fa8') + S('M82,110 L56,128 M82,110 L112,126', '#7a5a3a', 2.2);
  s += S('M52,140 q8,-4 16,0 t16,0 t16,0', cream, 1.6);
  s += '</g>';
  s += band(gold, deep, 'RETIRO · PRADO', 12, '4,49€', 'MADRID');
  stamps['retiro-prado'] = s + frame(cream);
}

mkdirSync(new URL('../design/route-stamps/', import.meta.url), { recursive: true });
for (const [id, s] of Object.entries(stamps)) {
  writeFileSync(new URL(`../design/route-stamps/${id}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${s}\n</svg>\n`);
  console.log(`design/route-stamps/${id}.svg`);
}
