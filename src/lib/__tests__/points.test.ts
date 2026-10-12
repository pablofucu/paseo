import { describe, expect, it } from '@jest/globals';
import { nearbyPoint } from '../points';
import type { MapPoint } from '@/data/points';
import type { LngLat } from '@/data/types';

// Dos puntos en la misma calle de Tomares, a unos 110 m uno del otro (0,001° de latitud)
const A: MapPoint = { id: 'a', kind: 'tapa', name: 'A', coord: [-6.046, 37.372] };
const B: MapPoint = { id: 'b', kind: 'foto', name: 'B', coord: [-6.046, 37.373] };
const pts = [A, B];
const at = (lat: number): LngLat => [-6.046, lat];
const none = new Set<string>();

describe('nearbyPoint', () => {
  it('abre el punto al acercarte y nada si estás lejos', () => {
    expect(nearbyPoint(pts, at(37.3705), null, none)).toBeNull();
    expect(nearbyPoint(pts, at(37.3718), null, none)).toBe('a');
  });

  it('elige el más cercano', () => {
    expect(nearbyPoint(pts, at(37.3728), null, none)).toBe('b');
  });

  it('no lo cierra hasta que te alejas más de la distancia de salida', () => {
    // ~50 m del punto A: fuera de NEAR pero dentro de LEAVE
    expect(nearbyPoint(pts, at(37.37245), 'a', none)).toBe('a');
    expect(nearbyPoint(pts, at(37.37245), null, none)).toBeNull();
    expect(nearbyPoint(pts, at(37.3707), 'a', none)).toBeNull();
  });

  it('no reabre un punto cerrado a mano', () => {
    expect(nearbyPoint(pts, at(37.372), null, new Set(['a']))).toBeNull();
  });
});
