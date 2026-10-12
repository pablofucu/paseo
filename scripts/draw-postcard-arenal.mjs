// Dibuja la ilustración de la postal de la ruta «Del Arenal a la Plaza de
// España» (design/postcards/sevilla-arenal.svg, 832 × 444) con la paleta de la
// postal de Sevilla centro. Es una escena, no un catálogo de las paradas. scripts/render-postcards.cjs le pone la textura de
// imprenta y la guarda en assets/postcards/sevilla-arenal.jpg.
//
//   node scripts/draw-postcard-arenal.mjs
import { writeFileSync } from 'node:fs';

const f = n => +n.toFixed(1);
const C = {
  sky: '#8fbadd', cloud: '#b9d4ea', dark: '#4a3a32', brick: '#b45a3e', brickLt: '#c9714f', terra: '#b8724f',
  ochre: '#d4a548', albero: '#e3b85a', orange: '#e0892e', blue: '#3f63a0', cream: '#efe6d2', white: '#f5f1e6',
  sand: '#e2cfa6', stone: '#d6c096', ground: '#e8dcc0', green: '#3f7d3a', green2: '#5a9a48', trunk: '#7a5f45', frond: '#3f8a3a',
  water: '#6f9fcc', waterLt: '#a9c8e6', tileGreen: '#2f6a3a',
};
const R = (x, y, w, h, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;
const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const S = (d, stroke, w, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
const Ci = (x, y, r, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"/>`;
const arch = (x, y, w, h, fill) => P(`M${f(x)},${f(y)} V${f(y - h + w / 2)} A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(x + w)},${f(y - h + w / 2)} V${f(y)} Z`, fill);
const horse = (x, y, w, h, fill) => { const r = w / 2, cy = y - h + r * 1.15; return P(`M${f(x + w * 0.08)},${f(y)} V${f(cy + r * 0.45)} A${f(r)},${f(r)} 0 1 1 ${f(x + w * 0.92)},${f(cy + r * 0.45)} V${f(y)} Z`, fill); };
const cloud = (x, y, s = 1) => P(`M${x},${y} h${90 * s} a${14 * s},${14 * s} 0 0 0 -${22 * s},-${14 * s} a${18 * s},${18 * s} 0 0 0 -${34 * s},-${4 * s} a${14 * s},${14 * s} 0 0 0 -${34 * s},${18 * s} Z`, C.cloud);
function palm(x, ground, h, lean = 6) {
  const tx = x + lean, ty = ground - h;
  let s = S(`M${x},${ground} Q${f(x - lean * 0.4)},${f(ground - h / 2)} ${tx},${ty}`, C.trunk, 6);
  for (let y = ground - 8; y > ty + 6; y -= 8) s += S(`M${f(x + lean * ((ground - y) / h) - 3)},${y} h6`, '#5a4532', 1);
  const fr = [[-34, 14], [-28, -6], [-14, -20], [4, -24], [20, -16], [32, -2], [34, 16], [-18, 22], [18, 24]];
  for (const [dx, dy] of fr) s += S(`M${tx},${ty} Q${f(tx + dx * 0.5)},${f(ty + dy * 0.5 - 8)} ${tx + dx},${ty + dy}`, C.frond, 5.5);
  return s;
}
function tree(x, ground, r, oranges = 0) {
  let s = R(x - 3, ground - r - 10, 6, r + 10, C.trunk) + Ci(x, ground - r - 12, r, C.green) + Ci(x - r * 0.6, ground - r * 0.8 - 12, r * 0.7, C.green) + Ci(x + r * 0.6, ground - r * 0.8 - 12, r * 0.7, C.green);
  for (let i = 0; i < oranges; i++) { const a = i * 2.4, rr = r * 0.75 * Math.sqrt((i + 0.5) / oranges); s += Ci(x + rr * Math.cos(a), ground - r - 12 + rr * Math.sin(a), 3, C.orange); }
  return s;
}
const win = (x, y, w, h, frame = C.white) => R(x - 2, y - 2, w + 4, h + 4, frame) + R(x, y, w, h, C.dark);
// Una sola escena: la Plaza de España vista desde el canal, con la barca, un
// puente de azulejo y el banco de una provincia en primer término.
const top = x => 196 + 46 * Math.sin((Math.PI * x) / 832); // cornisa: más lejos en el centro
const base = x => 334 - 10 * Math.sin((Math.PI * x) / 832);
let s = R(0, 0, 832, 444, C.sky) + cloud(250, 74) + cloud(560, 116, 0.7) + cloud(40, 150, 0.5);

/* El semicírculo de ladrillo: dos pisos de arcos que se alejan hacia el centro */
{
  let roof = `M0,${f(top(0))}`, foot = '';
  for (let x = 0; x <= 832; x += 16) roof += ` L${x},${f(top(x))}`;
  for (let x = 832; x >= 0; x -= 16) foot += ` L${x},${f(base(x))}`;
  s += P(roof + foot + ' Z', C.brick);
  let eave = `M0,${f(top(0) - 8)}`;
  for (let x = 0; x <= 832; x += 16) eave += ` L${x},${f(top(x) - 8)}`;
  for (let x = 832; x >= 0; x -= 16) eave += ` L${x},${f(top(x))}`;
  s += P(eave + ' Z', C.terra);
  for (let x = 6; x < 832; x += 0) {
    const h = base(x) - top(x), w = h * 0.12;
    s += arch(x, base(x) - 2, w, h * 0.42, C.dark) + arch(x + w * 0.15, top(x) + h * 0.42, w * 0.7, h * 0.3, C.dark);
    s += R(x - 2, top(x) + h * 0.47, w + 4, 3, C.stone);
    x += w * 1.7;
  }
  // Zócalo de azulejo y barandilla del canal
  for (let x = 0; x < 832; x += 9) s += R(x, base(x) - 2, 6, 6, (x / 9) % 2 ? C.blue : C.albero);
}
/* Pabellón central, al fondo */
s += R(380, 150, 72, 96, C.brickLt) + P('M374,154 Q416,118 458,154 Z', C.brick) + R(374, 150, 84, 6, C.stone);
s += arch(402, 232, 28, 56, C.dark) + R(392, 188, 48, 4, C.stone) + S('M416,124 V104', C.dark, 2) + Ci(416, 104, 3, C.ochre);
for (const x of [386, 438]) s += R(x, 160, 6, 22, C.dark);
/* La torre de la izquierda, cerca y muy alta */
{
  const cx = 150;
  s += R(cx - 36, 112, 72, 230, C.brick) + R(cx - 42, 104, 84, 10, C.stone);
  for (const y of [160, 220, 280]) s += arch(cx - 11, y + 30, 22, 44, C.dark) + R(cx - 16, y + 32, 32, 4, C.stone);
  s += R(cx - 26, 54, 52, 50, C.brickLt) + arch(cx - 10, 98, 20, 36, C.dark) + R(cx - 32, 48, 64, 8, C.stone);
  s += R(cx - 14, 18, 28, 30, C.brickLt) + arch(cx - 6, 44, 12, 20, C.dark) + P(`M${cx - 18},20 Q${cx},-12 ${cx + 18},20 Z`, C.tileGreen) + R(cx - 18, 16, 36, 5, C.stone);
  for (const dx of [-38, 38]) s += S(`M${cx + dx},104 V84`, C.stone, 5) + Ci(cx + dx, 82, 6, C.stone);
  for (const dx of [-28, 28]) s += S(`M${cx + dx},48 V36`, C.stone, 4) + Ci(cx + dx, 34, 4.5, C.stone);
  s += S(`M${cx},-6 V-30`, C.dark, 2);
}
/* La otra torre, cortada por el borde */
s += R(770, 120, 70, 220, C.brick) + R(764, 112, 80, 9, C.stone) + arch(796, 200, 18, 36, C.dark) + arch(796, 270, 18, 36, C.dark) + R(780, 66, 52, 46, C.brickLt) + arch(798, 108, 16, 30, C.dark) + R(774, 60, 64, 7, C.stone) + P('M790,62 Q806,30 822,62 Z', C.tileGreen);

/* Canal con la barca */
s += R(0, 340, 832, 54, C.water);
for (let x = 10, k = 0; x < 832; x += 38, k++) s += S(`M${x + (k % 2) * 14},${352 + (k % 3) * 12} q7,-4 14,0 t14,0`, C.waterLt, 2.2);
s += P('M268,370 h84 l-12,16 h-58 Z', C.orange) + R(274, 368, 74, 4, C.terra);
s += Ci(296, 346, 6, C.dark) + R(290, 352, 12, 16, C.blue) + Ci(326, 348, 5.5, C.dark) + R(320, 353, 11, 15, C.white);
s += S('M300,360 L262,384 M300,360 L338,384', C.trunk, 3);

/* Puente de azulejo en primer término, a la derecha: barandilla con pilares sobre el tablero */
{
  const q = t => [(1 - t) ** 2 * 466 + 2 * t * (1 - t) * 564 + t * t * 832, (1 - t) ** 2 * 444 + 2 * t * (1 - t) * 307 + t * t * 295];
  s += P('M470,444 Q566,316 832,304 V444 Z', C.cream);
  s += P('M600,444 Q660,388 740,384 Q800,388 832,410 V444 Z', C.water) + P('M600,444 Q660,388 740,384 Q800,388 832,410 V418 Q800,398 740,394 Q668,398 614,444 Z', C.stone);
  s += P('M470,444 Q566,316 832,304 L832,286 Q562,298 462,444 Z', C.white);
  // Azulejos a lo largo del pretil
  for (let i = 0; i <= 22; i++) {
    const [x, y] = q(0.04 + i * 0.043);
    s += R(x - 4, y - 4, 8, 8, i % 2 ? C.blue : C.albero);
  }
  s += P('M462,444 Q562,298 832,286 L832,278 Q558,290 452,444 Z', C.terra);
}

/* Banco de una provincia, a la izquierda: respaldo de azulejo y mapa */
{
  s += R(0, 392, 300, 52, C.white) + R(0, 388, 300, 6, C.albero);
  for (let x = 6; x < 296; x += 14) s += R(x, 400, 10, 10, (x / 14) % 2 ? C.blue : C.albero);
  s += R(110, 398, 80, 34, C.blue) + R(114, 402, 72, 26, C.cream) + P('M124,424 Q130,406 148,410 Q166,404 176,418 Q160,428 124,424 Z', C.green2);
  s += R(0, 430, 300, 14, C.stone) + R(0, 428, 300, 3, C.terra);
}

writeFileSync(new URL('../design/postcards/sevilla-arenal.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 832 444" width="832" height="444">\n<defs><clipPath id="clipAre"><rect x="0" y="0" width="832" height="444"/></clipPath></defs>\n<g id="arenal-art" clip-path="url(#clipAre)">\n${s}\n</g>\n</svg>\n`);
console.log('design/postcards/sevilla-arenal.svg');
