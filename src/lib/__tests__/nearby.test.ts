import { describe, expect, it } from '@jest/globals';
import { nearestStart, sortByDistance, startLabel } from '../nearby';
import { matchesDuration, matchesPrice, shouldFilter } from '../routeFilter';
import { LARGE_TEXT_SCALE, scaleType, type } from '@/theme/type';

const at = (lng: number, lat: number) => ({ stops: [{ coord: [lng, lat] as [number, number] }] }) as never;

describe('cerca de ti', () => {
  const pos: [number, number] = [-5.99, 37.39];
  const near = at(-5.991, 37.39); // ~90 m
  const far = at(-5.95, 37.39);

  it('encuentra el inicio más cercano', () => {
    expect(nearestStart(pos, [far, near])?.index).toBe(1);
    expect(nearestStart(null, [far, near])).toBeNull();
    expect(nearestStart(pos, [])).toBeNull();
  });

  it('ordena por distancia con los desconocidos al final y sin posición no cambia nada', () => {
    const items = [{ id: 'a', m: null }, { id: 'b', m: 900 }, { id: 'c', m: 100 }];
    expect(sortByDistance(items, pos, i => i.m).map(i => i.id)).toEqual(['c', 'b', 'a']);
    expect(sortByDistance(items, null, i => i.m)).toBe(items);
  });

  it('redacta la distancia al inicio y calla si estás en otra ciudad', () => {
    expect(startLabel(800)).toBe('A 800 m del inicio');
    expect(startLabel(1250)).toBe('A 1,3 km del inicio');
    expect(startLabel(3)).toBe('Estás en el inicio');
    expect(startLabel(400_000)).toBeNull();
    expect(startLabel(null)).toBeNull();
  });
});

describe('filtros de rutas', () => {
  it('filtra por duración y precio', () => {
    expect(matchesDuration(45, 'short')).toBe(true);
    expect(matchesDuration(75, 'short')).toBe(false);
    expect(matchesDuration(75, 'mid')).toBe(true);
    expect(matchesDuration(120, 'long')).toBe(true);
    expect(matchesDuration(120, 'all')).toBe(true);
    expect(matchesPrice(true, 'free')).toBe(true);
    expect(matchesPrice(true, 'paid')).toBe(false);
    expect(matchesPrice(false, 'paid')).toBe(true);
  });

  it('solo ofrece filtros con más de 3 rutas', () => {
    expect(shouldFilter(3)).toBe(false);
    expect(shouldFilter(4)).toBe(true);
  });
});

describe('texto grande', () => {
  it('escala tamaño e interlineado', () => {
    const big = scaleType(LARGE_TEXT_SCALE);
    expect(big.body.fontSize).toBeCloseTo(16 * LARGE_TEXT_SCALE, 0);
    expect(big.body.lineHeight).toBeGreaterThan(25);
    expect(scaleType(1)).toBe(type);
  });
});
