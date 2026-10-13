import { CITIES, TOURS } from '@/data/tours';
import type { Tour } from '@/data/types';
import { routeProgress, type UserRoute } from '@/store/passport';
import type { CityId } from '@/store/settings';

/** Visado de una ciudad: todas sus rutas están completadas */
export interface CityVisa {
  area: CityId;
  name: string;
  /** Las rutas de la ciudad, con su sello de ruta ya existente (no hay sello nuevo) */
  tours: Tour[];
}

/**
 * Ciudades con todas sus rutas completadas. Hace falta más de una ruta: con una
 * sola, la hoja de la ruta ya lo dice todo. No es un sello nuevo: solo junta en
 * una página los sellos de ruta que ya se tenían.
 */
export function cityVisas(routes: Record<string, UserRoute>, tours: Tour[] = TOURS): CityVisa[] {
  const out: CityVisa[] = [];
  for (const city of CITIES) {
    const own = tours.filter(t => t.area === city.id);
    if (own.length < 2) continue;
    if (own.every(t => routeProgress(t.id, routes[t.id]).completed)) out.push({ area: city.id, name: city.name, tours: own });
  }
  return out;
}
