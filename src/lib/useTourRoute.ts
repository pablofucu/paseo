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
  if (fixed) return { legs: fixed, quality: 'streets' };
  const straight = tour.legs.map(line => ({ line, steps: [] }));
  if (state.tourId !== tour.id || !state.done) return { legs: straight, quality: 'loading' };
  return state.legs ? { legs: state.legs, quality: 'streets' } : { legs: straight, quality: 'approximate' };
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
  if (!origin) return { leg: null, quality: 'loading' };
  if (state.key !== key) return { leg: { line: [origin, to], steps: [] }, quality: 'loading' };
  return state.leg ? { leg: state.leg, quality: 'streets' } : { leg: { line: [origin, to], steps: [] }, quality: 'approximate' };
}
