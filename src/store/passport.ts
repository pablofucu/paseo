import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getTour } from '@/data/tours';
import { randomSpot, stampRotation } from '@/lib/placement';
import { rng } from '@/lib/rubber';
import { placedBoxes, sheetFor, stampInk } from '@/lib/sheet';

/*
 * Modelo de datos de la guía de sellos (§ 10):
 *   UserPassport { owner, issuedAt, pageOrder }
 *   UserRoute { routeId, stamps[{ stopId, date, x, y, rot, seed }], postcardUnlockedAt }
 * Cada parada se sella una sola vez; las repeticiones van al historial. Con
 * el último sello la ruta queda completada y se gana la postal (no hay sello
 * de ruta completada).
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

export interface UserRoute {
  routeId: string;
  stamps: PlacedStamp[];
  /** Fecha del último sello de la ruta, cuando se gana la postal */
  postcardUnlockedAt: string | null;
  /** Ya se enseñó la tarjeta de «Postal desbloqueada» */
  postcardSeen?: boolean;
  /** Nota corta del usuario sobre el paseo (máx. 60 caracteres): sale a mano en el reverso de la postal */
  note?: string;
  /** Cada vez que se llega a una parada, aunque ya estuviera sellada */
  history: { stopId: string; date: string }[];
}

export interface UserPassport {
  owner: string;
  issuedAt: string;
  /** Rutas en el orden de sus hojas (el del primer sello) */
  pageOrder: string[];
}

export interface ActiveWalk {
  tourId: string;
  /** Índice de la parada a la que se va */
  target: number;
  /** Parada a la que se ha llegado de verdad (GPS o «Llegar» en modo prueba): solo esa se puede sellar */
  arrived: string | null;
  /** Última parada visitada: su guía se puede abrir y cerrar desde el botón del mapa */
  guide: number | null;
  /** Paradas saltadas a propósito: siguen sin sellar y se pueden sellar luego */
  skipped?: string[];
}

/** Dónde soltó el usuario el sello (sin la fecha, que la pone la app) */
export type Drop = Omit<PlacedStamp, 'date' | 'stopId'>;

interface PassportState {
  passport: UserPassport;
  routes: Record<string, UserRoute>;
  /** Paseo en curso (no se guarda): la ruta, la parada a la que se va y en cuál se está ya */
  walk: ActiveWalk | null;
  setOwner: (owner: string) => void;
  /** Empieza (o retoma) el paseo hacia la parada `target` */
  startWalk: (tourId: string, target: number, skipped?: string[]) => void;
  /** Saltar la parada `stopId` e ir a `target` (queda sin sellar) */
  skipStop: (stopId: string, target: number) => void;
  /** Tras la parada actual, a por la siguiente (las paradas van en orden) */
  advanceWalk: () => void;
  /** Saltar hasta una parada más adelante (la ruta queda incompleta) */
  goTo: (target: number) => void;
  endWalk: () => void;
  /** Llegada a una parada: queda en el historial y desde ese momento se puede sellar. Devuelve si ya estaba sellada. */
  arrive: (tourId: string, stopId: string) => boolean;
  placeStamp: (tourId: string, stopId: string, drop: Drop) => void;
  markPostcardSeen: (tourId: string) => void;
  /** Guarda la nota del paseo de una ruta (recortada a NOTE_MAX) */
  setNote: (tourId: string, note: string) => void;
  /** Cancelar una ruta: se borran sus sellos y su hoja del pasaporte, y se para el paseo si era esa */
  dropRoute: (tourId: string) => void;
  reset: () => void;
}

const emptyRoute = (routeId: string): UserRoute => ({ routeId, stamps: [], postcardUnlockedAt: null, history: [] });
const now = () => new Date().toISOString();
const freshPassport = (): UserPassport => ({ owner: '', issuedAt: now(), pageOrder: [] });

/** Largo máximo de la nota del paseo */
export const NOTE_MAX = 60;

export const newSeed = () => Math.floor(Math.random() * 1e9);

