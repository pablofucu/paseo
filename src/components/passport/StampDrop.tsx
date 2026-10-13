import { useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

/** Curva del estampado de la guía: cubic-bezier(.3, 1.4, .5, 1), con rebote */
const EASE = Easing.bezier(0.3, 1.4, 0.5, 1);

/**
 * Caída del sello (guía de sellos, § 07): aparece a escala 1,9 y transparente,
 * se aplasta contra la hoja (0,96, nítido) y se asienta (1, opacidad 0,94)
 * en 550 ms. El impacto (sonido, vibración y golpe de hoja) llega a los
 * 300 ms. Con «reducir
 * movimiento» el sello aparece directamente, pero suena y vibra igual.
 */
export function StampDrop({ onImpact, children }: { onImpact: () => void; children: ReactNode }) {
  const reduced = useReducedMotion();
  const total = 550;
  const scale = useSharedValue(reduced ? 1 : 1.9);
  const opacity = useSharedValue(reduced ? 1 : 0);
  const impact = useRef(onImpact);
  useEffect(() => { impact.current = onImpact; });

  useEffect(() => {
    if (!reduced) {
      scale.value = withSequence(withTiming(0.96, { duration: total * 0.55, easing: EASE }), withTiming(1, { duration: total * 0.45, easing: EASE }));
      opacity.value = withTiming(1, { duration: total * 0.55, easing: Easing.out(Easing.quad) });
    }
    const t = setTimeout(() => impact.current(), reduced ? 0 : 300);
    return () => clearTimeout(t);
  }, [reduced, scale, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, opacity.value), transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const MOTES = 11;

/** Una mota de tinta que sale disparada del sello y se apaga */
function Mote({ i, color, reach, delay }: { i: number; color: string; reach: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.set(withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }))); }, [t, delay]);
  // Reparto fijo (sin azar entre renders): ángulo y alcance con una pequeña variación por mota
  const a = (i / MOTES) * Math.PI * 2 + (i % 3) * 0.22;
  const r = reach * (0.7 + ((i * 37) % 10) / 22);
  const size = 3 + (i % 3);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : (1 - t.value) * 0.75,
    transform: [{ translateX: Math.cos(a) * r * t.value }, { translateY: Math.sin(a) * r * t.value }, { scale: 1 - t.value * 0.5 }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size, backgroundColor: color }, style]} />;
}

/**
 * Polvo de tinta del último sello de la ruta: unas motas que salen del
 * centro del sello justo en el impacto. Con «reducir movimiento» no se pinta.
 */
export function InkDust({ color, w, h }: { color: string; w: number; h: number }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: w / 2, top: h / 2 }}>
      {Array.from({ length: MOTES }, (_, i) => <Mote key={i} i={i} color={color} reach={Math.max(w, h) * 0.62} delay={300} />)}
    </View>
  );
}
