import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** Duración total del gesto de estampar */
export const PRESS_MS = 1500;
/** Momento del golpe dentro del gesto (0–1) */
const HIT = 0.36;

const SPLATS = [
  { x: -0.46, y: -0.32, r: 3.5 }, { x: 0.5, y: -0.18, r: 2.5 }, { x: 0.44, y: 0.42, r: 4 },
  { x: -0.38, y: 0.47, r: 2.5 }, { x: 0.05, y: -0.53, r: 2 }, { x: -0.55, y: 0.08, r: 3 },
];

interface Props {
  /** La impresión que queda en el papel (un sello) */
  children: ReactNode;
  width: number;
  height: number;
  /** Color de la goma y de las salpicaduras */
  ink: string;
  delay?: number;
  /** Sin animación (p. ej. con «reducir movimiento»): solo la impresión */
  still?: boolean;
}

/**
 * Un tampón de goma baja, golpea el papel (vibración), se aplasta, deja la
 * impresión con unas salpicaduras de tinta y se levanta.
 */
export function StampPress({ children, width, height, ink, delay = 0, still }: Props) {
  const t = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) return;
    t.value = withDelay(delay, withTiming(1, { duration: PRESS_MS, easing: Easing.linear }));
    const hit = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), delay + PRESS_MS * HIT);
    return () => clearTimeout(hit);
  }, [delay, still, t]);

  const H = height;
  const tool = useAnimatedStyle(() => {
    const v = t.value;
    // Baja acelerando (los tramos aproximan una caída), golpea, se aplasta y se va
    const y = interpolate(v, [0, 0.16, 0.28, HIT, 0.62, 0.86], [-H * 1.9, -H * 1.35, -H * 0.55, 0, 0, -H * 2.2], Extrapolation.CLAMP);
    const squash = interpolate(v, [HIT, HIT + 0.04, HIT + 0.12, HIT + 0.2], [1, 0.88, 0.97, 1], Extrapolation.CLAMP);
    const rot = interpolate(v, [0.62, 0.86], [0, 9], Extrapolation.CLAMP);
    return {
      opacity: interpolate(v, [0, 0.05, 0.7, 0.86], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: y }, { rotate: `${rot}deg` }, { scaleY: squash }, { scale: interpolate(v, [0, HIT], [1.2, 1], Extrapolation.CLAMP) }],
    };
  });
  const shadow = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, HIT, 0.62, 0.8], [0, 0.35, 0.35, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [0, HIT], [1.5, 1], Extrapolation.CLAMP) }],
  }));
  const print = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [HIT, HIT + 0.05], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [HIT, HIT + 0.14], [1.06, 1], Extrapolation.CLAMP) }],
  }));
  const splat = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [HIT, HIT + 0.04, 1], [0, 0.85, 0.7], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [HIT, HIT + 0.08], [0.2, 1], Extrapolation.CLAMP) }],
  }));
  const paper = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(t.value, [HIT, HIT + 0.03, HIT + 0.07, HIT + 0.11], [0, 3, -1, 0], Extrapolation.CLAMP) }],
  }));

  const toolW = width * 0.94;
  const toolH = H * 1.25;
  return (
    <Animated.View style={[{ width, height }, paper]}>
      <Animated.View style={[StyleSheet.absoluteFill, splat]} pointerEvents="none">
        {SPLATS.map((s, i) => (
          <View key={i} style={{ position: 'absolute', left: width / 2 + s.x * width - s.r, top: H / 2 + s.y * H - s.r, width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: ink }} />
        ))}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, print]}>{children}</Animated.View>
      {!still && (
        <>
          <Animated.View pointerEvents="none" style={[s.shadow, { left: width * 0.08, right: width * 0.08, top: H * 0.82, height: H * 0.16 }, shadow]} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: (width - toolW) / 2, top: H - toolH, width: toolW, height: toolH, transformOrigin: 'bottom' }, tool]}>
            <RubberStamp width={toolW} height={toolH} ink={ink} />
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}

/** El tampón visto de frente: pomo, mango, bloque de madera y goma entintada */
function RubberStamp({ width: w, height: h, ink }: { width: number; height: number; ink: string }) {
  const cx = w / 2;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7A4A24" />
          <Stop offset="0.45" stopColor="#B07A45" />
          <Stop offset="1" stopColor="#6B3E1C" />
        </LinearGradient>
        <LinearGradient id="knob" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3B3F4A" />
          <Stop offset="1" stopColor="#15171C" />
        </LinearGradient>
      </Defs>
      <Circle cx={cx} cy={h * 0.13} r={w * 0.12} fill="url(#knob)" />
      <Path d={`M${cx - w * 0.06} ${h * 0.2} L${cx + w * 0.06} ${h * 0.2} L${cx + w * 0.09} ${h * 0.52} L${cx - w * 0.09} ${h * 0.52} Z`} fill="url(#knob)" />
      <Rect x={w * 0.04} y={h * 0.52} width={w * 0.92} height={h * 0.3} rx={w * 0.04} fill="url(#wood)" />
      <Rect x={w * 0.04} y={h * 0.52} width={w * 0.92} height={h * 0.04} rx={w * 0.02} fill="#FFFFFF" opacity={0.18} />
      <Rect x={0} y={h * 0.82} width={w} height={h * 0.18} rx={w * 0.03} fill={ink} />
      <Rect x={0} y={h * 0.82} width={w} height={h * 0.05} fill="#000000" opacity={0.18} />
    </Svg>
  );
}

const s = StyleSheet.create({
  shadow: { position: 'absolute', borderRadius: 999, backgroundColor: '#000' },
});
