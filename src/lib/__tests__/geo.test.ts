import { describe, expect, it } from '@jest/globals';
import { bearing, cumulative, distance, formatDistance, maneuvers, pointAlong, projectOnRoute, turnAngle } from '../geo';
import { guide, instruction, prepareLeg } from '../guidance';
import type { LngLat } from '@/data/types';

// Una «L» de unos 110 m hacia el norte y luego 90 m hacia el este, en Tomares
const A: LngLat = [-6.046, 37.372];
const B: LngLat = [-6.046, 37.373];
const C: LngLat = [-6.045, 37.373];
const L = [A, B, C];

describe('geo', () => {
  it('mide distancias reales', () => {
    expect(distance(A, B)).toBeGreaterThan(110);
    expect(distance(A, B)).toBeLessThan(112);
    expect(distance(B, C)).toBeGreaterThan(87);
    expect(distance(B, C)).toBeLessThan(90);
  });

  it('calcula rumbos y giros con signo', () => {
    expect(bearing(A, B)).toBeCloseTo(0, 0);
    expect(bearing(B, C)).toBeCloseTo(90, 0);
    expect(turnAngle(0, 90)).toBe(90);
    expect(turnAngle(90, 0)).toBe(-90);
    expect(turnAngle(350, 10)).toBe(20);
  });

  it('detecta el giro a la derecha de la L', () => {
    const m = maneuvers(L);
    expect(m).toHaveLength(1);
    expect(m[0].direction).toBe('right');
    expect(m[0].at).toBeCloseTo(distance(A, B), 3);
  });

  it('interpola puntos sobre la ruta', () => {
    const cum = cumulative(L);
    const mid = pointAlong(L, cum[1] / 2, cum);
    expect(mid[1]).toBeCloseTo(37.3725, 5);
    expect(pointAlong(L, 1e9, cum)).toEqual(C);
  });

  it('proyecta posiciones y mide la desviación', () => {
    const p = projectOnRoute(L, [-6.0459, 37.3725]); // ~9 m al este del primer tramo
    expect(p.offRoute).toBeGreaterThan(7);
    expect(p.offRoute).toBeLessThan(11);
    expect(p.along).toBeGreaterThan(50);
    expect(p.along).toBeLessThan(62);
  });

  it('formatea distancias en español', () => {
    expect(formatDistance(3)).toBe('Ahora');
    expect(formatDistance(123)).toBe('120 m');
    expect(formatDistance(1234)).toBe('1,2 km');
  });
});

describe('guidance', () => {
  const leg = prepareLeg(L);

  it('anuncia el giro y lo que viene después', () => {
    const g = guide(leg, [-6.046, 37.3722]);
    expect(g.next?.direction).toBe('right');
    expect(g.distToNext).toBeGreaterThan(80);
    expect(g.arrived).toBe(false);
    expect(instruction(g, 'la iglesia')).toEqual({ text: 'Gira a la derecha', then: 'Después llegas a la iglesia' });
  });

  it('tras el último giro guía hasta la parada y detecta la llegada', () => {
    const g = guide(leg, [-6.0455, 37.373]);
    expect(g.next).toBeNull();
    expect(instruction(g, 'la iglesia').text).toBe('Sigue hasta la iglesia');
    expect(guide(leg, [-6.04503, 37.373]).arrived).toBe(true);
  });

  it('cuenta la llegada en la parada aunque la ruta acabe unos metros antes', () => {
    const stop: LngLat = [-6.0447, 37.373]; // ~26 m más allá del final de la ruta
    expect(guide(leg, stop).arrived).toBe(false);
    expect(guide(leg, stop, stop).arrived).toBe(true);
  });

  it('avisa si te sales de la ruta', () => {
    const g = guide(leg, [-6.0452, 37.3722]); // ~70 m al este del primer tramo
    expect(g.offRoute).toBe(true);
    expect(instruction(g, 'x').text).toBe('Te has salido de la ruta');
  });
});
