import Svg, { Circle, Path } from 'react-native-svg';
import { brand, neutral } from '@/theme/tokens';

/**
 * Emblema de Paseo: una brújula sobre un camino de paradas. Por defecto, para
 * fondo oscuro (bienvenida); en claro se pasan `ring` y `needle` oscuros.
 */
export function Compass({ size = 112, ring = brand.sun, needle = neutral.white }: { size?: number; ring?: string; needle?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={50} cy={50} r={46} fill="none" stroke={ring} strokeWidth={3} />
      <Circle cx={50} cy={50} r={39} fill="none" stroke={ring} strokeWidth={1.2} strokeDasharray="2 4" />
      <Path d="M50 16 L57 50 L50 84 L43 50 Z" fill="none" stroke={needle} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M50 16 L57 50 L43 50 Z" fill={brand.coral} />
      <Path d="M16 50 L50 44 L84 50 L50 56 Z" fill="none" stroke={needle} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}
