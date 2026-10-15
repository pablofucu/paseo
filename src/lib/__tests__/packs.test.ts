import { describe, expect, it } from '@jest/globals';
import { getPack, PACKS, packOf } from '@/data/packs';
import { getTour, LOCKED_TOURS, TOURS } from '@/data/tours';
import { collectionTotals, missingText, packCompletedAt, packProgress, postcardUnlocked, TEST_WON_TOURS } from '@/lib/packs';
import { addPacksSeen, usePassport, type UserRoute } from '@/store/passport';

const drop = { x: 0.5, y: 0.5, rot: 6, seed: 1 };
const full = (id: string, date = '2026-10-01T10:00:00Z'): UserRoute => {
  const t = getTour(id)!;
  return { routeId: id, stamps: t.stops.map(st => ({ stopId: st.id, date, ...drop })), postcardUnlockedAt: date, history: [] };
};
const half = (id: string): UserRoute => ({ ...full(id), stamps: full(id).stamps.slice(0, 1), postcardUnlockedAt: null });

describe('packs de postales', () => {
  it('los datos son coherentes: cada ruta existe y está en un solo pack', () => {
    const ids = PACKS.flatMap(p => p.tours.map(t => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getTour(id) ?? LOCKED_TOURS.find(l => l.id === id)).toBeTruthy();
    // Todas las rutas de la app están en algún pack
    for (const t of [...TOURS, ...LOCKED_TOURS]) expect(packOf(t.id)).toBeTruthy();
    for (const p of PACKS) expect(p.postcard === undefined || !!p.postcard.art).toBe(true);
  });

  it('sin sellos: ninguno ganado y faltan todos', () => {
    const p = getPack('sevilla-monumental')!;
    const r = packProgress(p, {});
    expect(r).toMatchObject({ won: 0, total: 3, complete: false });
    expect(r.missing).toHaveLength(3);
    expect(r.missingLabels).toEqual(['Río y judería', 'Arenal', 'Murillo']);
  });

  it('un sello se gana al completar la ruta, no a medias', () => {
    const p = getPack('sevilla-monumental')!;
    const a = packProgress(p, { 'sevilla-arenal': half('sevilla-arenal') });
    expect(a.won).toBe(0);
    expect(a.stamps.find(s => s.id === 'sevilla-arenal')).toMatchObject({ won: false, open: true, done: 1 });
    const b = packProgress(p, { 'sevilla-arenal': full('sevilla-arenal') });
    expect(b.won).toBe(1);
    expect(b.missingLabels).toEqual(['Río y judería', 'Murillo']);
  });

  it('una ruta de pago bloqueada nunca cuenta, aunque haya datos guardados', () => {
    const p = getPack('sevilla-otro-lado')!;
    const forged = { triana: { routeId: 'triana', stamps: [{ stopId: 'x', date: '2026-10-01T10:00:00Z', ...drop }], postcardUnlockedAt: '2026-10-01T10:00:00Z', history: [] } };
    const r = packProgress(p, { ...forged, 'tomares-4-paradas': full('tomares-4-paradas') });
    expect(r).toMatchObject({ won: 1, total: 2, complete: false });
    expect(r.stamps.find(s => s.id === 'triana')).toMatchObject({ open: false, won: false });
    expect(r.missing).toEqual([LOCKED_TOURS.find(l => l.id === 'triana')!.title]);
  });

  it('el pack se completa con todos los sellos (pack de un solo tour incluido)', () => {
    const solo = { ...getPack('madrid-arte')!, tours: [{ id: 'tomares-4-paradas', label: 'Tomares' }] };
    expect(packProgress(solo, {}).complete).toBe(false);
    expect(packProgress(solo, { 'tomares-4-paradas': full('tomares-4-paradas') }).complete).toBe(true);
    expect(packProgress({ ...solo, tours: [] }, {}).complete).toBe(false);
  });

  it('la postal solo se desbloquea con el pack completo y con ilustración', () => {
    const p = { ...getPack('sevilla-otro-lado')!, tours: [{ id: 'tomares-4-paradas', label: 'Tomares' }] };
    const routes = { 'tomares-4-paradas': full('tomares-4-paradas') };
    expect(postcardUnlocked(p, {})).toBe(false);
    expect(postcardUnlocked(p, routes)).toBe(true);
    expect(postcardUnlocked({ ...p, postcard: undefined }, routes)).toBe(false);
    expect(packCompletedAt(p, routes)).toBe('2026-10-01T10:00:00Z');
    expect(packCompletedAt(p, {})).toBeNull();
  });

  it('totales de la Colección y textos', () => {
    const none = collectionTotals({});
    expect(none).toMatchObject({ stamps: 0, totalStamps: 8, postcards: 0, totalPostcards: 4 });
    expect(collectionTotals({ 'tomares-4-paradas': full('tomares-4-paradas') }).stamps).toBe(1);
    expect(missingText(1)).toBe('Te falta 1 sello');
    expect(missingText(3)).toBe('Te faltan 3 sellos');
  });
});

describe('packs vistos', () => {
  it('markPackSeen guarda el pack y reset lo borra', () => {
    usePassport.getState().reset();
    usePassport.getState().markPackSeen('sevilla-otro-lado');
    expect(usePassport.getState().packsSeen).toEqual({ 'sevilla-otro-lado': true });
    usePassport.getState().reset();
    expect(usePassport.getState().packsSeen).toEqual({});
  });

  it('cancelar una ruta deja el pack sin ver otra vez', () => {
    usePassport.getState().reset();
    usePassport.getState().markPackSeen('sevilla-otro-lado');
    usePassport.getState().markPackSeen('madrid-arte');
    usePassport.getState().dropRoute('tomares-4-paradas');
    expect(usePassport.getState().packsSeen).toEqual({ 'madrid-arte': true });
  });

  it('la migración a la versión 3 añade packsSeen sin tocar lo demás', () => {
    const old = { passport: { owner: 'Ana', issuedAt: 'x', pageOrder: [] }, routes: {} };
    expect(addPacksSeen(old)).toEqual({ ...old, packsSeen: {} });
    expect(addPacksSeen({ ...old, packsSeen: { a: true as const } }).packsSeen).toEqual({ a: true });
  });

  describe('modo prueba', () => {
    const p = getPack('sevilla-otro-lado')!;
    const tomares = { 'tomares-4-paradas': full('tomares-4-paradas') };

    it('apagado: Triana no cuenta y el pack no se completa', () => {
      expect(TEST_WON_TOURS).toContain('triana');
      const r = packProgress(p, tomares);
      expect(r.complete).toBe(false);
      expect(r.stamps.find(x => x.id === 'triana')).toMatchObject({ won: false, testWon: false });
      expect(postcardUnlocked(p, tomares, { testMode: false })).toBe(false);
    });

    it('encendido: Triana cuenta, pero sin Tomares no hay pack', () => {
      expect(packProgress(p, {}, { testMode: true }).complete).toBe(false);
      expect(packProgress(p, tomares, { testMode: true }).stamps.find(x => x.id === 'triana')).toMatchObject({ won: true, testWon: true });
    });

    it('encendido: al completar Tomares se completa el pack y se gana la postal', () => {
      const opts = { testMode: true };
      expect(packProgress(p, tomares, opts)).toMatchObject({ won: 2, total: 2, complete: true });
      expect(postcardUnlocked(p, tomares, opts)).toBe(true);
      expect(packCompletedAt(p, tomares, opts)).toBe('2026-10-01T10:00:00Z');
      expect(collectionTotals(tomares, opts).postcards).toBe(1);
    });
  });
});
