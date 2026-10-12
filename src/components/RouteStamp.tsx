import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { Tour } from '@/data/types';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';

/** Proporción de la ilustración de la postal (832 × 444) */
const ART = 832 / 444;

/**
 * Borde dentado de sello de correos como un solo trazado (sin máscaras SVG,
 * que en el móvil cerraban la app): cada diente es un semicírculo hacia dentro.
 */
function perforated(w: number, h: number, r: number) {
  const holes = (len: number) => Math.max(2, Math.round(len / (r * 3.2)));
  let d = 'M0 0';
  const edge = (len: number, at: (t: number) => [number, number], end: [number, number]) => {
    const n = holes(len);
    for (let i = 0; i < n; i++) {
      const c = ((i + 0.5) * len) / n;
      const [ax, ay] = at(c - r);
      const [bx, by] = at(c + r);
      d += ` L${ax} ${ay} A${r} ${r} 0 0 0 ${bx} ${by}`;
    }
    d += ` L${end[0]} ${end[1]}`;
  };
  edge(w, t => [t, 0], [w, 0]);
  edge(h, t => [w, t], [w, h]);
  edge(w, t => [w - t, h], [0, h]);
  edge(h, t => [0, h - t], [0, 0]);
  return d + ' Z';
}

/** Matasellos: un círculo y tres ondas, como el de las postales */
function Postmark({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w * 1.25} height={h * 0.62} viewBox="0 0 60 30" style={{ position: 'absolute', left: -w * 0.32, top: h * 0.2 }} pointerEvents="none">
      <G fill="none" stroke={neutral.ink} strokeOpacity={0.82} strokeWidth={2.2}>
        <Circle cx={20} cy={15} r={11} />
        <Path d="M34 7c5 3 9-3 14 0s9-3 14 0M34 15c5 3 9-3 14 0s9-3 14 0M34 23c5 3 9-3 14 0s9-3 14 0" />
      </G>
    </Svg>
  );
}

function Lock({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} fill="#B9B0A2" />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#B9B0A2" strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

interface Props {
  /** Sin tour: sello en blanco con candado (tour de pago, todavía sin ilustración) */
  tour?: Tour;
  /** Sellos puestos / paradas */
  done?: number;
  total?: number;
  /** Alto del sello; el ancho sale de la proporción 0,82 */
  height: number;
  rotate?: number;
  style?: ViewStyle;
}

/**
 * Sello de una ruta: un sello de correos dentado con un recorte de la
 * ilustración de su postal (su sitio más reconocible). A medias se ve
 * desvaído; al completarla, a todo color y con el matasellos encima.
 */
export function RouteStamp({ tour, done = 0, total = 1, height: h, rotate = 0, style }: Props) {
  const w = Math.round(h * 0.82);
  const r = Math.max(1.6, h / 22);
  const pad = r + Math.max(1.5, h / 26);
  const completed = !!tour && done >= total;
  const iw = w - pad * 2, ih = h - pad * 2;
  // La ilustración, ampliada y centrada en el sitio del sello
  const zoom = 1.7;
  const artH = ih * zoom, artW = artH * ART;
  const focus = tour?.postcard.stampFocus ?? { x: 0.5, y: 0.5 };
  const left = Math.min(0, Math.max(iw - artW, iw / 2 - focus.x * artW));
  const top = Math.min(0, Math.max(ih - artH, ih / 2 - focus.y * artH));

  return (
    <View style={[{ width: w, height: h, transform: [{ rotate: `${rotate}deg` }] }, s.shadow, style]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={perforated(w, h, r)} fill="#fff" />
      </Svg>
      <View style={[s.inner, { left: pad, top: pad, width: iw, height: ih }, !tour && s.blank]}>
        {tour ? (
          <>
            <Image source={tour.postcard.art} style={{ position: 'absolute', left, top, width: artW, height: artH }} contentFit="fill" />
            {!completed && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(251,246,236,0.5)' }]} />}
            {!completed && done > 0 && h >= 44 && <Text style={[s.count, { fontSize: h / 6 }]}>{done}/{total}</Text>}
          </>
        ) : (
          <Lock size={h * 0.32} />
        )}
      </View>
      {completed && <Postmark w={w} h={h} />}
    </View>
  );
}

const s = StyleSheet.create({
  shadow: { shadowColor: '#1C1A17', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  inner: { position: 'absolute', overflow: 'hidden' },
  blank: { backgroundColor: neutral.paper, borderWidth: 1.2, borderStyle: 'dashed', borderColor: '#CFC6B8', alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 2, bottom: 1, fontFamily: font.black, color: neutral.ink, textShadowColor: 'rgba(255,255,255,0.9)', textShadowRadius: 3 },
});
