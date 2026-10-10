import type { LngLat } from '@/data/types';
import { cumulative, distance, maneuvers, projectOnRoute, type Maneuver } from './geo';

/** A menos de esto de la parada, cuenta como llegada */
export const ARRIVE_RADIUS_M = 25;
/** A más de esto de la ruta, avisamos de que te has salido */
export const OFF_ROUTE_M = 40;

export interface PreparedLeg {
  line: LngLat[];
  cum: number[];
  length: number;
  turns: Maneuver[];
}

export function prepareLeg(line: LngLat[]): PreparedLeg {
  const cum = cumulative(line);
  return { line, cum, length: cum[cum.length - 1], turns: maneuvers(line, cum) };
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
}

export function guide(leg: PreparedLeg, position: LngLat): Guidance {
  const proj = projectOnRoute(leg.line, position, leg.cum);
  const toStop = distance(position, leg.line[leg.line.length - 1]);
  const idx = leg.turns.findIndex(t => t.at > proj.along + 3);
  const next = idx >= 0 ? leg.turns[idx] : null;
  return {
    along: proj.along,
    remaining: Math.max(0, leg.length - proj.along),
    offRoute: proj.offRoute > OFF_ROUTE_M,
    offRouteBy: proj.offRoute,
    snapped: proj.snapped,
    next,
    distToNext: next ? next.at - proj.along : toStop,
    then: idx >= 0 ? leg.turns[idx + 1] ?? null : null,
    arrived: toStop <= ARRIVE_RADIUS_M,
  };
}

const WORD = { left: 'a la izquierda', right: 'a la derecha', 'slight-left': 'ligeramente a la izquierda', 'slight-right': 'ligeramente a la derecha', uturn: 'y da la vuelta' } as const;

export function instruction(g: Guidance, stopName: string): { text: string; then: string } {
  if (g.offRoute) return { text: 'Te has salido de la ruta', then: `Vuelve a la ruta: estás a ${Math.round(g.offRouteBy / 5) * 5} m` };
  const text = g.next ? `Gira ${WORD[g.next.direction]}` : `Sigue hasta ${stopName}`;
  const then = g.then ? `Después, gira ${WORD[g.then.direction]}` : g.next ? `Después llegas a ${stopName}` : 'Al llegar se estampa tu sello';
  return { text, then };
}
