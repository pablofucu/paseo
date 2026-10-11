import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SCENES } from '@/data/stamps/scenes';
import type { Stop, Tour } from '@/data/types';
import { tintaDeRuta } from '@/lib/ink';
import { rubberXml, sealXml } from '@/lib/rubber';

/** La tinta de una ruta, ya corregida para leerse sobre el papel */
export const inkOf = (tour: Tour) => tintaDeRuta(tour.accent);

interface StampProps {
  tour: Tour;
  stop: Stop;
  /** Fecha ISO del estampado */
  date: string;
  seed: number;
  width: number;
  height: number;
  style?: ViewStyle;
}

/** Sello de goma de una parada: una sola tinta, mezclada con el papel (multiply) */
export function RubberStamp({ tour, stop, date, seed, width, height, style }: StampProps) {
  const xml = useMemo(
    () => rubberXml({ art: stop.rubber, scene: SCENES[stop.id] ?? '', city: tour.city, date, color: inkOf(tour), seed }),
    [tour, stop, date, seed],
  );
  return (
    <View pointerEvents="none" style={[{ width, height, mixBlendMode: 'multiply', opacity: 0.94 }, style]}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}

/** Sello grande de «Ruta completada» */
export function CompletionSeal({ tour, date, seed, width, height, style }: Omit<StampProps, 'stop'>) {
  const xml = useMemo(
    () => sealXml({ title: tour.title, stops: tour.stops.length, date, color: inkOf(tour), seed }),
    [tour, date, seed],
  );
  return (
    <View pointerEvents="none" style={[{ width, height, mixBlendMode: 'multiply', opacity: 0.94 }, style]}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}
