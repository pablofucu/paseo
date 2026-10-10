import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Duración total del gesto de estampar */
export const PRESS_MS = 1700;
/** Momentos del gesto (0–1): golpe, empieza a levantarse, ya se ha ido */
const HIT = 0.34;
const LIFT = 0.56;
const GONE = 0.82;

const SPLATS = [
  { x: -0.5, y: -0.36, r: 2.6 }, { x: 0.53, y: -0.2, r: 1.8 }, { x: 0.47, y: 0.46, r: 3 },
  { x: -0.42, y: 0.5, r: 1.8 }, { x: 0.08, y: -0.56, r: 1.5 }, { x: -0.58, y: 0.06, r: 2.2 },
];

interface Props {
  /** La impresión que queda en el papel (un sello) */
  children: ReactNode;
  width: number;
  height: number;
  /** Color de la tinta (salpicaduras y borde de la goma) */
  ink: string;
  delay?: number;
  /** Sin animación: solo la impresión */
  still?: boolean;
  /** Forma del tampón visto desde arriba */
  shape?: 'round' | 'rect';
}

/**
 * El tampón visto desde arriba: entra grande (cerca de la cámara) con la sombra
 * lejos y difusa, baja hasta el papel mientras la sombra se concentra debajo,
 * golpea (vibración y temblor del papel), se queda apretando un instante y se
 * levanta descubriendo la impresión.
 */
