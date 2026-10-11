import { forwardRef, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

/** Muelle de la interfaz: rápido, sin rebote exagerado */
export const SPRING = { damping: 18, stiffness: 260, mass: 0.7 } as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Escala al pulsar */
  scaleTo?: number;
  children?: ReactNode;
};

/**
 * Botón que se hunde un poco con un muelle al tocarlo y rebota al soltar.
 * Toda la animación va en el hilo de UI.
 */
export const PressableScale = forwardRef<View, Props>(function PressableScale({ style, scaleTo = 0.96, onPressIn, onPressOut, children, ...rest }, ref) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }] }));
  return (
    <AnimatedPressable
      ref={ref}
      {...rest}
      onPressIn={e => { pressed.set(withSpring(1, SPRING)); onPressIn?.(e); }}
      onPressOut={e => { pressed.set(withSpring(0, SPRING)); onPressOut?.(e); }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
});

/** Entrada escalonada: sube y aparece con un muelle, `i` pasos de 70 ms después */
export const rise = (i = 0) => FadeInDown.delay(i * 70).springify().damping(20).stiffness(180).mass(0.8);

/** Contenedor con la entrada escalonada */
export function Rise({ i = 0, style, children }: { i?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <Animated.View entering={rise(i)} style={style}>{children}</Animated.View>;
}
