import type { ImageSourcePropType } from 'react-native';
import { getTour, LOCKED_TOURS } from '@/data/tours';
import { PACKS, type Pack } from '@/data/packs';
import { routeProgress, type UserRoute } from '@/store/passport';

/** Rutas de pago bloqueadas que cuentan como hechas en modo prueba, para probar cómo se gana una postal */
export const TEST_WON_TOURS = ['triana'];

/** Opciones de los cálculos de packs: `testMode` da por ganadas las rutas de `TEST_WON_TOURS` */
export interface PackOpts {
  testMode?: boolean;
}

const isTestWon = (id: string, opts?: PackOpts) => !!opts?.testMode && TEST_WON_TOURS.includes(id);

/** Un sello del pack con su estado (el tour puede ser abierto o de pago bloqueado) */
export interface PackStamp {
  id: string;
  label: string;
  title: string;
  /** El tour está abierto (se puede hacer); los de pago bloqueados nunca se ganan */
  open: boolean;
  /** Sello ganado: la ruta está completa */
  won: boolean;
  /** Ganado sólo por el modo prueba (ruta de pago bloqueada que cuenta como hecha) */
  testWon: boolean;
  /** Paradas selladas / paradas, para los abiertos */
  done: number;
  total: number;
}

export interface PackProgress {
  /** Sellos ganados */
  won: number;
  total: number;
  /** Todos los sellos ganados */
  complete: boolean;
  /** Títulos de los tours que faltan */
  missing: string[];
  /** Nombres cortos de los que faltan, para frases como «Te falta Triana» */
  missingLabels: string[];
  stamps: PackStamp[];
}

/**
 * Cuántos sellos de carta del pack se han ganado. Un sello se gana al completar
 * su ruta (`routeProgress().completed`); un tour de pago bloqueado nunca cuenta,
 * salvo los de `TEST_WON_TOURS` con el modo prueba activado.
 */
export function packProgress(pack: Pack, routes: Record<string, UserRoute | undefined>, opts?: PackOpts): PackProgress {
  const stamps = pack.tours.map<PackStamp>(pt => {
    const tour = getTour(pt.id);
    if (!tour) {
      const locked = LOCKED_TOURS.find(l => l.id === pt.id);
      const testWon = isTestWon(pt.id, opts);
      const total = locked?.stops ?? 0;
      return { id: pt.id, label: pt.label, title: locked?.title ?? pt.label, open: false, won: testWon, testWon, done: testWon ? total : 0, total };
    }
    const prog = routeProgress(tour.id, routes[tour.id]);
    return { id: pt.id, label: pt.label, title: tour.title, open: true, won: prog.completed, testWon: false, done: prog.done, total: prog.total };
  });
  const missing = stamps.filter(s => !s.won);
  const won = stamps.length - missing.length;
  return {
    won,
    total: stamps.length,
    complete: stamps.length > 0 && missing.length === 0,
    missing: missing.map(s => s.title),
    missingLabels: missing.map(s => s.label),
    stamps,
  };
}

/** Postal del pack desbloqueada: pack completo y con ilustración ya dibujada */
export const postcardUnlocked = (pack: Pack, routes: Record<string, UserRoute | undefined>, opts?: PackOpts) =>
  !!pack.postcard && packProgress(pack, routes, opts).complete;

/** Totales de la Colección: sellos ganados / de todos los packs, y postales desbloqueadas / packs */
export function collectionTotals(routes: Record<string, UserRoute | undefined>, opts?: PackOpts) {
  const all = PACKS.map(p => ({ p, prog: packProgress(p, routes, opts) }));
  return {
    stamps: all.reduce((a, x) => a + x.prog.won, 0),
    totalStamps: all.reduce((a, x) => a + x.prog.total, 0),
    postcards: all.filter(x => !!x.p.postcard && x.prog.complete).length,
    totalPostcards: PACKS.length,
  };
}

/** «Te falta 1 sello» / «Te faltan N sellos» */
export const missingText = (n: number) => (n === 1 ? 'Te falta 1 sello' : `Te faltan ${n} sellos`);

/** Cuándo se ganó el último sello del pack (pack completo), o null si aún falta alguno */
export function packCompletedAt(pack: Pack, routes: Record<string, UserRoute | undefined>, opts?: PackOpts) {
  // Un sello de prueba no tiene fecha: se ignora, y si no queda ninguna otra, vale ahora
  const real = pack.tours.filter(t => !isTestWon(t.id, opts));
  const dates = real.map(t => routeProgress(t.id, routes[t.id]).completedAt);
  if (!dates.length && !pack.tours.length) return null;
  if (!dates.every(Boolean)) return null;
  return (dates as string[]).sort().at(-1) ?? new Date().toISOString();
}

/** Dibujo del sello del pack para pies y reversos: el del último tour ganado y, si no hay, el primero que tenga */
export function packStampArt(pack: Pack, routes: Record<string, UserRoute | undefined> = {}): ImageSourcePropType | undefined {
  const won = pack.tours
    .map(t => ({ t, at: routeProgress(t.id, routes[t.id]).completedAt }))
    .filter(x => x.at)
    .sort((a, b) => b.at!.localeCompare(a.at!))[0]?.t.id;
  const ids = [won, ...pack.tours.map(t => t.id)];
  for (const id of ids) {
    const art = (id && (getTour(id)?.stamp.art ?? LOCKED_TOURS.find(l => l.id === id)?.stamp?.art)) || undefined;
    if (art) return art;
  }
  return undefined;
}
