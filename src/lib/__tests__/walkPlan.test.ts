import { describe, expect, it } from '@jest/globals';
import { acceptFix, MAX_ACCURACY_M, STALE_FIX_MS } from '../useWalkPosition';
import { canSkip, JOIN_LEG_M, legStart, nextTarget } from '../walkPlan';

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

describe('legStart (tramo tras sellar)', () => {
  const from: [number, number] = [-3.7, 40.4];
  // ~0,000009° de latitud ≈ 1 m
  const at = (m: number): [number, number] => [from[0], from[1] + m * 0.000009];
  const base = { sequential: true, source: 'gps' as const, accuracy: 8, legFrom: from };

  it('sellado en la parada: tramo fijo', () => {
    expect(legStart({ ...base, position: at(5) })).toBe('fixed');
  });
  it('sellado 100 m antes: camino desde donde estás', () => {
    expect(legStart({ ...base, position: at(100) })).toBe('approach');
  });
  it('justo en el límite sigue siendo fijo', () => {
    expect(legStart({ ...base, position: at(JOIN_LEG_M - 3) })).toBe('fixed');
    expect(legStart({ ...base, position: at(JOIN_LEG_M + 5) })).toBe('approach');
  });
  it('GPS flojo: margen mayor y, si es inservible, espera', () => {
    expect(legStart({ ...base, accuracy: 30, position: at(JOIN_LEG_M + 10) })).toBe('fixed');
    expect(legStart({ ...base, accuracy: 30, position: at(100) })).toBe('approach');
    expect(legStart({ ...base, accuracy: 80, position: at(100) })).toBe('wait');
    expect(legStart({ ...base, position: null })).toBe('wait');
  });
  it('paseo simulado: siempre el fijo', () => {
    expect(legStart({ ...base, source: 'simulated', accuracy: null, position: at(100) })).toBe('fixed');
  });
  it('sin tramo fijo (primera parada, saltos): camino desde donde estés', () => {
    expect(legStart({ ...base, sequential: false, position: at(0) })).toBe('approach');
    expect(legStart({ ...base, legFrom: null, position: at(0) })).toBe('approach');
  });
});
