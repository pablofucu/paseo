// Dibuja las escenas de los sellos de goma de la ruta «Del Arenal a la Plaza
// de España» en design/stamps/<parada>.svg. Después, scripts/build-stamps.mjs
// las hornea en assets/stamps/*.png como las demás.
//
//   node scripts/draw-stamps-arenal.mjs
import { writeFileSync } from 'node:fs';
import { RUBBER_BOX } from '../src/lib/rubber.ts';
import { kit, stampFile } from './stamp-kit.mjs';

const root = new URL('../', import.meta.url);
const out = {};

/* ───────────── Plaza de Toros de la Maestranza (círculo) ───────────── */
{
  const k = kit('ma');
  const G = 74; // suelo
  // Muro curvo del coso: la cornisa sube hacia el centro
  const wallTop = x => 12 - 7 * Math.cos((x / 110) * Math.PI / 2);
  let wall = '';
  let top = 'M-104,' + k.f(wallTop(-104));
  for (let x = -96; x <= 104; x += 8) top += ` L${x},${k.f(wallTop(x))}`;
  wall += k.path(top, 1.8);
  // Grada alta, retranqueada, con su arquería
  const upTop = x => wallTop(x) - 17;
  let up = 'M-104,' + k.f(upTop(-104));
  for (let x = -96; x <= 104; x += 8) up += ` L${x},${k.f(upTop(x))}`;
  wall += k.path(up, 1.5);
  for (let x = -100; x <= 100; x += 8) {
    const t = upTop(x);
    wall += k.line(x, t, x, wallTop(x), 0.6);
  }
  for (let x = -102; x < 100; x += 8) {
    const a = upTop(x + 4) + 4, b = wallTop(x + 4) - 1.5;
    wall += k.opening(k.archD(x + 1.6, b, 4.8, b - a), [x, a, x + 8, b], 0.7, 1.5);
  }
  // Tejadillo de la grada
  for (let x = -104; x < 104; x += 2.6) wall += k.line(x, upTop(x), x, upTop(x) - 2.6, 0.5);
  wall += k.path(up.replace(/,(-?[\d.]+)/g, (m, y) => ',' + k.f(+y - 2.6)), 0.8);
  // Muro bajo: albero en las fajas, huecos con reja
  wall += k.path(top.replace(/,(-?[\d.]+)/g, (m, y) => ',' + k.f(+y + 4)), 0.9);
  for (let x = -96; x <= 96; x += 16) {
    if (Math.abs(x) < 30) continue;
    const y = wallTop(x) + 14;
    wall += k.window(x - 3.5, y, 7, 11, { sw: 1 }) + k.line(x - 5, y + 11.5, x + 5, y + 11.5, 1);
    wall += k.window(x - 3, y + 24, 6, 9, { bars: false, sw: 0.9 });
  }
  wall += k.line(-104, 52, -30, 52, 0.7) + k.line(30, 52, 104, 52, 0.7);
  wall += k.hatch(`M-104,${G} V52 H-30 V${G} Z M30,${G} V52 H104 V${G} Z`, [-104, 52, 104, G], 3.2, 0, 0.45);
  // Puerta del Príncipe
  let p = '';
  const P = 'M-30,74 V-6 H-22 V-20 L-14,-28 Q0,-40 14,-28 L22,-20 V-6 H30 V74 Z';
  p += k.path('M-30,74 V-6 H30 V74', 1.8);
  p += k.opening(k.archD(-11, G, 22, 38), [-11, 36, 11, G], 1.6, 1.4);
  p += k.path('M-14,74 V40 A14,14 0 0 1 14,40 V74', 1);
  for (const sx of [-1, 1]) {
    p += k.column(sx * 18, 30, 74, 3.4) + k.column(sx * 25, 30, 74, 3.4);
    p += k.column(sx * 15, -4, 22, 2.8) + k.column(sx * 23, -4, 22, 2.8);
    p += k.vase(sx * 26, -6, 1.1);
    p += k.path(`M${sx * 20},-6 Q${sx * 20},-18 ${sx * 11},-22 Q${sx * 6},-24 ${sx * 7},-28`, 1.2);
    p += k.circle(sx * 8.5, -27, 1.6, 0.8);
  }
  p += k.line(-31, 30, 31, 30, 1.6) + k.line(-31, 26, 31, 26, 0.9) + k.line(-31, 22, 31, 22, 1.4);
  p += k.hatchRect(-30, 22, 60, 8, 1.8, 45, 0.4);
  // Balcón con reja y ventana
  p += k.opening(k.archD(-8, 18, 16, 22), [-8, -4, 8, 18], 1.2, 1.6);
  p += k.railing(-12, 12, 20, 6, 1.8, 0.55);
  p += k.line(-31, -4, 31, -4, 1.3) + k.line(-31, -7, 31, -7, 0.8);
  // Remate: escudo y corona
  p += k.path('M-5,-34 Q-5,-22 0,-19 Q5,-22 5,-34 Z', 1.2) + k.line(0, -33, 0, -22, 0.6) + k.line(-4, -29, 4, -29, 0.6);
  p += k.path('M-5,-36 L-4,-41 L-2,-38 L0,-42 L2,-38 L4,-41 L5,-36 Z', 1) + k.line(0, -42, 0, -46, 0.9) + k.line(-1.6, -44.5, 1.6, -44.5, 0.8);
  // Delante: naranjo, farola, gente, enlosado
  const front = k.tree(-70, G, 15, 14, { oranges: 7, seed: 2 }) + k.path('M-78,74 V69 H-62 V74', 1);
  const lamp = k.lamp(52, G, 34);
  const people = k.person(-40, 82, 1.05) + k.person(-34, 81, 0.95, true) + k.person(40, 84, 1.1, true) + k.person(70, 82, 1);
  let ground = k.line(-104, G, 104, G, 1.6) + k.paving(-104, 104, G, 100, 0, -40, { rows: 2, cols: 16 });
  const sky = k.bird(-46, -60) + k.bird(-38, -66, 0.8) + k.bird(40, -64, 0.9) + k.bird(54, -58, 0.7);
  // Banderas en lo alto
  const flag = k.line(0, -46, 0, -64, 1) + k.path('M0,-64 Q5,-66 10,-63 Q14,-61 18,-63 V-55 Q14,-53 10,-55 Q5,-58 0,-56', 1) + k.hatchRect(0, -64, 18, 9, 2.2, 0, 0.45);
  out.maestranza = k.scene('<circle r="102"/>', [
    { svg: sky + flag },
    { svg: wall, occ: `M-104,74 V${k.f(upTop(-104) - 3)} Q0,${k.f(upTop(0) - 6)} 104,${k.f(upTop(104) - 3)} V74 Z` },
    { svg: p, occ: P + ' M-8,-34 H8 V-46 H-8 Z', halo: 4 },
    { svg: ground },
    { svg: front, occ: k.treeOcc(-70, G, 15, 14) },
    { svg: lamp, occ: k.lampOcc(52, G, 34) },
    { svg: people, occ: k.personOcc(-40, 82, 1.05) + k.personOcc(-34, 81, 0.95) + k.personOcc(40, 84, 1.1) + k.personOcc(70, 82, 1) },
  ]);
}