export function StampPress({ children, width, height, ink, delay = 0, still, shape = 'round' }: Props) {
  const t = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) return;
    t.value = withDelay(delay, withTiming(1, { duration: PRESS_MS, easing: Easing.linear }));
    const hit = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), delay + PRESS_MS * HIT);
    return () => clearTimeout(hit);
  }, [delay, still, t]);

  const tool = useAnimatedStyle(() => {
    const v = t.value;
    // Altura sobre el papel: 1 = lejos (grande en pantalla), 0 = apoyado
    const z = v < HIT ? interpolate(v, [0, HIT], [1, 0], Extrapolation.CLAMP) ** 1.8 : v < LIFT ? 0 : interpolate(v, [LIFT, GONE], [0, 1], Extrapolation.CLAMP) ** 0.7;
    const squash = interpolate(v, [HIT, HIT + 0.03, HIT + 0.08, HIT + 0.13], [1, 0.955, 1.01, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(v, [0, 0.06, LIFT + 0.12, GONE], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: z * width * 0.05 },
        { translateY: -z * height * 0.08 },
        { rotate: `${interpolate(v, [0, HIT, LIFT, GONE], [-14, 0, 0, 10], Extrapolation.CLAMP)}deg` },
        { scale: (1 + z * 0.75) * squash },
      ],
    };
  });
  // La sombra se aleja y se difumina cuanto más alto está el tampón
  const shade = useAnimatedStyle(() => {
    const v = t.value;
    const z = v < HIT ? interpolate(v, [0, HIT], [1, 0], Extrapolation.CLAMP) : v < LIFT ? 0 : interpolate(v, [LIFT, GONE], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(v, [0, 0.08, GONE - 0.05, GONE], [0, 0.2 + (1 - z) * 0.32, 0.2 + (1 - z) * 0.32, 0], Extrapolation.CLAMP),
      transform: [{ translateX: z * width * 0.22 + 3 }, { translateY: z * height * 0.3 + 5 }, { scale: 1 + z * 0.35 }],
    };
  });
  // La impresión aparece al levantar el tampón; la tinta fresca brilla un momento
  const print = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [HIT, HIT + 0.02], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [LIFT, GONE], [1.015, 1], Extrapolation.CLAMP) }],
  }));
  const wet = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [LIFT, LIFT + 0.08, 1], [0, 0.22, 0], Extrapolation.CLAMP) }));
  const splat = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [HIT, HIT + 0.04, 1], [0, 0.85, 0.7], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [HIT, HIT + 0.08], [0.3, 1], Extrapolation.CLAMP) }],
  }));
  const paper = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(t.value, [HIT, HIT + 0.02, HIT + 0.05, HIT + 0.09], [0, 2.5, -1, 0], Extrapolation.CLAMP) }],
  }));

  const pad = shape === 'round' ? 0.1 : 0.07;
  const toolW = width * (1 + pad);
  const toolH = height * (1 + pad);
  const box = { position: 'absolute' as const, left: (width - toolW) / 2, top: (height - toolH) / 2, width: toolW, height: toolH };
  const radius = shape === 'round' ? toolW / 2 : Math.min(toolW, toolH) * 0.12;

  return (
    <Animated.View style={[{ width, height }, paper]}>
      <Animated.View style={[StyleSheet.absoluteFill, splat]} pointerEvents="none">
        {SPLATS.map((s, i) => (
          <View key={i} style={{ position: 'absolute', left: width / 2 + s.x * width - s.r, top: height / 2 + s.y * height - s.r, width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: ink }} />
        ))}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, print]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', borderRadius: radius }, wet]} />
      </Animated.View>
      {!still && (
        <>
          <Animated.View pointerEvents="none" style={[box, { borderRadius: radius, backgroundColor: 'rgba(0,0,0,0.9)', boxShadow: '0px 0px 28px 14px rgba(0,0,0,0.85)' }, shade]} />
          <Animated.View pointerEvents="none" style={[box, tool]}>
            <TopView width={toolW} height={toolH} ink={ink} round={shape === 'round'} />
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}

/** El tampón desde arriba: bloque de madera con canto biselado, borde de goma entintada y pomo lacado. */
function TopView({ width: w, height: h, ink, round }: { width: number; height: number; ink: string; round: boolean }) {
  const r = round ? w / 2 : Math.min(w, h) * 0.12;
  const knob = Math.min(w, h) * 0.2;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <RadialGradient id="wood" cx="40%" cy="35%" r="75%">
          <Stop offset="0" stopColor="#C99561" />
          <Stop offset="0.6" stopColor="#A06B3A" />
          <Stop offset="1" stopColor="#6E4220" />
        </RadialGradient>
        <LinearGradient id="grain" x1="0" y1="0" x2="1" y2="0.25">
          <Stop offset="0" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.5" stopColor="#000" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="knob" cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#5A606E" />
          <Stop offset="0.55" stopColor="#24272F" />
          <Stop offset="1" stopColor="#0E0F13" />
        </RadialGradient>
      </Defs>
      {/* goma entintada que asoma por el borde */}
      <Rect x={0} y={0} width={w} height={h} rx={r} fill={ink} />
      {/* bloque de madera */}
      <Rect x={w * 0.035} y={h * 0.035} width={w * 0.93} height={h * 0.93} rx={Math.max(0, r - w * 0.035)} fill="url(#wood)" />
      <Rect x={w * 0.035} y={h * 0.035} width={w * 0.93} height={h * 0.93} rx={Math.max(0, r - w * 0.035)} fill="url(#grain)" />
      {/* bisel del canto */}
      <Rect x={w * 0.1} y={h * 0.1} width={w * 0.8} height={h * 0.8} rx={Math.max(0, r - w * 0.1)} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1.5} />
      {/* pomo */}
      <Ellipse cx={w / 2 + knob * 0.12} cy={h / 2 + knob * 0.16} rx={knob * 1.02} ry={knob} fill="#000" opacity={0.3} />
      <Circle cx={w / 2} cy={h / 2} r={knob} fill="url(#knob)" />
      <Circle cx={w / 2 - knob * 0.32} cy={h / 2 - knob * 0.36} r={knob * 0.26} fill="#FFFFFF" opacity={0.28} />
      <Circle cx={w / 2} cy={h / 2} r={knob * 0.42} fill="none" stroke={ink} strokeWidth={2} opacity={0.9} />
    </Svg>
  );
}
