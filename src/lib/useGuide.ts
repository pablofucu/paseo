import { useState } from 'react';
import type { LngLat } from '@/data/types';
import { guide, type Guidance, type PreparedLeg } from './guidance';

interface Snapshot {
  leg: PreparedLeg | null;
  position: LngLat | null;
  accuracy: number | null;
  radius: number | undefined;
  stopKey: string;
  g: Guidance | null;
}

/**
 * Guía sobre el tramo actual recordando la lectura anterior: sin retroceder por
 * el temblor del GPS y con histéresis al salirse de la ruta. `accuracy` ensancha
 * los umbrales cuando el GPS es malo. Solo se recalcula cuando cambia alguna
 * entrada (la lectura anterior sale del cálculo previo, guardado en el estado).
 */
export function useGuide(leg: PreparedLeg | null, position: LngLat | null, stop: LngLat, accuracy: number | null, arriveRadius?: number): Guidance | null {
  const [prev, setPrev] = useState<Snapshot>({ leg: null, position: null, accuracy: null, radius: undefined, stopKey: '', g: null });
  const stopKey = `${stop[0]},${stop[1]}`;
  if (prev.leg === leg && prev.position === position && prev.accuracy === accuracy && prev.radius === arriveRadius && prev.stopKey === stopKey) return prev.g;
  const same = prev.leg === leg && prev.g;
  const g = leg && position ? guide(leg, position, stop, { prevAlong: same ? prev.g!.along : 0, wasOff: !!same && prev.g!.offRoute, accuracy, arriveRadius }) : null;
  setPrev({ leg, position, accuracy, radius: arriveRadius, stopKey, g });
  return g;
}