/* ───────────── Hospital de la Caridad (rectángulo) ───────────── */
{
  const k = kit('ca');
  const G = 52;
  // Alas laterales encaladas
  let wings = '';
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -140 : 58, x1 = sx < 0 ? -58 : 140;
    wings += k.path(`M${x0},-14 H${x1}`, 1.6) + k.tiles(x0, x1, -14, 3, 2.6);
    for (let x = x0 + 10; x < x1 - 6; x += 18) {
      wings += k.window(x, -4, 8, 13, { sw: 1 }) + k.railing(x - 2, x + 10, 10, 3, 1.6, 0.5);
      wings += k.window(x, 24, 8, 14, { sw: 1 });
    }
    wings += k.line(x0, 46, x1, 46, 0.8) + k.hatchRect(x0, 46, x1 - x0, 6, 2, 0, 0.45);
  }
  // Espadaña de las campanas, detrás a la izquierda
  let bell = k.path('M-118,-14 V-44 Q-108,-58 -98,-44 V-14', 1.5) + k.line(-120, -44, -96, -44, 1.1);
  bell += k.opening(k.archD(-114, -20, 12, 18), [-114, -38, -102, -20], 1, 1.8);
  bell += k.path('M-111.5,-26 Q-108,-33 -104.5,-26 Z', 0.9) + k.dot(-108, -25.2, 0.9) + k.line(-108, -36, -108, -31, 0.6);
  bell += k.line(-108, -52, -108, -60, 1) + k.line(-110.5, -57, -105.5, -57, 0.9);
  // Cuerpo central: dos pisos, columnas, paneles de azulejo y frontón curvo
  let c = '';
  const C = 'M-58,52 V-22 H-40 Q-40,-46 0,-50 Q40,-46 40,-22 H58 V52 Z';
  c += k.path('M-58,52 V-22 H58 V52', 1.8);
  c += k.path('M-40,-22 Q-40,-46 0,-50 Q40,-46 40,-22', 1.6) + k.path('M-34,-22 Q-34,-41 0,-44 Q34,-41 34,-22', 0.8);
  c += k.vase(-40, -22, 1.2) + k.vase(40, -22, 1.2) + k.vase(-58, -22, 1.1) + k.vase(58, -22, 1.1);
  c += k.line(0, -50, 0, -58, 1.2) + k.line(-3, -55, 3, -55, 1);
  c += k.azulejo(-9, -40, 18, 15, 'heart');
  c += k.line(-60, -22, 60, -22, 1.4) + k.line(-60, -19, 60, -19, 0.8);
  c += k.azulejo(-12, -14, 24, 24, 'figure');
  c += k.azulejo(-50, -12, 18, 20, 'cross') + k.azulejo(32, -12, 18, 20, 'anchor');
  c += k.line(-60, 16, 60, 16, 1.4) + k.line(-60, 19, 60, 19, 0.8);
  c += k.opening(k.archD(-10, G, 20, 28), [-10, 24, 10, G], 1.5, 1.5);
  for (const sx of [-1, 1]) c += k.column(sx * 15, 20, 52, 3.4) + k.column(sx * 21, 20, 52, 3.4) + k.column(sx * 15, -18, 14, 2.6) + k.column(sx * 21, -18, 14, 2.6);
  c += k.azulejo(-52, 24, 20, 20, 'star') + k.azulejo(32, 24, 20, 20, 'figure');
  // Estatua de Mañara en el jardín
  const st = k.rect(-108, 26, 14, 26, 1.3) + k.line(-110, 26, -92, 26, 1.4) + k.line(-110, 50, -92, 50, 1) + k.hatchRect(-108, 30, 14, 18, 2.4, 45, 0.4) +
    k.dot(-101, 6, 2.2) + k.path('M-104.5,9 H-97.5 L-96,26 H-106 Z', 1.2) + k.hatchRect(-105, 9, 8, 17, 1.4, 0, 0.5) + k.path('M-97.5,12 Q-91,14 -92,20', 1.1);
  const tr = k.tree(110, G + 8, 14, 16, { seed: 4 });
  const people = k.person(-30, 64, 1) + k.person(-24, 63, 0.9, true) + k.person(66, 64, 1.05, true);
  const ground = k.line(-140, G, 140, G, 1.5) + k.paving(-140, 140, G, 70, 0, -10, { rows: 2, cols: 18 });
  const sky = k.bird(-30, -58, 0.9) + k.bird(-22, -62, 0.7) + k.bird(80, -50, 0.9);
  out.caridad = k.scene('<rect x="-138" y="-66" width="276" height="134"/>', [
    { svg: sky + bell, occ: '' },
    { svg: wings, occ: 'M-140,52 V-18 H140 V52 Z' },
    { svg: c, occ: C + ' M-4,-50 H4 V-60 H-4 Z' },
    { svg: ground },
    { svg: st, occ: 'M-110,52 V24 H-106 V3 H-96 V24 H-92 V52 Z' },
    { svg: tr, occ: k.treeOcc(110, G + 8, 14, 16) },
    { svg: people, occ: k.personOcc(-30, 64) + k.personOcc(-24, 63, 0.9) + k.personOcc(66, 64, 1.05) },
  ]);
}

