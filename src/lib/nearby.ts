import type { LngLat, Tour } from '@/data/types';
import { distance, formatDistance } from './geo';

/** Más allá de esto, «cerca de ti» no tiene sentido (se está en otra ciudad) */
export const NEARBY_MAX_M = 30_000;

/** Metros desde `pos` hasta el inicio de la ruta (su primera parada) */
export const metersToStart = (pos: LngLat, tour: Pick<Tour, 'stops'>) => distance(pos, tour.stops[0].coord);

/** La ruta de la lista cuyo inicio está más cerca, con su distancia; null si no hay ninguna */
export function nearestStart(pos: LngLat | null, tours: Pick<Tour, 'stops'>[]): { index: number; meters: number } | null {
  if (!pos) return null;
  let best: { index: number; meters: number } | null = null;
  tours.forEach((t, index) => {
    const meters = metersToStart(pos, t);
    if (!best || meters < best.meters) best = { index, meters };
  });
  return best;
}

/** Ordena por distancia (null al final, estable). Sin posición, deja el orden como está. */
export function sortByDistance<T>(items: T[], pos: LngLat | null, meters: (item: T) => number | null): T[] {
  if (!pos) return items;
  return items
    .map((item, i) => ({ item, i, m: meters(item) }))
    .sort((a, b) => (a.m ?? Infinity) - (b.m ?? Infinity) || a.i - b.i)
    .map(x => x.item);
}

/** «A 800 m del inicio»; null si está demasiado lejos para decirlo */
export function startLabel(meters: number | null | undefined): string | null {
  if (meters == null || meters > NEARBY_MAX_M) return null;
  return meters < 8 ? 'Estás en el inicio' : `A ${formatDistance(meters)} del inicio`;
}

/** Espera a `promise` como mucho `ms`; si tarda más, null (y lo que llegue tarde se ignora) */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const t = setTimeout(() => resolve(null), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
