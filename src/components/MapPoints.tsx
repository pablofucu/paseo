import { Marker } from '@maplibre/maplibre-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { DUR, EASE_OUT, PressableScale } from '@/components/motion';
import { POINT_ICON, POINTS, type MapPoint } from '@/data/points';
import type { LngLat } from '@/data/types';
import { distance, formatDistance } from '@/lib/geo';
import { LEAVE, nearbyPoint } from '@/lib/points';
import { font } from '@/theme/fonts';
import { shadow, type TourPalette } from '@/theme/tokens';

/*
 * Puntos marcados del mapa (src/data/points.ts), los mismos en todas las rutas.
 * Cada uno es un punto pequeño junto a la calle. Al acercarte, el punto se
 * abre en la foto redonda del sitio con su nombre debajo, y al dejarlo atrás
 * se vuelve a cerrar. Tocarlo también lo abre y lo cierra.
 */

const DOT = 16;
const ROUND = 74;
const BOX_W = 180;
const BOX_H = ROUND + 40 + DOT;

/** Muelle con un pelín de rebote: la foto se pasa un poco de tamaño y se posa */
const OPEN = { damping: 13, stiffness: 300, mass: 0.8 } as const;

export function MapPoints({ position, palette }: { position: LngLat | null; palette: TourPalette }) {
  const [near, setNear] = useState<string | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
  const dismissed = useRef(new Set<string>());

  useEffect(() => {
    if (!position) return;
    // Los cerrados a mano vuelven a poder abrirse cuando te has alejado
    for (const id of dismissed.current) {
      const pt = POINTS.find(x => x.id === id);
      if (!pt || distance(position, pt.coord) >= LEAVE) dismissed.current.delete(id);
    }
    const next = nearbyPoint(POINTS, position, near, dismissed.current);
    if (next === near) return;
    setNear(next);
    if (next) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [position, near]);

  const open = tapped ?? near;
  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (open === id) {
      setTapped(null);
      if (near === id) { dismissed.current.add(id); setNear(null); }
    } else {
      setTapped(id);
    }
  };

  return POINTS.map((pt, i) => (
    <Marker key={pt.id} id={`point-${pt.id}`} lngLat={pt.coord} anchor="bottom">
      <PointPin
        point={pt}
        index={i}
        open={open === pt.id}
        meters={position && open === pt.id ? distance(position, pt.coord) : null}
        palette={palette}
        onPress={() => toggle(pt.id)}
      />
    </Marker>
  ));
}

interface PointPinProps {
  point: MapPoint;
  index: number;
  open: boolean;
  /** Distancia a ti, si está abierto */
  meters: number | null;
  palette: TourPalette;
  onPress: () => void;
}

/**
 * Punto que se abre en foto. La caja tiene siempre el mismo tamaño y se ancla
 * por abajo, así el punto no se mueve en el mapa al abrirse.
 */
function PointPin({ point, index, open, meters, palette: p, onPress }: PointPinProps) {
  const reduced = useReducedMotion();
  const appear = useSharedValue(reduced ? 1 : 0);
  const o = useSharedValue(0);

  // Los puntos aparecen con un fundido después de las paradas
  useEffect(() => {
    if (reduced) return;
    appear.set(withDelay(700 + index * 90, withTiming(1, { duration: DUR.slow, easing: EASE_OUT })));
  }, [appear, index, reduced]);

  useEffect(() => {
    if (reduced) o.set(withTiming(open ? 1 : 0, { duration: DUR.fast }));
    else o.set(open ? withSpring(1, OPEN) : withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }));
  }, [open, reduced, o]);

  const dot = useAnimatedStyle(() => ({ opacity: appear.value, transform: [{ scale: appear.value * (1 + Math.min(1, o.value) * 0.25) }] }));
  const bubble = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, o.value) * 2.5), transform: [{ scale: Math.max(0, o.value) }] }));

  return (
    <View style={s.box} pointerEvents="box-none">
      <Animated.View style={[s.bubble, bubble]} pointerEvents={open ? 'auto' : 'none'}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Cerrar ${point.name}`} onPress={onPress} scaleTo={0.95} style={s.bubbleIn}>
          <View style={[s.round, { backgroundColor: p.soft }]}>
            {point.photo
              ? <Image source={point.photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={DUR.fast} />
              : <Text style={s.roundIcon}>{POINT_ICON[point.kind]}</Text>}
          </View>
          <View style={[s.tag, { backgroundColor: p.deep }]}>
            <Text style={s.tagName} numberOfLines={1}>{point.name}</Text>
            {meters != null && <Text style={[s.tagDist, { color: p.t2 }]}>{formatDistance(Math.max(5, Math.round(meters / 5) * 5))}</Text>}
          </View>
        </PressableScale>
      </Animated.View>
      <PressableScale accessibilityRole="button" accessibilityLabel={point.name} onPress={onPress} hitSlop={14} scaleTo={0.85}>
        <Animated.View style={[s.dot, { backgroundColor: p.t2 }, dot]} />
      </PressableScale>
    </View>
  );
}

const s = StyleSheet.create({
  box: { width: BOX_W, height: BOX_H, alignItems: 'center', justifyContent: 'flex-end' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 3, borderColor: '#fff', ...shadow[2] },
  bubble: { position: 'absolute', bottom: DOT + 4, width: BOX_W, alignItems: 'center', transformOrigin: 'bottom' },
  bubbleIn: { alignItems: 'center', gap: 6 },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, borderWidth: 4, borderColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...shadow[3] },
  roundIcon: { fontSize: 30 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: BOX_W, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, ...shadow[2] },
  tagName: { flexShrink: 1, fontFamily: font.black, fontSize: 12, color: '#fff' },
  tagDist: { fontFamily: font.black, fontSize: 12 },
});
