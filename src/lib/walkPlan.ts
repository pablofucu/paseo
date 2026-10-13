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
