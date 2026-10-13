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

// Fotos antiguas («Así era»): de dominio público y anteriores a 1940. Con `file` se usa
// ese archivo de Commons; con `search`, se busca en Commons y se queda la más antigua
// que sea JPEG de dominio público (el registro muestra las candidatas para fijar `file`).
// Se guardan en assets/tours/<ruta>/antes/<parada>.jpg y en credits["<parada>@antes"].
const COMMONS = 'https://commons.wikimedia.org/w/api.php?action=query&format=json';
const yearOf = m => {
  const txt = strip(m.DateTimeOriginal?.value) + ' ' + strip(m.ObjectName?.value) + ' ' + strip(m.ImageDescription?.value);
  const y = (txt.match(/\b1[89]\d\d\b/g) ?? []).map(Number).filter(n => n >= 1839 && n <= 1940);
  return y.length ? Math.min(...y) : null;
};
const isFree = m => /public domain|^pd|cc0/i.test(m.LicenseShortName?.value ?? '');
async function cropImage(buf, [l, t, r, b]) {
  if (sharp) {
    const { width: w, height: h } = await sharp(buf).metadata();
    const box = { left: Math.round(w * l), top: Math.round(h * t), width: Math.round(w * (1 - l - r)), height: Math.round(h * (1 - t - b)) };
    return sharp(buf).extract(box).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  }
  const tmp = join(process.env.RUNNER_TEMP ?? '/tmp', `crop-${Date.now()}.jpg`);
  await writeFile(tmp, buf);
  const { stdout } = await run('identify', ['-format', '%w %h', tmp]);
  const [w, h] = stdout.split(' ').map(Number);
  await run('convert', [tmp, '-crop', `${Math.round(w * (1 - l - r))}x${Math.round(h * (1 - t - b))}+${Math.round(w * l)}+${Math.round(h * t)}`, '+repage', '-quality', '84', tmp]);
  return readFile(tmp);
}
async function infos(titles) {
  const r = await (await get(`${COMMONS}&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=1280&titles=${encodeURIComponent(titles.join('|'))}`)).json();
  return Object.values(r.query?.pages ?? {}).filter(p => p.imageinfo).map(p => ({ title: p.title, ii: p.imageinfo[0] }));
}
async function fetchThen(spec, { id, file, search, crop }, credits) {
  const key = `${id}@antes`;
  const out = join(spec.dir, 'antes', `${id}.jpg`);
  const want = file && (file.startsWith('File:') ? file : 'File:' + file);
  const same = c => (!want || c.file === want.slice(5).replace(/ /g, '_')) && JSON.stringify(c.crop ?? null) === JSON.stringify(crop ?? null);
  if (!FORCE && credits[key] && same(credits[key]) && await access(out).then(() => true, () => false)) { console.log(`${key}: ya está`); return; }
  let pick;
  if (want) {
    pick = (await infos([want]))[0];
    if (!pick) throw new Error(`${key}: ${want} no está en Commons`);
  } else {
    const titles = [];
    for (const q of [search].flat()) {
      const r = await (await get(`${COMMONS}&list=search&srnamespace=6&srlimit=40&srsearch=${encodeURIComponent(q)}`)).json();
      for (const x of r.query?.search ?? []) if (!titles.includes(x.title)) titles.push(x.title);
    }
    const found = [];
    for (let i = 0; i < titles.length; i += 20) found.push(...await infos(titles.slice(i, i + 20)));
    const ok = found
      .map(f => ({ ...f, year: yearOf(f.ii.extmetadata ?? {}) }))
      .filter(f => f.ii.mime === 'image/jpeg' && isFree(f.ii.extmetadata ?? {}) && f.year && f.ii.width >= 800)
      .sort((a, b) => a.year - b.year);
    console.log(`${key}: ${ok.length} candidatas para «${search}»`);
    for (const f of ok.slice(0, 15)) console.log(`   ${f.year} · ${f.title} · ${f.ii.extmetadata?.LicenseShortName?.value}`);
    pick = ok[0];
    if (!pick) { console.warn(`${key}: sin foto antigua libre, se omite`); return; }
  }
  const m = pick.ii.extmetadata ?? {};
  if (pick.ii.mime !== 'image/jpeg') throw new Error(`${key}: ${pick.title} es ${pick.ii.mime}, se necesita JPEG`);
  if (!isFree(m)) throw new Error(`${key}: ${pick.title} no es de dominio público (${m.LicenseShortName?.value})`);
  await mkdir(join(spec.dir, 'antes'), { recursive: true });
  let img = Buffer.from(await (await get(pick.ii.thumburl)).arrayBuffer());
  // Recorte [izquierda, arriba, derecha, abajo] en fracciones: quita el cartón y los
  // márgenes del escaneo para que la foto encaje con la de hoy
  if (crop) img = await cropImage(img, crop);
  await writeFile(out, img);
  credits[key] = {
    file: pick.title.slice(5).replace(/ /g, '_'),
    author: strip(m.Artist?.value) || 'Desconocido',
    license: m.LicenseShortName?.value ?? '',
    source: pick.ii.descriptionurl,
    year: yearOf(m),
    ...(crop ? { crop } : {}),
  };
  console.log(`${key}: ${pick.title} (${Math.round(img.length / 1024)} KB) · ${credits[key].author} · ${credits[key].year}`);
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
  for (const spec2 of spec.then ?? []) await fetchThen(spec, spec2, credits);
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
