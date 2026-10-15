import { describe, expect, it } from '@jest/globals';
import type { LngLat } from '@/data/types';
import { destination } from '../geo';
import { FIT_MIN_ZOOM, FOLLOW_ZOOM, fitTwo } from '../mapFit';

const A: LngLat = [-6.0, 37.0];
const area = { width: 400, height: 800, top: 150, bottom: 100 };

describe('encuadre de tú y la parada', () => {
  it('centra entre los dos puntos', () => {
    const b = destination(A, 0, 400);
    const { center } = fitTwo(A, b, 0, area);
    expect(center[0]).toBeCloseTo(A[0], 5);
    expect(center[1]).toBeCloseTo((A[1] + b[1]) / 2, 5);
  });
  it('más lejos, menos zoom, con tope por arriba y por abajo', () => {
    const near = fitTwo(A, destination(A, 0, 200), 0, area).zoom;
    const far = fitTwo(A, destination(A, 0, 1500), 0, area).zoom;
    expect(far).toBeLessThan(near);
    expect(fitTwo(A, destination(A, 0, 60), 0, area).zoom).toBe(FOLLOW_ZOOM);
    expect(fitTwo(A, destination(A, 0, 90000), 0, area).zoom).toBe(FIT_MIN_ZOOM);
  });
  it('con el mapa girado se mide la caja girada: la pantalla es más estrecha que alta', () => {
    const b = destination(A, 0, 600);
    const northUp = fitTwo(A, b, 0, area).zoom; // los puntos caen en vertical
    const eastUp = fitTwo(A, b, 90, area).zoom; // caen en horizontal, donde hay menos sitio
    expect(eastUp).toBeLessThan(northUp);
    expect(fitTwo(A, b, 180, area).zoom).toBe(northUp);
  });
});
