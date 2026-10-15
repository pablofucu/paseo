import { describe, expect, it } from '@jest/globals';
import { nearestStart, sortByDistance, startLabel, walkingDirectionsUrl, withTimeout } from '../nearby';
import { shortestFree } from '../routeFilter';
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

describe('texto grande', () => {
  it('escala tamaño e interlineado', () => {
    const big = scaleType(LARGE_TEXT_SCALE);
    expect(big.body.fontSize).toBeCloseTo(16 * LARGE_TEXT_SCALE, 0);
    expect(big.body.lineHeight).toBeGreaterThan(25);
    expect(scaleType(1)).toBe(type);
  });
});

describe('withTimeout', () => {
  it('devuelve el valor si llega a tiempo y null si tarda', async () => {
    expect(await withTimeout(Promise.resolve(5), 50)).toBe(5);
    expect(await withTimeout(new Promise<number>(() => {}), 10)).toBeNull();
  });
  it('propaga el error', async () => {
    await expect(withTimeout(Promise.reject(new Error('x')), 50)).rejects.toThrow('x');
  });
});

describe('primer paseo', () => {
  it('elige la ruta gratis más corta', () => {
    const t = [{ id: 'a', price: 'free' as const, durationMin: 90 }, { id: 'b', price: { eur: 3 }, durationMin: 30 }, { id: 'c', price: 'free' as const, durationMin: 60 }];
    expect(shortestFree(t)?.id).toBe('c');
    expect(shortestFree([t[1]])).toBeUndefined();
  });
});

describe('cómo llegar', () => {
  const c: [number, number] = [-6.07, 37.37];
  it('usa las coordenadas, a pie, según la plataforma', () => {
    expect(walkingDirectionsUrl(c, 'Rotonda', 'ios')).toBe('http://maps.apple.com/?daddr=37.37,-6.07&dirflg=w');
    expect(walkingDirectionsUrl(c, 'Plaza de España', 'android')).toBe('geo:37.37,-6.07?q=37.37,-6.07(Plaza%20de%20Espa%C3%B1a)');
    expect(walkingDirectionsUrl(c, 'x', 'web')).toBe('https://www.google.com/maps/dir/?api=1&destination=37.37,-6.07&travelmode=walking');
  });
});
