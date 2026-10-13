import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import type { Tour } from '@/data/types';

/**
 * Encuadre de las portadas: en las tarjetas bajas se ve la franja central
 * (y ≈ 110…400 de 600), donde cada ilustración pone sus monumentos.
 */
export const BANNER_POSITION = { top: '35%' } as const;

/** Portada de una ruta: su ilustración, con el color de acento de la ruta como color principal. */
export function TourBanner({ tour, style }: { tour: Tour; style?: StyleProp<ImageStyle> }) {
  return <Image source={tour.banner} style={[StyleSheet.absoluteFill, { backgroundColor: tour.palette.deep }, style]} contentFit="cover" contentPosition={BANNER_POSITION} transition={150} accessibilityIgnoresInvertColors />;
}
