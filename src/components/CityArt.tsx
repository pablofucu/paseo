import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { CityId } from '@/store/settings';
import { neutral, type TourPalette } from '@/theme/tokens';


/** Madrid aún no tiene fotos: la Puerta de Alcalá y la cúpula del Metrópolis en línea */
function MadridArt({ palette: MADRID }: { palette: TourPalette }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: MADRID.deep }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 180" preserveAspectRatio="xMidYMax slice">
        <Rect x={0} y={0} width={360} height={180} fill={MADRID.deep} />
        <Path d="M0 150 H360" stroke={MADRID.t2} strokeWidth={2} />
        {/* Puerta de Alcalá: cinco vanos, frontón y estatuas */}
        <Path d="M40 150 V92 H190 V150 M40 92 L115 70 L190 92 M58 150 V112 a9 9 0 0 1 18 0 V150 M90 150 V104 a15 15 0 0 1 30 0 V150 M134 150 V112 a9 9 0 0 1 18 0 V150 M160 150 V118 h12 V150 M46 118 h8 V150 M105 70 v-8 h20 v8 M112 62 v-6 h6 v6" fill="none" stroke={neutral.white} strokeOpacity={0.9} strokeWidth={2} strokeLinejoin="round" />
        {/* Metrópolis: torre redondeada con cúpula y la Victoria encima */}
        <Path d="M250 150 V78 a32 32 0 0 1 64 0 V150 M250 100 H314 M262 150 V108 M282 150 V108 M302 150 V108 M282 46 a12 14 0 0 1 0 -2 M282 46 V30 M276 34 l6 -6 l6 6" fill="none" stroke={MADRID.t2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Path d="M250 78 a32 30 0 0 1 64 0" fill={MADRID.t2} fillOpacity={0.18} />
      </Svg>
    </View>
  );
}


/** Dibujo común para una ciudad sin ilustración propia: su paleta con un horizonte de tejados y una brújula */
function GenericArt({ palette }: { palette: TourPalette }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.deep }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 180" preserveAspectRatio="xMidYMax slice">
        <Path d="M0 150 H360" stroke={palette.t2} strokeWidth={2} />
        <Path d="M30 150 V120 h26 V150 M56 150 V100 l18 -14 l18 14 V150 M92 150 V126 h22 V150 M150 150 V110 h8 V92 h12 V110 h8 V150 M230 150 V118 h30 V150 M260 150 V96 l16 -12 l16 12 V150" fill="none" stroke={neutral.white} strokeOpacity={0.85} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M300 50 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0 M300 36 L304 50 L300 64 L296 50 Z" fill="none" stroke={palette.t2} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** Dibujo de portada de una ciudad según su id; las que no tienen el suyo usan el común */
const ART: Partial<Record<CityId, (p: { palette: TourPalette }) => ReactElement>> = { madrid: MadridArt };

export function CityArt({ id, palette }: { id: string; palette: TourPalette }) {
  const Art = ART[id as CityId];
  return Art ? <Art palette={palette} /> : <GenericArt palette={palette} />;
}
