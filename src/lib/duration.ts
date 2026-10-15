const NBSP = ' ';

/** «45 min», «1 h», «1 h 30»: una sola forma en toda la app. Con espacios duros para que no se parta en dos líneas. */
export function formatDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}${NBSP}min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}${NBSP}h${NBSP}${String(r).padStart(2, '0')}` : `${h}${NBSP}h`;
}