/* ───────────── Palacio de San Telmo (octógono) ───────────── */
{
  const k = kit('st');
  const G = 80;
  // Fachada lateral con balcones y balaustrada con los sevillanos ilustres
  let wall = k.line(-140, -26, 140, -26, 1.6) + k.balustrade(-140, 140, -26, 7, 4);
  for (let x = -128; x <= 128; x += 21) { if (Math.abs(x) < 40) continue; wall += k.statue(x, -33, 0.9); }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = sx * (48 + i * 22) - 5;
    wall += k.window(x, -14, 10, 18, { arch: true }) + k.railing(x - 3, x + 13, 6, 4, 1.6, 0.5) + k.line(x - 3, -17, x + 13, -17, 1);
    wall += k.window(x, 30, 10, 18, { arch: true }) + k.railing(x - 3, x + 13, 50, 3, 1.6, 0.5);
  }
  wall += k.line(-140, 22, 140, 22, 0.9) + k.line(-140, 25, 140, 25, 0.6);
  wall += k.hatch(`M-140,${G} V64 H140 V${G} Z`, [-140, 64, 140, G], 3, 0, 0.45) + k.line(-140, 64, 140, 64, 0.8);
  // Portada barroca de tres cuerpos
  let p = '';
  const Pd = 'M-36,80 V22 H-30 V-20 H-24 V-62 Q-12,-74 0,-80 Q12,-74 24,-62 V-20 H30 V22 H36 V80 Z';
  p += k.path('M-36,80 V22 H36 V80', 1.7) + k.path('M-30,22 V-20 H30 V22', 1.5) + k.path('M-24,-20 V-62 M24,-20 V-62', 1.4);
  // Primer cuerpo: puerta y tres columnas por lado
  p += k.opening(k.archD(-12, G, 24, 40), [-12, 40, 12, G], 1.6, 1.4) + k.path('M-15,80 V52 A15,15 0 0 1 15,52 V80', 1);
  for (const sx of [-1, 1]) for (const x of [19, 25, 31]) p += k.column(sx * x, 30, 80, 3.2);
  p += k.line(-37, 30, 37, 30, 1.5) + k.line(-37, 26, 37, 26, 0.8) + k.hatchRect(-36, 22, 72, 4, 1.4, 45, 0.4) + k.line(-37, 22, 37, 22, 1.4);
  // Segundo cuerpo: balcón y ventana
  p += k.opening(k.archD(-10, 16, 20, 30), [-10, -14, 10, 16], 1.3, 1.6);
  p += k.railing(-16, 16, 18, 6, 1.7, 0.55);
  for (const sx of [-1, 1]) for (const x of [16, 23]) p += k.column(sx * x, -16, 20, 2.8);
  p += k.vase(-28, -20, 1) + k.vase(28, -20, 1);
  p += k.line(-31, -20, 31, -20, 1.4) + k.line(-31, -16, 31, -16, 0.8);
  // Tercer cuerpo: hornacina con San Telmo y remate
  p += k.path('M-10,-24 V-46 A10,10 0 0 1 10,-46 V-24 Z', 1.2) + k.hatch('M-10,-24 V-46 A10,10 0 0 1 10,-46 V-24 Z', [-10, -56, 10, -24], 1.8, 0, 0.45);
  p += k.dot(0, -45, 2.6) + k.fillPath('M-4,-42 H4 L5,-26 H-5 Z');
  p += k.path('M6,-36 L13,-36 L11,-32 H8 Z M9.5,-36 V-42 L13,-38', 0.8);
  for (const sx of [-1, 1]) p += k.column(sx * 16, -58, -22, 2.6) + k.path(`M${sx * 21},-58 Q${sx * 26},-58 ${sx * 24},-50`, 1);
  p += k.path('M-24,-62 Q-12,-74 0,-80 Q12,-74 24,-62', 1.5) + k.path('M-6,-64 Q0,-70 6,-64 Q0,-58 -6,-64 Z', 0.9);
  p += k.path('M-4,-80 L-3,-84 L-1.5,-82 L0,-86 L1.5,-82 L3,-84 L4,-80 Z', 0.9) + k.line(0, -86, 0, -92, 1) + k.line(-2, -89.5, 2, -89.5, 0.9);
  // Palmeras y suelo
  const palms = k.palm(-92, 86, 70, 5, { fronds: 9, len: 1.1 }) + k.palm(96, 86, 62, -6, { fronds: 9, len: 1 });
  const people = k.person(-52, 90, 1.05, true) + k.person(46, 90, 1) + k.person(53, 89, 0.9);
  const ground = k.line(-140, G, 140, G, 1.5) + k.paving(-140, 140, G, 96, 0, -40, { rows: 2, cols: 20 });
  const sky = k.bird(-60, -70, 0.9) + k.bird(-50, -76, 0.7) + k.bird(64, -66, 0.8);
  out['san-telmo'] = k.scene('<polygon points="128.4,53.2 53.2,128.4 -53.2,128.4 -128.4,53.2 -128.4,-53.2 -53.2,-128.4 53.2,-128.4 128.4,-53.2"/>', [
    { svg: sky },
    { svg: wall, occ: 'M-140,80 V-40 H140 V80 Z' },
    { svg: p, occ: Pd + ' M-5,-80 H5 V-94 H-5 Z' },
    { svg: ground },
    { svg: palms, occ: k.palmOcc(-92, 86, 70, 5, 1.1) + k.palmOcc(96, 86, 62, -6, 1) },
    { svg: people, occ: k.personOcc(-52, 90, 1.05) + k.personOcc(46, 90) + k.personOcc(53, 89, 0.9) },
  ], '<rect x="-150" y="-95" width="300" height="190"/>');
}

