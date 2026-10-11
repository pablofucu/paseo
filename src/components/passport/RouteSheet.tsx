import { useCallback, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { PassportPaper } from '@/components/Paper';
import { CompletionSeal, inkOf, RubberStamp } from '@/components/RubberStamp';
import { StampDrop } from '@/components/passport/StampDrop';
import type { Tour } from '@/data/types';
import { stampHit } from '@/lib/feedback';
import { sealBox, sheetFor, stampBox } from '@/lib/sheet';
import { routeProgress, type UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

interface Props {
  tour: Tour;
  route: UserRoute | undefined;
  width: number;
  pageNumber: number;
  /** Sello recién puesto que tiene que caer con la animación (id de parada o 'final') */
  fresh?: string | null;
  /** Tocar el sello grande lleva a la postal */
  onSealPress?: () => void;
  /** Capa encima de los sellos (vista previa del sello en la mano) */
  children?: ReactNode;
}

/**
 * Hoja de una ruta en el pasaporte: cabecera con el punto del acento, el
 * nombre, la ciudad, las paradas y el contador; los sellos donde los dejó el
 * usuario; y al pie las paradas que faltan y el número de página.
 */
export function RouteSheet({ tour, route, width, pageNumber, fresh, onSealPress, children }: Props) {
  const sheet = sheetFor(width);
  const ink = inkOf(tour);
  const prog = routeProgress(tour.id, route);

  // Golpe de hoja: baja 3 px y encoge al 99,5 % en el impacto, y vuelve (280 ms)
  const knock = useSharedValue(0);
  const knockStyle = useAnimatedStyle(() => ({ transform: [{ translateY: knock.value * 3 }, { scale: 1 - knock.value * 0.005 }] }));
  const hit = useCallback((big: boolean) => {
    stampHit(big);
    knock.set(withSequence(withTiming(1, { duration: 98, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 182, easing: Easing.out(Easing.quad) })));
  }, [knock]);

  const stamps = route?.stamps ?? [];
  const final = route?.finalStamp;
  const head = Math.max(13, width * 0.05);

  return (
    <Animated.View style={[{ width, height: sheet.h }, s.sheet, knockStyle]}>
      <PassportPaper width={width} height={sheet.h} />
      <View style={[s.head, { height: sheet.top, paddingHorizontal: 16 }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.titleRow}>
            <View style={[s.dot, { backgroundColor: ink }]} />
            <Text style={[s.title, { fontSize: head * 1.25 }]} numberOfLines={1}>{tour.title}</Text>
          </View>
          <Text style={[s.sub, { fontSize: head * 0.72 }]}>{tour.city.toUpperCase()} · {tour.stops.length} PARADAS</Text>
        </View>
        <Text style={[s.count, { fontSize: head * 1.15 }]}>{prog.done}/{prog.total}</Text>
      </View>
      <View style={[s.rule, { top: sheet.top - 1 }]} />

      {stamps.map(st => {
        const stop = tour.stops.find(t => t.id === st.stopId);
        if (!stop) return null;
        const b = stampBox(stop.rubber.shape, width);
        const art = <RubberStamp tour={tour} stop={stop} date={st.date} seed={st.seed} width={b.w} height={b.h} />;
        return (
          <View key={st.stopId} pointerEvents="none" style={{ position: 'absolute', left: st.x * width - b.w / 2, top: st.y * sheet.h - b.h / 2, width: b.w, height: b.h, transform: [{ rotate: `${st.rot}deg` }] }}>
            {fresh === st.stopId ? <StampDrop onImpact={() => hit(false)}>{art}</StampDrop> : art}
          </View>
        );
      })}

      {final && (() => {
        const b = sealBox(width);
        const art = <CompletionSeal tour={tour} date={final.date} seed={final.seed} width={b.w} height={b.h} />;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver la postal de esta ruta"
            disabled={!onSealPress}
            onPress={onSealPress}
            style={{ position: 'absolute', left: final.x * width - b.w / 2, top: final.y * sheet.h - b.h / 2, width: b.w, height: b.h, transform: [{ rotate: `${final.rot}deg` }] }}
          >
            {fresh === 'final' ? <StampDrop big onImpact={() => hit(true)}>{art}</StampDrop> : art}
          </Pressable>
        );
      })()}

      {children}

      <View style={[s.foot, { height: sheet.bottom, paddingHorizontal: 16 }]} pointerEvents="none">
        <Text style={[s.missing, { fontSize: head * 0.72 }]} numberOfLines={2}>
          {prog.allStamped ? (final ? '' : 'Todas selladas · falta el sello de ruta completada') : `Faltan: ${prog.missing.map(m => m.name).join(', ')}`}
        </Text>
        <Text style={[s.page, { fontSize: head * 0.85 }]}>{pageNumber}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: { overflow: 'hidden', borderRadius: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { flexShrink: 1, fontFamily: font.serif, color: '#2b2418', letterSpacing: -0.3 },
  sub: { fontFamily: font.black, letterSpacing: 1.6, color: '#7d705a', marginTop: 3, marginLeft: 18 },
  count: { fontFamily: font.black, color: '#2b2418', fontVariant: ['tabular-nums'] },
  rule: { position: 'absolute', left: 16, right: 16, height: 1, backgroundColor: 'rgba(90,67,32,0.22)' },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(90,67,32,0.18)', marginHorizontal: 0 },
  missing: { flex: 1, fontFamily: font.bold, color: '#7d705a' },
  page: { fontFamily: font.black, color: '#7d705a', fontVariant: ['tabular-nums'] },
});
