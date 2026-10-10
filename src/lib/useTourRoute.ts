import { useEffect, useMemo, useState } from 'react';
import type { Tour } from '@/data/types';
import { loadWalkingRoute, type RoutedLeg } from './routing';

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
