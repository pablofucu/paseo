import { describe, expect, it } from '@jest/globals';
import type { LngLat } from '@/data/types';
import { distance } from '../geo';
import { boundsWithMargin, estimateBytes, formatSize, initialPackState, PACK_MAX_ZOOM, PACK_MIN_ZOOM, packReducer, routePoints, SOURCE_MAX_ZOOM, tileCount } from '../offlinePack';

const pts: LngLat[] = [[-6.046, 37.372], [-6.04, 37.375], [-6.05, 37.37]];

describe('offlinePack: cuadro', () => {
  it('abarca los puntos y añade el margen por cada lado', () => {
    const [w, s, e, n] = boundsWithMargin(pts, 300)!;
    expect(w).toBeLessThan(-6.05);
    expect(e).toBeGreaterThan(-6.04);
    expect(s).toBeLessThan(37.37);
    expect(n).toBeGreaterThan(37.375);
    // El margen mide ~300 m tanto en latitud como en longitud
    expect(distance([-6.05, 37.372], [w, 37.372])).toBeCloseTo(300, -1);
    expect(distance([-6.04, 37.37], [-6.04, s])).toBeCloseTo(300, -1);
  });

  it('sin puntos no hay cuadro', () => {
    expect(boundsWithMargin([])).toBeNull();
  });

  it('un solo punto da un cuadrado de unos 600 m', () => {
    const [w, s, e, n] = boundsWithMargin([[-6, 37]], 300)!;
    expect(distance([w, 37], [e, 37])).toBeCloseTo(600, -1);
    expect(distance([-6, s], [-6, n])).toBeCloseTo(600, -1);
  });

  it('une paradas y tramos', () => {
    expect(routePoints([{ coord: [1, 2] }], [[[3, 4], [5, 6]]])).toEqual([[1, 2], [3, 4], [5, 6]]);
  });
});

describe('offlinePack: zoom y tamaño', () => {
  it('el zoom cubre el del paseo (17,3) y no baja de la vista de ruta', () => {
    expect(PACK_MIN_ZOOM).toBeLessThanOrEqual(14);
    expect(PACK_MAX_ZOOM).toBeGreaterThanOrEqual(17);
    expect(PACK_MIN_ZOOM).toBeLessThanOrEqual(SOURCE_MAX_ZOOM);
  });

  it('cuenta teselas y no pasa del zoom máximo de la fuente', () => {
    const b = boundsWithMargin(pts)!;
    const n = tileCount(b);
    expect(n).toBeGreaterThan(1);
    expect(tileCount(b, 13, 20, 14)).toBe(tileCount(b, 13, 14, 14));
    // Un cuadro enorme tiene más teselas
    expect(tileCount([-7, 37, -5, 38])).toBeGreaterThan(n);
  });

  it('la estimación crece con las teselas y se escribe en español', () => {
    expect(estimateBytes(100)).toBeGreaterThan(estimateBytes(10));
    expect(formatSize(850_000)).toBe('850 KB');
    expect(formatSize(3_450_000)).toBe('3,5 MB');
    expect(formatSize(24_400_000)).toBe('24 MB');
  });
});

describe('offlinePack: estado', () => {
  const st = (state: 'inactive' | 'active' | 'complete', percentage: number, size = 0) => ({ state, percentage, completedResourceSize: size });

  it('descarga, progreso y fin', () => {
    let s = packReducer(initialPackState, { type: 'start' });
    expect(s).toEqual({ phase: 'downloading', percentage: 0, bytes: 0 });
    s = packReducer(s, { type: 'progress', status: st('active', 40, 1000) });
    expect(s).toEqual({ phase: 'downloading', percentage: 40, bytes: 1000 });
    s = packReducer(s, { type: 'progress', status: st('active', 30, 1200) });
    expect(s).toMatchObject({ percentage: 40 });
    s = packReducer(s, { type: 'progress', status: st('complete', 100, 5000) });
    expect(s).toEqual({ phase: 'done', bytes: 5000 });
  });

  it('un paquete hecho no se estropea con avisos sueltos', () => {
    const done = { phase: 'done', bytes: 5000 } as const;
    expect(packReducer(done, { type: 'progress', status: st('inactive', 10) })).toBe(done);
    expect(packReducer(done, { type: 'error', message: 'x' })).toBe(done);
  });

  it('un error se puede reintentar y el progreso lo supera', () => {
    let s = packReducer({ phase: 'downloading', percentage: 20, bytes: 1 }, { type: 'error', message: 'sin red' });
    expect(s).toEqual({ phase: 'error', message: 'sin red' });
    s = packReducer(s, { type: 'progress', status: st('active', 25, 2) });
    expect(s.phase).toBe('downloading');
    expect(packReducer(s, { type: 'start' })).toMatchObject({ phase: 'downloading', percentage: 0 });
  });

  it('borrar vuelve al inicio y hydrate recoge lo que ya hay', () => {
    expect(packReducer({ phase: 'done', bytes: 1 }, { type: 'removed' })).toEqual({ phase: 'idle' });
    expect(packReducer(initialPackState, { type: 'hydrate', status: null })).toEqual({ phase: 'idle' });
    expect(packReducer(initialPackState, { type: 'hydrate', status: st('complete', 100, 9) })).toEqual({ phase: 'done', bytes: 9 });
    expect(packReducer(initialPackState, { type: 'hydrate', status: st('inactive', 55, 9) })).toMatchObject({ phase: 'downloading', percentage: 55 });
  });

  it('un porcentaje raro no rompe la barra', () => {
    expect(packReducer(initialPackState, { type: 'progress', status: st('active', NaN) })).toMatchObject({ percentage: 0 });
    expect(packReducer(initialPackState, { type: 'progress', status: st('active', 400) })).toMatchObject({ percentage: 100 });
  });
});
