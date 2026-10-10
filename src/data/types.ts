import type { ImageSourcePropType } from 'react-native';
import type { TourPalette } from '@/theme/tokens';

/** [longitud, latitud], el mismo orden que usa MapLibre y GeoJSON */
export type LngLat = [number, number];

/** La forma del sello dice qué tipo de lugar es */
export type StampShape = 'round' | 'ticket' | 'arch' | 'postal' | 'oval' | 'chapa';

export const SHAPE_FOR_KIND = {
  monument: 'round',
  civic: 'ticket',
  religious: 'arch',
  tradition: 'postal',
  public: 'oval',
  food: 'chapa',
} as const satisfies Record<string, StampShape>;

export type StopKind = keyof typeof SHAPE_FOR_KIND;

export const KIND_LABEL: Record<StopKind, string> = {
  monument: 'Monumento',
  civic: 'Edificio civil',
  religious: 'Religioso',
  tradition: 'Tradición',
  public: 'Espacio público',
  food: 'Gastronomía',
};

export interface Stop {
  id: string;
  name: string;
  /** Texto del sello, en mayúsculas, 16 caracteres como mucho */
  stampLabel: string;
  kind: StopKind;
  /** Pictograma del sello: marcado SVG interior en una caja de 60 × 40 */
  pictogram: string;
  photo: ImageSourcePropType;
  coord: LngLat;
  arriveHint: string;
  audioTitle: string;
  p1: string;
  look: string;
  p2: string;
  fact: string;
  captions: string[];
}

export interface OnTheWay {
  /** Se oye en el tramo que sale de esta parada (índice 0) */
  afterStop: number;
  name: string;
  text: string;
}

export interface Tour {
  id: string;
  city: string;
  region: string;
  title: string;
  category: string;
  intro: string;
  palette: TourPalette;
  durationMin: number;
  price: 'free' | { eur: number };
  stops: Stop[];
  /** Ruta a pie de cada parada a la siguiente; legs[i] va de stops[i] a stops[i + 1] */
  legs: LngLat[][];
  onTheWay: OnTheWay[];
}
