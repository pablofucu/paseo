import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { appear, DUR, EASE_OUT, PressableScale } from '@/components/motion';
import type { LockedTour } from '@/data/types';
import { font } from '@/theme/fonts';
import { RouteStamp } from '@/components/RouteStamp';
import { functional, neutral, radius, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

export const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

function Lock({ color = neutral.white, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} fill={color} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Portada de un tour sin foto: su paleta con un motivo de calles y paradas */
function Pattern({ tour }: { tour: LockedTour }) {
  const p = tour.palette;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.deep }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice">
        <Path d="M-10 64 C60 34 90 74 150 44 S260 -10 370 20" fill="none" stroke={p.t} strokeWidth={14} strokeLinecap="round" opacity={0.55} />
        <Path d="M-10 64 C60 34 90 74 150 44 S260 -10 370 20" fill="none" stroke={p.t2} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" />
        <Path d="M40 -10 L90 160 M220 -10 L180 160 M300 -10 L330 160" stroke={neutral.white} strokeOpacity={0.08} strokeWidth={10} />
        {[[60, 48], [150, 44], [262, 12]].map(([x, y]) => (
          <Path key={x} d={`M${x} ${y} m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0`} fill={p.t2} stroke={neutral.white} strokeWidth={2.5} />
        ))}
      </Svg>
    </View>
  );
}

/** Tarjeta de un tour de pago bloqueado en Inicio */
export function LockedTourCard({ tour, onPress }: { tour: LockedTour; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${tour.title}, tour de pago bloqueado, ${euros(tour.eur)}`} scaleTo={0.975} onPress={onPress} style={s.card}>
      <View style={s.hero}>
        <Pattern tour={tour} />
        <View style={s.veil} />
        <View style={s.heroText}>
          <Text style={[type.overline, { color: 'rgba(255,255,255,0.85)' }]}>{tour.region}</Text>
          <Text style={s.city}>{tour.city}</Text>
        </View>
        <View style={s.price}>
          <Lock size={14} />
          <Text maxFontSizeMultiplier={1.3} style={s.priceText}>{euros(tour.eur)}</Text>
        </View>
      </View>
      <View style={s.body}>
        <View style={[s.swatch, { backgroundColor: tour.palette.t }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.cat, { color: tour.palette.t }]} numberOfLines={1}>{tour.category}</Text>
          <Text style={s.title}>{tour.title}</Text>
          <Text style={type.caption}>{tour.durationMin} min · {tour.stops} paradas · Bloqueado</Text>
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * Hoja de un tour de pago: qué tiene y su precio. Solo es interfaz: el pago
 * todavía no existe, así que el botón avisa de que llegará pronto.
 */
export function LockedTourSheet({ tour, onClose }: { tour: LockedTour; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tried, setTried] = useState(false);
  const p = tour.palette;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, s.backdrop]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(DUR.slow).easing(EASE_OUT)} exiting={SlideOutDown.duration(220)} style={[s.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <View style={s.grab} />
        <View style={s.sheetHero}>
          <Pattern tour={tour} />
          {tour.stamp
            ? <RouteStamp locked={tour} height={96} rotate={-4} />
            : <View style={s.bigLock}><Lock size={30} color={p.deep} /></View>}
        </View>
        <Text style={[type.overline, { color: p.t }]}>{tour.category} · {tour.city}</Text>
        <Text style={type.title}>{tour.title}</Text>
        <Text style={type.caption}>{tour.durationMin} min · {tour.stops} paradas · audio, sellos y postal</Text>
        <Text style={[type.body, { marginTop: 6 }]}>{tour.intro}</Text>
        {tried && (
          <Animated.Text entering={appear()} style={s.soon}>Los pagos todavía no están disponibles. Este tour se podrá desbloquear muy pronto.</Animated.Text>
        )}
        <PressableScale accessibilityRole="button" onPress={() => setTried(true)} style={[s.buy, { backgroundColor: p.t }]}>
          <Lock size={18} color={p.on} />
          <Text style={[s.buyText, { color: p.on }]}>Desbloquear por {euros(tour.eur)}</Text>
        </PressableScale>
        <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: 'center', padding: 10 }}>
          <Text style={s.later}>Ahora no</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: neutral.surface, borderRadius: 22, overflow: 'hidden', ...shadow[2] },
  hero: { height: 130 },
  veil: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  heroText: { position: 'absolute', left: 16, bottom: 12 },
  city: { fontFamily: font.serif, fontSize: 30, lineHeight: 33, color: neutral.white },
  price: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 28 },
  priceText: { fontFamily: font.black, fontSize: 13, color: neutral.white },
  body: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'center', opacity: 0.85 },
  swatch: { width: 8, alignSelf: 'stretch', borderRadius: 4 },
  cat: { fontFamily: font.black, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: font.serif, fontSize: 19, lineHeight: 22, color: neutral.ink, marginVertical: 2 },
  backdrop: { backgroundColor: 'rgba(10,8,5,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: neutral.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, gap: 6, ...shadow[3] },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: neutral.line, marginBottom: 8 },
  sheetHero: { height: 120, borderRadius: 18, overflow: 'hidden', marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  bigLock: { width: 64, height: 64, borderRadius: 32, backgroundColor: neutral.white, alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  soon: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: functional.warnInk, backgroundColor: functional.warnSoft, padding: 12, borderRadius: radius.md, overflow: 'hidden', marginTop: 6 },
  buy: { marginTop: 10, minHeight: 56, paddingVertical: 8, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buyText: { fontFamily: font.black, fontSize: 17 },
  later: { fontFamily: font.black, fontSize: 14.5, color: neutral.ink2 },
});
