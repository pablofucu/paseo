import { describe, expect, it } from '@jest/globals';
import { acceptFix, MAX_ACCURACY_M, STALE_FIX_MS } from '../useWalkPosition';
import { canSkip, nextTarget } from '../walkPlan';

const ids = ['a', 'b', 'c', 'd'];

describe('walkPlan', () => {
  it('va a la siguiente parada sin sellar', () => {
    expect(nextTarget(ids, new Set(['a']), 0)).toBe(1);
    expect(nextTarget(ids, new Set(['a', 'b']), 0)).toBe(2);
  });

  it('tras sellar fuera de orden se salta lo ya sellado', () => {
    expect(nextTarget(ids, new Set(['b', 'c']), 1)).toBe(3);
  });

  it('al acabar vuelve a las saltadas sin sellar, y si no hay termina', () => {
    expect(nextTarget(ids, new Set(['a', 'c', 'd']), 3, ['b'])).toBe(1);
    expect(nextTarget(ids, new Set(['a', 'b', 'c', 'd']), 3, ['b'])).toBe(4);
    expect(nextTarget(ids, new Set(['a', 'c', 'd']), 3)).toBe(4);
  });

  it('solo se puede saltar si queda algo por delante', () => {
    expect(canSkip(ids, new Set(), 0)).toBe(true);
    expect(canSkip(ids, new Set(), 3)).toBe(false);
    expect(canSkip(ids, new Set(['d']), 2)).toBe(false);
  });
});

describe('lecturas del GPS', () => {
  it('la primera siempre vale, aunque sea mala', () => {
    expect(acceptFix(120, false, 0)).toBe(true);
  });
  it('ignora las peores de 35 m salvo que lleve tiempo sin ninguna buena', () => {
    expect(acceptFix(MAX_ACCURACY_M, true, 1000)).toBe(true);
    expect(acceptFix(MAX_ACCURACY_M + 1, true, 1000)).toBe(false);
    expect(acceptFix(80, true, STALE_FIX_MS)).toBe(true);
    expect(acceptFix(null, true, 1000)).toBe(true);
  });
});
