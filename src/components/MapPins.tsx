import { Marker } from '@maplibre/maplibre-react-native';
import { memo, useEffect, useRef, type ReactNode } from 'react';
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
import { DUR, EASE_OUT, PressableScale, SPRING } from '@/components/motion';
import type { Stop } from '@/data/types';
import { angleDelta, unwrapAngle } from '@/lib/smooth';
import { font } from '@/theme/fonts';
import { functional, neutral, shadow, type TourPalette } from '@/theme/tokens';

/** Anillo que se expande y se desvanece en bucle (parada a la que vas, tu posición) */
function Pulse({ size, color, delay = 0 }: { size: number; color: string; delay?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [t, reduced, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - t.value), transform: [{ scale: 1 + t.value * 1.1 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

interface StopPinProps {
  index: number;
  /** Nombre de la parada, para lectores de pantalla */
  name?: string;
  stamped?: boolean;
  state: 'done' | 'now' | 'next';
  selected: boolean;
  palette: TourPalette;
  onPress: () => void;
  /** Pins un 30 % más grandes, para ir andando con el mapa inclinado */
  large?: boolean;
}

/**
 * Pin de una parada: al abrir el mapa aparecen uno detrás de otro con un fundido
 * suave; la parada a la que vas late con calma; la elegida crece un poco.
 */
export const StopPin = memo(function StopPin({ index, name, stamped, state, selected, palette: p, onPress, large }: StopPinProps) {
  const reduced = useReducedMotion();
  const drop = useSharedValue(reduced ? 1 : 0);
  const sel = useSharedValue(0);
  useEffect(() => {
    drop.set(withDelay(250 + index * 90, withTiming(1, { duration: DUR.slow, easing: EASE_OUT })));
  }, [drop, index]);
  useEffect(() => { sel.set(withSpring(selected ? 1 : 0, SPRING)); }, [sel, selected]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 2),
    transform: [{ translateY: (1 - drop.value) * -10 }, { scale: 1 + sel.value * 0.14 }],
  }));
  const now = state === 'now';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Parada ${index + 1}${name ? `: ${name}` : ''}${stamped ? ', sellada' : state === 'now' ? ', tu próxima parada' : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress} hitSlop={10} scaleTo={0.85} style={[s.pinHit, large && s.pinHitL]}>
      {now && <Pulse size={large ? 62 : 48} color={p.t2} />}
      <Animated.View
        style={[
          s.pin,
          large && s.pinL,
          state === 'done' && { backgroundColor: p.t, opacity: 0.6, borderColor: p.t },
          now && [s.pinNow, large && s.pinNowL, { backgroundColor: p.t2 }],
          state === 'next' && { borderColor: p.t },
          selected && { borderColor: neutral.ink },
          style,
        ]}
      >
        <Text style={[s.pinText, large && s.pinTextL, { color: state === 'done' ? p.on : now ? neutral.ink : p.t }]}>{index + 1}</Text>
      </Animated.View>
    </PressableScale>
  );
});

interface StopMarkersProps {
  stops: Stop[];
  /** Paradas selladas (por id) */
  stamped: ReadonlySet<string>;
  target: number;
  selected: number | null;
  palette: TourPalette;
  onSelect: (index: number) => void;
  large?: boolean;
}

/**
 * Los pins de todas las paradas. Está aparte y memoizado para que no se
 * repinten con cada lectura del GPS: solo cuando cambia la parada, la selección o los sellos.
 */
export const StopMarkers = memo(function StopMarkers({ stops, stamped, target, selected, palette, onSelect, large }: StopMarkersProps) {
  return stops.map((st, i) => (
    <Marker key={st.id} id={`stop-${st.id}`} lngLat={st.coord} anchor="center">
      <StopPin index={i} name={st.name} stamped={stamped.has(st.id)} state={stamped.has(st.id) ? 'done' : i === target ? 'now' : 'next'} selected={selected === i} palette={palette} onPress={() => onSelect(i)} large={large} />
    </Marker>
  ));
});

