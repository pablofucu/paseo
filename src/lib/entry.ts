import { MAX_ACCURACY_M, type PositionSource, type WalkPosition } from './useWalkPosition';

/** A menos de esto de la parada (en línea recta) sin haber llegado, el botón te pregunta si ya estás */
export const CONFIRM_RADIUS_M = 150;

/**
 * Cómo entra el usuario a la guía de la parada a la que va:
 * - «here»: la llegada ya está registrada (el botón escucha y sella)
 * - «confirm»: el GPS no basta para decidir, o estás muy cerca: te pregunta
 * - «far»: GPS fiable y lejos: se puede escuchar ya, el sello es al llegar
 */
export type EntryMode = 'here' | 'confirm' | 'far';

export interface EntryInput {
  /** La llegada a esta parada ya está registrada */
  arrived: boolean;
  /** Metros en línea recta hasta la parada (null si no hay posición) */
  distance: number | null;
  accuracy: number | null;
  permission: WalkPosition['permission'];
  hasFix: boolean;
  /** Pasó el tiempo de espera sin ninguna lectura del GPS */
  noFix: boolean;
  source: PositionSource;
}

export function entryMode({ arrived, distance, accuracy, permission, hasFix, noFix, source }: EntryInput): EntryMode {
  if (arrived) return 'here';
  // El paseo simulado se comporta como un GPS bueno
  if (source === 'gps') {
    if (permission === 'denied' || permission === 'unavailable') return 'confirm';
    if (!hasFix) return noFix ? 'confirm' : 'far';
    // Con mala precisión pregunta, salvo si quedas lejos incluso contando el error
    if (accuracy != null && accuracy > MAX_ACCURACY_M) return distance != null && distance > CONFIRM_RADIUS_M + accuracy ? 'far' : 'confirm';
  }
  return distance != null && distance <= CONFIRM_RADIUS_M ? 'confirm' : 'far';
}
