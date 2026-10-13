import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PAPEL } from '@/lib/ink';

// Guilloche, viñeteado y sombra del lomo, horneados por scripts/build-passport-paper.mjs
const FACE = require('../../assets/passport/paper-face.png');
const BACK = require('../../assets/passport/paper-back.png');

/**
 * Papel de las hojas del pasaporte (#f1ead6, o el velo de color de una ruta):
 * guilloche fino, viñeteado ocre y sombra del lomo en el lado interior.
 * El color va debajo y la textura es una imagen horneada: antes era un SVG con
 * ~1.200 tramos por hoja, repetido en cada tramo de la hoja que se curva.
 */
export const PassportPaper = memo(function PassportPaper({ width, height, spine = 'left', back, color = PAPEL }: { width: number; height: number; spine?: 'left' | 'right'; back?: boolean; color?: string }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height, backgroundColor: color }]}>
      <Image
        source={back ? BACK : FACE}
        style={[StyleSheet.absoluteFill, spine === 'right' && { transform: [{ scaleX: -1 }] }]}
        contentFit="fill"
        cachePolicy="memory"
        transition={0}
      />
    </View>
  );
});
