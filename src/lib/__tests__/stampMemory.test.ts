import { describe, expect, it } from '@jest/globals';
import { returnsText, stampMemory } from '@/lib/stampMemory';
import type { UserRoute } from '@/store/passport';

const stamp = { stopId: 'a', date: '2026-10-01T10:00:00Z', x: 0.5, y: 0.5, rot: 0, seed: 1 };
const route = (history: string[]): UserRoute => ({ routeId: 't', stamps: [stamp], postcardUnlockedAt: null, history: history.map(stopId => ({ stopId, date: '2026-10-01T10:00:00Z' })) });

describe('recuerdo de un sello', () => {
  it('la primera llegada es la del sello: no cuenta como vuelta', () => {
    expect(stampMemory(route(['a']), 'a')?.returns).toBe(0);
    expect(stampMemory(route(['a', 'b', 'a', 'a']), 'a')?.returns).toBe(2);
  });
  it('un historial vacío (datos viejos) no da vueltas negativas', () => {
    expect(stampMemory(route([]), 'a')?.returns).toBe(0);
  });
  it('una parada sin sello no tiene recuerdo', () => {
    expect(stampMemory(route(['b']), 'b')).toBeNull();
    expect(stampMemory(undefined, 'a')).toBeNull();
  });
  it('el texto de las vueltas', () => {
    expect(returnsText(0)).toBeNull();
    expect(returnsText(1)).toBe('Has vuelto 1 vez');
    expect(returnsText(3)).toBe('Has vuelto 3 veces');
  });
});
