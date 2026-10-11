import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { DuotoneImage } from '@/components/DuotoneImage';
import { PressableScale, SPRING } from '@/components/motion';
import type { Stop } from '@/data/types';
import { font } from '@/theme/fonts';
import { functional, neutral, shadow, type TourPalette } from '@/theme/tokens';

/** Anillo que se expande y se desvanece en bucle (parada a la que vas, tu posición) */
function Pulse({ size, color, delay = 0 }: { size: number; color: string; delay?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [t, reduced, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - t.value), transform: [{ scale: 1 + t.value * 1.4 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

interface StopPinProps {
  index: number;
  state: 'done' | 'now' | 'next';
  selected: boolean;
  palette: TourPalette;
  onPress: () => void;
}

/**
 * Pin de una parada: al abrir el mapa caen uno detrás de otro con rebote; la
 * parada a la que vas late; la elegida crece.
 */
export function StopPin({ index, state, selected, palette: p, onPress }: StopPinProps) {
  const reduced = useReducedMotion();
  const drop = useSharedValue(reduced ? 1 : 0);
  const sel = useSharedValue(0);
  useEffect(() => {
    drop.set(withDelay(250 + index * 110, withSpring(1, { damping: 9, stiffness: 160, mass: 0.8 })));
  }, [drop, index]);
  useEffect(() => { sel.set(withSpring(selected ? 1 : 0, SPRING)); }, [sel, selected]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 2),
    transform: [{ translateY: (1 - drop.value) * -46 }, { scale: 1 + sel.value * 0.28 }],
  }));
  const now = state === 'now';
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Parada ${index + 1}`} onPress={onPress} hitSlop={10} scaleTo={0.85} style={s.pinHit}>
      {now && <Pulse size={48} color={p.t2} />}
      <Animated.View
        style={[
          s.pin,
          state === 'done' && { backgroundColor: p.t, opacity: 0.6, borderColor: p.t },
          now && [s.pinNow, { backgroundColor: p.t2 }],
          state === 'next' && { borderColor: p.t },
          selected && { borderColor: neutral.ink },
          style,
        ]}
      >
        <Text style={[s.pinText, { color: state === 'done' ? p.on : now ? neutral.ink : p.t }]}>{index + 1}</Text>
      </Animated.View>
    </PressableScale>
  );
}

/** Tu posición: punto azul con un halo que se expande y el cono hacia donde miras */
export function MePin({ heading }: { heading: number | null }) {
  return (
    <View style={s.meWrap} pointerEvents="none">
      <Pulse size={22} color={functional.me} />
      {heading != null && <View style={[s.cone, { transform: [{ rotate: `${heading}deg` }] }]} />}
      <View style={s.me} />
    </View>
  );
}

interface PopupProps {
  stop: Stop;
  index: number;
  total: number;
  palette: TourPalette;
  /** «Sellada», «Vas aquí · 4 min», «Más adelante»… */
  status: string;
  action?: { label: string; onPress: () => void };
  onClose: () => void;
  children?: ReactNode;
}

/** Ventana de una parada en el mapa: nace del pin con un muelle y se cierra encogiendo */
export function StopPopup({ stop, index, total, palette: p, status, action, onClose }: PopupProps) {
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(15).stiffness(220).withInitialValues({ transform: [{ scale: 0.6 }] })}
      exiting={FadeOut.duration(140)}
      style={s.popup}
    >
      <DuotoneImage source={stop.photo} palette={p} style={s.popPic} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={[s.popOver, { color: p.t }]}>Parada {index + 1} de {total}</Text>
        <Text style={s.popName} numberOfLines={2}>{stop.name}</Text>
        <Text style={s.popStatus} numberOfLines={1}>{status}</Text>
      </View>
      <View style={{ gap: 6, alignItems: 'flex-end' }}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={10} scaleTo={0.85} style={s.popClose}>
          <Text style={s.popCloseText}>✕</Text>
        </PressableScale>
        {action && (
          <PressableScale accessibilityRole="button" onPress={action.onPress} style={[s.popBtn, { backgroundColor: p.t }]}>
            <Text style={[s.popBtnText, { color: p.on }]}>{action.label}</Text>
          </PressableScale>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pinHit: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#fff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  pinNow: { width: 46, height: 46, borderRadius: 23, borderWidth: 4, borderColor: '#fff' },
  pinText: { fontFamily: font.black, fontSize: 16 },
  meWrap: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  cone: { position: 'absolute', width: 0, height: 0, top: 2, borderLeftWidth: 14, borderRightWidth: 14, borderBottomWidth: 32, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(45,127,249,0.25)', transformOrigin: 'center 33px' },
  me: { width: 22, height: 22, borderRadius: 11, backgroundColor: functional.me, borderWidth: 4, borderColor: '#fff', ...shadow[2] },
  popup: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, backgroundColor: neutral.surface, ...shadow[3] },
  popPic: { width: 64, height: 64, borderRadius: 14 },
  popOver: { fontFamily: font.black, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popName: { fontFamily: font.serif, fontSize: 18, lineHeight: 21, color: neutral.ink },
  popStatus: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3 },
  popClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: neutral.bg2, alignItems: 'center', justifyContent: 'center' },
  popCloseText: { fontFamily: font.black, fontSize: 12, color: neutral.ink2 },
  popBtn: { height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  popBtnText: { fontFamily: font.black, fontSize: 13.5 },
});
