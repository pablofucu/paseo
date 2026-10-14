import type { LngLat } from '@/data/types';

const R = 6371008.8; // radio medio de la Tierra en metros
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Distancia en metros entre dos puntos (haversine). */
export function distance(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Punto a `meters` de `from` en la dirección `bearingDeg` (0 = norte), con la misma proyección plana local que `projectOnRoute`. */
export function destination(from: LngLat, bearingDeg: number, meters: number): LngLat {
  const kx = Math.cos(rad(from[1])) * rad(1) * R;
  const ky = rad(1) * R;
  return [from[0] + (Math.sin(rad(bearingDeg)) * meters) / kx, from[1] + (Math.cos(rad(bearingDeg)) * meters) / ky];
}

/** Rumbo inicial de a hacia b, en grados 0–360 (0 = norte). */
export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Diferencia de rumbo con signo en (−180, 180]: positivo = giro a la derecha. */
export function turnAngle(from: number, to: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return d === -180 ? 180 : d;
}

/** Longitudes acumuladas de una polilínea, en metros. */
export function cumulative(line: LngLat[]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + distance(line[i - 1], line[i]));
  return out;
}

/** Punto situado a `meters` desde el inicio de la polilínea. */
export function pointAlong(line: LngLat[], meters: number, cum = cumulative(line)): LngLat {
  if (meters <= 0) return line[0];
  const total = cum[cum.length - 1];
  if (meters >= total) return line[line.length - 1];
  let i = 1;
  while (cum[i] < meters) i++;
  const f = (meters - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const a = line[i - 1];
  const b = line[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export interface RouteProjection {
  /** Metros recorridos sobre la ruta hasta el punto más cercano */
  along: number;
  /** Distancia del usuario a la ruta, en metros */
  offRoute: number;
  /** Punto de la ruta más cercano al usuario */
  snapped: LngLat;
}

/**
 * Proyecta una posición sobre la ruta. Para tramos urbanos cortos basta con
 * una proyección plana local (equirectangular) alrededor del usuario.
 * Con `minAlong` solo se miran los tramos que acaban después de esos metros:
 * así el punto no retrocede por el temblor del GPS (ni salta a otro lado de
 * una ruta que se cruza consigo misma).
 */
export function projectOnRoute(line: LngLat[], p: LngLat, cum = cumulative(line), minAlong = 0): RouteProjection {
  const kx = Math.cos(rad(p[1])) * rad(1) * R;
  const ky = rad(1) * R;
  let best: RouteProjection = { along: 0, offRoute: Infinity, snapped: line[0] };
  for (let i = 1; i < line.length; i++) {
    if (cum[i] < minAlong) continue;
    const a = line[i - 1];
    const b = line[i];
    const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky;
    const bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const qx = ax + dx * t, qy = ay + dy * t;
    const d = Math.hypot(qx, qy);
    if (d < best.offRoute) {
      best = {
        along: Math.max(minAlong, cum[i - 1] + (cum[i] - cum[i - 1]) * t),
        offRoute: d,
        snapped: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
      };
    }
  }
  return best;
}

export type TurnDirection = 'left' | 'right' | 'slight-left' | 'slight-right' | 'uturn';

export interface Maneuver {
  /** Metros desde el inicio de la ruta hasta el giro */
  at: number;
  direction: TurnDirection;
  point: LngLat;
  /** Calle a la que se gira, si la conocemos */
  street?: string;
}

/** Saca los giros de la geometría: cada vértice donde el rumbo cambia más de 30°. */
export function maneuvers(line: LngLat[], cum = cumulative(line)): Maneuver[] {
  const out: Maneuver[] = [];
  for (let i = 1; i < line.length - 1; i++) {
    const a = turnAngle(bearing(line[i - 1], line[i]), bearing(line[i], line[i + 1]));
    const abs = Math.abs(a);
    if (abs < 30) continue;
    const direction: TurnDirection =
      abs > 150 ? 'uturn' : abs < 60 ? (a > 0 ? 'slight-right' : 'slight-left') : a > 0 ? 'right' : 'left';
    out.push({ at: cum[i], direction, point: line[i] });
  }
  return out;
}

/** «120 m», «1,2 km» o «Ahora» */
export function formatDistance(m: number): string {
  if (m < 8) return 'Ahora';
  // Desde 995 m ya se redondea a «1,0 km» (y no a «1000 m»)
  if (m < 995) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Metros andados hasta la parada sellada más lejana (legMeters[i] va de la parada i a la i + 1); 0 sin sellos */
export function walkedMeters(legMeters: number[], stampedIdx: number[]): number {
  if (!stampedIdx.length) return 0;
  return legMeters.slice(0, Math.max(...stampedIdx)).reduce((a, m) => a + m, 0);
}

/** Minutos a pie a 4,5 km/h, como mínimo 1. */
export const walkingMinutes = (m: number) => Math.max(1, Math.ceil(m / 75));

/** Caja [oeste, sur, este, norte] que contiene todos los puntos; null si no hay ninguno. Es el formato de `bounds` de MapLibre. */
export function boundsOf(points: LngLat[]): [number, number, number, number] | null {
  if (!points.length) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < w) w = lng;
    if (lng > e) e = lng;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return [w, s, e, n];
}
