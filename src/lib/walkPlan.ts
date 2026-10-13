import type { LngLat } from '@/data/types';
import { distance } from './geo';
import { accuracySlack } from './guidance';
import { MAX_ACCURACY_M, type PositionSource } from './useWalkPosition';

/**
 * Orden del paseo cuando se saltan paradas o se sellan fuera de orden.
 * `stamped` son las paradas ya selladas y `skipped` las que se saltaron a
 * propósito (siguen sin sellar y se pueden sellar luego).
 */

/**
 * A qué parada ir después de `from`: la siguiente sin sellar; si no quedan
 * delante, la primera saltada que siga sin sellar; si no, el final (`ids.length`).
 */
export function nextTarget(ids: string[], stamped: ReadonlySet<string>, from: number, skipped: readonly string[] = []): number {
  for (let i = from + 1; i < ids.length; i++) if (!stamped.has(ids[i])) return i;
  for (let i = 0; i < from && i < ids.length; i++) if (!stamped.has(ids[i]) && skipped.includes(ids[i])) return i;
  return ids.length;
}

/** ¿Hay alguna parada sin sellar más adelante? (si no, saltar sería acabar el paseo) */
export const canSkip = (ids: string[], stamped: ReadonlySet<string>, from: number) => ids.some((id, i) => i > from && !stamped.has(id));

/** Al empezar un tramo fijo, a más de esto de su inicio ya no estás en él (se suma el margen por mala precisión) */
export const JOIN_LEG_M = 30;

/**
 * Cómo empieza el tramo hacia la parada `target`:
 * - «fixed»: el tramo fijo que sale de la parada anterior (estás en su inicio, o es el paseo simulado, que lo recorre desde ahí)
 * - «approach»: camino por calles desde tu posición (sellaste antes de llegar a la parada anterior, o sin ella)
 * - «wait»: aún no se sabe (sin posición o con GPS muy flojo): se muestra el fijo y se decide con la siguiente lectura buena
 * Se decide una sola vez por tramo: al avanzar por el fijo no vuelve a cambiar.
 */
export type LegStart = 'fixed' | 'approach' | 'wait';

export function legStart(o: { sequential: boolean; source: PositionSource; position: LngLat | null; accuracy: number | null; legFrom: LngLat | null }): LegStart {
  if (!o.sequential || !o.legFrom) return 'approach';
  if (o.source === 'simulated') return 'fixed';
  if (!o.position || (o.accuracy != null && o.accuracy > MAX_ACCURACY_M)) return 'wait';
  return distance(o.position, o.legFrom) > JOIN_LEG_M + accuracySlack(o.accuracy) ? 'approach' : 'fixed';
}
