import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockedTourSheet } from '@/components/LockedTour';
import { rise } from '@/components/motion';
import { LockedRouteCard, StampDots, stopInks, TourRouteCard } from '@/components/RouteCard';
import { IconButton } from '@/components/ui';
import { getCity, toursIn } from '@/data/tours';
import type { LockedTour } from '@/data/types';
import { usePassport } from '@/store/passport';
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
  const inks = open.flatMap(t => stopInks(t, routes[t.id]));
  const got = inks.filter(Boolean).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 12 }}>
        <IconButton label="Volver" icon="back" onPress={() => router.back()} style={{ marginLeft: -4 }} />
        <Animated.Text entering={rise(1)} style={s.city}>{city?.name ?? 'Ciudad'}</Animated.Text>
        {inks.length > 0 && (
          <Animated.View entering={rise(2)} style={s.dotsRow} accessible accessibilityLabel={`${got} de ${inks.length} sellos`}>
            <View style={{ flex: 1, overflow: 'hidden' }}><StampDots inks={inks} /></View>
            <Text style={s.count}><Text style={{ color: neutral.ink, fontFamily: font.black }}>{got} de {inks.length}</Text> sellos</Text>
          </Animated.View>
        )}
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
