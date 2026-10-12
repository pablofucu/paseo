// Dibuja el sello de correos de cada ruta en design/route-stamps/<tour>.svg
// (164 × 200). Es un dibujo exclusivo que simboliza la ruta entera, no un
// recorte de su postal. scripts/render-postcards.cjs lo hornea con la textura
// de imprenta en assets/route-stamps/<tour>.png; el borde dentado lo pone la app.
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

mkdirSync(new URL('../design/route-stamps/', import.meta.url), { recursive: true });
for (const [id, s] of Object.entries(stamps)) {
  writeFileSync(new URL(`../design/route-stamps/${id}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${s}\n</svg>\n`);
  console.log(`design/route-stamps/${id}.svg`);
}
