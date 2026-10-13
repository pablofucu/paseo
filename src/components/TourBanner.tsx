import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import type { Tour } from '@/data/types';

/**
 * Portada de una ruta: su ilustración teñida con los colores de la ruta.
 * Se encuadra por arriba para que en las tarjetas bajas se vea lo alto de
 * la escena (la Giralda en Sevilla) y no solo el primer término.
 */
export function TourBanner({ tour, style }: { tour: Tour; style?: StyleProp<ImageStyle> }) {
  return <Image source={tour.banner} style={[StyleSheet.absoluteFill, { backgroundColor: tour.palette.deep }, style]} contentFit="cover" contentPosition={{ top: '6%' }} transition={150} accessibilityIgnoresInvertColors />;
}
