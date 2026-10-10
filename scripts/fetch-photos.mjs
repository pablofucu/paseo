// Descarga la foto principal del artículo de Wikipedia de cada parada (Wikimedia
// Commons, licencias libres) y guarda autoría y licencia para mostrarlas en la app.
// Lee src/data/tours/*.photos.json y escribe <tour>.credits.json.
import { mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/data/tours';
const UA = { 'User-Agent': 'Paseo content builder (github.com/pablofucu/paseo)' };
const FORCE = process.env.FORCE === '1';
const strip = html => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const get = async url => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return r; };

for (const file of (await readdir(DIR)).filter(f => f.endsWith('.photos.json'))) {
  const spec = JSON.parse(await readFile(join(DIR, file), 'utf8'));
  await mkdir(spec.dir, { recursive: true });
  const creditsPath = join(DIR, file.replace('.photos.json', '.credits.json'));
  const credits = await readFile(creditsPath, 'utf8').then(JSON.parse).catch(() => ({}));
  for (const { id, wiki } of spec.photos) {
    const out = join(spec.dir, `${id}.jpg`);
    if (!FORCE && credits[id] && await access(out).then(() => true, () => false)) { console.log(`${id}: ya está`); continue; }
    const [lang, title] = wiki.split(':');
    const page = await (await get(`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&redirects=1&titles=${encodeURIComponent(title)}`)).json();
    const name = Object.values(page.query.pages)[0]?.pageimage;
    if (!name) throw new Error(`${id}: el artículo ${wiki} no tiene imagen principal`);
    const info = await (await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1280&titles=${encodeURIComponent('File:' + name)}`)).json();
    const ii = Object.values(info.query.pages)[0]?.imageinfo?.[0];
    if (!ii) throw new Error(`${id}: ${name} no está en Commons`);
    if (ii.mime !== 'image/jpeg') throw new Error(`${id}: ${name} es ${ii.mime}, se necesita JPEG`);
    const img = Buffer.from(await (await get(ii.thumburl)).arrayBuffer());
    await writeFile(out, img);
    const m = ii.extmetadata ?? {};
    credits[id] = { file: name, author: strip(m.Artist?.value) || 'Desconocido', license: m.LicenseShortName?.value ?? '', source: ii.descriptionurl };
    console.log(`${id}: ${name} (${Math.round(img.length / 1024)} KB) · ${credits[id].author} · ${credits[id].license}`);
  }
  await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n');
}
