import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getTour } from '@/data/tours';
import { randomSpot } from '@/lib/placement';
import { rng } from '@/lib/rubber';
import { placedBoxes, sheetFor, stampInk } from '@/lib/sheet';

/*
 * Modelo de datos de la guía de sellos (§ 10):
 *   UserPassport { owner, issuedAt, pageOrder }
 *   UserRoute { routeId, stamps[{ stopId, date, x, y, rot, seed }], finalStamp | null, postcardUnlockedAt }
 * Cada parada se sella una sola vez; las repeticiones van al historial.
 */

/** Un sello puesto en la hoja: centro en proporción de la hoja (0–1), giro en grados y semilla de la textura */
export interface PlacedStamp {
  stopId: string;
  date: string;
  x: number;
  y: number;
  rot: number;
  seed: number;
}

export type FinalStamp = Omit<PlacedStamp, 'stopId'>;

export interface UserRoute {
  routeId: string;
  stamps: PlacedStamp[];
  finalStamp: FinalStamp | null;
  postcardUnlockedAt: string | null;
  /** Cada vez que se llega a una parada, aunque ya estuviera sellada */
  history: { stopId: string; date: string }[];
}

export interface UserPassport {
  owner: string;
  issuedAt: string;
  /** Rutas en el orden de sus hojas (el del primer sello) */
  pageOrder: string[];
}

/** Dónde soltó el usuario el sello (sin la fecha, que la pone la app) */
export type Drop = Omit<PlacedStamp, 'date' | 'stopId'>;

interface PassportState {
  passport: UserPassport;
  routes: Record<string, UserRoute>;
  /** Ruta que se está andando ahora */
  activeTourId: string | null;
  setOwner: (owner: string) => void;
  startWalk: (tourId: string) => void;
  endWalk: () => void;
  /** Llegada a una parada: queda en el historial. Devuelve si ya estaba sellada. */
  arrive: (tourId: string, stopId: string) => boolean;
  placeStamp: (tourId: string, stopId: string, drop: Drop) => void;
  placeFinal: (tourId: string, drop: Drop) => void;
  reset: () => void;
}

const emptyRoute = (routeId: string): UserRoute => ({ routeId, stamps: [], finalStamp: null, postcardUnlockedAt: null, history: [] });
const now = () => new Date().toISOString();
const freshPassport = (): UserPassport => ({ owner: '', issuedAt: now(), pageOrder: [] });

export const newSeed = () => Math.floor(Math.random() * 1e9);

export const usePassport = create<PassportState>()(
  persist(
    (set, get) => ({
      passport: freshPassport(),
      routes: {},
      activeTourId: null,
      setOwner: owner => set(s => ({ passport: { ...s.passport, owner: owner.slice(0, 24) } })),
      startWalk: tourId => set({ activeTourId: tourId }),
      endWalk: () => set({ activeTourId: null }),
      arrive: (tourId, stopId) => {
        const route = get().routes[tourId] ?? emptyRoute(tourId);
        set(s => ({ routes: { ...s.routes, [tourId]: { ...route, history: [...route.history, { stopId, date: now() }] } } }));
        return route.stamps.some(st => st.stopId === stopId);
      },
      placeStamp: (tourId, stopId, drop) =>
        set(s => {
          const route = s.routes[tourId] ?? emptyRoute(tourId);
          if (route.stamps.some(st => st.stopId === stopId)) return s;
          const pageOrder = s.passport.pageOrder.includes(tourId) ? s.passport.pageOrder : [...s.passport.pageOrder, tourId];
          return {
            passport: { ...s.passport, pageOrder },
            routes: { ...s.routes, [tourId]: { ...route, stamps: [...route.stamps, { stopId, date: now(), ...drop }] } },
          };
        }),
      placeFinal: (tourId, drop) =>
        set(s => {
          const route = s.routes[tourId];
          if (!route || route.finalStamp) return s;
          const date = now();
          return { routes: { ...s.routes, [tourId]: { ...route, finalStamp: { date, ...drop }, postcardUnlockedAt: date } } };
        }),
      reset: () => set({ passport: freshPassport(), routes: {}, activeTourId: null }),
    }),
    {
      name: 'paseo-passport',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (old, version) => (version < 1 ? migrateVisits(old as OldState) : old) as PassportState,
    },
  ),
);

/** Estado de la versión 0: una lista de visitas con sus sellos por parada */
interface OldState {
  visits?: { tourId: string; startedAt: string; stamps: Record<string, string>; completedAt?: string }[];
}

/** Pasa las visitas antiguas al pasaporte nuevo, colocando sus sellos en huecos libres */
export function migrateVisits(old: OldState): Pick<PassportState, 'passport' | 'routes' | 'activeTourId'> {
  const visits = [...(old.visits ?? [])].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const routes: Record<string, UserRoute> = {};
  const passport: UserPassport = { owner: '', issuedAt: visits[0]?.startedAt ?? now(), pageOrder: [] };
  const sheet = sheetFor(1000);
  for (const v of visits) {
    const tour = getTour(v.tourId);
    if (!tour) continue;
    const route = (routes[v.tourId] ??= emptyRoute(v.tourId));
    const r = rng(v.startedAt.length * 7919 + Object.keys(v.stamps).length);
    for (const [stopId, date] of Object.entries(v.stamps).sort((a, b) => a[1].localeCompare(b[1]))) {
      const stop = tour.stops.find(s => s.id === stopId);
      if (!stop) continue;
      route.history.push({ stopId, date });
      if (route.stamps.some(s => s.stopId === stopId)) continue;
      const others = placedBoxes(route.stamps.map(s => ({ ...s, shape: tour.stops.find(t => t.id === s.stopId)!.rubber.shape })), sheet);
      const size = stampInk(stop.rubber.shape, sheet.w);
      const spot = randomSpot(size.w, size.h, others, sheet, r);
      route.stamps.push({ stopId, date, x: spot.x / sheet.w, y: spot.y / sheet.h, rot: (r() - 0.5) * 24, seed: Math.floor(r() * 1e9) });
    }
    // Una visita terminada con todos los sellos trae su sello de ruta completada (y su postal)
    if (v.completedAt && !route.finalStamp && route.stamps.length === tour.stops.length) {
      route.finalStamp = { date: v.completedAt, x: 0.5 + (r() - 0.5) * 0.2, y: 0.58 + (r() - 0.5) * 0.2, rot: (r() - 0.5) * 40, seed: Math.floor(r() * 1e9) };
      route.postcardUnlockedAt = v.completedAt;
    }
    if (!passport.pageOrder.includes(v.tourId) && route.stamps.length) passport.pageOrder.push(v.tourId);
  }
  return { passport, routes, activeTourId: null };
}

/** Situación de una ruta para la interfaz */
export function routeProgress(tourId: string, route: UserRoute | undefined) {
  const tour = getTour(tourId)!;
  const stamped = new Set(route?.stamps.map(s => s.stopId));
  const missing = tour.stops.filter(s => !stamped.has(s.id));
  return {
    done: stamped.size,
    total: tour.stops.length,
    missing,
    allStamped: missing.length === 0,
    completed: !!route?.finalStamp,
    started: stamped.size > 0,
  };
}

export const useRoute = (tourId: string | undefined) => usePassport(s => (tourId ? s.routes[tourId] : undefined));