/* ───────────── Real Fábrica de Tabacos (rectángulo) ───────────── */
{
  const k = kit('ta');
  const G = 40;
  let wall = k.line(-140, -30, 140, -30, 1.6) + k.balustrade(-140, 140, -30, 6, 3.6);
  for (let x = -136; x <= 136; x += 17) { if (Math.abs(x) < 36) continue; wall += k.vase(x, -36, 0.9); }
  for (let x = -128; x < 128; x += 17) {
    if (Math.abs(x + 4) < 38) continue;
    wall += k.window(x, -22, 8, 12, { sw: 1 }) + k.line(x - 2, -24, x + 10, -24, 0.9);
    wall += k.window(x, 4, 8, 14, { sw: 1 }) + k.line(x - 2, 2, x + 10, 2, 0.9) + k.line(x - 2, 19, x + 10, 19, 0.7);
  }
  wall += k.line(-140, -6, 140, -6, 1) + k.line(-140, -3, 140, -3, 0.6);
  wall += k.hatch('M-140,40 V24 H140 V40 Z', [-140, 24, 140, 40], 3.2, 0, 0.45) + k.line(-140, 24, 140, 24, 0.8);
  // Portada central con frontón y la Fama
  let p = '';
  const Pd = 'M-34,40 V-36 L0,-50 L34,-36 V40 Z';
  p += k.path('M-34,40 V-36 H34 V40', 1.7);
  p += k.path('M-38,-36 L0,-50 L38,-36 Z', 1.5) + k.path('M-30,-38.5 L0,-47.5 L30,-38.5', 0.7);
  p += k.circle(0, -41.5, 3.4, 1) + k.dot(0, -41.5, 1.4);
  p += k.opening(k.archD(-11, G, 22, 30), [-11, 10, 11, G], 1.6, 1.4);
  for (const sx of [-1, 1]) { p += k.column(sx * 17, 6, 40, 3.4) + k.column(sx * 25, 6, 40, 3.4) + k.column(sx * 17, -32, 2, 2.8) + k.column(sx * 25, -32, 2, 2.8); }
  p += k.line(-35, 4, 35, 4, 1.4) + k.line(-35, 1, 35, 1, 0.8);
  p += k.opening(k.rectD(-8, -26, 16, 22), [-8, -26, 8, -4], 1.2, 1.6) + k.railing(-12, 12, -3, 5, 1.7, 0.55);
  p += k.path('M-10,-28 L0,-31 L10,-28', 1) + k.line(-35, -34, 35, -34, 1.2);
  p += k.vase(-38, -36, 1.2) + k.vase(38, -36, 1.2);
  // La Fama: figura alada con trompeta
  p += k.dot(0, -62.5, 1.7) + k.path('M-1.8,-60 H1.8 L2.6,-51 H-2.6 Z', 1) + k.path('M-1.8,-59 L-9,-64 L-6,-58 L-10,-60 L-3,-55', 0.9) + k.line(1.6, -61.5, 9, -64.5, 1) + k.path('M8.6,-65.8 L10.6,-63.2', 1.1);
  // Foso con puente
  let moat = k.line(-140, 44, 140, 44, 1.2) + k.hatch('M-140,44 H-16 V58 H-140 Z M16,44 H140 V58 H16 Z', [-140, 44, 140, 58], 1.8, 0, 0.5);
  moat += k.balustrade(-140, -16, 58, 5, 3.2) + k.balustrade(16, 140, 58, 5, 3.2);
  moat += k.path('M-16,58 V44 M16,58 V44', 1.2);
  const people = k.person(-60, 68, 1) + k.person(-4, 56, 0.85, true) + k.person(4, 55, 0.8) + k.person(78, 68, 1.05, true) + k.person(86, 67, 0.95);
  const tr = k.tree(-110, 64, 13, 12, { seed: 3, oranges: 6 });
  const ground = k.line(-140, G, 140, G, 1.4) + k.line(-140, 58, 140, 58, 1) + k.paving(-140, 140, 58, 70, 0, 0, { rows: 1, cols: 20 });
  const sky = k.bird(-80, -56, 0.9) + k.bird(-72, -60, 0.7) + k.bird(70, -54, 0.9) + k.bird(78, -58, 0.7);
  out.tabacos = k.scene('<rect x="-138" y="-66" width="276" height="134"/>', [
    { svg: sky },
    { svg: wall, occ: 'M-140,40 V-38 H140 V40 Z' },
    { svg: p, occ: Pd + ' M-11,-50 H11 V-67 H-11 Z' },
    { svg: ground + moat },
    { svg: tr, occ: k.treeOcc(-110, 64, 13, 12) },
    { svg: people, occ: k.personOcc(-60, 68) + k.personOcc(-4, 56, 0.85) + k.personOcc(4, 55, 0.8) + k.personOcc(78, 68, 1.05) + k.personOcc(86, 67, 0.95) },
  ]);
}

