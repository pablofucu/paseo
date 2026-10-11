import { memo, useCallback, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { PassportPaper } from '@/components/Paper';
import { paperOf, RubberStamp } from '@/components/RubberStamp';
import { StampDrop } from '@/components/passport/StampDrop';
import type { Tour } from '@/data/types';
import { stampHit } from '@/lib/feedback';
import { mezcla } from '@/lib/ink';
import { sheetFor, stampBox } from '@/lib/sheet';
import type { UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

interface Props {
  tour: Tour;
  route: UserRoute | undefined;
  width: number;
  pageNumber: number;
  /** Sello recién puesto que tiene que caer con la animación (id de parada) */
  fresh?: string | null;
  /** Capa encima de los sellos (vista previa del sello en la mano) */
  children?: ReactNode;
}

/**
 * Hoja de una ruta en el pasaporte: un papel con un velo suave del color de
 * la ruta, su nombre y su ciudad discretos arriba, y los sellos donde los
 * dejó el usuario.
 */
export const RouteSheet = memo(function RouteSheet({ tour, route, width, pageNumber, fresh, children }: Props) {
  const sheet = sheetFor(width);
  const paper = paperOf(tour);
  // Letra del encabezado: la tinta de la ruta muy apagada sobre el papel
  const quiet = mezcla(tour.palette.deep, paper, 0.35);

  // Golpe de hoja: baja 3 px y encoge al 99,5 % en el impacto, y vuelve (280 ms)
  const knock = useSharedValue(0);
  const knockStyle = useAnimatedStyle(() => ({ transform: [{ translateY: knock.value * 3 }, { scale: 1 - knock.value * 0.005 }] }));
  const hit = useCallback(() => {
    stampHit(false);
    knock.set(withSequence(withTiming(1, { duration: 98, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 182, easing: Easing.out(Easing.quad) })));
  }, [knock]);

  const stamps = route?.stamps ?? [];
  const k = width / 340;

  return (
    <Animated.View style={[{ width, height: sheet.h }, s.sheet, knockStyle]}>
      <PassportPaper width={width} height={sheet.h} color={paper} />
      <View style={[s.head, { height: sheet.top }]} pointerEvents="none">
        <Text style={[s.city, { color: quiet, fontSize: 9.5 * k, letterSpacing: 3 * k }]}>{tour.city.toUpperCase()}</Text>
        <Text style={[s.title, { color: quiet, fontSize: 17 * k }]} numberOfLines={1}>{tour.title}</Text>
      </View>

      {stamps.map(st => {
        const stop = tour.stops.find(t => t.id === st.stopId);
        if (!stop) return null;
        const b = stampBox(stop.rubber.shape, width);
        const art = <RubberStamp tour={tour} stop={stop} date={st.date} width={b.w} height={b.h} />;
        return (
          <View key={st.stopId} pointerEvents="none" style={{ position: 'absolute', left: st.x * width - b.w / 2, top: st.y * sheet.h - b.h / 2, width: b.w, height: b.h, transform: [{ rotate: `${st.rot}deg` }] }}>
            {fresh === st.stopId ? <StampDrop onImpact={hit}>{art}</StampDrop> : art}
          </View>
        );
      })}

      {children}

      <Text pointerEvents="none" style={[s.page, { color: quiet, fontSize: 10 * k, bottom: sheet.bottom * 0.3 }]}>{pageNumber}</Text>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  sheet: { overflow: 'hidden', borderRadius: 6 },
  head: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 2, opacity: 0.85 },
  city: { fontFamily: font.black },
  title: { fontFamily: font.serifBold, letterSpacing: -0.2 },
  page: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: font.heavy, fontVariant: ['tabular-nums'], opacity: 0.7 },
});
