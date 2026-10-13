import { useEffect, useMemo, useState } from 'react';
import type { LngLat, Tour } from '@/data/types';
import { fetchWalkingRoute, loadWalkingRoute, type RoutedLeg } from './routing';

export type RouteQuality = 'loading' | 'streets' | 'approximate';

/**
 * Tramos del tour. Lo normal es que la ruta venga fijada por calles con el tour
 * (legSteps). Si un tour aún no la tiene, se intenta calcular en el móvil y,
 * sin conexión, se usa la línea recta.
 */
export function useTourRoute(tour: Tour): { legs: RoutedLeg[]; quality: RouteQuality } {
  const fixed = useMemo(() => (tour.legSteps ? tour.legs.map((line, i) => ({ line, steps: tour.legSteps![i] ?? [] })) : null), [tour]);
  const [state, setState] = useState<{ tourId: string; legs: RoutedLeg[] | null; done: boolean }>({ tourId: tour.id, legs: null, done: false });
  useEffect(() => {
    if (fixed) return;
    let alive = true;
    loadWalkingRoute(tour.id, tour.stops.map(s => s.coord)).then(legs => {
      if (alive) setState({ tourId: tour.id, legs, done: true });
    });
    return () => { alive = false; };
  }, [tour, fixed]);
  // Siempre el mismo objeto mientras no cambie nada: el paseo memoriza el tramo con él y la guía
  // guarda su lectura en el estado, así que uno nuevo en cada render los rehacía sin fin («Too many re-renders»)
  const straight = useMemo(() => tour.legs.map(line => ({ line, steps: [] as RoutedLeg['steps'] })), [tour]);
  const loading = state.tourId !== tour.id || !state.done;
  return useMemo(() => {
    if (fixed) return { legs: fixed, quality: 'streets' as const };
    if (loading) return { legs: straight, quality: 'loading' as const };
    return state.legs ? { legs: state.legs, quality: 'streets' as const } : { legs: straight, quality: 'approximate' as const };
  }, [fixed, loading, straight, state.legs]);
}

/**
 * Camino a pie por calles desde donde estás hasta la primera parada.
 * Se pide una vez por punto de partida; sin conexión, queda en línea recta.
 */
export function useApproachRoute(origin: LngLat | null, to: LngLat): { leg: RoutedLeg | null; quality: RouteQuality } {
  const key = origin ? origin.map(v => v.toFixed(5)).join(',') : '';
  const [state, setState] = useState<{ key: string; leg: RoutedLeg | null }>({ key: '', leg: null });
  useEffect(() => {
    if (!origin) return;
    let alive = true;
    fetchWalkingRoute([origin, to]).then(
      legs => { if (alive) setState({ key, leg: legs[0] ?? null }); },
      () => { if (alive) setState({ key, leg: null }); },
    );
    return () => { alive = false; };
    // origin solo cambia de verdad cuando cambia la clave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, to[0], to[1]]);
  // La línea recta de reserva se guarda por punto de partida: una nueva en cada render rehacía el tramo sin fin
  const straight = useMemo<RoutedLeg | null>(
    () => (origin ? { line: [origin, to], steps: [] } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, to[0], to[1]],
  );
  const loading = state.key !== key;
  return useMemo(() => {
    if (!straight) return { leg: null, quality: 'loading' as const };
    if (loading) return { leg: straight, quality: 'loading' as const };
    return state.leg ? { leg: state.leg, quality: 'streets' as const } : { leg: straight, quality: 'approximate' as const };
  }, [straight, loading, state.leg]);
}
