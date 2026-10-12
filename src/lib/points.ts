import type { MapPoint } from '@/data/points';
import type { LngLat } from '@/data/types';
import { distance } from './geo';

/** A esta distancia (m) un punto marcado se abre solo */
export const NEAR = 40;
/** Y se cierra al alejarte más de esto (margen para que no parpadee con el GPS) */
export const LEAVE = 60;

/**
 * Qué punto se abre solo: el que ya está abierto mientras no te alejes, o si
 * no el más cercano a menos de NEAR. Los que cerraste a mano (`dismissed`) no
 * se reabren.
 */
export function nearbyPoint(points: MapPoint[], position: LngLat, current: string | null, dismissed: ReadonlySet<string>): string | null {
  const cur = current ? points.find(pt => pt.id === current) : undefined;
  if (cur && !dismissed.has(cur.id) && distance(position, cur.coord) < LEAVE) return cur.id;
  let best: string | null = null;
  let bestD = NEAR;
  for (const pt of points) {
    if (dismissed.has(pt.id)) continue;
    const d = distance(position, pt.coord);
    if (d < bestD) { best = pt.id; bestD = d; }
  }
  return best;
}
