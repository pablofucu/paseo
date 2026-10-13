// Descarga la foto principal del artículo de Wikipedia de cada parada (Wikimedia
// Commons, licencias libres) y guarda autoría y licencia para mostrarlas en la app.
// Lee src/data/tours/*.photos.json y escribe <tour>.credits.json y las miniaturas
// assets/tours/<ruta>/thumbs/<parada>.jpg.
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const DIR = 'src/data/tours';
const UA = { 'User-Agent': 'Paseo content builder (github.com/pablofucu/paseo)' };
const FORCE = process.env.FORCE === '1';
const strip = html => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// Wikipedia limita la frecuencia (HTTP 429): se espera y se reintenta
const get = async (url, tries = 5) => {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r;
    if (r.status !== 429 || i >= tries) throw new Error(`HTTP ${r.status} ${url}`);
    await new Promise(res => setTimeout(res, (Number(r.headers.get('retry-after')) || 2 ** i * 2) * 1000));
  }
};

// Miniaturas cuadradas de 160 px (paradas de la ficha y botón «Guía»): evitan
// decodificar fotos de 1280 px para pintar círculos de 40. Usa sharp si está
// instalado y, si no, ImageMagick (`magick` o `convert`).
const THUMB = 160;
const run = promisify(execFile);
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { /* sin sharp */ }
async function thumbnail(src, dest) {
  await mkdir(join(dest, '..'), { recursive: true });
  if (sharp) { await sharp(src).resize(THUMB, THUMB, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toFile(dest); return; }
  for (const bin of ['magick', 'convert']) {
    try {
      await run(bin, [src, '-resize', `${THUMB}x${THUMB}^`, '-gravity', 'center', '-extent', `${THUMB}x${THUMB}`, '-strip', '-quality', '78', dest]);
      return;
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  throw new Error('Para las miniaturas hace falta sharp (npm i --no-save sharp) o ImageMagick');
}

for (const file of (await readdir(DIR)).filter(f => f.endsWith('.photos.json'))) {
  const spec = JSON.parse(await readFile(join(DIR, file), 'utf8'));
  await mkdir(spec.dir, { recursive: true });
  const creditsPath = join(DIR, file.replace('.photos.json', '.credits.json'));
  const credits = await readFile(creditsPath, 'utf8').then(JSON.parse).catch(() => ({}));
  for (const { id, wiki } of spec.photos) {
    const out = join(spec.dir, `${id}.jpg`);
    const thumb = join(spec.dir, 'thumbs', `${id}.jpg`);
    const has = f => access(f).then(() => true, () => false);
    if (!FORCE && credits[id] && await has(out)) {
      console.log(`${id}: ya está`);
      if (!await has(thumb)) { await thumbnail(out, thumb); console.log(`${id}: miniatura`); }
      continue;
    }
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
    await thumbnail(out, thumb);
    const m = ii.extmetadata ?? {};
    credits[id] = { file: name, author: strip(m.Artist?.value) || 'Desconocido', license: m.LicenseShortName?.value ?? '', source: ii.descriptionurl };
    console.log(`${id}: ${name} (${Math.round(img.length / 1024)} KB) · ${credits[id].author} · ${credits[id].license}`);
  }
  await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n');
}

// Rutas con fotos propias (sin .photos.json, p. ej. Tomares): solo las miniaturas que falten
for (const dir of await readdir('assets/tours')) {
  const base = join('assets/tours', dir);
  for (const f of (await readdir(base)).filter(f => f.endsWith('.jpg'))) {
    const thumb = join(base, 'thumbs', f);
    if (!FORCE && await access(thumb).then(() => true, () => false)) continue;
    await thumbnail(join(base, f), thumb);
    console.log(`${dir}/${f}: miniatura`);
  }
}
