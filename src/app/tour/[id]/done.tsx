import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton } from '@/components/ui';
import { VisitPage } from '@/components/VisitPage';
import { cumulative, formatDistance } from '@/lib/geo';
import { useTourParam } from '@/lib/useTour';
import { usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';
import { TourThemeProvider } from '@/theme/TourTheme';

export default function Done() {
  const tour = useTourParam();
  const insets = useSafeAreaInsets();
  const p = tour.palette;
  const visitId = usePassport(s => s.activeVisitId ?? [...s.visits].reverse().find(v => v.tourId === tour.id)?.id);
  const visit = usePassport(s => s.visits.find(v => v.id === visitId));
  const completeVisit = usePassport(s => s.completeVisit);
  useEffect(() => { if (visit && !visit.completedAt) completeVisit(); }, [visit, completeVisit]);

  const meters = tour.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
  const minutes = visit?.completedAt ? Math.max(1, Math.round((+new Date(visit.completedAt) - +new Date(visit.startedAt)) / 60000)) : null;
  const stats = [[String(tour.stops.length), 'sellos'], [formatDistance(meters), 'recorridos'], [minutes ? `${minutes} min` : '—', 'tiempo']];

  return (
    <TourThemeProvider palette={p}>
      <ScrollView style={{ flex: 1, backgroundColor: p.t }} contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 16, gap: 18 }}>
        <Animated.View entering={FadeInDown} style={{ alignItems: 'center' }}>
          <Text style={[s.over, { color: p.t2 }]}>Parada {tour.stops.length} de {tour.stops.length} · Hecho</Text>
          <Text style={s.title}>¡Tour completado!</Text>
          <Text style={s.sub}>{tour.title}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120)} style={s.stats}>
          {stats.map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={s.statV}>{v}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </Animated.View>
        {visit && <VisitPage tour={tour} visit={visit} animate stampSize={100} />}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
          <View style={{ flex: 1 }}><GhostButton light label="Inicio" onPress={() => router.dismissTo('/')} /></View>
          <View style={{ flex: 1 }}><GhostButton label="Mi pasaporte" onPress={() => router.replace('/passport')} /></View>
        </View>
      </ScrollView>
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: font.serif, fontSize: 34, color: '#fff', marginTop: 4 },
  sub: { fontFamily: font.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  stats: { flexDirection: 'row' },
  statV: { fontFamily: font.black, fontSize: 24, color: '#fff', fontVariant: ['tabular-nums'] },
  statL: { fontFamily: font.bold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
});
