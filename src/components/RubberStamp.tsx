import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { STAMP_ART } from '@/data/stamps/images';
import type { Stop, Tour } from '@/data/types';
import { papelDeRuta, tintaDeParada, tintaDeRuta } from '@/lib/ink';
import { rubberDateXml } from '@/lib/rubber';

/** La tinta de una ruta (su acento), ya corregida para leerse sobre el papel */
export const inkOf = (tour: Tour) => tintaDeRuta(tour.accent);

/** Papel de la hoja de una ruta */
export const paperOf = (tour: Tour) => papelDeRuta(tour.palette.soft);

/** Tinta del sello de una parada: cada parada tiene la suya, de la familia de la ruta */
export function stopInk(tour: Tour, stopId: string) {
  return tintaDeParada(tour.inks, tour.accent, Math.max(0, tour.stops.findIndex(s => s.id === stopId)), paperOf(tour));
}

interface StampProps {
  tour: Tour;
  stop: Stop;
  /** Fecha ISO del estampado */
  date: string;
  width: number;
  height: number;
  style?: ViewStyle;
}

/**
 * Sello de goma de una parada: el dibujo horneado con su textura, teñido con
 * la tinta de la parada, y la fecha real encima. Sin mixBlendMode: en Android
 * cada sello abría una capa aparte y en el pasaporte hay muchos a la vez.
 */
export const RubberStamp = memo(function RubberStamp({ tour, stop, date, width, height, style }: StampProps) {
  const color = stopInk(tour, stop.id);
  const xml = useMemo(() => rubberDateXml({ art: stop.rubber, city: tour.city, date, color }), [stop, tour.city, date, color]);
  return (
    <View pointerEvents="none" style={[{ width, height, opacity: 0.88 }, style]}>
      <Image source={STAMP_ART[stop.id]} tintColor={color} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" transition={0} />
      <SvgXml xml={xml} width={width} height={height} opacity={0.88} />
    </View>
  );
});
