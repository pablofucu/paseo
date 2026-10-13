import { describe, expect, it } from '@jest/globals';
import { shouldNotify, type NotifyInput } from '../arrivalWatch';

const base: NotifyInput = { accuracy: 10, distance: 20, done: false, notified: false };
const ok = (o: Partial<NotifyInput> = {}) => shouldNotify({ ...base, ...o });

describe('shouldNotify', () => {
  it('avisa dentro del radio de llegada con buena precisión', () => {
    expect(ok()).toBe(true);
    expect(ok({ distance: 25 })).toBe(true);
    expect(ok({ distance: 26 })).toBe(false);
  });

  it('con peor precisión el radio se ensancha un poco', () => {
    // 30 m de error: margen de 15 m, la mitad se suma al radio (25 + 7,5)
    expect(ok({ accuracy: 30, distance: 32 })).toBe(true);
    expect(ok({ accuracy: 30, distance: 33 })).toBe(false);
  });

  it('no avisa sin precisión o con precisión mala', () => {
    expect(ok({ accuracy: null })).toBe(false);
    expect(ok({ accuracy: 36 })).toBe(false);
  });

  it('no avisa dos veces ni de una parada ya sellada o registrada', () => {
    expect(ok({ notified: true })).toBe(false);
    expect(ok({ done: true })).toBe(false);
  });
});
