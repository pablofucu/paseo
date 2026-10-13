import type { Tour } from '@/data/types';

/** En la web no hay mapa nativo (MapLibre): la ficha va sin vista previa */
export function TourMapPreview(_: { tour: Tour; lines: [number, number][][]; stamped: ReadonlySet<string> }) {
  return null;
}
