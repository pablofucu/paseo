import { useId } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Degradado suave sobre una foto para que se lea el texto (de transparente a `color`). */
export function Scrim({ color = '#000', opacity = 0.55, from = 'bottom', style }: { color?: string; opacity?: number; from?: 'bottom' | 'top'; style?: ViewStyle }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const top = from === 'top';
  return (
    <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Defs>
        <LinearGradient id={`s${id}`} x1="0" y1={top ? '1' : '0'} x2="0" y2={top ? '0' : '1'}>
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="0.45" stopColor={color} stopOpacity={opacity * 0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={opacity} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#s${id})`} />
    </Svg>
  );
}