/* ───────────── Plaza de España (óvalo) ───────────── */
{
  const k = kit('pe');
  const G = 18;
  // Alas exteriores que se curvan alejándose
  let back = '';
  for (const sx of [-1, 1]) {
    const a = sx * 68, b = sx * 118;
    back += k.path(`M${a},-4 Q${sx * 95},-2 ${b},4`, 1.4) + k.path(`M${a},-1 Q${sx * 95},1 ${b},7`, 0.6);
    for (let i = 0; i < 7; i++) {
      const x = a + sx * (4 + i * 7), y0 = -4 + 8 * ((x - a) / (b - a)) ** 2 + 4;
      back += k.opening(k.archD(x - 2.2, G, 4.4, G - y0 - 10), [x - 3, y0 + 10, x + 3, G], 0.7, 1.4);
      back += k.opening(k.rectD(x - 1.4, y0 + 2, 2.8, 4), [x - 2, y0, x + 2, y0 + 7], 0.6, 1.2);
    }
  }
  // Galería con arquería y ventanas entre las torres y el centro
  let wings = '';
  for (const sx of [-1, 1]) {
    const a = sx * 53, b = sx * 16;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    wings += k.line(lo, -12, hi, -12, 1.5) + k.tiles(lo, hi, -12, 2.6, 2.4) + k.line(lo, 3, hi, 3, 0.9);
    for (let x = lo + 4; x < hi - 2; x += 7) {
      wings += k.opening(k.archD(x - 2.4, G, 4.8, 12), [x - 3, 6, x + 3, G], 0.8, 1.4);
      wings += k.window(x - 1.6, -8, 3.2, 7, { arch: true, bars: false, sw: 0.7 });
    }
    wings += k.hatch(k.rectD(lo, -12, hi - lo, 30), [lo, -12, hi, G], 3.4, 0, 0.35);
  }
  // Torres barrocas
  let towers = '';
  let towersOcc = '';
  for (const sx of [-1, 1]) {
    const c = sx * 61;
    towers += k.rect(c - 8, -30, 16, 48, 1.6) + k.hatchRect(c - 8, -30, 16, 48, 3, 0, 0.4);
    towers += k.window(c - 2.5, -22, 5, 10, { arch: true, sw: 0.9 }) + k.window(c - 2.5, -4, 5, 10, { arch: true, sw: 0.9 });
    towers += k.line(c - 10, -30, c + 10, -30, 1.5) + k.line(c - 9, -33, c + 9, -33, 0.9);
    towers += k.vase(c - 9.5, -33, 0.8) + k.vase(c + 9.5, -33, 0.8);
    towers += k.rect(c - 5, -44, 10, 11, 1.4) + k.opening(k.archD(c - 2.2, -34.5, 4.4, 8), [c - 3, -43, c + 3, -34], 0.8, 1.3);
    towers += k.line(c - 6.5, -44, c + 6.5, -44, 1.2) + k.rect(c - 2.6, -49.5, 5.2, 5.5, 1);
    towers += k.path(`M${c - 3.6},-49.5 Q${c},-56 ${c + 3.6},-49.5`, 1.1) + k.line(c, -55, c, -60, 0.9) + k.dot(c, -60.5, 0.9);
    towersOcc += `M${c - 10},${G} V-33 H${c - 6} V-46 H${c - 4} V-50 L${c},-61 L${c + 4},-50 V-46 H${c + 6} V-33 H${c + 10} V${G} Z`;
  }
  // Pabellón central
  let ctr = k.path('M-16,18 V-24 H16 V18', 1.7) + k.path('M-17,-24 Q0,-38 17,-24', 1.4) + k.path('M-11,-25.5 Q0,-33 11,-25.5', 0.7);
  ctr += k.line(0, -31, 0, -38, 1) + k.dot(0, -38.5, 1) + k.vase(-16, -24, 0.9) + k.vase(16, -24, 0.9);
  ctr += k.hatchRect(-16, -24, 32, 42, 3.4, 0, 0.35);
  ctr += k.opening(k.archD(-7, G, 14, 20), [-7, -2, 7, G], 1.3, 1.4);
  ctr += k.railing(-10, 10, -4, 4, 1.6, 0.5) + k.window(-4, -19, 8, 13, { arch: true, sw: 1 });
  ctr += k.column(-11.5, -2, 18, 2.4) + k.column(11.5, -2, 18, 2.4);
  // Canal con barca y el puente de azulejo
  let canal = k.line(-118, 22, 118, 22, 1.3) + k.water(-118, 118, 23, 42, 4.6) + k.line(-118, 42, 118, 42, 1.3);
  let bench = '';
  for (let x = -116; x < 116; x += 8) bench += k.rect(x, 44, 6, 4, 0.6);
  bench += k.line(-118, 48.5, 118, 48.5, 0.9);
  let bridge = k.path('M-30,42 V24 H30 V42', 1.4) + k.path('M-22,42 Q0,22 22,42', 1.4) + k.balustrade(-31, 31, 24, 5, 3.4) + k.line(-31, 28, 31, 28, 0.7);
  for (let x = -27; x <= 27; x += 6) if (Math.abs(x) > 14) bridge += k.rect(x - 2, 30, 4, 4, 0.5);
  bridge += k.water(-20, 20, 34, 42, 4);
  const boat = k.path('M-74,36 L-56,36 L-59,40 H-71 Z', 1.2) + k.person(-66, 36, 0.6) + k.line(-62, 32, -54, 39, 0.9) + k.path('M90,34 L104,34 L102,37 H92 Z', 1);
  const people = k.person(-40, 62, 1, true) + k.person(-33, 61, 0.9) + k.person(44, 63, 1.05, true) + k.person(12, 60, 0.9);
  const ground = k.paving(-118, 118, 50, 72, 0, 10, { rows: 2, cols: 22 });
  const sky = k.bird(-30, -52, 0.9) + k.bird(-22, -56, 0.7) + k.bird(28, -48, 0.8) + k.bird(88, -34, 0.7);
  out['plaza-espana'] = k.scene('<ellipse rx="116" ry="69"/>', [
    { svg: sky },
    { svg: back, occ: '' },
    { svg: wings, occ: 'M-55,18 V-15 H-14 V18 Z M14,18 V-15 H55 V18 Z' },
    { svg: towers, occ: towersOcc },
    { svg: ctr, occ: 'M-18,18 V-24 Q0,-40 18,-24 V18 Z M-2,-30 H2 V-40 H-2 Z' },
    { svg: canal + bench + ground },
    { svg: boat, occ: 'M-75,37 L-55,37 L-59,41 H-71 Z M-69,36 V26 H-63 V36 Z' },
    { svg: bridge, occ: 'M-32,42 V18 H32 V42 Z' },
    { svg: people, occ: k.personOcc(-40, 62) + k.personOcc(-33, 61, 0.9) + k.personOcc(44, 63, 1.05) + k.personOcc(12, 60, 0.9) },
  ]);
}

