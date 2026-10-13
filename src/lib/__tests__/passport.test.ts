import { describe, expect, it } from '@jest/globals';
import { STAMP_ART } from '@/data/stamps/images';
import { TOURS } from '@/data/tours';
import { contraste, PAPEL, papelDeRuta, tintaDeParada, tintaDeRuta } from '@/lib/ink';
import { clampToSafe, overlap, randomSpot, settle, stampRotation } from '@/lib/placement';
import { fechaRomana, fechaSello, rng, rubberDateXml } from '@/lib/rubber';
import { sheetFor } from '@/lib/sheet';
import { dropFinalStamps, migrateVisits, routeProgress, type UserRoute } from '@/store/passport';

describe('postal y sello de ruta', () => {
  it('cada ruta tiene su propio sello, distinto de la postal y de los de las demás rutas', () => {
    const arts = TOURS.map(t => t.stamp.art);
    for (const t of TOURS) {
      expect(t.stamp.art).toBeTruthy();
      expect(t.stamp.art).not.toBe(t.postcard.art);
      expect(t.stamp.symbol.length).toBeGreaterThan(10);
    }
    expect(new Set(arts).size).toBe(TOURS.length);
  });
});

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
  it('cada parada tiene su tinta, distinta de la anterior y legible sobre el papel de su hoja', () => {
    for (const tour of TOURS) {
      const papel = papelDeRuta(tour.palette.soft);
      const inks = tour.stops.map((_, i) => tintaDeParada(tour.inks, tour.accent, i, papel));
      for (const ink of inks) expect(contraste(ink, papel)).toBeGreaterThanOrEqual(4.5);
      expect(new Set(inks).size).toBe(tour.stops.length);
    }
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
  it('cada parada tiene su dibujo horneado', () => {
    for (const tour of TOURS) for (const st of tour.stops) expect(STAMP_ART[st.id]).toBeTruthy();
  });
  it('pinta la fecha real con la ciudad y la tinta de la parada', () => {
    const tour = TOURS.find(t => t.city === 'Tomares')!;
    const kebab = tour.stops.find(s => s.id === 'kebab')!;
    const xml = rubberDateXml({ art: kebab.rubber, city: tour.city, date: '2026-10-10T17:00:00Z', color: '#2f5a48' });
    expect(xml).toContain('TOMARES · 10 OCT 2026');
    expect(xml).toContain('color="#2f5a48"');
    const ayto = tour.stops.find(s => s.id === 'ayuntamiento')!;
    expect(rubberDateXml({ art: ayto.rubber, city: tour.city, date: '2026-10-10T17:00:00Z', color: '#000' })).toContain('10 · X · 2026');
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
      expect(Math.abs(s.rot)).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('ruta completada', () => {
  it('con todos los sellos se gana la postal, sin sello final', () => {
    const tour = TOURS.find(t => t.city === 'Tomares')!;
    const stamps = tour.stops.map((st, i) => ({ stopId: st.id, date: `2026-10-0${i + 1}T10:00:00Z`, x: 0.5, y: 0.5, rot: 0, seed: 1 }));
    const route = { routeId: tour.id, stamps, postcardUnlockedAt: null, history: [] };
    const p = routeProgress(tour.id, route);
    expect(p.completed).toBe(true);
    expect(p.completedAt).toBe('2026-10-04T10:00:00Z');
    expect(routeProgress(tour.id, { ...route, stamps: stamps.slice(1) }).completed).toBe(false);
  });
  it('la versión 2 quita el sello grande y conserva la postal', () => {
    const tour = TOURS.find(t => t.city === 'Tomares')!;
    const stamps = tour.stops.map(st => ({ stopId: st.id, date: '2026-10-01T10:00:00Z', x: 0.5, y: 0.5, rot: 0, seed: 1 }));
    const out = dropFinalStamps({ routes: { [tour.id]: { routeId: tour.id, stamps, finalStamp: { date: '2026-10-02T10:00:00Z', x: 0.5, y: 0.5, rot: 0, seed: 2 }, postcardUnlockedAt: '2026-10-02T10:00:00Z', history: [] } as unknown as UserRoute } });
    const r = out.routes[tour.id];
    expect('finalStamp' in r).toBe(false);
    expect(r.postcardUnlockedAt).toBe('2026-10-02T10:00:00Z');
    expect(r.postcardSeen).toBe(true);
  });
});

describe('SvgXml', () => {
  it('react-native-svg entiende la fecha de todos los sellos', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parse } = require('react-native-svg/lib/commonjs/xml');
    for (const tour of TOURS) {
      for (const st of tour.stops) expect(() => parse(rubberDateXml({ art: st.rubber, city: tour.city, date: '2026-10-10T17:00:00Z', color: '#9c3a24' }))).not.toThrow();
    }
  });
});

describe('fecha del sello', () => {
  it('el trazo guía del texto en arco no se rellena', () => {
    const tour = TOURS.find(t => t.city === 'Tomares')!;
    const xml = rubberDateXml({ art: tour.stops.find(s => s.rubber.shape === 'circle')!.rubber, city: 'Tomares', date: '2026-10-10T17:00:00Z', color: '#000' });
    expect(xml).toMatch(/<g [^>]*fill="none"/);
  });
});

describe('giro del sello', () => {
  it('nunca queda recto: entre 4° y 12° a cada lado', () => {
    const r = rng(9);
    const rots = Array.from({ length: 400 }, () => stampRotation(r));
    for (const d of rots) expect(Math.abs(d)).toBeGreaterThanOrEqual(4);
    for (const d of rots) expect(Math.abs(d)).toBeLessThanOrEqual(12);
    expect(rots.some(d => d < 0) && rots.some(d => d > 0)).toBe(true);
  });
});

describe('ciudades y tours bloqueados', () => {
  it('Sevilla tiene sus tours (con Tomares) y Madrid solo tours de pago', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { toursIn } = require('@/data/tours') as typeof import('@/data/tours');
    expect(toursIn('sevilla').open.map(t => t.city).sort()).toEqual(['Sevilla', 'Sevilla', 'Tomares']);
    expect(toursIn('madrid').open).toHaveLength(0);
    expect(toursIn('madrid').locked.length).toBeGreaterThan(0);
    for (const c of ['sevilla', 'madrid'] as const) for (const t of toursIn(c).locked) expect(t.eur).toBeGreaterThan(0);
  });
});

describe('paseo en curso', () => {
  it('solo se puede sellar tras llegar, y la siguiente parada empieza sin llegada', () => {
    const { usePassport } = require('@/store/passport') as typeof import('@/store/passport'); // eslint-disable-line @typescript-eslint/no-require-imports
    const tour = TOURS.find(t => t.city === 'Tomares')!;
    usePassport.getState().startWalk(tour.id, 0);
    expect(usePassport.getState().walk).toEqual({ tourId: tour.id, target: 0, arrived: null, guide: null });
    usePassport.getState().arrive(tour.id, tour.stops[0].id);
    expect(usePassport.getState().walk?.arrived).toBe(tour.stops[0].id);
    usePassport.getState().advanceWalk();
    // La guía de la parada visitada sigue a mano desde el mapa
    expect(usePassport.getState().walk).toEqual({ tourId: tour.id, target: 1, arrived: null, guide: 0 });
    usePassport.getState().goTo(3);
    expect(usePassport.getState().walk?.target).toBe(3);
  });
});

describe('rutas a medias', () => {
  it('«Sigue donde lo dejaste» enseña las empezadas sin terminar, la última sellada primero, y cancelar borra la ruta', () => {
    const { unfinishedRoutes, usePassport } = require('@/store/passport') as typeof import('@/store/passport'); // eslint-disable-line @typescript-eslint/no-require-imports
    const [a, b] = TOURS;
    const drop = { x: 0.5, y: 0.5, rot: 6, seed: 1 };
    usePassport.getState().reset();
    usePassport.getState().placeStamp(a.id, a.stops[0].id, drop);
    usePassport.getState().placeStamp(b.id, b.stops[0].id, drop);
    const ids = TOURS.map(t => t.id);
    expect(unfinishedRoutes(ids, usePassport.getState().routes).sort()).toEqual([a.id, b.id].sort());
    for (const st of b.stops.slice(1)) usePassport.getState().placeStamp(b.id, st.id, drop);
    expect(unfinishedRoutes(ids, usePassport.getState().routes)).toEqual([a.id]);
    usePassport.getState().startWalk(a.id, 1);
    usePassport.getState().dropRoute(a.id);
    const s = usePassport.getState();
    expect(s.routes[a.id]).toBeUndefined();
    expect(s.passport.pageOrder).toEqual([b.id]);
    expect(s.walk).toBeNull();
    expect(unfinishedRoutes(ids, s.routes)).toEqual([]);
  });
});
