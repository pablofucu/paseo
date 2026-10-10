import { Image } from 'expo-image';
import { useId, useMemo, useState } from 'react';
import { StyleSheet, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Svg, { Defs, FeColorMatrix, Filter, G, Image as SvgImage } from 'react-native-svg';
import { mix } from '@/lib/mapStyle';
import type { TourPalette } from '@/theme/tokens';

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

/**
 * Matriz de color para un duotono: la luminancia de la foto (con algo más de
 * contraste) se lleva del color oscuro al claro.
 */
export function duotoneMatrix(dark: string, light: string, contrast = 1.3, lift = -0.12): string {
  const d = rgb(dark), l = rgb(light);
  const rows = d.map((dc, i) => {
    const k = (l[i] - dc) * contrast;
    return [k * 0.299, k * 0.587, k * 0.114, 0, dc + (l[i] - dc) * lift];
  });
  return [...rows, [0, 0, 0, 1, 0]].flat().map(n => n.toFixed(4)).join(' ');
}

interface Props {
  source: ImageSourcePropType;
  palette: TourPalette;
  style?: ViewStyle;
  /** false: foto a color */
  duotone?: boolean;
  /** Encuadre: zoom y punto de interés (0–1) */
  zoom?: number;
  focus?: { x: number; y: number };
}

/** Foto teñida con los dos colores del tour (oscuro → claro), como en el prototipo. */
export function DuotoneImage({ source, palette, style, duotone = true, zoom = 1, focus = { x: 0.5, y: 0.5 } }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const matrix = useMemo(() => duotoneMatrix(palette.deep, mix(palette.t2, '#FFFFFF', 0.45)), [palette]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Acerca la foto hacia el punto de interés sin dejar ver los bordes
  const shift = (f: number, len: number) => {
    const max = ((zoom - 1) * len) / (2 * zoom);
    return Math.max(-max, Math.min(max, (0.5 - f) * len));
  };
  const transform = [{ scale: zoom }, { translateX: shift(focus.x, size.w) }, { translateY: shift(focus.y, size.h) }];
  return (
    <View onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={[{ overflow: 'hidden', backgroundColor: palette.deep }, style]}>
      {duotone ? (
        <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { transform }]}>
          <Defs>
            <Filter id={`d${id}`} x="0" y="0" width="100%" height="100%">
              <FeColorMatrix type="matrix" values={matrix} />
            </Filter>
          </Defs>
          <G filter={`url(#d${id})`}>
            <SvgImage href={source} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </G>
        </Svg>
      ) : (
        <Image source={source} style={[StyleSheet.absoluteFill, { transform }]} contentFit="cover" transition={200} />
      )}
    </View>
  );
}