export const usePassport = create<PassportState>()(
  persist(
    (set, get) => ({
      passport: freshPassport(),
      routes: {},
      walk: null,
      setOwner: owner => set(s => ({ passport: { ...s.passport, owner: owner.slice(0, 24) } })),
      startWalk: (tourId, target, skipped) => set({ walk: { tourId, target, arrived: null, guide: null, ...(skipped?.length ? { skipped } : {}) } }),
      skipStop: (stopId, target) =>
        set(s => (s.walk ? { walk: { ...s.walk, target, arrived: null, skipped: s.walk.skipped?.includes(stopId) ? s.walk.skipped : [...(s.walk.skipped ?? []), stopId] } } : s)),
      advanceWalk: () => set(s => (s.walk ? { walk: { ...s.walk, target: s.walk.target + 1, arrived: null } } : s)),
      goTo: target => set(s => (s.walk ? { walk: { ...s.walk, target, arrived: null } } : s)),
      endWalk: () => set({ walk: null }),
      arrive: (tourId, stopId) => {
        let already = false;
        set(s => {
          const route = s.routes[tourId] ?? emptyRoute(tourId);
          already = route.stamps.some(st => st.stopId === stopId);
          return {
            routes: { ...s.routes, [tourId]: { ...route, history: [...route.history, { stopId, date: now() }] } },
            walk: s.walk?.tourId === tourId ? { ...s.walk, arrived: stopId, guide: s.walk.target } : s.walk,
          };
        });
        return already;
      },
      placeStamp: (tourId, stopId, drop) =>
        set(s => {
          const route = s.routes[tourId] ?? emptyRoute(tourId);
          if (route.stamps.some(st => st.stopId === stopId)) return s;
          const tour = getTour(tourId);
          const pageOrder = s.passport.pageOrder.includes(tourId) ? s.passport.pageOrder : [...s.passport.pageOrder, tourId];
          const date = now();
          const stamps = [...route.stamps, { stopId, date, ...drop }];
          const complete = (list: PlacedStamp[]) => !!tour && tour.stops.every(st => list.some(x => x.stopId === st.id));
          const all = complete(stamps);
          // Si la ruta ya estaba completa (no puede, salvo datos viejos) la fecha se conserva; si no, la fija el último sello
          const was = complete(route.stamps);
          const postcardUnlockedAt = was ? route.postcardUnlockedAt : all ? date : null;
          // Una ruta que gana una parada nueva y se vuelve a completar gana su postal otra vez
          const postcardSeen = !was && all ? false : route.postcardSeen;
          return {
            passport: { ...s.passport, pageOrder },
            routes: { ...s.routes, [tourId]: { ...route, stamps, postcardUnlockedAt, postcardSeen } },
          };
        }),
      markPostcardSeen: tourId =>
        set(s => (s.routes[tourId] ? { routes: { ...s.routes, [tourId]: { ...s.routes[tourId], postcardSeen: true } } } : s)),
      setNote: (tourId, note) =>
        set(s => (s.routes[tourId] ? { routes: { ...s.routes, [tourId]: { ...s.routes[tourId], note: note.trim().slice(0, NOTE_MAX) } } } : s)),
      dropRoute: tourId =>
        set(s => {
          const { [tourId]: _dropped, ...routes } = s.routes;
          return {
            routes,
            passport: { ...s.passport, pageOrder: s.passport.pageOrder.filter(id => id !== tourId) },
            walk: s.walk?.tourId === tourId ? null : s.walk,
          };
        }),
      reset: () => set({ passport: freshPassport(), routes: {}, walk: null }),
    }),
    {
      name: 'paseo-passport',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // El paseo en curso no se guarda: al volver a abrir la app hay que volver a llegar para sellar
      partialize: s => ({ passport: s.passport, routes: s.routes }),
      migrate: (old, version) => dropFinalStamps(version < 1 ? migrateVisits(old as OldState) : (old as PassportState)) as PassportState,
    },
  ),
);

/** Estado de la versión 0: una lista de visitas con sus sellos por parada */
interface OldState {
  visits?: { tourId: string; startedAt: string; stamps: Record<string, string>; completedAt?: string }[];
}

