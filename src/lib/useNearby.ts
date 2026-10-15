import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { LngLat } from '@/data/types';
import { withTimeout } from './nearby';

/** Una ubicación guardada más vieja que esto no sirve para «cerca de ti» */
export const LAST_KNOWN_MAX_AGE_MS = 10 * 60_000;
/** Cuánto se espera a una ubicación nueva antes de rendirse */
export const FIX_TIMEOUT_MS = 9_000;

/** Dónde estás ahora: la última ubicación si es de hace menos de 10 min; si no, una nueva (con tiempo límite). Null si falla. */
async function currentPosition(): Promise<LngLat | null> {
  const p = (await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }))
    ?? (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), FIX_TIMEOUT_MS));
  return p ? [p.coords.longitude, p.coords.latitude] : null;
}

/**
 * Dónde estás, solo si ya diste permiso de ubicación (aquí nunca se pide: el
 * permiso se pide al empezar a caminar). Sin permiso o sin posición, null.
 */
export function useNearby(): LngLat | null {
  const [pos, setPos] = useState<LngLat | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const perm = await Location.getForegroundPermissionsAsync();
          if (!perm.granted) return;
          const p = await currentPosition();
          if (alive && p) setPos(p);
        } catch {
          // Sin ubicación: la lista queda en su orden de siempre
        }
      })();
      return () => { alive = false; };
    }, []),
  );
  return pos;
}

/**
 * Pide el permiso de ubicación (solo en primer plano) y devuelve dónde estás.
 * Para llamarla al tocar un botón («Centrar en mí»), nunca al abrir una pantalla.
 * Null si se deniega el permiso, no hay posición o tarda más de lo razonable.
 */
export async function askNearby(): Promise<LngLat | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    return await currentPosition();
  } catch {
    return null;
  }
}
