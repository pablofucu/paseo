import { describe, expect, it } from '@jest/globals';
import type { LngLat } from '@/data/types';
import { shouldNotify } from '../arrivalWatch';
import { destination } from '../geo';
import { ARRIVE_RADIUS_M, arriveRadiusOf, dwellRestart, DWELL_RADIUS_M, guide, prepareLeg, type Guidance } from '../guidance';
import { TURN_CUE_M, TURN_PATTERNS, turnCue } from '../turnCue';
import { acceptFix, coherentFix, MAX_ACCURACY_M, stableReading, type WalkPosition } from '../useWalkPosition';

const A: LngLat = [-6.0, 37.0];
const at = (bearingDeg: number, m: number) => destination(A, bearingDeg, m);

describe('radio de llegada por parada', () => {
  const leg = prepareLeg([A, at(90, 200)]);
  const stop = at(90, 200);
  it('sin radio propio vale el general', () => {
    expect(arriveRadiusOf({})).toBe(ARRIVE_RADIUS_M);
    expect(guide(leg, at(90, 160), stop).arrived).toBe(false);
  });
  it('una plaza grande llega antes', () => {
    expect(arriveRadiusOf({ arriveRadius: 45 })).toBe(45);
    expect(guide(leg, at(90, 160), stop, { arriveRadius: 45 }).arrived).toBe(true);
    expect(guide(leg, at(90, 150), stop, { arriveRadius: 45 }).arrived).toBe(false);
  });
  it('el aviso en segundo plano usa el mismo radio', () => {
    const base = { accuracy: 10, distance: 40, done: false, notified: false };
    expect(shouldNotify(base)).toBe(false);
    expect(shouldNotify({ ...base, radius: 45 })).toBe(true);
  });
});

describe('quedarse parado cerca de la parada', () => {
  it('cuenta de nuevo solo si te mueves más del margen', () => {
    expect(dwellRestart(null, A)).toBe(true);
    expect(dwellRestart(A, at(0, DWELL_RADIUS_M - 1))).toBe(false);
    expect(dwellRestart(A, at(0, DWELL_RADIUS_M + 2))).toBe(true);
  });
});

describe('vibración en los giros', () => {
  const g = (o: Partial<Guidance>): Guidance => ({
    along: 0, remaining: 100, offRoute: false, offRouteBy: 0, snapped: A,
    next: { at: 100, direction: 'left', point: A }, distToNext: 20, then: null, arrived: false, near: false, toStop: 100, ...o,
  });
  it('vibra a 25 m del giro, con el patrón de cada lado, y una sola vez', () => {
    expect(turnCue(g({ distToNext: TURN_CUE_M + 1 }), null)).toEqual({ cue: null, fired: null });
    const first = turnCue(g({ distToNext: TURN_CUE_M }), null);
    expect(first.cue).toBe('left');
    expect(turnCue(g({ distToNext: 10 }), first.fired).cue).toBeNull();
    const right = turnCue(g({ next: { at: 180, direction: 'right', point: A } }), first.fired);
    expect(right.cue).toBe('right');
    expect(TURN_PATTERNS.left).toHaveLength(2);
    expect(TURN_PATTERNS.right).toHaveLength(3);
  });
  it('los giros suaves y la llegada no vibran', () => {
    expect(turnCue(g({ next: { at: 100, direction: 'slight-left', point: A } }), null).cue).toBeNull();
    expect(turnCue(g({ near: true }), null).cue).toBeNull();
    expect(turnCue(g({ arrived: true }), null).cue).toBeNull();
    expect(turnCue(g({ next: null }), null).cue).toBeNull();
  });
  it('avisa una vez al salirte y otra vez si vuelves y te sales', () => {
    const off = turnCue(g({ offRoute: true }), null);
    expect(off.cue).toBe('off');
    expect(turnCue(g({ offRoute: true }), off.fired).cue).toBeNull();
    const back = turnCue(g({ distToNext: 80 }), off.fired);
    expect(back.fired).toBeNull();
    expect(turnCue(g({ offRoute: true }), back.fired).cue).toBe('off');
  });
  it('sin guía no hace nada', () => {
    expect(turnCue(null, 't5')).toEqual({ cue: null, fired: 't5' });
  });
});

describe('lecturas imprecisas del GPS', () => {
  it('se aceptan si encajan con lo andado (2 m/s × tiempo + error)', () => {
    // 60 m de error a 50 m del último punto, 1 s después: dentro del error
    expect(coherentFix(A, at(0, 50), 60, 1000)).toBe(true);
    // 60 m de error a 200 m en 2 s: salto imposible
    expect(coherentFix(A, at(0, 200), 60, 2000)).toBe(false);
    // 10 s dan 20 m de paseo más el error
    expect(coherentFix(A, at(0, 65), 50, 10000)).toBe(true);
  });
  it('sin punto previo o con error enorme no se aceptan', () => {
    expect(coherentFix(null, A, 60, 1000)).toBe(false);
    expect(coherentFix(A, A, 150, 1000)).toBe(false);
    expect(coherentFix(A, A, null, 1000)).toBe(false);
  });
  it('acceptFix las deja pasar solo si son coherentes', () => {
    expect(acceptFix(MAX_ACCURACY_M + 20, true, 1000)).toBe(false);
    expect(acceptFix(MAX_ACCURACY_M + 20, true, 1000, true)).toBe(true);
  });
});

describe('temblor del GPS', () => {
  const prev: WalkPosition = { position: A, heading: null, course: 90, permission: 'granted', accuracy: 10 };
  it('menos de 1 m, poco rumbo y error parecido: mismo estado', () => {
    expect(stableReading(prev, { position: at(0, 0.5), course: 95, accuracy: 11 })).toBe(prev);
  });
  it('un movimiento real, un giro de rumbo o cruzar «señal débil» sí cambian', () => {
    expect(stableReading(prev, { position: at(0, 3), course: 90, accuracy: 10 })).not.toBe(prev);
    expect(stableReading(prev, { position: A, course: 120, accuracy: 10 }).course).toBe(120);
    expect(stableReading(prev, { position: A, course: 90, accuracy: 40 }).accuracy).toBe(40);
  });
  it('conserva la misma posición si el cambio es de otra cosa', () => {
    const next = stableReading(prev, { position: at(0, 0.3), course: 200, accuracy: 10 });
    expect(next.position).toBe(prev.position);
  });
});
