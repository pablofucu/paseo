import type { ImageSourcePropType } from 'react-native';
import type { RouteStep } from '@/lib/routing';
import type { CityId } from '@/store/settings';
import type { TourPalette } from '@/theme/tokens';

/** [longitud, latitud], el mismo orden que usa MapLibre y GeoJSON */
export type LngLat = [number, number];

export type StopKind = 'monument' | 'civic' | 'religious' | 'tradition' | 'public' | 'food';

/**
 * Formas del sello de goma (guía de sellos): rectángulo para fachadas anchas
 * y comercios, círculo para plazas y monumentos con torre, óvalo para paisajes
 * y letreros, octógono para edificios institucionales.
 */
export type RubberShape = 'rect' | 'circle' | 'oval' | 'octagon';

/** El sello de goma de una parada. La escena dibujada está en src/data/stamps/scenes.ts (misma clave que la parada). */
export interface RubberArt {
  shape: RubberShape;
  /** Texto principal: nombre del sitio, en mayúsculas */
  title: string;
  /** Octógono: texto pequeño encima del título (por defecto, la ciudad) */
  kicker?: string;
  /** Octógono: texto de la banda inferior, encima de la fecha */
  label?: string;
  /** Lugar que acompaña a la fecha abajo (por defecto, la ciudad) */
  place?: string;
}

export const KIND_LABEL: Record<StopKind, string> = {
  monument: 'Monumento',
  civic: 'Edificio civil',
  religious: 'Religioso',
  tradition: 'Tradición',
  public: 'Espacio público',
  food: 'Gastronomía',
};

/** Símbolo de una ruta, según de qué va: lo lleva su marca en la tarjeta de la ciudad y su sello */
export type RouteSymbol = 'tower' | 'house' | 'jar' | 'brush' | 'crown' | 'book' | 'tree';

export interface Stop {
  id: string;
  name: string;
  kind: StopKind;
  /** Sello de goma de la parada */
  rubber: RubberArt;
  photo: ImageSourcePropType;
  /** Autoría y licencia de la foto (fotos libres de Wikimedia Commons) */
  photoCredit?: { author: string; license: string };
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
  /** Lo que se cuenta al tocarla; si falta, se lee `text` */
  story?: string;
}

export interface Tour {
  id: string;
  /** Ciudad del selector de Inicio a la que pertenece (Tomares está en el área de Sevilla) */
  area: CityId;
  city: string;
  region: string;
  title: string;
  category: string;
  symbol: RouteSymbol;
  intro: string;
  palette: TourPalette;
  /**
   * Color de acento de la ruta: el marco y los títulos de su postal. Se corrige con
   * tintaDeRuta() si no llega a 4,5:1 sobre el papel.
   */
  accent: string;
  /**
   * Tintas de los sellos, una por parada y por turnos: colores de tampón
   * distintos pero de la misma familia que la ruta. Si falta, todas usan el acento.
   */
  inks?: string[];
  /** Postal que se gana al completar la ruta */
  postcard: {
    /** Ilustración 832 × 444 (sitios de la ruta bajo un cielo común, con textura de imprenta) */
    art: ImageSourcePropType;
    /** Valor facial, como en un sello de carta («4,50€») */
    value: string;
    /** Subtítulo: las paradas separadas por « · » */
    subtitle: string;
  };
  /** Parada cuya foto sirve de portada del tour */
  emblemStop: number;
  durationMin: number;
  price: 'free' | { eur: number };
  stops: Stop[];
  /** Ruta a pie de cada parada a la siguiente; legs[i] va de stops[i] a stops[i + 1] */
  legs: LngLat[][];
  /** Giros con nombre de calle de cada tramo, si la ruta está fijada por calles */
  legSteps?: RouteStep[][];
  onTheWay: OnTheWay[];
}

/**
 * Tour de pago que todavía no se puede hacer: solo se enseña en la interfaz,
 * bloqueado, con su precio. No tiene paradas ni contenido.
 */
export interface LockedTour {
  id: string;
  area: CityId;
  city: string;
  region: string;
  title: string;
  category: string;
  symbol: RouteSymbol;
  intro: string;
  palette: TourPalette;
  durationMin: number;
  stops: number;
  /** Precio en euros */
  eur: number;
  /** Foto de portada, si hay; si no, la tarjeta se pinta con la paleta */
  cover?: ImageSourcePropType;
}