/* ───────────── Parque de María Luisa (círculo) ───────────── */
{
  const k = kit('ml');
  const G = 54;
  const palms = k.palm(-70, 30, 78, 6, { fronds: 9, len: 1.15 }) + k.palm(74, 30, 70, -5, { fronds: 9, len: 1.1 }) + k.palm(-90, 34, 52, -4, { fronds: 8, len: 0.9 });
  // Pabellón Mudéjar: torre central, azulejo y arcos de herradura
  let b = '';
  const Bd = 'M-60,54 V-6 H-16 V-50 L0,-66 L16,-50 V-6 H60 V54 Z';
  b += k.path('M-60,54 V-6 H60 V54', 1.7) + k.tiles(-62, -16, -6, 2.8, 2.6) + k.tiles(16, 62, -6, 2.8, 2.6);
  b += k.path('M-16,-6 V-50 H16 V-6', 1.6) + k.path('M-19,-50 L0,-66 L19,-50 Z', 1.4) + k.hatch('M-19,-50 L0,-66 L19,-50 Z', [-19, -66, 19, -50], 2.2, 60, 0.45);
  b += k.line(0, -66, 0, -73, 1) + k.dot(0, -74, 1.1);
  for (const sx of [-1, 1]) b += k.opening(k.horseD(sx * 5.5 - 3.8, -24, 7.6, 16), [sx * 5.5 - 4, -42, sx * 5.5 + 4, -24], 0.9, 1.4);
  b += k.hatch(k.rectD(-16, -20, 32, 5), [-16, -20, 16, -15], 1.2, 45, 0.4) + k.hatch(k.rectD(-16, -20, 32, 5), [-16, -20, 16, -15], 1.2, 135, 0.4);
  b += k.rect(-16, -20, 32, 5, 0.8);
  // Friso de azulejo en zigzag
  let zz = 'M-60,18';
  for (let x = -60, i = 0; x < 60; x += 4, i++) zz += ` L${x + 4},${i % 2 ? 18 : 13}`;
  b += k.line(-60, 12, 60, 12, 1) + k.path(zz, 0.8) + k.line(-60, 19, 60, 19, 1);
  for (let x = -52; x <= 52; x += 13) {
    if (Math.abs(x) < 8) continue;
    b += k.opening(k.horseD(x - 3, 6, 6, 12), [x - 3.5, -6, x + 3.5, 6], 0.8, 1.4);
  }
  for (let x = -52; x <= 52; x += 13) b += k.opening(k.horseD(x - 5, G, 10, 28), [x - 6, 24, x + 6, G], 1.1, 1.5) + k.line(x + 6.5, 24, x + 6.5, G, 0.6);
  b += k.hatch('M-60,54 V24 H60 V54 Z', [-60, 24, 60, 54], 4, 0, 0.3);
  // Plaza de América: fuente, palomas y gente
  const fount = k.path('M-44,74 V68 H-20 V74', 1.3) + k.path('M-46,68 H-18', 1.2) + k.line(-32, 68, -32, 58, 1.5) + k.path('M-38,58 H-26 Q-28,62 -32,62 Q-36,62 -38,58 Z', 1.1) + k.path('M-32,58 Q-37,52 -40,60 M-32,58 Q-27,52 -24,60', 0.7) + k.water(-44, -20, 69, 74, 3);
  let doves = '';
  [[-6, 70, 1], [4, 76, -1], [14, 70, 1], [22, 80, -1], [-12, 82, 1], [34, 74, 1], [44, 84, -1], [-2, 88, 1], [28, 90, -1], [56, 72, -1]].forEach(([x, y, d]) => { doves += k.dove(x, y, 1.6, d); });
  const people = k.person(50, 80, 1.1) + k.person(8, 86, 0.75) + k.path('M10,76 Q16,74 18,78', 0.8) + k.dot(19, 79.5, 0.6) + k.dot(17, 81, 0.6);
  const flying = k.bird(-44, -60, 0.9) + k.bird(-34, -66, 0.8) + k.bird(34, -70, 0.9) + k.bird(46, -62, 0.8) + k.bird(40, -78, 0.7);
  const ground = k.line(-104, G, 104, G, 1.5) + k.paving(-104, 104, G, 100, 0, 0, { rows: 3, cols: 18 });
  out['maria-luisa'] = k.scene('<circle r="102"/>', [
    { svg: flying },
    { svg: palms, occ: '' },
    { svg: b, occ: Bd + ' M-3,-66 H3 V-76 H-3 Z' },
    { svg: ground },
    { svg: fount, occ: 'M-47,76 V66 H-39 V56 H-25 V66 H-17 V76 Z' },
    { svg: doves },
    { svg: people, occ: k.personOcc(50, 80, 1.1) + k.personOcc(8, 86, 0.75) },
  ]);
}

// Formas: deben coincidir con `rubber.shape` de cada parada
const SHAPE = { maestranza: 'circle', caridad: 'rect', 'san-telmo': 'octagon', tabacos: 'rect', 'plaza-espana': 'oval', 'maria-luisa': 'circle' };
for (const [id, scene] of Object.entries(out)) {
  writeFileSync(new URL(`design/stamps/${id}.svg`, root), stampFile(RUBBER_BOX[SHAPE[id]], scene));
  console.log(`design/stamps/${id}.svg`);
}
