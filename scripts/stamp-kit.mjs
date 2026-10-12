// Piezas para dibujar escenas de sellos de goma (design/stamps/<parada>.svg)
// con el mismo trazo que los de la guía: líneas en currentColor, sombreado de
// rayas recortado y halos de máscara para que lo de delante tape lo de detrás.
//
// Una escena son capas de atrás adelante; cada capa puede declarar su silueta
// (`occ`) y las de detrás se enmascaran con ella (con un margen blanco, como
// el hueco que deja la goma entre dos relieves).

const f = n => +n.toFixed(1);

export function kit(prefix) {
  let n = 0;
  const id = s => `${prefix}_${s}${(n++).toString(36)}`;

  const path = (d, w = 1.4, extra = '') => `<path d="${d}" stroke-width="${w}"${extra}/>`;
  const fillPath = d => `<path d="${d}" fill="currentColor" stroke="none"/>`;
  const line = (x1, y1, x2, y2, w = 1) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${w}"/>`;
  const rect = (x, y, w, h, sw = 1.4) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" stroke-width="${sw}"/>`;
  const dot = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="currentColor" stroke="none"/>`;
  const circle = (x, y, r, w = 1.2) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" stroke-width="${w}"/>`;
  const rectD = (x, y, w, h) => `M${f(x)},${f(y)} H${f(x + w)} V${f(y + h)} H${f(x)} Z`;

  /** Rayado dentro de un trazado: horizontal (ang 0), inclinado o vertical (90) */
  function hatch(d, box, step = 4, ang = 0, w = 0.45) {
    const c = id('h');
    const [x0, y0, x1, y1] = box;
    let out = '';
    if (ang === 0) for (let y = y0 + step / 2; y < y1; y += step) out += line(x0, y, x1, y, w);
    else if (ang === 90) for (let x = x0 + step / 2; x < x1; x += step) out += line(x, y0, x, y1, w);
    else {
      const t = Math.tan((ang * Math.PI) / 180), H = y1 - y0;
      for (let x = x0 - H / t; x < x1; x += step / Math.sin((ang * Math.PI) / 180)) out += line(x, y1, x + H / t, y0, w);
    }
    return `<clipPath id="${c}"><path d="${d}"/></clipPath><g clip-path="url(#${c})">${out}</g>`;
  }
  const hatchRect = (x, y, w, h, step, ang, sw) => hatch(rectD(x, y, w, h), [x, y, x + w, y + h], step, ang, sw);

  /** Hueco oscuro (puerta, ventana): contorno y rayado tupido */
  function opening(d, box, sw = 1.2, step = 1.6) {
    return hatch(d, box, step, 0, 0.55) + path(d, sw);
  }
  /** Arco de medio punto: x, y del arranque (esquina inferior izq.), ancho, alto total */
  const archD = (x, y, w, h) => `M${f(x)},${f(y)} V${f(y - h + w / 2)} A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(x + w)},${f(y - h + w / 2)} V${f(y)} Z`;
  /** Arco de herradura */
  const horseD = (x, y, w, h) => {
    const r = w / 2, cy = y - h + r * 1.15;
    return `M${f(x + w * 0.08)},${f(y)} V${f(cy + r * 0.45)} A${f(r)},${f(r)} 0 1 1 ${f(x + w * 0.92)},${f(cy + r * 0.45)} V${f(y)} Z`;
  };
  function window_(x, y, w, h, { arch = false, bars = true, sw = 1.1 } = {}) {
    const d = arch ? archD(x, y + h, w, h) : rectD(x, y, w, h);
    let s = opening(d, [x, y, x + w, y + h], sw, 1.7);
    if (bars) s += line(x + w / 2, y + (arch ? w / 2 : 0), x + w / 2, y + h, 0.7);
    return s;
  }
  /** Barandilla de balcón: pasamanos y barrotes */
  function railing(x0, x1, y, h, step = 2.2, w = 0.6) {
    let s = line(x0, y - h, x1, y - h, 1.1) + line(x0, y, x1, y, 0.9);
    for (let x = x0 + step / 2; x < x1; x += step) s += line(x, y - h, x, y, w);
    return s;
  }
  /** Balaustrada de piedra: balaustres de botella */
  function balustrade(x0, x1, y, h, step = 4) {
    let s = line(x0, y - h, x1, y - h, 1.3) + line(x0, y, x1, y, 1.1);
    for (let x = x0 + step / 2; x < x1 - 1; x += step) s += path(`M${f(x - 0.9)},${f(y)} Q${f(x - 1.6)},${f(y - h * 0.45)} ${f(x)},${f(y - h * 0.55)} Q${f(x + 1.6)},${f(y - h * 0.45)} ${f(x + 0.9)},${f(y)}`, 0.6);
    return s;
  }
  /** Tejado de teja vista de frente: borde y canales */
  function tiles(x0, x1, y, h = 3, step = 2.6) {
    let s = line(x0, y, x1, y, 1.3);
    for (let x = x0 + step / 2; x < x1; x += step) s += line(x, y, x, y - h, 0.55);
    return s + line(x0, y - h, x1, y - h, 0.8);
  }
  /** Una persona de pie (como las de la guía) */
  function person(x, y, s = 1, walk = false) {
    const head = 2.2 * s, top = y - 16 * s;
    let o = dot(x, top + head, head);
    o += fillPath(`M${f(x - 2.4 * s)},${f(top + head * 2 + 0.6)} L${f(x + 2.4 * s)},${f(top + head * 2 + 0.6)} L${f(x + 3 * s)},${f(top + 11 * s)} L${f(x - 3 * s)},${f(top + 11 * s)} Z`);
    if (walk) o += line(x - 1 * s, top + 11 * s, x - 3 * s, y, 1.5 * s) + line(x + 1 * s, top + 11 * s, x + 3 * s, y, 1.5 * s);
    else o += line(x - 1.2 * s, top + 11 * s, x - 1.5 * s, y, 1.6 * s) + line(x + 1.2 * s, top + 11 * s, x + 1.6 * s, y, 1.6 * s);
    return o;
  }
  const personOcc = (x, y, s = 1) => rectD(x - 3.5 * s, y - 16 * s, 7 * s, 16 * s);
  /** Farola de brazo */
  function lamp(x, y, h = 30) {
    return line(x, y, x, y - h, 1.5) + path(`M${f(x - 3)},${f(y - h)} L${f(x)},${f(y - h - 6)} L${f(x + 3)},${f(y - h)} Z`, 1.1) +
      line(x - 2.2, y - h + 1.5, x + 2.2, y - h + 1.5, 0.8) + path(`M${f(x - 3)},${f(y)} L${f(x - 2)},${f(y - 4)} H${f(x + 2)} L${f(x + 3)},${f(y)} Z`, 1);
  }
  const lampOcc = (x, y, h = 30) => rectD(x - 3.5, y - h - 6, 7, h + 6);
  /** Copa redonda de árbol (contorno festoneado), su silueta y el tronco */
  function blobD(cx, cy, r, k = 9, seed = 1) {
    let d = '', prev;
    for (let i = 0; i <= k; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / k;
      const rr = r * (0.92 + 0.1 * Math.sin(i * 2.7 + seed));
      const p = [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      if (!prev) d = `M${f(p[0])},${f(p[1])}`;
      else d += ` A${f(r * 0.38)},${f(r * 0.38)} 0 0 1 ${f(p[0])},${f(p[1])}`;
      prev = p;
    }
    return d + 'Z';
  }
  function tree(cx, ground, r, trunk, { oranges = 0, seed = 1 } = {}) {
    const cy = ground - trunk - r;
    let s = line(cx, ground, cx, cy + r * 0.5, 2.2) + line(cx, cy + r * 0.9, cx - r * 0.3, cy + r * 0.5, 1.1);
    s += path(blobD(cx, cy, r, 9, seed), 1.8);
    for (let i = 0; i < 5; i++) {
      const a = seed * 1.7 + i * 1.3, rr = r * 0.45 * ((i % 3) / 3 + 0.4);
      const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a), q = r * 0.16;
      s += path(`M${f(x - q)},${f(y)} A${f(q)},${f(q)} 0 0 1 ${f(x + q)},${f(y)}`, 0.8);
    }
    for (let i = 0; i < oranges; i++) {
      const a = seed + i * 2.39, rr = r * 0.7 * Math.sqrt((i + 0.5) / oranges);
      s += dot(cx + rr * Math.cos(a), cy + rr * Math.sin(a), Math.max(1.2, r * 0.09));
    }
    return s;
  }
  const treeOcc = (cx, ground, r, trunk) => blobD(cx, ground - trunk - r, r, 9, 1) + rectD(cx - 2, ground - trunk - r, 4, trunk + r);
  /** Palmera: tronco curvo anillado y hojas en abanico */
  function palm(x, ground, h, lean = 4, { fronds = 9, len = 1 } = {}) {
    const tx = x + lean, ty = ground - h;
    let s = path(`M${f(x)},${f(ground)} Q${f(x - lean * 0.4)},${f(ground - h * 0.5)} ${f(tx)},${f(ty)}`, 2.4);
    for (let i = 1; i < h / 5; i++) {
      const t = (i * 5) / h, px = (1 - t) * (1 - t) * x + 2 * t * (1 - t) * (x - lean * 0.4) + t * t * tx, py = ground - h * t;
      s += line(px - 2, py, px + 2, py - 0.8, 0.6);
    }
    for (let i = 0; i < fronds; i++) {
      const a = Math.PI + (i * Math.PI) / (fronds - 1);
      const L = (14 + 5 * Math.sin(i * 1.9)) * len, droop = 6 * Math.abs(Math.cos(a)) * len;
      const ex = tx + L * Math.cos(a), ey = ty + L * Math.sin(a) * 0.55 + droop;
      const mx = tx + L * 0.55 * Math.cos(a), my = ty + L * 0.55 * Math.sin(a) * 0.9 - 2;
      s += path(`M${f(tx)},${f(ty)} Q${f(mx)},${f(my)} ${f(ex)},${f(ey)}`, 1.6);
      for (let k = 1; k < 5; k++) {
        const t = k / 5, qx = (1 - t) * (1 - t) * tx + 2 * t * (1 - t) * mx + t * t * ex, qy = (1 - t) * (1 - t) * ty + 2 * t * (1 - t) * my + t * t * ey;
        s += line(qx, qy, qx + Math.cos(a + 0.9) * 3.4 * len, qy + 3.2 * len, 0.6) + line(qx, qy, qx + Math.cos(a - 0.9) * 3.4 * len, qy + 3 * len, 0.6);
      }
    }
    return s + dot(tx - 1, ty + 2, 1.2) + dot(tx + 1.4, ty + 2.4, 1.1);
  }
  const palmOcc = (x, ground, h, lean = 4, len = 1) => `M${f(x - 2)},${f(ground)} L${f(x + lean - 2)},${f(ground - h)} L${f(x + lean + 2)},${f(ground - h)} L${f(x + 2)},${f(ground)} Z` + rectD(x + lean - 20 * len, ground - h - 8 * len, 40 * len, 18 * len);
  /** Pájaros en el cielo */
  const bird = (x, y, s = 1) => path(`M${f(x - 3 * s)},${f(y - 1 * s)} Q${f(x - 1.5 * s)},${f(y - 2.4 * s)} ${f(x)},${f(y)} Q${f(x + 1.5 * s)},${f(y - 2.4 * s)} ${f(x + 3 * s)},${f(y - 1 * s)}`, 0.9);
  /** Paloma posada en el suelo */
  const dove = (x, y, s = 1, dir = 1) => path(`M${f(x - 3 * s * dir)},${f(y)} Q${f(x)},${f(y - 3.5 * s)} ${f(x + 2.5 * s * dir)},${f(y - 2.6 * s)} L${f(x + 3.6 * s * dir)},${f(y - 2.2 * s)} M${f(x - 3 * s * dir)},${f(y)} L${f(x - 4.6 * s * dir)},${f(y - 1.4 * s)}`, 1) + dot(x + 2.6 * s * dir, y - 3 * s, 0.9 * s) + line(x, y, x, y + 1.6 * s, 0.6);
  /** Suelo enlosado con fuga hacia (vx, vy) */
  function paving(x0, x1, y0, y1, vx, vy, { rows = 3, cols = 12 } = {}) {
    let s = '';
    for (let i = 1; i <= rows; i++) {
      const t = i / (rows + 1), y = y0 + (y1 - y0) * t * t * 1.4;
      if (y < y1) s += line(x0, y, x1, y, 0.5);
    }
    for (let i = 0; i <= cols; i++) {
      const x = x0 + ((x1 - x0) * i) / cols;
      const xb = vx + (x - vx) * ((y1 - vy) / (y0 - vy));
      s += line(x, y0, xb, y1, 0.45);
    }
    return s;
  }
  /** Ondas de agua */
  function water(x0, x1, y0, y1, step = 4.5) {
    let s = '';
    let k = 0;
    for (let y = y0 + step / 2; y < y1; y += step, k++) {
      let d = '';
      for (let x = x0 + (k % 2) * 5; x < x1 - 6; x += 14) d += `M${f(x)},${f(y)} q2.5,-1.6 5,0 t5,0 `;
      s += path(d, 0.6);
    }
    return s;
  }
  /** Columna con capitel y basa */
  function column(x, y0, y1, w = 3.6) {
    let s = rect(x - w / 2, y0 + 2, w, y1 - y0 - 4, 1);
    s += line(x - w / 2 - 1.2, y0 + 2, x + w / 2 + 1.2, y0 + 2, 1.2) + line(x - w / 2 - 1.2, y1 - 2, x + w / 2 + 1.2, y1 - 2, 1.2);
    s += line(x - w / 2 - 0.8, y0, x + w / 2 + 0.8, y0, 0.9) + line(x - w / 2 - 0.8, y1, x + w / 2 + 0.8, y1, 0.9);
    if (w >= 3) s += line(x, y0 + 4, x, y1 - 4, 0.45);
    return s;
  }
  /** Panel de azulejos: retícula y una figura sencilla en el centro */
  function azulejo(x, y, w, h, motif = 'cross') {
    let s = rect(x, y, w, h, 1.3) + rect(x + 1.6, y + 1.6, w - 3.2, h - 3.2, 0.6);
    const g = Math.max(3, w / 5);
    for (let gx = x + 1.6 + g; gx < x + w - 2; gx += g) s += line(gx, y + 1.6, gx, y + h - 1.6, 0.35);
    for (let gy = y + 1.6 + g; gy < y + h - 2; gy += g) s += line(x + 1.6, gy, x + w - 1.6, gy, 0.35);
    const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.26;
    if (motif === 'cross') s += line(cx, cy - r, cx, cy + r, 1.6) + line(cx - r * 0.6, cy - r * 0.35, cx + r * 0.6, cy - r * 0.35, 1.6);
    else if (motif === 'heart') s += fillPath(`M${f(cx)},${f(cy + r)} C${f(cx - r * 1.5)},${f(cy - r * 0.2)} ${f(cx - r * 0.5)},${f(cy - r * 1.2)} ${f(cx)},${f(cy - r * 0.3)} C${f(cx + r * 0.5)},${f(cy - r * 1.2)} ${f(cx + r * 1.5)},${f(cy - r * 0.2)} ${f(cx)},${f(cy + r)} Z`);
    else if (motif === 'anchor') s += line(cx, cy - r, cx, cy + r, 1.4) + path(`M${f(cx - r * 0.8)},${f(cy + r * 0.3)} Q${f(cx)},${f(cy + r * 1.5)} ${f(cx + r * 0.8)},${f(cy + r * 0.3)}`, 1.3) + line(cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy - r * 0.5, 1.2) + circle(cx, cy - r * 1.1, r * 0.22, 0.9);
    else if (motif === 'figure') s += person(cx, cy + r * 1.1, r / 7.5);
    else if (motif === 'star') {
      let p = '';
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.42 : r, a = -Math.PI / 2 + (i * Math.PI) / 5; p += `${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))} `; }
      s += `<polygon points="${p.trim()}" fill="currentColor" stroke="none"/>`;
    }
    return s;
  }
  /** Jarrón o pináculo de remate */
  const vase = (x, y, s = 1) => path(`M${f(x - 1.6 * s)},${f(y)} H${f(x + 1.6 * s)} L${f(x + 1)},${f(y - 1.4 * s)} Q${f(x + 2.6 * s)},${f(y - 3 * s)} ${f(x)},${f(y - 5 * s)} Q${f(x - 2.6 * s)},${f(y - 3 * s)} ${f(x - 1)},${f(y - 1.4 * s)} Z`, 0.9) + line(x, y - 5 * s, x, y - 7 * s, 0.8) + dot(x, y - 7.4 * s, 0.8 * s);
  /** Estatua sobre pedestal (silueta) */
  function statue(x, y, s = 1) {
    let o = rect(x - 3 * s, y - 6 * s, 6 * s, 6 * s, 0.9);
    o += dot(x, y - 14.6 * s, 1.6 * s) + fillPath(`M${f(x - 2 * s)},${f(y - 6 * s)} L${f(x - 1.6 * s)},${f(y - 13 * s)} H${f(x + 1.6 * s)} L${f(x + 2 * s)},${f(y - 6 * s)} Z`);
    return o;
  }

  /**
   * Monta la escena: recorte exterior (`clip`, contenido de <clipPath>) y capas
   * de atrás adelante {occ?, svg, halo?}. Cada capa queda enmascarada por las
   * siluetas de las que tiene delante. `inner`: segundo recorte opcional.
   */
  function scene(clip, layers, inner) {
    let out = `<clipPath id="${prefix}_c">${clip}</clipPath>` + (inner ? `<clipPath id="${prefix}_i">${inner}</clipPath>` : '');
    const masks = [];
    layers.forEach((l, i) => {
      const front = layers.slice(i + 1).filter(x => x.occ);
      if (!front.length) return masks.push(null);
      const m = `${prefix}_m${i}`;
      out += `<mask id="${m}" maskUnits="userSpaceOnUse" x="-170" y="-170" width="340" height="340"><rect x="-170" y="-170" width="340" height="340" fill="#fff"/><g fill="#000" stroke="#000" stroke-linejoin="round" stroke-linecap="round">` +
        front.map(x => `<path d="${x.occ}" stroke-width="${x.halo ?? 5}"/>`).join('') + '</g></mask>';
      masks.push(m);
    });
    out += `<g clip-path="url(#${prefix}_c)">` + (inner ? `<g clip-path="url(#${prefix}_i)">` : '');
    layers.forEach((l, i) => { out += masks[i] ? `<g mask="url(#${masks[i]})">${l.svg}</g>` : l.svg; });
    return out + (inner ? '</g>' : '') + '</g>';
  }

  return { f, id, path, fillPath, line, rect, dot, circle, rectD, hatch, hatchRect, opening, archD, horseD, window: window_, railing, balustrade, tiles, person, personOcc, lamp, lampOcc, blobD, tree, treeOcc, palm, palmOcc, bird, dove, paving, water, column, azulejo, vase, statue, scene };
}

/** Archivo de la guía: la escena va entre el primer <clipPath> y el último "\n</g></g>" */
export const stampFile = (box, scene) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">\n` +
  `<g class="stamp" color="#1d4e89" style="mix-blend-mode:multiply">\n<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">\n` +
  scene + '\n</g></g>\n</svg>\n';
