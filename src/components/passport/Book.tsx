import { memo, useCallback, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { pageTurn } from '@/lib/feedback';
import { sheetFor } from '@/lib/sheet';
import { font } from '@/theme/fonts';

/** Pasar hoja con los botones: rotateY 0 → −180° sobre el lomo en 750 ms; arranca suave, se acelera y se posa */
const TURN_MS = 750;
/** Distancia de la cámara en anchos de hoja: más cerca, más se acerca el borde de la hoja al levantarse */
const DEPTH = 3;
const EASE = Easing.bezier(0.42, 0.05, 0.2, 1);
/** La pista de «se puede pasar con el dedo» se enseña una vez por sesión */
let hinted = false;

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
 *
 * Qué hoja está pasada, cuál gira y en qué orden se apilan se decide en el
 * hilo de UI (indexSV, turningSV): si dependiera del render de React, al
 * terminar un giro la hoja volvería un instante a su sitio antes de que
 * llegase el índice nuevo.
 */
export function Book({ leaves, width, spread, index, onIndex }: Props) {
  const height = sheetFor(width).h;
  const reduced = useReducedMotion();
  const deg = useSharedValue(0);
  // Hoja que gira (−1 si ninguna) y hoja abierta, en el hilo de UI
  const turningSV = useSharedValue(-1);
  const indexSV = useSharedValue(index);
  const countSV = useSharedValue(leaves.length);
  /** 1 mientras el dedo arrastra una hoja */
  const dragSV = useSharedValue(0);
  useEffect(() => { indexSV.set(index); }, [index, indexSV]);
  useEffect(() => { countSV.set(leaves.length); }, [leaves.length, countSV]);

  // Fin del giro (en JS): avisa del índice nuevo; la libreta ya lo enseña desde el hilo de UI
  const settled = useCallback((next: number) => onIndex(next), [onIndex]);

  const flip = (dir: 1 | -1) => {
    // El índice del hilo de UI ya va por delante si un giro acaba de terminar
    const idx = indexSV.value;
    if (turningSV.value >= 0) return;
    if (dir === 1 && idx >= leaves.length - 1) return;
    if (dir === -1 && idx <= 0) return;
    const i = dir === 1 ? idx : idx - 1;
    deg.set(dir === 1 ? 0 : -180);
    turningSV.set(i);
    pageTurn();
    deg.set(withTiming(dir === 1 ? -180 : 0, { duration: reduced ? 0 : TURN_MS, easing: EASE }, done => {
      'worklet';
      land(i, dir, true);
    }));
  };

  // Al posarse la hoja, el índice y la pila cambian en el mismo fotograma
  const land = (i: number, dir: number, complete: boolean) => {
    'worklet';
    if (turningSV.value !== i) return;
    const next = complete ? (dir === 1 ? i + 1 : i) : indexSV.value;
    indexSV.set(next);
    turningSV.set(-1);
    if (complete) scheduleOnRN(settled, next);
  };

  // Pista la primera vez: la esquina de la tapa se levanta un poco y vuelve
  useEffect(() => {
    if (hinted || reduced || index !== 0 || leaves.length < 2) return;
    hinted = true;
    const t = setTimeout(() => {
      if (turningSV.value >= 0) return;
      turningSV.set(0);
      deg.set(withSequence(
        withTiming(-24, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 640, easing: Easing.inOut(Easing.quad) }),
      ));
      // El aviso de fin de una animación dentro de withSequence no siempre llega: se cierra a tiempo fijo
      end = setTimeout(() => { deg.set(0); if (turningSV.value === 0) turningSV.set(-1); }, 1300);
    }, 700);
    let end: ReturnType<typeof setTimeout> | undefined;
    return () => { clearTimeout(t); clearTimeout(end); };
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-24, 24],
    onUpdate: e => {
      'worklet';
      // La dirección se decide con el primer movimiento claro (al activarse el gesto aún puede valer 0)
      if (!dragSV.value) {
        // Si una hoja está girando con los botones, el dedo espera
        if (turningSV.value >= 0 || Math.abs(e.translationX) < 8) return;
        const dir = e.translationX < 0 ? 1 : -1;
        const idx = indexSV.value;
        if ((dir === 1 && idx >= countSV.value - 1) || (dir === -1 && idx <= 0)) return;
        const i = dir === 1 ? idx : idx - 1;
        deg.set(dir === 1 ? 0 : -180);
        turningSV.set(i);
        dragSV.set(1);
      }
      const t = turningSV.value;
      // La hoja sigue al dedo; pasado el lomo, se curva un poco más deprisa
      const p = Math.min(1, Math.max(0, (t === indexSV.value ? -e.translationX : e.translationX) / width));
      const q = p < 0.5 ? p * 1.15 : 1 - (1 - p) * 0.85;
      deg.set(t === indexSV.value ? -180 * q : -180 * (1 - q));
    },
    onDeactivate: e => {
      'worklet';
      const t = turningSV.value;
      if (!dragSV.value || t < 0) return;
      dragSV.set(0);
      const dir = t === indexSV.value ? 1 : -1;
      const p = (dir === 1 ? -e.translationX : e.translationX) / width;
      const fling = (dir === 1 ? -e.velocityX : e.velocityX) / 1000;
      const complete = (p > 0.3 && fling > -0.3) || fling > 0.5;
      const target = dir === 1 ? (complete ? -180 : 0) : complete ? 0 : -180;
      if (complete) scheduleOnRN(pageTurn);
      // Al soltar, la hoja sigue con la velocidad del dedo y se asienta con un muelle
      deg.set(withSpring(target, { velocity: (e.velocityX / width) * 180, damping: 22, stiffness: 170, mass: 0.9, overshootClamping: true }, done => {
        'worklet';
        land(t, dir, complete);
      }));
    },
  });

  // Se montan la hoja actual y dos a cada lado: la siguiente ya está lista antes de girarla
  const visible = leaves.map((l, i) => ({ l, i })).filter(({ i }) => i >= index - (spread ? 3 : 2) && i <= index + 2);

  // Sombra que la hoja al girar proyecta sobre la de debajo
  const cast = useAnimatedStyle(() => {
    const a = -deg.value;
    return { opacity: turningSV.value >= 0 ? Math.sin((a * Math.PI) / 180) * 0.55 : 0 };
  });
  // Con una sola hoja en pantalla, la cámara acompaña a la que gira: la libreta se aleja
  // un poco y se desplaza hacia el lado del lomo para que se vea la hoja de pie y su vuelta
  const camera = useAnimatedStyle(() => {
    const a = !spread && turningSV.value >= 0 ? Math.sin((-deg.value * Math.PI) / 180) : 0;
    return { transform: [{ translateX: width * 0.12 * a }, { scale: 1 - a * 0.14 }] };
  });

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <GestureDetector gesture={pan}>
        {/* Sin recortar: la hoja sale del lomo hacia el espectador y sigue más allá del borde */}
        <Animated.View style={[{ width: spread ? width * 2 : width, height }, camera]}>
          {visible.map(({ l, i }) => (
            <Page key={l.key} i={i} deg={deg} turning={turningSV} index={indexSV} spread={!!spread} width={width} height={height} left={spread ? width : 0} back={l.back}>
              {l.front}
            </Page>
          ))}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: spread ? width : 0, top: 0, width, height, zIndex: 999 }, s.cast, cast]} />
        </Animated.View>
      </GestureDetector>
      <View style={s.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hoja anterior" disabled={index === 0} onPress={() => flip(-1)} style={({ pressed }) => [s.navBtn, index === 0 && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Text style={s.navText}>‹ Anterior</Text>
        </Pressable>
        <Text style={s.navCount}>{index + 1} / {leaves.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Hoja siguiente" disabled={index >= leaves.length - 1} onPress={() => flip(1)} style={({ pressed }) => [s.navBtn, index >= leaves.length - 1 && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.95 }] }]}>
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
  index: SharedValue<number>;
  spread: boolean;
  width: number;
  height: number;
  left: number;
  back: ReactNode;
  children: ReactNode;
}

const Page = memo(function Page({ i, deg, turning, index, spread, width, height, left, back, children }: PageProps) {
  const perspective = width * DEPTH;
  // Cada estilo lee los valores compartidos directamente: así Reanimated sabe de qué depende
  const leaf = useAnimatedStyle(() => {
    const t = turning.value === i;
    const flipped = i < index.value;
    const a = t ? deg.value : flipped ? -180 : 0;
    return {
      // Encima la que gira; luego las pasadas (la última arriba) y las por pasar (la siguiente arriba)
      zIndex: t ? 1000 : flipped ? i : 500 - i,
      // Con una sola hoja, las ya pasadas quedan fuera de la pantalla
      opacity: !spread && flipped && !t ? 0 : 1,
      transform: [{ perspective }, { rotateY: `${a}deg` }],
    };
  });
  const front = useAnimatedStyle(() => {
    const a = turning.value === i ? deg.value : i < index.value ? -180 : 0;
    return { opacity: a > -90 ? 1 : 0 };
  });
  const rear = useAnimatedStyle(() => {
    const a = turning.value === i ? deg.value : i < index.value ? -180 : 0;
    return { opacity: a > -90 ? 0 : 1 };
  });
  // Sombra que recorre la cara mientras gira
  const shade = useAnimatedStyle(() => ({ opacity: turning.value === i ? Math.sin((-deg.value * Math.PI) / 180) * 0.9 : 0 }));
  const shadeBack = useAnimatedStyle(() => ({ opacity: turning.value === i ? interpolate(-deg.value, [90, 180], [0.7, 0]) : 0 }));
  return (
    <Animated.View style={[{ position: 'absolute', left, top: 0, width, height, transformOrigin: 'left center' }, leaf]}>
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
});

const s = StyleSheet.create({
  cast: { experimental_backgroundImage: 'linear-gradient(90deg, rgba(40,28,10,0.35), rgba(40,28,10,0) 55%)', borderRadius: 6 },
  shade: { experimental_backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0) 40%)', borderRadius: 6 },
  shadeBack: { experimental_backgroundImage: 'linear-gradient(270deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 50%)', borderRadius: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navBtn: { height: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(28,26,23,0.06)' },
  navText: { fontFamily: font.black, fontSize: 14, color: '#1c1a17' },
  navCount: { fontFamily: font.heavy, fontSize: 13, color: '#7d705a', fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'center' },
});
