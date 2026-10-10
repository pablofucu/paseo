// Calcula la ruta a pie por calles entre las paradas de cada tour y la guarda
// en src/data/tours/*.geo.json (legs + steps). Se ejecuta en GitHub Actions
// (workflow «Rutas») o en local: `node scripts/build-routes.mjs`.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROUTER = process.env.ROUTER ?? 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';
const DIR = 'src/data/tours';
const MODIFIER = { left: 'left', 'sharp left': 'left', right: 'right', 'sharp right': 'right', 'slight left': 'slight-left', 'slight right': 'slight-right', uturn: 'uturn' };
const round = c => [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6];

async function route(points) {
  const coords = points.map(p => `${p[0]},${p[1]}`).join(';');
  const url = `${ROUTER}/${coords}?overview=false&steps=true&geometries=geojson`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Paseo route builder (github.com/pablofucu/paseo)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const json = await res.json();
  if (json.code !== 'Ok') throw new Error(`OSRM ${json.code}`);
  return json.routes[0].legs.map(leg => {
    const line = [];
    const steps = [];
    for (const st of leg.steps) {
      for (const c of st.geometry.coordinates.map(round)) {
        const last = line.at(-1);
        if (!last || last[0] !== c[0] || last[1] !== c[1]) line.push(c);
      }
      const direction = MODIFIER[st.maneuver.modifier];
      if (direction && !['depart', 'arrive'].includes(st.maneuver.type)) steps.push({ location: round(st.maneuver.location), direction, street: st.name ?? '' });
    }
    return { line, steps, meters: Math.round(leg.distance) };
  });
}

for (const file of (await readdir(DIR)).filter(f => f.endsWith('.geo.json'))) {
  const path = join(DIR, file);
  const geo = JSON.parse(await readFile(path, 'utf8'));
  const legs = await route(geo.stops.map(s => s.coord));
  geo.legs = legs.map(l => l.line);
  geo.steps = legs.map(l => l.steps);
  geo.generated = { router: ROUTER, meters: legs.map(l => l.meters) };
  await writeFile(path, JSON.stringify(geo, null, 2) + '\n');
  console.log(`${file}: ${legs.map((l, i) => `tramo ${i + 1} ${l.meters} m, ${l.line.length} puntos, ${l.steps.length} giros (${l.steps.map(s => s.street || '?').join(' → ')})`).join('\n  ')}`);
}
