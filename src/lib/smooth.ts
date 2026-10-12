import type { LngLat } from '@/data/types';
import { distance } from './geo';

/*
 * Suavizado de tu posición y de la brújula en el mapa. El GPS llega a saltos
 * (cada ~1 s) y la brújula tiembla; en vez de saltar, el punto se desliza de
 * una lectura a la siguiente y el cono gira por el camino más corto.
 */

/** Diferencia de rumbo con signo por el camino más corto, en (−180, 180] */
export function angleDelta(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** Siguiente ángulo «desenrollado» (puede pasar de 360) para animar sin dar la vuelta entera */
export const unwrapAngle = (prev: number, next: number) => prev + angleDelta(prev, next);

export const lerpLngLat = (a: LngLat, b: LngLat, t: number): LngLat => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Curva del deslizamiento: arranca y se posa con suavidad */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Más lejos que esto, el punto salta sin deslizarse (p. ej. tocar el mapa en modo prueba) */
export const SNAP_METERS = 80;

/**
 * Cuánto dura el deslizamiento hasta la nueva lectura: lo que tardó en llegar
 * esa lectura (así el punto nunca se queda parado ni va con retraso), entre
 * 200 ms y 1,2 s. Cero si hay que saltar.
 */
export function glideMs(from: LngLat, to: LngLat, sinceLastMs: number): number {
  if (distance(from, to) > SNAP_METERS) return 0;
  return Math.min(1200, Math.max(200, sinceLastMs));
}
