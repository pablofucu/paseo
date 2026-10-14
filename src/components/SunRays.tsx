import { memo } from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { brand } from '@/theme/tokens';

/**
 * Rayos de sol estáticos detrás del sello nuevo: cuñas alternas de amarillo muy
 * suave que salen del centro y se funden con el fondo arriba y abajo.
 * Un solo trazado y un degradado (sin filtros): barato también en Android.
 */
export const SunRays = memo(function SunRays({ width, height, background, rays = 20 }: { width: number; height: number; background: string; rays?: number }) {
  const cx = width / 2, cy = height / 2, r = Math.hypot(width, height);
  const step = (Math.PI * 2) / rays;
  let d = '';
  for (let i = 0; i < rays; i++) {
    const a = i * step - Math.PI / 2;
    d += `M${cx} ${cy}L${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}L${(cx + r * Math.cos(a + step / 2)).toFixed(1)} ${(cy + r * Math.sin(a + step / 2)).toFixed(1)}Z`;
  }
  return (
    <Svg width={width} height={height} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={background} stopOpacity={1} />
          <Stop offset="0.3" stopColor={background} stopOpacity={0} />
          <Stop offset="0.7" stopColor={background} stopOpacity={0} />
          <Stop offset="1" stopColor={background} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Path d={d} fill={brand.sun} fillOpacity={0.13} />
      <Rect x={0} y={0} width={width} height={height} fill="url(#fade)" />
    </Svg>
  );
});
