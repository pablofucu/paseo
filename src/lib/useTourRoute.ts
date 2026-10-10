import { useEffect, useState } from 'react';
import type { Tour } from '@/data/types';
import { loadWalkingRoute, type RoutedLeg } from './routing';

export type RouteQuality = 'loading' | 'streets' | 'approximate';

/** Tramos del tour: la ruta real por calles si se puede calcular, si no la aproximada del tour. */
export function useTourRoute(tour: Tour): { legs: RoutedLeg[]; quality: RouteQuality } {
  const fallback = tour.legs.map(line => ({ line, steps: [] }));
  const [state, setState] = useState<{ tourId: string; legs: RoutedLeg[] | null; done: boolean }>({ tourId: tour.id, legs: null, done: false });
  useEffect(() => {
    let alive = true;
    loadWalkingRoute(tour.id, tour.stops.map(s => s.coord)).then(legs => {
      if (alive) setState({ tourId: tour.id, legs, done: true });
    });
    return () => { alive = false; };
  }, [tour]);
  if (state.tourId !== tour.id || !state.done) return { legs: fallback, quality: 'loading' };
  return state.legs ? { legs: state.legs, quality: 'streets' } : { legs: fallback, quality: 'approximate' };
}
