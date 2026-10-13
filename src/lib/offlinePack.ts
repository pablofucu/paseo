import type { LngLat } from '@/data/types';

/*
 * Paquete sin conexión de una ruta («Descargar para pasear»): la parte pura
 * (cuadro, zoom, estimación y estado). El módulo nativo está en
 * components/OfflinePack.tsx. El paquete usa las mismas teselas y glifos que el
 * mapa del paseo (lib/mapStyle.ts): MapLibre guarda los recursos por URL, así
 * que valen para cualquier paleta de tour.
 */

/** Margen alrededor de la ruta, en metros: lo que te puedes desviar o ir a ver */
export const PACK_MARGIN_M = 300;
/** Zoom del paseo: la cámara va a 17–17,3; con 13 se ve la ruta entera al alejar */
export const PACK_MIN_ZOOM = 13;
export const PACK_MAX_ZOOM = 17;
/** Las teselas vectoriales llegan hasta este zoom (más allá se amplía la misma tesela) */
export const SOURCE_MAX_ZOOM = 14;
/** Tamaño medio de una tesela vectorial de ciudad (bytes), solo para estimar */
const AVG_TILE_BYTES = 60_000;
/** Glifos y TileJSON, que se descargan una vez */
const FIXED_BYTES = 400_000;

const M_PER_DEG = 111_320;

/** [oeste, sur, este, norte] */
export type Bounds = [number, number, number, number];

/** Cuadro que abarca todos los puntos, ensanchado `marginM` metros por cada lado. Null si no hay puntos. */
export function boundsWithMargin(points: LngLat[], marginM = PACK_MARGIN_M): Bounds | null {
  if (!points.length) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < w) w = lng;
    if (lng > e) e = lng;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  const dLat = marginM / M_PER_DEG;
  // Los meridianos se juntan hacia los polos: se mide con la latitud más alejada del ecuador
  const dLng = marginM / (M_PER_DEG * Math.cos((Math.max(Math.abs(s), Math.abs(n)) * Math.PI) / 180));
  return [w - dLng, s - dLat, e + dLng, n + dLat];
}

/** Todos los puntos de una ruta: las paradas y la geometría de cada tramo */
export function routePoints(stops: { coord: LngLat }[], legs: LngLat[][]): LngLat[] {
  return [...stops.map(st => st.coord), ...legs.flat()];
}

const tileX = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/** Teselas que cubren el cuadro entre dos zooms (sin pasar del zoom máximo de la fuente) */
export function tileCount([w, s, e, n]: Bounds, minZoom = PACK_MIN_ZOOM, maxZoom = PACK_MAX_ZOOM, sourceMaxZoom = SOURCE_MAX_ZOOM): number {
  let total = 0;
  for (let z = minZoom; z <= Math.min(maxZoom, sourceMaxZoom); z++) {
    total += (tileX(e, z) - tileX(w, z) + 1) * (tileY(s, z) - tileY(n, z) + 1);
  }
  return total;
}

/** Peso aproximado de la descarga en bytes (la API no lo da de antemano) */
export function estimateBytes(tiles: number): number {
  return FIXED_BYTES + tiles * AVG_TILE_BYTES;
}

/** «12 MB», «850 KB»: coma decimal y sin decimales a partir de 10 MB */
export function formatSize(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  const mb = bytes / 1_000_000;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace('.', ',')} MB`;
}

/** Estado del paquete de una ruta */
export type PackState =
  | { phase: 'idle' }
  | { phase: 'downloading'; percentage: number; bytes: number }
  | { phase: 'done'; bytes: number }
  | { phase: 'error'; message: string };

/** Lo que usamos del estado que da MapLibre (OfflinePackStatus) */
export interface PackStatus {
  state: 'inactive' | 'active' | 'complete';
  percentage: number;
  completedResourceSize: number;
}

export type PackAction =
  | { type: 'start' }
  | { type: 'progress'; status: PackStatus }
  | { type: 'error'; message: string }
  | { type: 'removed' }
  /** Lo que ya hay en el móvil al abrir la ficha: null si no hay paquete */
  | { type: 'hydrate'; status: PackStatus | null };

export const initialPackState: PackState = { phase: 'idle' };

const pct = (v: number) => (Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0);

export function packReducer(state: PackState, a: PackAction): PackState {
  switch (a.type) {
    case 'start':
      return { phase: 'downloading', percentage: 0, bytes: 0 };
    case 'progress': {
      const { status } = a;
      if (status.state === 'complete') return { phase: 'done', bytes: status.completedResourceSize };
      // Una vez hecho, un aviso suelto de «inactivo» no lo deshace
      if (state.phase === 'done') return state;
      // El porcentaje solo sube (los recursos nuevos que se descubren no lo hacen retroceder)
      const prev = state.phase === 'downloading' ? state.percentage : 0;
      return { phase: 'downloading', percentage: Math.max(prev, pct(status.percentage)), bytes: status.completedResourceSize };
    }
    case 'error':
      return state.phase === 'done' ? state : { phase: 'error', message: a.message };
    case 'removed':
      return initialPackState;
    case 'hydrate':
      if (!a.status) return initialPackState;
      if (a.status.state === 'complete') return { phase: 'done', bytes: a.status.completedResourceSize };
      return { phase: 'downloading', percentage: pct(a.status.percentage), bytes: a.status.completedResourceSize };
  }
}