/** Pasa las visitas antiguas al pasaporte nuevo, colocando sus sellos en huecos libres */
export function migrateVisits(old: OldState): Pick<PassportState, 'passport' | 'routes'> {
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
      const others = placedBoxes(route.stamps.map(s => ({ ...s, shape: tour.stops.find(t => t.id === s.stopId)!.rubber.shape })), sheet, tour.stops.length);
      const size = stampInk(stop.rubber.shape, sheet.w, tour.stops.length);
      const spot = randomSpot(size.w, size.h, others, sheet, r);
      route.stamps.push({ stopId, date, x: spot.x / sheet.w, y: spot.y / sheet.h, rot: stampRotation(r), seed: Math.floor(r() * 1e9) });
    }
    if (!route.postcardUnlockedAt && route.stamps.length === tour.stops.length) {
      route.postcardUnlockedAt = route.stamps.at(-1)!.date;
      route.postcardSeen = true;
    }
    if (!passport.pageOrder.includes(v.tourId) && route.stamps.length) passport.pageOrder.push(v.tourId);
  }
  return { passport, routes };
}

/**
 * Versión 2: ya no hay sello de ruta completada. La postal se gana con todos
 * los sellos; se quita el sello grande de las hojas que lo tenían.
 */
export function dropFinalStamps<T extends Pick<PassportState, 'routes'>>(state: T): T {
  const routes: Record<string, UserRoute> = {};
  for (const [id, r] of Object.entries(state.routes ?? {})) {
    const { finalStamp, ...rest } = r as UserRoute & { finalStamp?: { date: string } | null };
    const tour = getTour(id);
    // Una ruta que ya no existe en la app se deja tal cual (por si vuelve); solo se le quita el sello grande
    if (!tour) { routes[id] = rest; continue; }
    const all = tour.stops.every(st => rest.stamps.some(x => x.stopId === st.id));
    const last = rest.stamps.map(x => x.date).sort().at(-1) ?? null;
    routes[id] = { ...rest, postcardUnlockedAt: all ? (rest.postcardUnlockedAt ?? finalStamp?.date ?? last) : null, postcardSeen: rest.postcardSeen ?? !!finalStamp };
  }
  return { ...state, routes };
}

/** Situación de una ruta para la interfaz. Si la ruta ya no existe en la app, todo a cero. */
export function routeProgress(tourId: string, route: UserRoute | undefined) {
  const tour = getTour(tourId);
  if (!tour) return { done: 0, total: 0, missing: [], allStamped: false, completed: false, completedAt: null, started: false };
  const stamped = new Set(route?.stamps.map(s => s.stopId));
  const missing = tour.stops.filter(s => !stamped.has(s.id));
  const done = tour.stops.length - missing.length;
  return {
    done,
    total: tour.stops.length,
    missing,
    allStamped: missing.length === 0,
    completed: missing.length === 0,
    /** Cuándo se completó (el último sello) */
    completedAt: missing.length === 0 ? (route?.postcardUnlockedAt ?? route?.stamps.map(s => s.date).sort().at(-1) ?? null) : null,
    started: done > 0,
  };
}

/** Las rutas de la lista que siguen existiendo (una hoja guardada de un tour que ya no está se ignora) */
export const knownRoutes = (ids: string[]) => ids.filter(id => !!getTour(id));

/** Rutas empezadas y sin terminar, la del último sello primero (para «Sigue donde lo dejaste») */
export function unfinishedRoutes(tourIds: string[], routes: Record<string, UserRoute>) {
  const last = (id: string) => routes[id]?.stamps.map(s => s.date).sort().at(-1) ?? '';
  return tourIds.filter(id => {
    const p = routeProgress(id, routes[id]);
    return p.started && !p.completed;
  }).sort((a, b) => last(b).localeCompare(last(a)));
}

export const useRoute = (tourId: string | undefined) => usePassport(s => (tourId ? s.routes[tourId] : undefined));

/** true cuando el pasaporte guardado ya se ha leído (hasta entonces, portada o esqueleto) */
export function usePassportHydrated() {
  return useSyncExternalStore(usePassport.persist.onFinishHydration, usePassport.persist.hasHydrated, () => false);
}
