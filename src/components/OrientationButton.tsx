import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { PressableScale } from '@/components/motion';
import type { MapOrientation } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, radius, shadow } from '@/theme/tokens';

const LABEL: Record<MapOrientation, string> = { route: 'Ruta arriba', north: 'Norte arriba' };
/** Cuánto se ve el nombre del modo tras tocar el botón */
const LABEL_MS = 1600;

/**
 * Botón de la orientación del mapa: «ruta arriba» (el camino que sigues hacia
 * arriba) o «norte arriba». La aguja apunta siempre al norte del mapa y gira
 * con él sin repintar la pantalla (lee el giro del mapa de un valor animado).
 */
export function OrientationButton({ mode, bearing, accent, onToggle, style }: { mode: MapOrientation; bearing: SharedValue<number>; accent: string; onToggle: () => void; style?: ViewStyle }) {
  const [label, setLabel] = useState(false);
  useEffect(() => {
    if (!label) return;
    const t = setTimeout(() => setLabel(false), LABEL_MS);
    return () => clearTimeout(t);
  }, [label, mode]);
  const needle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-bearing.value}deg` }] }));
  const next: MapOrientation = mode === 'route' ? 'north' : 'route';

  return (
    <View style={[s.wrap, style]} pointerEvents="box-none">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Mapa: ${LABEL[mode].toLowerCase()}`}
        accessibilityHint={`Toca para poner ${next === 'north' ? 'el norte' : 'la ruta'} arriba`}
        onPress={() => { onToggle(); setLabel(true); }}
        hitSlop={8}
        scaleTo={0.88}
        style={[s.btn, mode === 'route' && { borderColor: accent }]}
      >
        <Animated.View style={needle}>
          <Svg width={32} height={32} viewBox="0 0 26 26">
            <SvgText x={13} y={6.6} fontSize={6.5} fontFamily={font.black} fontWeight="900" fill={brand.rose} textAnchor="middle">N</SvgText>
            <Path d="M13 8 L16.4 15 L9.6 15 Z" fill={brand.rose} />
            <Path d="M13 22 L16.4 15 L9.6 15 Z" fill={neutral.ink3} />
          </Svg>
        </Animated.View>
      </PressableScale>
      {label && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(220)} style={s.label} pointerEvents="none">
          <Text style={s.labelText}>{LABEL[mode]}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  label: { backgroundColor: 'rgba(28,26,23,0.82)', borderRadius: radius.pill, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  labelText: { fontFamily: font.black, fontSize: 12.5, color: '#fff' },
});
