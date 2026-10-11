import { describe, expect, it } from '@jest/globals';
import { SCENES } from '@/data/stamps/scenes';
import { TOURS } from '@/data/tours';
import { contraste, PAPEL, tintaDeRuta } from '@/lib/ink';
import { clampToSafe, overlap, randomSpot, settle } from '@/lib/placement';
import { fechaRomana, fechaSello, rng, rubberXml, sealXml } from '@/lib/rubber';
import { sheetFor } from '@/lib/sheet';
import { migrateVisits } from '@/store/passport';

describe('tinta de la ruta', () => {
  it('deja igual un acento que ya se lee (Tomares, 5,8:1)', () => {
    expect(tintaDeRuta('#9c3a24')).toBe('#9c3a24');
    expect(contraste('#9c3a24', PAPEL)).toBeGreaterThan(5.6);
  });
  it('oscurece un acento claro hasta 4,5:1', () => {
    const t = tintaDeRuta('#e8a33d');
    expect(t).not.toBe('#e8a33d');
    expect(contraste(t, PAPEL)).toBeGreaterThanOrEqual(4.5);
  });
  it('todas las rutas tienen tinta legible', () => {
    for (const tour of TOURS) expect(contraste(tintaDeRuta(tour.accent), PAPEL)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('colocar sellos', () => {
  const sheet = sheetFor(330);
  it('respeta márgenes, cabecera y pie', () => {
    const c = clampToSafe(0, 0, 100, 100, sheet);
    expect(c.x).toBe(16 + 50);
    expect(c.y).toBeGreaterThanOrEqual(sheet.top + 50);
    const d = clampToSafe(999, 999, 100, 100, sheet);
    expect(d.y + 50).toBeLessThanOrEqual(sheet.h - sheet.bottom);
  });
  it('si tapa más de un 35 % a otro, se aparta lo justo', () => {
    const other = { x: 165, y: 250, w: 110, h: 110 };
    const p = settle(170, 255, 110, 110, [other], sheet);
    expect(overlap({ ...p, w: 110, h: 110 }, other)).toBeLessThanOrEqual(0.35 + 1e-9);
    expect(Math.hypot(p.x - 170, p.y - 255)).toBeLessThan(75);
  });
  it('si cabe, cae justo donde se suelta', () => {
    expect(settle(165, 250, 110, 110, [], sheet)).toEqual({ x: 165, y: 250 });
  });
  it('«Colócalo tú» encuentra un hueco libre', () => {
    const others = [{ x: 100, y: 200, w: 110, h: 110 }, { x: 230, y: 200, w: 110, h: 110 }];
    const p = randomSpot(110, 110, others, sheet, rng(3));
    for (const o of others) expect(overlap({ ...p, w: 110, h: 110 }, o)).toBeLessThanOrEqual(0.35 + 1e-9);
  });
});

describe('sellos de goma', () => {
  it('cada parada tiene su escena dibujada', () => {
    for (const tour of TOURS) for (const st of tour.stops) expect(SCENES[st.id]?.length).toBeGreaterThan(1000);
  });
  it('genera el sello con la ciudad, la fecha y una sola tinta', () => {
    const tour = TOURS.find(t => t.city === 'Tomares')!;
    const stop = tour.stops.find(s => s.id === 'kebab')!;
    const xml = rubberXml({ art: stop.rubber, scene: SCENES.kebab, city: tour.city, date: '2026-10-10T17:00:00Z', color: '#9c3a24', seed: 4 });
    expect(xml).toContain('ROYAL KING KEBAB');
    expect(xml).toContain('TOMARES · 10 OCT 2026 · SEVILLA');
    expect(xml).toContain('color="#9c3a24"');
    // ids con prefijo propio, sin choques entre sellos
    const a = rubberXml({ art: stop.rubber, scene: SCENES.kebab, city: 'Tomares', date: '2026-10-10T17:00:00Z', color: '#9c3a24', seed: 4 });
    expect(a.match(/id="(r[0-9a-z]+_)/)![1]).not.toBe(xml.match(/id="(r[0-9a-z]+_)/)![1]);
  });
  it('el sello de ruta completada sigue la plantilla', () => {
    const xml = sealXml({ title: 'Tomares en una tarde', stops: 3, date: '2026-10-10T17:00:00Z', color: '#9c3a24', seed: 1 });
    expect(xml).toContain('RUTA COMPLETADA');
    expect(xml).toContain('3 / 3 PARADAS · 10 OCT 2026');
    expect(xml).toContain('font-size="23.00"');
  });
  it('formatea las fechas como en la guía', () => {
    expect(fechaSello('2026-10-10T12:00:00Z')).toBe('10 OCT 2026');
    expect(fechaRomana('2026-10-10T12:00:00Z')).toBe('10 · X · 2026');
  });
});

describe('migración del pasaporte', () => {
  it('pasa las visitas antiguas a una hoja por ruta, sin repetir sellos', () => {
    const out = migrateVisits({
      visits: [
        { tourId: 'tomares-4-paradas', startedAt: '2026-10-01T10:00:00Z', stamps: { rotonda: '2026-10-01T10:10:00Z', ayuntamiento: '2026-10-01T10:30:00Z' } },
        { tourId: 'tomares-4-paradas', startedAt: '2026-10-05T10:00:00Z', stamps: { rotonda: '2026-10-05T10:10:00Z' } },
      ],
    });
    const r = out.routes['tomares-4-paradas'];
    expect(out.passport.pageOrder).toEqual(['tomares-4-paradas']);
    expect(r.stamps.map(s => s.stopId)).toEqual(['rotonda', 'ayuntamiento']);
    expect(r.history).toHaveLength(3);
    for (const s of r.stamps) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(1);
      expect(Math.abs(s.rot)).toBeLessThanOrEqual(12);
    }
  });
});

describe('SvgXml', () => {
  it('react-native-svg entiende todos los sellos', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parse } = require('react-native-svg/lib/commonjs/xml');
    for (const tour of TOURS) {
      for (const st of tour.stops) {
        const xml = rubberXml({ art: st.rubber, scene: SCENES[st.id], city: tour.city, date: '2026-10-10T17:00:00Z', color: '#9c3a24', seed: 4 });
        try { parse(xml); } catch (e) { throw new Error(`${st.id}: ${(e as Error).message.slice(0, 120)} … ${xml.slice(Number(/\(0:(\d+)\)/.exec((e as Error).message)?.[1] ?? 0) - 120, Number(/\(0:(\d+)\)/.exec((e as Error).message)?.[1] ?? 0) + 40)}`); }
      }
    }
  });
});
