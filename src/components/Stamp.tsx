import { useMemo } from 'react';
import { type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SHAPE_FOR_KIND, type Tour } from '@/data/types';
import { stampXml, visaXml } from '@/lib/stamp';

const ROTATIONS = [-8, 6, -5, 9, -3, 7, -10, 4];

/** Tinta del sello de una parada: cada parada de la ruta tiene su color */
export const inkFor = (tour: Tour, index: number) => tour.stampInks[index % tour.stampInks.length];

interface StopStampProps {
  tour: Tour;
  index: number;
  date: string;
  ghost?: boolean;
  size: number;
  rotate?: number;
  /** Fuerza otro color (p. ej. la llegada sobre fondo oscuro) */
  color?: string;
  style?: ViewStyle;
}

/** Sello de una parada */
export function StopStamp({ tour, index, date, ghost, size, rotate, color, style }: StopStampProps) {
  const stop = tour.stops[index];
  const xml = useMemo(
    () => stampXml({ shape: SHAPE_FOR_KIND[stop.kind], pictogram: stop.pictogram, name: stop.stampLabel, sub: `PARADA ${index + 1} · ${date}`, color: color ?? inkFor(tour, index), ghost }),
    [stop, index, date, color, ghost, tour],
  );
  const r = rotate ?? (ghost ? 0 : ROTATIONS[index % ROTATIONS.length]);
  return <SvgXml xml={xml} width={size} height={size} style={[{ transform: [{ rotate: `${r}deg` }] }, style]} />;
}

interface SealProps {
  tour: Tour;
  date: string;
  collected: boolean[];
  ghost?: boolean;
  /** Ancho; el visado es apaisado (170 × 120) */
  width: number;
  rotate?: number;
  style?: ViewStyle;
}

/** Sello del tour: un visado de pasaporte, distinto de los sellos de parada */
export function TourSeal({ tour, date, collected, ghost, width, rotate = -6, style }: SealProps) {
  const xml = useMemo(
    () => visaXml({ city: tour.city, title: tour.title, date, pictogram: tour.stops[tour.emblemStop].pictogram, stops: collected, color: tour.palette.deep, accent: tour.palette.t, ghost }),
    [tour, date, collected, ghost],
  );
  return <SvgXml xml={xml} width={width} height={(width * 120) / 170} style={[{ transform: [{ rotate: `${ghost ? 0 : rotate}deg` }] }, style]} />;
}
