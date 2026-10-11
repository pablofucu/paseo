import { useEffect } from 'react';
import { Easing, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * Movimiento de las fotos de cabecera: un zoom lento continuo (quieto con
 * «reducir movimiento»), paralaje al hacer scroll, la foto se agranda al tirar
 * hacia abajo y se funde con el fondo al subir. Devuelve el manejador de
 * scroll para un Animated.ScrollView y los estilos de la foto y del velo.
 */
export function useHeroMotion(height: number) {
  const reduced = useReducedMotion();
  const scrollY = useSharedValue(0);
  const drift = useSharedValue(0);
  useEffect(() => {
    if (!reduced) drift.set(withRepeat(withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [drift, reduced]);
  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });
  const photo = useAnimatedStyle(() => ({
    transform: [
      { translateY: scrollY.value > 0 ? scrollY.value * 0.45 : scrollY.value / 2 },
      { scale: (scrollY.value < 0 ? 1 - scrollY.value / height : 1) * (1.02 + drift.value * 0.07) },
    ],
  }));
  const veil = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, height], [0, 0.6], 'clamp') }));
  return { onScroll, photo, veil };
}
