import { Marker } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from '@/components/motion';
import { POINT_ICON, POINTS, type MapPoint } from '@/data/points';
import type { LngLat } from '@/data/types';
import { distance } from '@/lib/geo';
import { font } from '@/theme/fonts';
import { neutral, shadow, type TourPalette } from '@/theme/tokens';

/*
 * Puntos marcados del mapa (src/data/points.ts), los mismos en todas las rutas.
 * Aquí sí hay rebote a propósito: el pin cae y se aplasta al tocar el suelo, y
 * la burbuja salta desde el pin con un muelle que se pasa y vuelve. Al pasar
 * cerca de un punto, su burbuja salta sola una vez.
 */

/** A esta distancia (m) la burbuja salta sola */
const NEAR = 45;
/** La burbuja que saltó sola se cierra pasado este tiempo si no la tocas */
const AUTO_CLOSE_MS = 7000;
const PIN = 38;
const BUBBLE_W = 230;
const BUBBLE_H = 104;

/** Muelle juguetón: se pasa un poco y vuelve */
const POP = { damping: 9, stiffness: 340, mass: 0.7 } as const;

export function MapPoints({ position, palette }: { position: LngLat | null; palette: TourPalette }) {
  const [open, setOpen] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const seen = useRef(new Set<string>());

  // Al pasar cerca de un punto que aún no ha saltado, salta solo
  useEffect(() => {
    if (!position) return;
    const near = POINTS.find(pt => !seen.current.has(pt.id) && distance(position, pt.coord) < NEAR);
    if (!near) return;
    seen.current.add(near.id);
    setOpen(near.id);
    setAuto(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [position]);

  useEffect(() => {
    if (!open || !auto) return;
    const id = setTimeout(() => setOpen(null), AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [open, auto]);

  const toggle = (id: string) => {
    seen.current.add(id);
    setAuto(false);
    setOpen(v => (v === id ? null : id));
    Haptics.selectionAsync().catch(() => {});
  };

  return POINTS.map((pt, i) => (
    <Marker key={pt.id} id={`point-${pt.id}`} lngLat={pt.coord} anchor="bottom">
      <PointPin point={pt} index={i} open={open === pt.id} palette={palette} onPress={() => toggle(pt.id)} />
    </Marker>
  ));
}

interface PointPinProps {
  point: MapPoint;
  index: number;
  open: boolean;
  palette: TourPalette;
  onPress: () => void;
}

/** Pin con su burbuja encima. La caja tiene siempre el mismo tamaño para que el pin no se mueva al abrirla. */
function PointPin({ point, index, open, palette: p, onPress }: PointPinProps) {
  const reduced = useReducedMotion();
  const drop = useSharedValue(reduced ? 1 : 0);
  const squash = useSharedValue(0);
  const bubble = useSharedValue(0);

  // Entrada: cae desde arriba con muelle, después de las paradas
  useEffect(() => {
    if (reduced) return;
    drop.set(withDelay(700 + index * 110, withSpring(1, POP)));
  }, [drop, index, reduced]);

  // Al abrirse: el pin se aplasta y estira, y la burbuja salta desde él
  useEffect(() => {
    if (reduced) { bubble.set(open ? 1 : 0); return; }
    if (open) {
      squash.set(withSequence(withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 6, stiffness: 420 })));
      bubble.set(withSpring(1, POP));
    } else {
      bubble.set(withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }));
    }
  }, [open, reduced, bubble, squash]);

  const pinStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 3),
    transform: [
      { translateY: (1 - drop.value) * -26 },
      { scaleX: drop.value * (1 + squash.value * 0.22) },
      { scaleY: drop.value * (1 - squash.value * 0.2) },
    ],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, bubble.value * 2.5),
    transform: [{ translateY: (1 - bubble.value) * 18 }, { scale: 0.35 + bubble.value * 0.65 }, { rotate: `${(1 - bubble.value) * -6}deg` }],
  }));

  return (
    <View style={s.box} pointerEvents="box-none">
      <Animated.View style={[s.bubble, bubbleStyle]} pointerEvents={open ? 'auto' : 'none'}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Cerrar ${point.name}`} onPress={onPress} scaleTo={0.97} style={s.card}>
          <View style={s.head}>
            <Text style={s.icon}>{POINT_ICON[point.kind]}</Text>
            <Text style={[s.name, { color: p.deep }]} numberOfLines={1}>{point.name}</Text>
          </View>
          <Text style={s.text} numberOfLines={3}>{point.text}</Text>
        </PressableScale>
        <View style={s.tail} />
      </Animated.View>
      <PressableScale accessibilityRole="button" accessibilityLabel={point.name} onPress={onPress} hitSlop={10} scaleTo={0.85}>
        <Animated.View style={[s.pin, { backgroundColor: p.t2 }, pinStyle]}>
          <Text style={s.pinIcon}>{POINT_ICON[point.kind]}</Text>
        </Animated.View>
      </PressableScale>
    </View>
  );
}

const s = StyleSheet.create({
  box: { width: BUBBLE_W, height: BUBBLE_H + PIN + 10, alignItems: 'center', justifyContent: 'flex-end' },
  pin: { width: PIN, height: PIN, borderRadius: PIN / 2, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', transformOrigin: 'bottom', ...shadow[2] },
  pinIcon: { fontSize: 17 },
  bubble: { position: 'absolute', bottom: PIN + 8, width: BUBBLE_W, alignItems: 'center', transformOrigin: 'bottom' },
  card: { width: '100%', backgroundColor: neutral.surface, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, gap: 3, ...shadow[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 15 },
  name: { flex: 1, fontFamily: font.black, fontSize: 14.5 },
  text: { fontFamily: font.bold, fontSize: 12.5, lineHeight: 16.5, color: neutral.ink2 },
  tail: { width: 14, height: 14, marginTop: -8, backgroundColor: neutral.surface, transform: [{ rotate: '45deg' }] },
});
