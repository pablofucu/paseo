import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { LngLat } from '@/data/types';

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
          const p = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
          if (alive && p) setPos([p.coords.longitude, p.coords.latitude]);
        } catch {
          // Sin ubicación: la lista queda en su orden de siempre
        }
      })();
      return () => { alive = false; };
    }, []),
  );
  return pos;
}
