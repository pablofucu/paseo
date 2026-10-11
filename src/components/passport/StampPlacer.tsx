import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { RubberStamp } from '@/components/RubberStamp';
import { RouteSheet } from '@/components/passport/RouteSheet';
import type { Tour } from '@/data/types';
import { randomSpot, settle } from '@/lib/placement';
import { placedBoxes, sheetFor, stampBox, stampInk } from '@/lib/sheet';
import { newSeed, routeProgress, usePassport, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

/** El sello en la mano se ve un poco por encima del dedo para que el dedo no lo tape */
const LIFT = 36;

interface Props {
  tour: Tour;
  width: number;
  /** Parada que se sella */
  target: string;
  pageNumber: number;
  /** Se llama al soltar, justo antes de guardar el sello */
  onDrop?: () => void;
  /** Se llama en el impacto, cuando el sello ya está en la hoja */
  onStamped?: () => void;
  /** Colores del texto de ayuda y del botón (sobre fondo oscuro o claro) */
  tone?: 'dark' | 'light';
}

/**
 * La hoja de la ruta con el sello «en la mano»: una vista previa al 35 % que
 * sigue al dedo. Al soltar, el sello cae justo ahí (con los límites de la
 * guía) y ya no se puede mover. «Colócalo tú» busca un hueco libre al azar.
 */
export function StampPlacer({ tour, width, target, pageNumber, onDrop, onStamped, tone = 'dark' }: Props) {
  const route = useRoute(tour.id);
  const placeStamp = usePassport(s => s.placeStamp);
  const sheet = sheetFor(width);
  const stop = tour.stops.find(s => s.id === target)!;
  const box = stampBox(stop.rubber.shape, width);
  const ink = stampInk(stop.rubber.shape, width);
  const [fresh, setFresh] = useState<string | null>(null);
  const done = useRef(false);
  const previewDate = useMemo(() => new Date().toISOString(), []);

  const gx = useSharedValue(width / 2);
  const gy = useSharedValue(sheet.top + (sheet.h - sheet.top - sheet.bottom) / 2);
  const held = useSharedValue(0);

  const others = () =>
    placedBoxes((route?.stamps ?? []).map(st => ({ ...st, shape: tour.stops.find(t => t.id === st.stopId)!.rubber.shape })), sheet);

  const stampAt = (spot: { x: number; y: number }) => {
    if (done.current) return;
    done.current = true;
    onDrop?.();
    placeStamp(tour.id, target, { x: spot.x / sheet.w, y: spot.y / sheet.h, rot: (Math.random() * 2 - 1) * 12, seed: newSeed() });
    setFresh(target);
    setTimeout(() => onStamped?.(), 300);
  };

  // Como mucho un 35 % encima de otro sello
  const release = (x: number, y: number) => stampAt(settle(x, y, ink.w, ink.h, others(), sheet));
  const auto = () => stampAt(randomSpot(ink.w, ink.h, others(), sheet, Math.random));

  const pan = usePanGesture({
    minDistance: 0,
    runOnJS: true,
    onBegin: e => { if (done.current) return; gx.value = e.x; gy.value = e.y - LIFT; held.value = withTiming(1, { duration: 120 }); },
    onUpdate: e => { if (done.current) return; gx.value = e.x; gy.value = e.y - LIFT; },
    onFinalize: e => {
      held.value = withTiming(0, { duration: 120 });
      if (!e.canceled && !done.current) release(e.x, e.y - LIFT);
    },
  });

  const ghost = useAnimatedStyle(() => ({
    opacity: fresh ? 0 : 0.35,
    transform: [{ translateX: gx.value - box.w / 2 }, { translateY: gy.value - box.h / 2 }, { scale: 1 + held.value * 0.04 }],
  }));

  const prog = routeProgress(tour.id, route);
  const light = tone === 'light';
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <GestureDetector gesture={pan}>
        <View>
          <RouteSheet tour={tour} route={route} width={width} pageNumber={pageNumber} fresh={fresh}>
            {!fresh && (
              <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h }, ghost]}>
                <RubberStamp tour={tour} stop={stop} date={previewDate} width={box.w} height={box.h} />
              </Animated.View>
            )}
          </RouteSheet>
        </View>
      </GestureDetector>
      {!fresh ? (
        <View style={s.row}>
          <Text style={[s.hint, { color: light ? 'rgba(28,26,23,0.7)' : 'rgba(255,255,255,0.85)' }]}>
            Arrastra el sello y suéltalo donde quieras
          </Text>
          <Pressable accessibilityRole="button" onPress={auto} style={[s.auto, { borderColor: light ? 'rgba(28,26,23,0.25)' : 'rgba(255,255,255,0.5)' }]}>
            <Text style={[s.autoText, { color: light ? '#1c1a17' : '#fff' }]}>Colócalo tú</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[s.hint, { color: light ? 'rgba(28,26,23,0.7)' : 'rgba(255,255,255,0.85)', textAlign: 'center' }]}>
          {prog.allStamped ? '¡Ruta completada! Has ganado la postal' : `Sello ${prog.done} de ${prog.total}`}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  hint: { flex: 1, fontFamily: font.bold, fontSize: 13.5, lineHeight: 18 },
  auto: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, height: 38, justifyContent: 'center' },
  autoText: { fontFamily: font.black, fontSize: 13.5 },
});
