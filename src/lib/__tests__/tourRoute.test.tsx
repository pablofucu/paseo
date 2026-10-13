import { describe, expect, it, jest } from '@jest/globals';
import { useMemo, type ReactElement } from 'react';
import { TOURS } from '@/data/tours';
import type { LngLat, Tour } from '@/data/types';
import { prepareLeg } from '@/lib/guidance';
import { useGuide } from '@/lib/useGuide';
import { useApproachRoute, useTourRoute } from '@/lib/useTourRoute';

// react-dom/server no trae tipos aquí; basta con renderizar una vez (los bucles de render también saltan en servidor)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToString } = require('react-dom/server') as { renderToString: (el: ReactElement) => string };

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));

/** Lo mismo que hace el mapa del paseo: tramo memorizado y guía que guarda la lectura anterior en el estado */
function Walk({ tour, sequential, origin }: { tour: Tour; sequential: boolean; origin: LngLat | null }) {
  const route = useTourRoute(tour);
  const approach = useApproachRoute(origin, tour.stops[1].coord);
  const leg = useMemo(
    () => (sequential ? prepareLeg(route.legs[0].line, route.legs[0].steps) : approach.leg ? prepareLeg(approach.leg.line, approach.leg.steps) : null),
    [route, sequential, approach.leg],
  );
  const g = useGuide(leg, tour.stops[0].coord, tour.stops[1].coord, null);
  return <>{g ? 'guía' : 'sin guía'}</>;
}

describe('ruta del paseo', () => {
  const tour = TOURS[0];
  const origin: LngLat = [tour.stops[0].coord[0] + 0.001, tour.stops[0].coord[1]];

  it('el tramo entre paradas no se rehace en cada render (sin bucle de renders)', () => {
    expect(() => renderToString(<Walk tour={tour} sequential origin={null} />)).not.toThrow();
  });

  it('el camino hasta la primera parada no se rehace mientras se calcula (sin bucle de renders)', () => {
    // La ruta por calles no llega nunca: se queda en la línea recta «calculando»
    global.fetch = (() => new Promise(() => {})) as never;
    expect(() => renderToString(<Walk tour={tour} sequential={false} origin={origin} />)).not.toThrow();
  });
});