/**
 * Tu posición: punto azul con un halo que se expande y el cono hacia donde miras.
 * El cono gira con suavidad por el camino más corto e ignora el temblor de la brújula.
 */
export function MePin({ heading }: { heading: number | null }) {
  const reduced = useReducedMotion();
  const rot = useSharedValue(heading ?? 0);
  const shown = useSharedValue(heading != null ? 1 : 0);
  const last = useRef<number | null>(heading);
  useEffect(() => {
    shown.set(withTiming(heading != null ? 1 : 0, { duration: DUR.fast }));
    if (heading == null) return;
    if (last.current == null) { last.current = heading; rot.set(heading); return; }
    // Menos de 2° es ruido de la brújula
    if (Math.abs(angleDelta(last.current, heading)) < 2) return;
    last.current = unwrapAngle(last.current, heading);
    rot.set(reduced ? last.current : withTiming(last.current, { duration: 320, easing: EASE_OUT }));
  }, [heading, rot, shown, reduced]);
  const cone = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <View style={s.meWrap} pointerEvents="none">
      <Pulse size={22} color={functional.me} />
      <Animated.View style={[s.cone, cone]} />
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
  /** Opción a lo ancho al pie de la ventana («Ir aquí») */
  footer?: { label: string; hint?: string; onPress: () => void };
  onClose: () => void;
  children?: ReactNode;
}

/** Ventana de una parada en el mapa: aparece con un fundido y una escala mínima, y se cierra con un fundido */
export function StopPopup({ stop, index, total, palette: p, status, action, footer, onClose }: PopupProps) {
  return (
    <Animated.View
      entering={ZoomIn.duration(DUR.base).easing(EASE_OUT).withInitialValues({ transform: [{ scale: 0.96 }] })}
      exiting={FadeOut.duration(140)}
      style={s.popup}
    >
      <View style={s.popRow}>
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
      </View>
      {footer && (
        <PressableScale accessibilityRole="button" onPress={footer.onPress} scaleTo={0.97} style={[s.popFoot, { borderColor: p.t }]}>
          <Text style={[s.popFootText, { color: p.t }]}>{footer.label}</Text>
          {footer.hint && <Text style={s.popFootHint}>{footer.hint}</Text>}
        </PressableScale>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pinHit: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#fff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  pinNow: { width: 46, height: 46, borderRadius: 23, borderWidth: 4, borderColor: '#fff' },
  pinText: { fontFamily: font.black, fontSize: 16 },
  pinHitL: { width: 68, height: 68 },
  pinL: { width: 44, height: 44, borderRadius: 22, borderWidth: 4 },
  pinNowL: { width: 60, height: 60, borderRadius: 30, borderWidth: 5 },
  pinTextL: { fontSize: 20 },
  meWrap: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  cone: { position: 'absolute', width: 0, height: 0, top: 2, borderLeftWidth: 14, borderRightWidth: 14, borderBottomWidth: 32, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(45,127,249,0.25)', transformOrigin: 'center 33px' },
  me: { width: 22, height: 22, borderRadius: 11, backgroundColor: functional.me, borderWidth: 4, borderColor: '#fff', ...shadow[2] },
  popup: { gap: 10, padding: 10, borderRadius: 22, backgroundColor: neutral.surface, ...shadow[3] },
  popRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  popFoot: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 9, alignItems: 'center' },
  popFootText: { fontFamily: font.black, fontSize: 14.5 },
  popFootHint: { fontFamily: font.bold, fontSize: 11.5, color: neutral.ink3, marginTop: 1 },
  popPic: { width: 64, height: 64, borderRadius: 14 },
  popOver: { fontFamily: font.black, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popName: { fontFamily: font.serif, fontSize: 18, lineHeight: 21, color: neutral.ink },
  popStatus: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3 },
  popClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: neutral.bg2, alignItems: 'center', justifyContent: 'center' },
  popCloseText: { fontFamily: font.black, fontSize: 12, color: neutral.ink2 },
  popBtn: { height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  popBtnText: { fontFamily: font.black, fontSize: 13.5 },
});
