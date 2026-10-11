import { useEffect, useRef, type ReactNode } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

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
