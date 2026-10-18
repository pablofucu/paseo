import { describe, expect, it } from '@jest/globals';
import { TOURS } from '@/data/tours';
import { planReminders } from '@/lib/reminders';
import { cityVisas } from '@/lib/visa';
import { dropFinalStamps, knownRoutes, routeProgress, unfinishedRoutes, usePassport, type UserRoute } from '@/store/passport';

const drop = { x: 0.5, y: 0.5, rot: 6, seed: 1 };
const tour = TOURS.find(t => t.city === 'Tomares')!;
const stampsOf = (t: typeof tour, n: number, date: string) => t.stops.slice(0, n).map(st => ({ stopId: st.id, date, ...drop }));
const full = (id: string): UserRoute => {
  const t = TOURS.find(x => x.id === id)!;
  return { routeId: id, stamps: stampsOf(t, t.stops.length, '2026-10-01T10:00:00Z'), postcardUnlockedAt: '2026-10-01T10:00:00Z', history: [] };
};

describe('sellos, postal y nota', () => {
  it('una parada solo se sella una vez', () => {
    usePassport.getState().reset();
    usePassport.getState().placeStamp(tour.id, tour.stops[0].id, drop);
    const before = usePassport.getState().routes[tour.id];
    usePassport.getState().placeStamp(tour.id, tour.stops[0].id, { ...drop, x: 0.2 });
    expect(usePassport.getState().routes[tour.id]).toBe(before);
    expect(usePassport.getState().routes[tour.id].stamps).toHaveLength(1);
  });

  it('la postal se gana con el último sello y no antes', () => {
    usePassport.getState().reset();
    for (const st of tour.stops.slice(0, -1)) usePassport.getState().placeStamp(tour.id, st.id, drop);
    expect(usePassport.getState().routes[tour.id].postcardUnlockedAt).toBeNull();
    usePassport.getState().placeStamp(tour.id, tour.stops.at(-1)!.id, drop);
    const r = usePassport.getState().routes[tour.id];
    expect(r.postcardUnlockedAt).toBe(r.stamps.at(-1)!.date);
    expect(routeProgress(tour.id, r).completed).toBe(true);
  });

  it('arrive avisa de si la parada ya estaba sellada', () => {
    usePassport.getState().reset();
    expect(usePassport.getState().arrive(tour.id, tour.stops[0].id)).toBe(false);
    usePassport.getState().placeStamp(tour.id, tour.stops[0].id, drop);
    expect(usePassport.getState().arrive(tour.id, tour.stops[0].id)).toBe(true);
    expect(usePassport.getState().routes[tour.id].history).toHaveLength(2);
  });

  it('la nota del paseo se recorta a 60 caracteres', () => {
    usePassport.getState().reset();
    usePassport.getState().setNote(tour.id, 'sin ruta aún');
    expect(usePassport.getState().routes[tour.id]).toBeUndefined();
    usePassport.getState().placeStamp(tour.id, tour.stops[0].id, drop);
    usePassport.getState().setNote(tour.id, `  ${'a'.repeat(80)}  `);
    expect(usePassport.getState().routes[tour.id].note).toBe('a'.repeat(60));
  });

  it('una ruta que ya no existe no rompe nada', () => {
    const stamps = [{ stopId: 'x', date: '2026-10-01T10:00:00Z', ...drop }];
    const orphan = { routeId: 'borrada', stamps, postcardUnlockedAt: '2026-10-02T10:00:00Z', history: [] };
    const out = dropFinalStamps({ routes: { borrada: orphan } });
    expect(out.routes.borrada.postcardUnlockedAt).toBe('2026-10-02T10:00:00Z');
    expect(routeProgress('borrada', orphan)).toMatchObject({ done: 0, total: 0, completed: false, started: false });
    expect(unfinishedRoutes(['borrada'], { borrada: orphan })).toEqual([]);
    expect(knownRoutes(['borrada', tour.id])).toEqual([tour.id]);
  });

  it('una parada nueva en una ruta ya completa quita la postal hasta que se vuelve a completar', () => {
    const route = { routeId: tour.id, stamps: stampsOf(tour, tour.stops.length - 1, '2026-10-01T10:00:00Z'), postcardUnlockedAt: '2026-10-01T10:00:00Z', postcardSeen: true, history: [] };
    expect(routeProgress(tour.id, route).completed).toBe(false);
    expect(routeProgress(tour.id, route).completedAt).toBeNull();
    usePassport.setState({ routes: { [tour.id]: route } });
    usePassport.getState().placeStamp(tour.id, tour.stops.at(-1)!.id, drop);
    const r = usePassport.getState().routes[tour.id];
    expect(r.postcardUnlockedAt).toBe(r.stamps.at(-1)!.date);
    expect(r.postcardSeen).toBe(false);
  });
});

describe('visado de ciudad', () => {
  it('solo sale cuando todas las rutas de la ciudad están completas', () => {
    const sevilla = TOURS.filter(t => t.area === 'sevilla');
    expect(sevilla.length).toBeGreaterThan(1);
    const routes: Record<string, UserRoute> = {};
    expect(cityVisas(routes)).toEqual([]);
    for (const t of sevilla.slice(1)) routes[t.id] = full(t.id);
    expect(cityVisas(routes)).toEqual([]);
    routes[sevilla[0].id] = full(sevilla[0].id);
    const visas = cityVisas(routes);
    expect(visas.map(v => v.area)).toEqual(['sevilla']);
    expect(visas[0].tours.map(t => t.id)).toEqual(sevilla.map(t => t.id));
  });
});

describe('avisos de ruta a medias', () => {
  const part = (n: number, date: string): UserRoute => ({ routeId: tour.id, stamps: stampsOf(tour, n, date), postcardUnlockedAt: null, history: [] });
  it('avisa a los 3 días del último sello, con los sellos que faltan', () => {
    const [a] = planReminders([tour.id], { [tour.id]: part(tour.stops.length - 1, '2026-10-01T10:00:00Z') }, +new Date('2026-10-02T10:00:00Z'));
    expect(a.body).toBe(`Te falta 1 sello para completar ${tour.title} y ganar su sello de ruta`);
    expect(a.at.toISOString()).toBe('2026-10-04T10:00:00.000Z');
    const [b] = planReminders([tour.id], { [tour.id]: part(1, '2026-10-01T10:00:00Z') }, +new Date('2026-10-02T10:00:00Z'));
    expect(b.body).toContain(`Te faltan ${tour.stops.length - 1} sellos`);
  });
  it('si ya pasaron los 3 días avisa dentro de 2 horas; las rutas completas o sin empezar no avisan', () => {
    const now = +new Date('2026-10-20T10:00:00Z');
    const [a] = planReminders([tour.id], { [tour.id]: part(1, '2026-10-01T10:00:00Z') }, now);
    expect(+a.at).toBe(now + 2 * 3_600_000);
    expect(planReminders([tour.id], { [tour.id]: part(tour.stops.length, '2026-10-01T10:00:00Z') }, now)).toEqual([]);
    expect(planReminders([tour.id], {}, now)).toEqual([]);
  });
});
