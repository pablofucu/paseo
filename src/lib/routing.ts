import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LngLat } from '@/data/types';
import type { TurnDirection } from './geo';

/**
 * Ruta a pie real entre paradas con OSRM (perfil peatón de FOSSGIS, datos de
 * OpenStreetMap). Se calcula una vez en el móvil y se guarda para usarla sin
 * conexión. Para producción conviene precalcularla al preparar el tour.
 */
const ROUTER = process.env.EXPO_PUBLIC_ROUTER ?? 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';

export interface RouteStep {
  location: LngLat;
  direction: TurnDirection;
  street: string;
}

export interface RoutedLeg {
  line: LngLat[];
  steps: RouteStep[];
}

const MODIFIER: Record<string, TurnDirection | undefined> = {
  left: 'left',
  'sharp left': 'left',
  right: 'right',
  'sharp right': 'right',
  'slight left': 'slight-left',
  'slight right': 'slight-right',
  uturn: 'uturn',
};

interface OsrmStep {
  name?: string;
  geometry: { coordinates: LngLat[] };
  maneuver: { type: string; modifier?: string; location: LngLat };
}
interface OsrmResponse {
  code: string;
  routes?: { legs: { steps: OsrmStep[] }[] }[];
}

/** Convierte la respuesta de OSRM (con steps=true y geometrías GeoJSON) en tramos. */
export function parseOsrm(json: OsrmResponse): RoutedLeg[] {
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error(`OSRM: ${json.code}`);
  return json.routes[0].legs.map(leg => {
    const line: LngLat[] = [];
    const steps: RouteStep[] = [];
    for (const st of leg.steps) {
      for (const c of st.geometry.coordinates) {
        const last = line[line.length - 1];
        if (!last || last[0] !== c[0] || last[1] !== c[1]) line.push(c);
      }
      const direction = st.maneuver.modifier ? MODIFIER[st.maneuver.modifier] : undefined;
      if (direction && st.maneuver.type !== 'depart' && st.maneuver.type !== 'arrive') {
        steps.push({ location: st.maneuver.location, direction, street: st.name ?? '' });
      }
    }
    return { line, steps };
  });
}

export async function fetchWalkingRoute(points: LngLat[], timeoutMs = 10000): Promise<RoutedLeg[]> {
  const coords = points.map(p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join(';');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ROUTER}/${coords}?overview=false&steps=true&geometries=geojson`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseOsrm(await res.json());
  } finally {
    clearTimeout(t);
  }
}

const cacheKey = (tourId: string, points: LngLat[]) => `route:v1:${tourId}:${points.map(p => p.join(',')).join(';')}`;

/** Ruta guardada o recién calculada; null si no hay red ni caché. */
export async function loadWalkingRoute(tourId: string, points: LngLat[]): Promise<RoutedLeg[] | null> {
  const key = cacheKey(tourId, points);
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return JSON.parse(cached) as RoutedLeg[];
  } catch {}
  try {
    const legs = await fetchWalkingRoute(points);
    if (legs.length === points.length - 1) {
      AsyncStorage.setItem(key, JSON.stringify(legs)).catch(() => {});
      return legs;
    }
  } catch {}
  return null;
}
