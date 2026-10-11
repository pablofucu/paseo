import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { pageTurn } from '@/lib/feedback';
import { sheetFor } from '@/lib/sheet';
import { font } from '@/theme/fonts';

/** Pasar hoja: rotateY 0 → −180° sobre el lomo en 750 ms con cubic-bezier(.3, .7, .2, 1) */
const TURN_MS = 750;
const EASE = Easing.bezier(0.3, 0.7, 0.2, 1);

export interface Leaf {
  key: string;
  front: ReactNode;
  back: ReactNode;
}

interface Props {
  leaves: Leaf[];
  /** Ancho de una hoja */
  width: number;
  /** Doble página (pantallas anchas): el reverso de la hoja anterior a la izquierda */
  spread?: boolean;
  index: number;
  onIndex: (i: number) => void;
}

/**
 * El pasaporte como libreta: las hojas giran sobre el borde izquierdo. Se
 * pasan arrastrando con el dedo (más del 30 % del ancho o soltando con
 * velocidad > 0,5 px/ms) o con los botones. Cada hoja tiene reverso de papel
 * y una sombra recorre la cara mientras gira.
 */
export function Book({ leaves, width, spread, index, onIndex }: Props) {
  const height = sheetFor(width).h;
  const reduced = useReducedMotion();
  const deg = useSharedValue(0);
  const [turning, setTurning] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const turningSV = useSharedValue(-1);

  const begin = (i: number, dir: 1 | -1) => {
    turningSV.value = i;
    setTurning({ i, dir });
  };
  const finish = (i: number, dir: 1 | -1, complete: boolean) => {
    const target = dir === 1 ? (complete ? -180 : 0) : complete ? 0 : -180;
    const remaining = Math.abs(target - deg.value) / 180;
    if (complete) pageTurn();
    const ms = reduced ? 0 : Math.max(120, TURN_MS * remaining);
    deg.value = withTiming(target, { duration: ms, easing: EASE });
    setTimeout(() => {
      if (complete) onIndex(dir === 1 ? i + 1 : i);
      turningSV.value = -1;
      setTurning(null);
    }, ms + 16);
  };

  const flip = (dir: 1 | -1) => {
    if (turning) return;
    if (dir === 1 && index >= leaves.length - 1) return;
    if (dir === -1 && index <= 0) return;
    const i = dir === 1 ? index : index - 1;
    deg.value = dir === 1 ? 0 : -180;
    begin(i, dir);
    finish(i, dir, true);
  };

  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-12, 12],
    failOffsetY: [-24, 24],
    onActivate: e => {
      if (turning) return;
      const dir = e.translationX < 0 ? 1 : -1;
      if ((dir === 1 && index >= leaves.length - 1) || (dir === -1 && index <= 0)) return;
      const i = dir === 1 ? index : index - 1;
      deg.value = dir === 1 ? 0 : -180;
      begin(i, dir);
    },
    onUpdate: e => {
      const t = turningSV.value;
      if (t < 0) return;
      const p = Math.min(1, Math.max(0, Math.abs(e.translationX) / width));
      deg.value = t === index ? -180 * p : -180 * (1 - p);
    },
    onDeactivate: e => {
      const t = turningSV.value;
      if (t < 0) return;
      const dir: 1 | -1 = t === index ? 1 : -1;
      const p = Math.abs(e.translationX) / width;
      const fast = Math.abs(e.velocityX) / 1000 > 0.5 && Math.sign(e.velocityX) === -dir;
      finish(t, dir, p > 0.3 || fast);
    },
  });

  // Solo se montan las hojas que se pueden ver: la anterior, la actual y la siguiente
  const visible = leaves.map((l, i) => ({ l, i })).filter(({ i }) => i >= index - (spread ? 2 : 1) && i <= index + 1);

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <GestureDetector gesture={pan}>
        <View style={{ width: spread ? width * 2 : width, height, overflow: spread ? 'visible' : 'hidden' }}>
          {visible.map(({ l, i }) => {
            const flipped = i < index;
            const isTurning = turning?.i === i;
            const z = isTurning ? 1000 : flipped ? i : 500 - i;
            return (
              <Page key={l.key} i={i} deg={deg} turning={turningSV} flipped={flipped} width={width} height={height} left={spread ? width : 0} z={z} back={l.back}>
                {l.front}
              </Page>
            );
          })}
        </View>
      </GestureDetector>
      <View style={s.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hoja anterior" disabled={index === 0} onPress={() => flip(-1)} style={[s.navBtn, index === 0 && { opacity: 0.35 }]}>
          <Text style={s.navText}>‹ Anterior</Text>
        </Pressable>
        <Text style={s.navCount}>{index + 1} / {leaves.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Hoja siguiente" disabled={index >= leaves.length - 1} onPress={() => flip(1)} style={[s.navBtn, index >= leaves.length - 1 && { opacity: 0.35 }]}>
          <Text style={s.navText}>{index === 0 ? 'Abrir ›' : 'Siguiente ›'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface PageProps {
  i: number;
  deg: SharedValue<number>;
  turning: SharedValue<number>;
  flipped: boolean;
  width: number;
  height: number;
  left: number;
  z: number;
  back: ReactNode;
  children: ReactNode;
}

function Page({ i, deg, turning, flipped, width, height, left, z, back, children }: PageProps) {
  const angle = () => {
    'worklet';
    return turning.value === i ? deg.value : flipped ? -180 : 0;
  };
  const leaf = useAnimatedStyle(() => ({
    transform: [{ perspective: 1600 }, { rotateY: `${angle()}deg` }],
  }));
  const front = useAnimatedStyle(() => ({ opacity: angle() > -90 ? 1 : 0 }));
  const rear = useAnimatedStyle(() => ({ opacity: angle() > -90 ? 0 : 1 }));
  // Sombra que recorre la cara mientras gira
  const shade = useAnimatedStyle(() => ({ opacity: turning.value === i ? Math.sin((-angle() * Math.PI) / 180) * 0.9 : 0 }));
  const shadeBack = useAnimatedStyle(() => ({ opacity: turning.value === i ? interpolate(-angle(), [90, 180], [0.7, 0]) : 0 }));
  return (
    <Animated.View style={[{ position: 'absolute', left, top: 0, width, height, zIndex: z, transformOrigin: 'left center' }, leaf]}>
      <Animated.View style={[StyleSheet.absoluteFill, front]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.shade, shade]} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleX: -1 }] }, rear]}>
        {back}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.shadeBack, shadeBack]} />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  shade: { experimental_backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0) 40%)', borderRadius: 6 },
  shadeBack: { experimental_backgroundImage: 'linear-gradient(270deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 50%)', borderRadius: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navBtn: { height: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(28,26,23,0.06)' },
  navText: { fontFamily: font.black, fontSize: 14, color: '#1c1a17' },
  navCount: { fontFamily: font.heavy, fontSize: 13, color: '#7d705a', fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'center' },
});
