import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { RubberStamp } from '@/components/RubberStamp';
import { RouteSheet } from '@/components/passport/RouteSheet';
import type { Tour } from '@/data/types';
import { randomSpot, settle, stampRotation } from '@/lib/placement';
import { syncReminders } from '@/lib/reminders';
import { placedBoxes, sheetFor, stampBox, stampInk } from '@/lib/sheet';
import { knownRoutes, newSeed, routeProgress, usePassport, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

/** El sello en la mano se ve un poco por encima del dedo para que el dedo no lo tape */
const LIFT = 36;
/** Un toque suelto no sella: hace falta arrastrar al menos 6 px durante 150 ms */
const MIN_DRAG = 6;
const MIN_HOLD = 150;

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
 * La hoja de la ruta con el sello «en la mano»: una vista previa translúcida
 * (35 % de opacidad) que sigue al dedo. Al soltar tras arrastrar, el sello cae justo ahí
 * (con los límites de la guía, sin pisar otro sello) y ya no se puede mover; un toque suelto lo deja en la mano con «Sellar aquí». «Colócalo tú» busca un hueco libre al azar.
 */
export function StampPlacer({ tour, width, target, pageNumber, onDrop, onStamped, tone = 'dark' }: Props) {
  const route = useRoute(tour.id);
  const placeStamp = usePassport(s => s.placeStamp);
  const sheet = sheetFor(width);
  const stop = tour.stops.find(s => s.id === target)!;
  const box = stampBox(stop.rubber.shape, width, tour.stops.length);
  const ink = stampInk(stop.rubber.shape, width, tour.stops.length);
  const [fresh, setFresh] = useState<string | null>(null);
  /** Ruta recién completada con este sello: golpe más fuerte y polvo de tinta */
  const [final, setFinal] = useState(false);
  /** Sello «en la mano» tras un toque suelto: espera a «Sellar aquí» */
  const [hand, setHand] = useState<{ x: number; y: number } | null>(null);
  const done = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previewDate = useMemo(() => new Date().toISOString(), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const gx = useSharedValue(width / 2);
  const gy = useSharedValue(sheet.top + (sheet.h - sheet.top - sheet.bottom) / 2);
  const held = useSharedValue(0);
  const inHand = useSharedValue(0);
  // Datos del gesto en curso, en el hilo de UI
  const startX = useSharedValue(0), startY = useSharedValue(0), startT = useSharedValue(0), travel = useSharedValue(0);

  const others = () =>
    placedBoxes((route?.stamps ?? []).map(st => ({ ...st, shape: tour.stops.find(t => t.id === st.stopId)?.rubber.shape ?? 'circle' })), sheet, tour.stops.length);

  const stampAt = (spot: { x: number; y: number }) => {
    if (done.current) return;
    done.current = true;
    onDrop?.();
    placeStamp(tour.id, target, { x: spot.x / sheet.w, y: spot.y / sheet.h, rot: stampRotation(Math.random), seed: newSeed() });
    const st = usePassport.getState();
    setFinal(routeProgress(tour.id, st.routes[tour.id]).completed);
    setHand(null);
    setFresh(target);
    timer.current = setTimeout(() => onStamped?.(), 300);
    // Primer sello: se pide permiso para los avisos (un poco después, con el sello ya asentado)
    setTimeout(() => syncReminders(knownRoutes(st.passport.pageOrder), st.routes, true), 1800);
  };

  // Nunca encima de otro sello: se aparta al hueco libre más cercano
  const release = (x: number, y: number) => stampAt(settle(x, y, ink.w, ink.h, others(), sheet));
  const auto = () => stampAt(randomSpot(ink.w, ink.h, others(), sheet, Math.random));
  const keep = (x: number, y: number) => { if (!done.current) setHand({ x, y }); };
  const clearHand = () => setHand(null);

  // Un arrastre de verdad: al menos 6 px y 150 ms. Un toque suelto no sella: deja el sello en la mano
  const pan = usePanGesture({
    minDistance: 0,
    onBegin: e => {
      'worklet';
      startX.set(e.x); startY.set(e.y); startT.set(Date.now()); travel.set(0);
      if (inHand.get()) { inHand.set(0); scheduleOnRN(clearHand); }
      gx.set(e.x); gy.set(e.y - LIFT);
      held.set(withTiming(1, { duration: 120 }));
    },
    onUpdate: e => {
      'worklet';
      gx.set(e.x); gy.set(e.y - LIFT);
      travel.set(Math.max(travel.get(), Math.hypot(e.x - startX.get(), e.y - startY.get())));
    },
    onFinalize: e => {
      'worklet';
      held.set(withTiming(0, { duration: 120 }));
      if (e.canceled) return;
      if (travel.get() >= MIN_DRAG && Date.now() - startT.get() >= MIN_HOLD) scheduleOnRN(release, e.x, e.y - LIFT);
      else { inHand.set(withTiming(1, { duration: 120 })); scheduleOnRN(keep, e.x, e.y - LIFT); }
    },
  });

  const ghost = useAnimatedStyle(() => ({
    opacity: fresh ? 0 : 0.35 + inHand.get() * 0.4,
    transform: [{ translateX: gx.get() - box.w / 2 }, { translateY: gy.get() - box.h / 2 }, { scale: 1 + held.get() * 0.04 }],
  }));

  const prog = routeProgress(tour.id, route);
  const light = tone === 'light';
  const hintColor = light ? 'rgba(28,26,23,0.7)' : 'rgba(255,255,255,0.85)';
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <GestureDetector gesture={pan}>
        <View>
          <RouteSheet tour={tour} route={route} width={width} pageNumber={pageNumber} fresh={fresh} heavy={final}>
            {!fresh && (
              <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h }, ghost]}>
                <RubberStamp tour={tour} stop={stop} date={previewDate} width={box.w} height={box.h} />
              </Animated.View>
            )}
          </RouteSheet>
        </View>
      </GestureDetector>
      {fresh ? (
        <Text style={[s.hint, { color: hintColor, textAlign: 'center' }]}>
          {prog.allStamped ? '¡Ruta completada! Has ganado la postal' : `Sello ${prog.done} de ${prog.total}`}
        </Text>
      ) : hand ? (
        <View style={s.row}>
          <Text style={[s.hint, { color: hintColor }]}>Arrastra para moverlo y suéltalo, o séllalo aquí</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Sellar aquí" onPress={() => release(hand.x, hand.y)} style={[s.auto, s.confirm, { backgroundColor: light ? '#1c1a17' : '#fff' }]}>
            <Text style={[s.autoText, { color: light ? '#fff' : '#1c1a17' }]}>Sellar aquí</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.row}>
          <Text style={[s.hint, { color: hintColor }]}>Arrastra el sello y suéltalo donde quieras</Text>
          <Pressable accessibilityRole="button" onPress={auto} style={[s.auto, { borderColor: light ? 'rgba(28,26,23,0.25)' : 'rgba(255,255,255,0.5)' }]}>
            <Text style={[s.autoText, { color: light ? '#1c1a17' : '#fff' }]}>Colócalo tú</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  hint: { flex: 1, fontFamily: font.bold, fontSize: 13.5, lineHeight: 18 },
  auto: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, height: 38, justifyContent: 'center' },
  confirm: { borderWidth: 0 },
  autoText: { fontFamily: font.black, fontSize: 13.5 },
});
