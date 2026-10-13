import type { LngLat } from '@/data/types';
import { cumulative, distance, maneuvers, projectOnRoute, type Maneuver } from './geo';
import type { RouteStep } from './routing';

/** A menos de esto de la parada, cuenta como llegada */
export const ARRIVE_RADIUS_M = 25;
/** A menos de esto de la parada se avisa de que ya casi estás («¡Ya estás aquí!») */
export const PREVIEW_RADIUS_M = 60;
/** A más de esto de la ruta, avisamos de que te has salido */
export const OFF_ROUTE_M = 40;
/** Y para dar por vuelta a la ruta hay que bajar de esto (histéresis: no parpadea en el límite) */
export const BACK_ON_ROUTE_M = 25;
/** Con el GPS peor que esto (m de error) los umbrales se ensanchan */
export const GOOD_ACCURACY_M = 15;
/** Cuánto se ensanchan como máximo los umbrales por mala precisión, en metros */
export const MAX_SLACK_M = 30;
/** Hacia atrás en la ruta solo se busca hasta esto: el temblor del GPS no te hace retroceder */
export const BACKTRACK_M = 20;
/** Tiempo mínimo entre dos llegadas seguidas si no te has movido */
export const MIN_BETWEEN_ARRIVALS_MS = 45000;

/** Margen extra de los umbrales según el error del GPS (0 si es bueno o se desconoce) */
export const accuracySlack = (accuracy: number | null | undefined) =>
  accuracy == null ? 0 : Math.min(MAX_SLACK_M, Math.max(0, accuracy - GOOD_ACCURACY_M));

export interface GuideOptions {
  /** Metros recorridos en la lectura anterior (para no retroceder) */
  prevAlong?: number;
  /** Ya estabas fuera de la ruta en la lectura anterior (histéresis) */
  wasOff?: boolean;
  /** Error del GPS en metros */
  accuracy?: number | null;
}

/**
 * Dos paradas muy juntas (menos de 25 m) llegan a la vez: la siguiente solo
 * cuenta si estaban lo bastante separadas, si te has movido desde la llegada
 * anterior o si ha pasado un rato.
 */
export function arrivalAllowed(last: { at: number; coord: LngLat; stopCoord: LngLat } | null, stopCoord: LngLat, position: LngLat, now: number): boolean {
  if (!last) return true;
  if (distance(last.stopCoord, stopCoord) > ARRIVE_RADIUS_M * 2) return true;
  if (distance(last.coord, position) >= ARRIVE_RADIUS_M * 0.6) return true;
  return now - last.at >= MIN_BETWEEN_ARRIVALS_MS;
}

export interface PreparedLeg {
  line: LngLat[];
  cum: number[];
  length: number;
  turns: Maneuver[];
}

/** Prepara un tramo. Con los pasos del router usa sus giros y nombres de calle; sin ellos, los saca de la geometría. */
export function prepareLeg(line: LngLat[], steps?: RouteStep[]): PreparedLeg {
  const cum = cumulative(line);
  const turns = steps?.length
    ? steps.map(st => ({ at: projectOnRoute(line, st.location, cum).along, direction: st.direction, point: st.location, street: st.street || undefined })).sort((a, b) => a.at - b.at)
    : maneuvers(line, cum);
  return { line, cum, length: cum[cum.length - 1], turns };
}

export interface Guidance {
  along: number;
  remaining: number;
  offRoute: boolean;
  /** Metros hasta volver a la ruta (si te has salido) */
  offRouteBy: number;
  snapped: LngLat;
  next: Maneuver | null;
  /** Metros hasta el siguiente giro, o hasta la parada si no quedan giros */
  distToNext: number;
  then: Maneuver | null;
  arrived: boolean;
  /** A menos de 60 m de la parada pero sin haber llegado todavía */
  near: boolean;
  /** Distancia en línea recta a la parada */
  toStop: number;
}

/**
 * Guía sobre un tramo. `stop` es la ubicación real de la parada: la ruta por
 * calles puede acabar unos metros antes si la parada no está sobre una calle.
 */
export function guide(leg: PreparedLeg, position: LngLat, stop?: LngLat, opts: GuideOptions = {}): Guidance {
  const slack = accuracySlack(opts.accuracy);
  const minAlong = Math.max(0, (opts.prevAlong ?? 0) - BACKTRACK_M);
  let proj = minAlong > 0 ? projectOnRoute(leg.line, position, leg.cum, minAlong) : projectOnRoute(leg.line, position, leg.cum);
  // Si hacia delante no hay ruta cerca, se mira entera (te has desviado o has vuelto atrás de verdad)
  if (minAlong > 0 && proj.offRoute > OFF_ROUTE_M + slack) {
    const full = projectOnRoute(leg.line, position, leg.cum);
    if (full.offRoute < proj.offRoute) proj = full;
  }
  // Histéresis: se sale de la ruta a más de 40 m y se vuelve a ella a menos de 25 m
  const offLimit = (opts.wasOff ? BACK_ON_ROUTE_M : OFF_ROUTE_M) + slack;
  const toStop = Math.min(distance(position, leg.line[leg.line.length - 1]), stop ? distance(position, stop) : Infinity);
  const idx = leg.turns.findIndex(t => t.at > proj.along + 3);
  const next = idx >= 0 ? leg.turns[idx] : null;
  return {
    along: proj.along,
    remaining: Math.max(0, leg.length - proj.along),
    offRoute: proj.offRoute > offLimit,
    offRouteBy: proj.offRoute,
    snapped: proj.snapped,
    next,
    distToNext: next ? next.at - proj.along : toStop,
    then: idx >= 0 ? leg.turns[idx + 1] ?? null : null,
    arrived: toStop <= ARRIVE_RADIUS_M + slack / 2,
    near: toStop > ARRIVE_RADIUS_M + slack / 2 && toStop <= PREVIEW_RADIUS_M,
    toStop,
  };
}

const VERB = { left: 'Gira', right: 'Gira', 'slight-left': 'Sigue', 'slight-right': 'Sigue', uturn: 'Da' } as const;
const WORD = { left: 'a la izquierda', right: 'a la derecha', 'slight-left': 'ligeramente a la izquierda', 'slight-right': 'ligeramente a la derecha', uturn: 'la vuelta' } as const;

export function instruction(g: Guidance, stopName: string): { text: string; then: string } {
  if (g.offRoute) return { text: 'Te has salido de la ruta', then: `Vuelve a la ruta: estás a ${Math.round(g.offRouteBy / 5) * 5} m` };
  const onto = (m: Maneuver) => (m.street ? ` en ${m.street}` : '');
  const text = g.next ? `${VERB[g.next.direction]} ${WORD[g.next.direction]}${onto(g.next)}` : `Sigue hasta ${stopName}`;
  const then = g.then ? `Después, ${VERB[g.then.direction].toLowerCase()} ${WORD[g.then.direction]}${onto(g.then)}` : g.next ? `Después llegas a ${stopName}` : 'Al llegar se estampa tu sello';
  return { text, then };
}
