import type { LngLat } from '@/data/types';
import { bearing, distance, pointAlong } from './geo';
import type { Guidance, PreparedLeg } from './guidance';
import { angleDelta } from './smooth';

/*
 * «Ruta arriba»: el mapa gira para que el camino que te toca seguir quede hacia
 * arriba de la pantalla. El rumbo sale de la propia ruta (no de la brújula ni
 * del GPS), así que no tiembla aunque estés parado: solo cambia cuando avanzas
 * por el tramo. Sin ruta todavía, se usa el rumbo de tu movimiento.
 */

/** Se mira este trozo de ruta por delante: los zigzags cortos de la calle no giran el mapa y antes de un giro el mapa ya va girando */
export const LOOKAHEAD_M = 30;
/** El avance se redondea a esto (m): el temblor del GPS sobre la ruta no mueve el mapa */
export const ALONG_STEP_M = 4;
/** A menos de esto de la parada, el mapa se queda como estaba (no da vueltas al llegar) */
export const HOLD_NEAR_STOP_M = 12;
/** Fuera de la ruta, a menos de esto de ella el rumbo de vuelta tiembla demasiado: se mantiene el anterior */
export const MIN_BACK_M = 15;
/** Por debajo de este giro (grados) el mapa no se mueve */
export const DEADBAND_DEG = 12;
/** Para usar el rumbo del movimiento hay que ir al menos a esta velocidad (m/s); parado, el GPS da rumbos al azar */
export const MIN_COURSE_SPEED = 0.8;

/** Rumbo del GPS (dirección del movimiento) solo si es fiable: andando y con valor */
export function reliableCourse(course: number | null | undefined, speed: number | null | undefined): number | null {
  if (course == null || course < 0 || speed == null || speed < MIN_COURSE_SPEED) return null;
  return course % 360;
}

/**
 * Hacia dónde tienes que seguir andando, en grados (0 = norte), o null si no
 * hay un rumbo fiable (entonces el mapa se queda como estaba).
 */
export function routeBearing(leg: PreparedLeg | null, g: Guidance | null, position: LngLat | null, course: number | null): number | null {
  if (!leg || !g || !position) return course;
  if (g.toStop <= HOLD_NEAR_STOP_M) return null;
  // Fuera de la ruta: hacia el punto por el que vuelves a ella
  if (g.offRoute) return g.offRouteBy >= MIN_BACK_M ? bearing(position, g.snapped) : null;
  const along = Math.floor(g.along / ALONG_STEP_M) * ALONG_STEP_M;
  const from = pointAlong(leg.line, along, leg.cum);
  const to = pointAlong(leg.line, Math.min(leg.length, along + LOOKAHEAD_M), leg.cum);
  // Al final del tramo la ruta puede acabar antes de la parada: se mira hacia la parada desde donde estás
  if (distance(from, to) < HOLD_NEAR_STOP_M) return g.toStop > HOLD_NEAR_STOP_M ? bearing(position, leg.line[leg.line.length - 1]) : null;
  return bearing(from, to);
}

/** Siguiente rumbo del mapa: solo cambia si el giro supera el margen; sin rumbo nuevo, se queda */
export function nextMapBearing(current: number, wanted: number | null): number {
  if (wanted == null) return current;
  return Math.abs(angleDelta(current, wanted)) < DEADBAND_DEG ? current : (wanted + 360) % 360;
}

/** Más giro, más tiempo de animación: un giro de esquina no da un latigazo */
export function rotateMs(from: number, to: number): number {
  return Math.round(700 + Math.min(1, Math.abs(angleDelta(from, to)) / 180) * 500);
}
