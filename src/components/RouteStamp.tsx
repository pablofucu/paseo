import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { LockedTour, Tour } from '@/data/types';
import { font } from '@/theme/fonts';
import { brand, neutral } from '@/theme/tokens';

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

/**
 * El sello de cada ruta en blanco y negro (scripts/shrink-assets.py), para los
 * que aún no se han conseguido o no se han comprado. Horneado y no con `filter`,
 * que en iOS y en Android antiguos no pinta el gris.
 */
export const ROUTE_STAMP_GRAY: Record<string, ImageSourcePropType> = {
  'tomares-4-paradas': require('../../assets/route-stamps/gray/tomares-4-paradas.png'),
  'sevilla-centro': require('../../assets/route-stamps/gray/sevilla-centro.png'),
  'sevilla-arenal': require('../../assets/route-stamps/gray/sevilla-arenal.png'),
  triana: require('../../assets/route-stamps/gray/triana.png'),
  murillo: require('../../assets/route-stamps/gray/murillo.png'),
  austrias: require('../../assets/route-stamps/gray/austrias.png'),
  letras: require('../../assets/route-stamps/gray/letras.png'),
  'retiro-prado': require('../../assets/route-stamps/gray/retiro-prado.png'),
};

/** Dibujo del sello en gris; si una ruta nueva aún no tiene el suyo horneado, el de color desvaído */
function GrayArt({ id, art, label }: { id: string; art: ImageSourcePropType; label: string }) {
  const gray = ROUTE_STAMP_GRAY[id];
  return (
    <>
      <Image source={gray ?? art} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={label} />
      {!gray && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(251,246,236,0.6)' }]} />}
    </>
  );
}

export function Lock({ size, color = '#B9B0A2' }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} fill={color} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Disco oscuro con el candado en amarillo sol: «todavía no es tuyo» */
export function LockDisc({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: neutral.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Lock size={size * 0.58} color={brand.sun} />
    </View>
  );
}

interface Props {
  /** Sin tour: sello en blanco con candado (tour de pago, todavía sin ilustración) */
  tour?: Tour;
  /** Tour de pago bloqueado: su sello en blanco y negro con el candado si ya está dibujado (`stamp`); si no, solo el candado */
  locked?: LockedTour;
  /** Sellos puestos / paradas */
  done?: number;
  total?: number;
  /** Alto del sello; el ancho sale de la proporción 0,82 */
  height: number;
  rotate?: number;
  /** Sin conseguir: insignia de candado en la esquina (en lugar de la de en medio, en los de pago) */
  lockBadge?: boolean;
  style?: ViewStyle;
}

/**
 * Sello de una ruta: un sello de correos dentado con su dibujo exclusivo
 * (`tour.stamp`), que simboliza la ruta entera. No es un trozo de la postal.
 * Sin conseguir (o sin comprar, con candado) se ve en blanco y negro; al
 * completarla, a todo color y limpio (sin matasellos encima).
 */
export function RouteStamp({ tour, locked, done = 0, total = 1, height: h, rotate = 0, lockBadge, style }: Props) {
  const w = Math.round(h * 0.82);
  const r = Math.max(1.6, h / 22);
  const pad = r + Math.max(1.5, h / 26);
  const completed = !!tour && done >= total;
  const iw = w - pad * 2, ih = h - pad * 2;

  return (
    <View style={[{ width: w, height: h, transform: [{ rotate: `${rotate}deg` }] }, s.shadow, style]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={perforated(w, h, r)} fill="#fff" />
      </Svg>
      <View style={[s.inner, { left: pad, top: pad, width: iw, height: ih }, !tour && !locked?.stamp && s.blank]}>
        {tour ? (
          <>
            {completed
              ? <Image source={tour.stamp.art} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Sello de la ruta ${tour.title}`} />
              : <GrayArt id={tour.id} art={tour.stamp.art} label={`Sello de la ruta ${tour.title}, sin conseguir`} />}
            {!completed && done > 0 && h >= 44 && <Text style={[s.count, { fontSize: h / 6 }]}>{done}/{total}</Text>}
          </>
        ) : locked?.stamp ? (
          <>
            <GrayArt id={locked.id} art={locked.stamp.art} label={`Sello de la ruta ${locked.title}, bloqueado`} />
            {!lockBadge && <View style={s.center}>
              <View style={[s.lockBadge, { width: h * 0.36, height: h * 0.36, borderRadius: h * 0.18 }]}><Lock size={h * 0.24} color={neutral.ink} /></View>
            </View>}
          </>
        ) : (
          <Lock size={h * 0.32} />
        )}
      </View>
      {lockBadge && !completed && (
        <View style={{ position: 'absolute', right: -h * 0.06, bottom: -h * 0.04 }}><LockDisc size={Math.max(14, h * 0.28)} /></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  shadow: { shadowColor: '#1C1A17', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  inner: { position: 'absolute', overflow: 'hidden' },
  blank: { backgroundColor: neutral.paper, borderWidth: 1.2, borderStyle: 'dashed', borderColor: '#CFC6B8', alignItems: 'center', justifyContent: 'center' },
  // Candado sobre un círculo de papel, para que se lea encima del dibujo en gris
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { backgroundColor: 'rgba(251,246,236,0.92)', alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 2, bottom: 1, fontFamily: font.black, color: neutral.ink, textShadowColor: 'rgba(255,255,255,0.9)', textShadowRadius: 3 },
});
