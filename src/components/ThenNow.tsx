import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui';
import { creditPending, type PhotoCredit, type Stop, type ThenPhoto } from '@/data/types';
import { font } from '@/theme/fonts';
import { neutral, shadow, type TourPalette } from '@/theme/tokens';

/** Papel de la foto antigua: las etiquetas de época usan su color sepia */
const SEPIA = '#F1DFBD';
const SEPIA_INK = '#3A2614';
const SEPIA_TEXT = '#8A5A22';

export const thenYear = (t: ThenPhoto) => (t.approx ? `hacia ${t.year}` : String(t.year));

/**
 * Tarjeta «Así era» de la ficha de la parada: la foto antigua en pequeño. Al tocarla
 * se abre el visor para comparar con la de hoy deslizando una barra.
 */
export function ThenNowCard({ stop, palette }: { stop: Stop; palette: TourPalette }) {
  const [open, setOpen] = useState(false);
  const then = stop.then;
  if (!then) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Así era, ${thenYear(then)}: ${then.title}. Compáralo con hoy`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
      >
        <Image source={then.photo} contentFit="cover" style={s.cardPhoto} />
        <View style={s.cardBody}>
          <Text style={s.cardOver}>Así era · {thenYear(then)}</Text>
          <Text style={s.cardTitle}>{then.title}</Text>
          <Text style={[s.cardGo, { color: palette.t }]}>Compáralo con hoy →</Text>
        </View>
      </Pressable>
      <ThenNowViewer stop={stop} then={then} palette={palette} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ThenNowViewer({ stop, then, palette, visible, onClose }: { stop: Stop; then: ThenPhoto; palette: TourPalette; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const h = Math.round(width * 0.92);
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* En Android los gestos no llegan dentro de un Modal sin su propia raíz de gestos */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[s.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
        <IconButton label="Cerrar" icon="close" onPress={onClose} style={{ marginLeft: 16 }} />
        <View style={s.head}>
          <Text style={[s.over, { color: palette.t2 }]}>Así era · {thenYear(then)}</Text>
          <Text style={s.title}>{then.title}</Text>
        </View>
        <Compare then={then.photo} now={stop.photo} year={then.year} width={width} height={h} accent={palette.t2} />
        <View style={s.foot}>
          <Text style={s.text}>{then.text}</Text>
          <Credit label="Antes" credit={then.credit} />
          <Credit label="Ahora" credit={stop.photoCredit} />
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Credit({ label, credit }: { label: string; credit: PhotoCredit }) {
  if (creditPending(credit)) return null;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${label}: foto de ${credit.author}, ${credit.license}. Abre la fuente`} onPress={() => Linking.openURL(credit.source).catch(() => {})} hitSlop={{ top: 4, bottom: 4 }}>
      <Text style={s.credit} numberOfLines={2}>{label}: {credit.author} · {credit.license} · Wikimedia Commons</Text>
    </Pressable>
  );
}

const clamp = (v: number) => {
  'worklet';
  return Math.min(1, Math.max(0, v));
};

/** Las dos fotos encajadas una sobre otra: a la izquierda de la barra, la antigua */
function Compare({ then, now, year, width, height, accent }: { then: Stop['photo']; now: Stop['photo']; year: number; width: number; height: number; accent: string }) {
  const pos = useSharedValue(0.5);
  const pan = usePanGesture({
    // Activa al tocar (no hay scroll en el visor) y cede si el gesto es claramente vertical
    minDistance: 0,
    failOffsetY: [-60, 60],
    onBegin: e => { 'worklet'; pos.set(withTiming(clamp(e.x / width), { duration: 120 })); },
    onUpdate: e => { 'worklet'; pos.set(clamp(e.x / width)); },
  });
  const clip = useAnimatedStyle(() => ({ width: pos.get() * width }));
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: pos.get() * width - 1.5 }] }));
  // Lectores de pantalla: la barra se mueve de 10 en 10 %
  const step = (d: number) => pos.set(withTiming(clamp(pos.get() + d), { duration: 200 }));
  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Comparar ${year} con hoy`}
        accessibilityHint="Desliza a los lados para ver más de una u otra foto"
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={e => step(e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)}
        collapsable={false}
        style={{ width, height, overflow: 'hidden' }}
      >
        <Image source={now} contentFit="cover" style={StyleSheet.absoluteFill} />
        <Animated.View style={[s.clip, clip]}>
          <Image source={then} contentFit="cover" style={{ width, height }} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[s.bar, bar]}>
          <View style={s.knob}><Text style={s.knobText}>‹ ›</Text></View>
        </Animated.View>
        <Text style={[s.tag, { left: 14, backgroundColor: SEPIA, color: SEPIA_INK }]}>{year}</Text>
        <Text style={[s.tag, { right: 14, backgroundColor: accent, color: neutral.ink }]}>Hoy</Text>
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 18, backgroundColor: neutral.surface, overflow: 'hidden', ...shadow[1] },
  cardPhoto: { width: 104, minHeight: 104 },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 3, justifyContent: 'center' },
  cardOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: SEPIA_TEXT },
  cardTitle: { fontFamily: font.serifBold, fontSize: 18, lineHeight: 22, color: neutral.ink },
  cardGo: { fontFamily: font.black, fontSize: 13.5, marginTop: 4 },
  viewer: { flex: 1, backgroundColor: neutral.night, gap: 18 },
  head: { paddingHorizontal: 20, gap: 2 },
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: font.serifBold, fontSize: 24, lineHeight: 28, color: '#fff' },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  knob: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  knobText: { fontFamily: font.black, fontSize: 16, color: neutral.ink },
  tag: { position: 'absolute', bottom: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', fontFamily: font.black, fontSize: 12.5 },
  foot: { paddingHorizontal: 20, gap: 8 },
  text: { fontFamily: font.body, fontSize: 15.5, lineHeight: 23, color: '#D7DDE8', marginBottom: 6 },
  credit: { fontFamily: font.bold, fontSize: 11.5, color: '#8F9AB0', textDecorationLine: 'underline' },
});
