import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { PAPEL } from '@/lib/ink';

/** Ondas finas de guilloche: el fondo de seguridad del papel */
function guilloche(width: number, height: number) {
  const out: string[] = [];
  const rows = Math.round(height / 22);
  for (let k = 0; k < rows; k++) {
    const y0 = (height / rows) * k + 8;
    let d = `M0 ${y0.toFixed(1)}`;
    for (let x = 0; x <= width + 6; x += 6) {
      const y = y0 + Math.sin(x / 17 + k * 0.7) * 4 + Math.sin(x / 43 + k) * 2.5;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    out.push(d);
  }
  return out.join(' ');
}

/**
 * Papel de las hojas del pasaporte (#f1ead6): guilloche fino, viñeteado ocre
 * y sombra del lomo en el lado interior.
 */
export function PassportPaper({ width, height, spine = 'left', back }: { width: number; height: number; spine?: 'left' | 'right'; back?: boolean }) {
  const waves = useMemo(() => guilloche(width, height), [width, height]);
  const left = spine === 'left';
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="vig" cx="50%" cy="48%" r="72%">
          <Stop offset="0.55" stopColor="#b8893a" stopOpacity="0" />
          <Stop offset="1" stopColor="#b8893a" stopOpacity="0.32" />
        </RadialGradient>
        <LinearGradient id={`spine-${spine}`} x1={left ? '0' : '1'} y1="0" x2={left ? '1' : '0'} y2="0">
          <Stop offset="0" stopColor="#5a4320" stopOpacity="0.32" />
          <Stop offset="0.07" stopColor="#5a4320" stopOpacity="0.1" />
          <Stop offset="0.16" stopColor="#5a4320" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill={PAPEL} />
      {!back && <Path d={waves} stroke="#9b8a62" strokeWidth={0.6} fill="none" opacity={0.28} />}
      <Rect width={width} height={height} fill="url(#vig)" />
      <Rect width={width} height={height} fill={`url(#spine-${spine})`} />
    </Svg>
  );
}
