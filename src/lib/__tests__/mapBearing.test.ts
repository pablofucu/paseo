import { describe, expect, it } from '@jest/globals';
import { destination } from '../geo';
import { guide, prepareLeg } from '../guidance';
import { DEADBAND_DEG, nextMapBearing, reliableCourse, rotateMs, routeBearing } from '../mapBearing';
import type { LngLat } from '@/data/types';

// La misma «L» de los tests de geo: ~110 m al norte y luego ~90 m al este
const A: LngLat = [-6.046, 37.372];
const B: LngLat = [-6.046, 37.373];
const C: LngLat = [-6.045, 37.373];
const leg = prepareLeg([A, B, C]);
const at = (p: LngLat, prevAlong?: number) => routeBearing(leg, guide(leg, p, C, { prevAlong }), p, null);

describe('mapBearing', () => {
  it('pone hacia arriba el tramo que toca andar', () => {
    expect(at(destination(A, 0, 20))).toBeCloseTo(0, 0);
    expect(at(destination(B, 90, 20))).toBeCloseTo(90, 0);
  });

  it('antes de la esquina el mapa ya va girando hacia la calle siguiente', () => {
    const b = at(destination(B, 180, 10))!;
    expect(b).toBeGreaterThan(20);
    expect(b).toBeLessThan(90);
  });

  it('con el usuario parado y el GPS temblando, el mapa no se mueve', () => {
    const here = destination(A, 0, 50);
    let map = at(here)!;
    for (let i = 0; i < 40; i++) {
      const jitter = destination(here, (i * 97) % 360, 3 + (i % 5));
      map = nextMapBearing(map, at(jitter, 50));
    }
    expect(map).toBeCloseTo(at(here)!, 6);
  });

  it('fuera de la ruta mira hacia el punto por el que vuelves a ella', () => {
    const off = destination(destination(A, 0, 50), 90, 60);
    expect(at(off)).toBeCloseTo(270, 0);
  });

  it('al llegar a la parada no da vueltas', () => {
    expect(at(destination(C, 270, 5))).toBeNull();
  });

  it('sin ruta usa el rumbo del movimiento solo si andas', () => {
    expect(routeBearing(null, null, A, 123)).toBe(123);
    expect(reliableCourse(45, 1.2)).toBe(45);
    expect(reliableCourse(45, 0.2)).toBeNull();
    expect(reliableCourse(-1, 1.2)).toBeNull();
    expect(reliableCourse(null, 1.2)).toBeNull();
  });

  it('ignora giros pequeños y sigue el camino corto al pasar por el norte', () => {
    expect(nextMapBearing(10, 10 + DEADBAND_DEG - 1)).toBe(10);
    expect(nextMapBearing(10, null)).toBe(10);
    expect(nextMapBearing(350, 30)).toBe(30);
    expect(nextMapBearing(0, -90)).toBe(270);
    expect(rotateMs(0, 10)).toBeLessThan(rotateMs(0, 120));
    expect(rotateMs(350, 10)).toBe(rotateMs(0, 20));
  });
});
