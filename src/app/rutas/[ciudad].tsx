import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockedTourSheet } from '@/components/LockedTour';
import { PressableScale, rise } from '@/components/motion';
import { LockedRouteCard, TourRouteCard } from '@/components/RouteCard';
import { ResumeStrip } from '@/components/ResumeStrip';
import { RouteStamp } from '@/components/RouteStamp';
import { GhostButton, IconButton } from '@/components/ui';
import { getCity, toursIn } from '@/data/tours';
import type { LockedTour } from '@/data/types';
import { goBack } from '@/lib/nav';
import { metersToStart, sortByDistance } from '@/lib/nearby';
import { DURATION_FILTERS, matchesDuration, matchesPrice, PRICE_FILTERS, shouldFilter, type DurationFilter, type PriceFilter } from '@/lib/routeFilter';
import { useNearby } from '@/lib/useNearby';
import { routeProgress, usePassport } from '@/store/passport';
import type { CityId } from '@/store/settings';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { useType } from '@/theme/type';

/** Chip de filtro: una opción de una fila; la elegida va en oscuro */
function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} scaleTo={0.94} onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.chipText, on && { color: neutral.white }]}>{label}</Text>
    </PressableScale>
  );
}

/** Rutas de una ciudad (modelo G2): sus sellos arriba y cada tour con su ruta dibujada */
export default function CityRoutes() {
  const insets = useSafeAreaInsets();
  const type = useType();
  const { ciudad } = useLocalSearchParams<{ ciudad: string }>();
  const city = getCity(ciudad);
  const routes = usePassport(s => s.routes);
  const pos = useNearby();
  const [sheet, setSheet] = useState<LockedTour | null>(null);
  const [duration, setDuration] = useState<DurationFilter>('all');
  const [price, setPrice] = useState<PriceFilter>('all');

  // Ciudad que no existe (enlace viejo o mal escrito): aviso y salida al inicio
  if (!city) {
    return (
      <View style={[s.empty, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}>
        <IconButton label="Volver" icon="back" onPress={goBack} style={{ marginLeft: -4 }} />
        <View style={s.emptyBody}>
          <Text style={type.title}>No encontramos esa ciudad</Text>
          <Text style={[type.body, { textAlign: 'center' }]}>El enlace no lleva a ninguna ciudad de Paseo. Vuelve al inicio para ver las que hay.</Text>
          <GhostButton label="Volver al inicio" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  const all = toursIn(city.id as CityId);
  const open = sortByDistance(all.open, pos, t => metersToStart(pos!, t));
  const locked = all.locked;
  const total = open.length + locked.length;
  const filtering = shouldFilter(total);
  const shownOpen = filtering ? open.filter(t => matchesDuration(t.durationMin, duration) && matchesPrice(t.price === 'free', price)) : open;
  const shownLocked = filtering ? locked.filter(t => matchesDuration(t.durationMin, duration) && matchesPrice(false, price)) : locked;
  const progress = open.map(t => routeProgress(t.id, routes[t.id]));
  const completed = progress.filter(pr => pr.completed).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 12 }}>
        <IconButton label="Volver" icon="back" onPress={goBack} style={{ marginLeft: -4 }} />
        <Animated.Text entering={rise(1)} style={s.city}>{city.name}</Animated.Text>
        <Animated.View entering={rise(2)} style={s.dotsRow} accessible accessibilityLabel={`${completed} de ${open.length} rutas completadas`}>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {open.map((t, i) => <RouteStamp key={t.id} tour={t} done={progress[i].done} total={progress[i].total} height={50} rotate={i % 2 ? 3 : -3} />)}
            {locked.map(t => <RouteStamp key={t.id} locked={t} height={50} />)}
          </View>
          {open.length > 0 && <Text style={s.count}><Text style={{ color: neutral.ink, fontFamily: font.black }}>{completed} de {open.length}</Text> hechas</Text>}
        </Animated.View>
        <View style={{ height: 6 }} />
        <ResumeStrip tourIds={open.map(t => t.id)} />
        {filtering && (
          <Animated.View entering={rise(3)} style={{ gap: 8 }}>
            <View style={s.chips}>
              {DURATION_FILTERS.map(f => <FilterChip key={f.id} label={f.label} on={duration === f.id} onPress={() => setDuration(f.id)} />)}
            </View>
            <View style={s.chips}>
              {PRICE_FILTERS.map(f => <FilterChip key={f.id} label={f.label} on={price === f.id} onPress={() => setPrice(f.id)} />)}
            </View>
          </Animated.View>
        )}
        {shownOpen.map((t, i) => (
          <Animated.View key={t.id} entering={rise(3 + i)}><TourRouteCard tour={t} route={routes[t.id]} startMeters={pos ? metersToStart(pos, t) : null} /></Animated.View>
        ))}
        {shownLocked.map((t, i) => (
          <Animated.View key={t.id} entering={rise(3 + shownOpen.length + i)}><LockedRouteCard tour={t} onPress={() => setSheet(t)} /></Animated.View>
        ))}
        {shownOpen.length + shownLocked.length === 0 && (
          <View style={s.none}>
            <Text style={type.body}>Ninguna ruta cumple esos filtros.</Text>
            <GhostButton label="Quitar filtros" onPress={() => { setDuration('all'); setPrice('all'); }} />
          </View>
        )}
      </ScrollView>
      {sheet && <LockedTourSheet tour={sheet} onClose={() => setSheet(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  city: { fontFamily: font.serif, fontSize: 40, lineHeight: 44, color: neutral.ink, marginTop: 6 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { fontFamily: font.heavy, fontSize: 13.5, color: neutral.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 34, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: neutral.surface, borderWidth: 1.5, borderColor: neutral.line },
  chipOn: { backgroundColor: neutral.ink, borderColor: neutral.ink },
  chipText: { fontFamily: font.heavy, fontSize: 13.5, color: neutral.ink },
  none: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  empty: { flex: 1, backgroundColor: neutral.bg, paddingHorizontal: 20 },
  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 12, paddingBottom: 60 },
});
