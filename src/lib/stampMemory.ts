import type { PlacedStamp, UserRoute } from '@/store/passport';

/** Recuerdo de un sello: el sello en sí y cuántas veces se volvió a la parada después de sellarla */
export interface StampMemory {
  stamp: PlacedStamp;
  returns: number;
}

/**
 * Qué se enseña al tocar un sello en el pasaporte. El historial guarda cada
 * llegada (también la primera, la que se selló), así que las vueltas son una
 * menos. Sin puntos ni logros: solo el recuerdo.
 */
export function stampMemory(route: UserRoute | undefined, stopId: string): StampMemory | null {
  const stamp = route?.stamps.find(s => s.stopId === stopId);
  if (!route || !stamp) return null;
  const arrivals = route.history.filter(h => h.stopId === stopId).length;
  return { stamp, returns: Math.max(0, arrivals - 1) };
}

/** «Has vuelto 2 veces» (nada si no se ha vuelto) */
export const returnsText = (returns: number) => (returns > 0 ? `Has vuelto ${returns} ${returns === 1 ? 'vez' : 'veces'}` : null);
