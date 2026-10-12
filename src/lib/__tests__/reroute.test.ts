import { describe, expect, it } from '@jest/globals';
import { REROUTE_AFTER_MS, REROUTE_COOLDOWN_MS, rerouteDelay } from '../useReroute';

describe('reroute', () => {
  it('en la ruta no recalcula', () => {
    expect(rerouteDelay(null, null, 1000)).toBeNull();
  });

  it('espera unos segundos fuera de la ruta antes de recalcular', () => {
    expect(rerouteDelay(1000, null, 1000)).toBe(REROUTE_AFTER_MS);
    expect(rerouteDelay(1000, null, 1000 + REROUTE_AFTER_MS + 500)).toBe(0);
  });

  it('respeta el tiempo mínimo entre recálculos', () => {
    const last = 10000;
    expect(rerouteDelay(last + 1000, last, last + 1000)).toBe(REROUTE_COOLDOWN_MS - 1000);
  });
});
