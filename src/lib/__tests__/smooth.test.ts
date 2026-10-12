import { describe, expect, it } from '@jest/globals';
import { angleDelta, easeInOut, glideMs, lerpLngLat, unwrapAngle } from '../smooth';
import type { LngLat } from '@/data/types';

describe('smooth', () => {
  it('gira por el camino más corto', () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
    expect(angleDelta(0, 180)).toBe(180);
    expect(angleDelta(90, 90)).toBe(0);
    expect(unwrapAngle(350, 10)).toBe(370);
    expect(unwrapAngle(-5, 355)).toBe(-5);
  });

  it('desliza entre dos lecturas', () => {
    const a: LngLat = [-6, 37];
    const b: LngLat = [-5.9, 37.1];
    expect(lerpLngLat(a, b, 0)).toEqual(a);
    expect(lerpLngLat(a, b, 1)[0]).toBeCloseTo(-5.9);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });

  it('salta si la nueva posición está lejos y ajusta la duración al ritmo del GPS', () => {
    const a: LngLat = [-6.046, 37.372];
    const near: LngLat = [-6.046, 37.37205];
    const far: LngLat = [-6.046, 37.374];
    expect(glideMs(a, far, 1000)).toBe(0);
    expect(glideMs(a, near, 1000)).toBe(1000);
    expect(glideMs(a, near, 50)).toBe(200);
    expect(glideMs(a, near, 9000)).toBe(1200);
  });
});
