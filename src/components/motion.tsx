import * as Haptics from 'expo-haptics';
import { forwardRef, type ReactNode } from 'react';
import { Platform, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

/*
 * Movimiento de la interfaz: fluido y con cuerpo, pero sin rebotes. Los
 * elementos de interfaz entran con una curva de salida larga (se frenan
 * suavemente) y los muelles están amortiguados del todo. Los rebotes se
 * guardan para lo físico: el sello que cae y la hoja del pasaporte.
 */

/** Vibración ligera al elegir algo (ciudad, idioma, confirmar); en dispositivos sin motor no hace nada */
export const lightTap = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

/** Curva de salida suave (tipo «ease-out quint»): arranca con energía y se posa sin pasarse */
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
/** Curva para lo que va y vuelve (cambios de estado, desplazamientos) */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
/** Duraciones: rápido para respuestas al toque, normal para entradas, lento para lo grande */
export const DUR = { fast: 180, base: 360, slow: 520 } as const;

/** Muelle de la interfaz: con cuerpo y sin rebote (amortiguado del todo) */
export const SPRING = { damping: 30, stiffness: 320, mass: 0.9, overshootClamping: true } as const;

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

/** Entrada escalonada: sube 12 px y aparece, `i` pasos de 50 ms después, sin rebote */
export const rise = (i = 0) =>
  // En la web, Reanimated fija en absoluto (fuera del flujo) los bloques con una entrada a medida y los de debajo se les montan encima: allí solo se usa el fundido predefinido
  Platform.OS === 'web'
    ? FadeIn.delay(i * 50).duration(DUR.base).easing(EASE_OUT)
    : FadeInDown.delay(i * 50).duration(DUR.base).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

/** Aparición sin desplazamiento, para lo que no debe moverse (overlays, textos sobre fotos) */
export const appear = (delay = 0) => FadeIn.delay(delay).duration(DUR.base).easing(EASE_OUT);

/** Contenedor con la entrada escalonada */
export function Rise({ i = 0, style, children }: { i?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <Animated.View entering={rise(i)} style={style}>{children}</Animated.View>;
}
