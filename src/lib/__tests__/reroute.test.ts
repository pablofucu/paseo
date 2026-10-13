import { describe, expect, it } from '@jest/globals';
import { REROUTE_AFTER_MS, REROUTE_COOLDOWN_MS, REROUTE_FAIL_MAX_MS, rerouteCooldown, rerouteDelay } from '../useReroute';

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

  it('tras fallar el router espera cada vez más, hasta un máximo', () => {
    expect(rerouteCooldown(0)).toBe(REROUTE_COOLDOWN_MS);
    expect(rerouteCooldown(1)).toBeGreaterThan(REROUTE_COOLDOWN_MS);
    expect(rerouteCooldown(2)).toBe(rerouteCooldown(1) * 2);
    expect(rerouteCooldown(20)).toBe(REROUTE_FAIL_MAX_MS);
    const last = 10000;
    expect(rerouteDelay(last + 1000, last, last + 1000, 1)).toBe(rerouteCooldown(1) - 1000);
  });
});
