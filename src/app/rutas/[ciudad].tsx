import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockedTourSheet } from '@/components/LockedTour';
import { rise } from '@/components/motion';
import { LockedRouteCard, RouteMark, TourRouteCard } from '@/components/RouteCard';
import { IconButton } from '@/components/ui';
import { getCity, toursIn } from '@/data/tours';
import type { LockedTour } from '@/data/types';
import { routeProgress, usePassport } from '@/store/passport';
import type { CityId } from '@/store/settings';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';

/** Rutas de una ciudad (modelo G2): sus sellos arriba y cada tour con su ruta dibujada */
export default function CityRoutes() {
  const insets = useSafeAreaInsets();
  const { ciudad } = useLocalSearchParams<{ ciudad: string }>();
  const city = getCity(ciudad);
  const routes = usePassport(s => s.routes);
  const [sheet, setSheet] = useState<LockedTour | null>(null);
  const { open, locked } = toursIn((city?.id ?? ciudad) as CityId);
  const color = city?.palette.t ?? neutral.ink;
  const progress = open.map(t => routeProgress(t.id, routes[t.id]));
  const completed = progress.filter(pr => pr.completed).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 12 }}>
        <IconButton label="Volver" icon="back" onPress={() => router.back()} style={{ marginLeft: -4 }} />
        <Animated.Text entering={rise(1)} style={s.city}>{city?.name ?? 'Ciudad'}</Animated.Text>
        <Animated.View entering={rise(2)} style={s.dotsRow} accessible accessibilityLabel={`${completed} de ${open.length} rutas completadas`}>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {open.map((t, i) => <RouteMark key={t.id} symbol={t.symbol} color={color} progress={progress[i].done / progress[i].total} size={34} />)}
            {locked.map(t => <RouteMark key={t.id} symbol={t.symbol} color={color} locked size={34} />)}
          </View>
          {open.length > 0 && <Text style={s.count}><Text style={{ color: neutral.ink, fontFamily: font.black }}>{completed} de {open.length}</Text> hechas</Text>}
        </Animated.View>
        <View style={{ height: 6 }} />
        {open.map((t, i) => (
          <Animated.View key={t.id} entering={rise(3 + i)}><TourRouteCard tour={t} route={routes[t.id]} /></Animated.View>
        ))}
        {locked.map((t, i) => (
          <Animated.View key={t.id} entering={rise(3 + open.length + i)}><LockedRouteCard tour={t} onPress={() => setSheet(t)} /></Animated.View>
        ))}
      </ScrollView>
      {sheet && <LockedTourSheet tour={sheet} onClose={() => setSheet(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  city: { fontFamily: font.serif, fontSize: 40, lineHeight: 44, color: neutral.ink, marginTop: 6 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { fontFamily: font.heavy, fontSize: 13.5, color: neutral.ink2 },
});
