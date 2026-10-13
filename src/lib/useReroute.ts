import { useEffect, useRef } from 'react';
import type { LngLat } from '@/data/types';
import type { RouteQuality } from './useTourRoute';

/** Tiempo seguido fuera de la ruta antes de recalcularla (evita saltos del GPS) */
export const REROUTE_AFTER_MS = 4000;
/** Tiempo mínimo entre dos recálculos, para no saturar el router */
export const REROUTE_COOLDOWN_MS = 10000;

/** Tras un fallo del router la espera crece (30 s, 1 min, 2 min…) hasta este máximo */
export const REROUTE_FAIL_BASE_MS = 30000;
export const REROUTE_FAIL_MAX_MS = 300000;

/** Espera mínima entre recálculos: corta si todo va bien, larga y creciente si el router falla (sin red no sirve de nada insistir cada 10 s) */
export function rerouteCooldown(failures: number): number {
  if (failures <= 0) return REROUTE_COOLDOWN_MS;
  return Math.min(REROUTE_FAIL_MAX_MS, REROUTE_FAIL_BASE_MS * 2 ** (failures - 1));
}

/** Cuánto falta para recalcular: 0 = ya; null = no toca (estás en la ruta). */
export function rerouteDelay(offSince: number | null, lastReroute: number | null, now: number, failures = 0): number | null {
  if (offSince == null) return null;
  const ready = Math.max(offSince + REROUTE_AFTER_MS, lastReroute == null ? 0 : lastReroute + rerouteCooldown(failures));
  return Math.max(0, ready - now);
}

/**
 * Recalcula el camino hasta la primera parada cuando te sales de él: si sigues
 * fuera de la ruta unos segundos, llama a `onReroute` con tu posición, que pasa
 * a ser el nuevo punto de partida. Mientras `enabled` es falso (las demás
 * paradas, cuya ruta es fija) no hace nada. Devuelve si hay un recálculo en
 * marcha (estás fuera de la ruta y va a recalcularse).
 */
export function useReroute(enabled: boolean, position: LngLat | null, offRoute: boolean, onReroute: (from: LngLat) => void, quality: RouteQuality = 'streets'): boolean {
  const last = useRef<number | null>(null);
  // Cuántos recálculos seguidos han fallado (la ruta quedó en línea recta)
  const failures = useRef(0);
  const prevQuality = useRef(quality);
  useEffect(() => {
    if (prevQuality.current === quality) return;
    prevQuality.current = quality;
    if (quality === 'approximate') failures.current += 1;
    else if (quality === 'streets') failures.current = 0;
  }, [quality]);
  const latest = useRef({ position, onReroute });
  useEffect(() => { latest.current = { position, onReroute }; });

  const off = enabled && offRoute && !!position;
  useEffect(() => {
    if (!off) return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = (offSince: number) => {
      t = setTimeout(() => {
        // El fallo del router se conoce después de pedir la ruta: la espera se recalcula al despertar
        const wait = rerouteDelay(offSince, last.current, Date.now(), failures.current)!;
        if (wait > 0) { schedule(offSince); return; }
        const { position: from, onReroute: reroute } = latest.current;
        if (from) {
          last.current = Date.now();
          reroute(from);
        }
        // Si la nueva ruta tampoco te recoge, se vuelve a contar desde ahora
        schedule(Date.now());
      }, rerouteDelay(offSince, last.current, Date.now(), failures.current)!);
    };
    schedule(Date.now());
    return () => clearTimeout(t);
  }, [off]);

  return off;
}
