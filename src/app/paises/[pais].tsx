import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { DuotoneImage } from '@/components/DuotoneImage';
import { euros, LockedTourSheet } from '@/components/LockedTour';
import { IconButton } from '@/components/ui';
import { PressableScale, rise } from '@/components/motion';
import { getCountry, toursInCountry } from '@/data/tours';
import type { LockedTour, Tour } from '@/data/types';
import { cumulative, formatDistance } from '@/lib/geo';
import { tintaDeRuta } from '@/lib/ink';
import { routeProgress, usePassport } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, radius, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

function Lock({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} fill={color} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Fila de un tour que se puede hacer: foto de su parada emblema, título y progreso */
function OpenRow({ tour }: { tour: Tour }) {
  const routes = usePassport(s => s.routes);
  const meters = tour.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
  const prog = routeProgress(tour.id, routes[tour.id]);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Abrir ${tour.title}`} scaleTo={0.975} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: tour.id } })} style={s.row}>
      <View style={s.thumb}>
        <DuotoneImage source={tour.stops[tour.emblemStop].photo} palette={tour.palette} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[s.swatch, { backgroundColor: tintaDeRuta(tour.accent) }]} />
      <View style={s.rowText}>
        <Text style={[s.cat, { color: tour.palette.t }]} numberOfLines={1}>{tour.category}</Text>
        <Text style={s.title} numberOfLines={3}>{tour.title}</Text>
        <Text style={type.caption} numberOfLines={1}>
          {tour.durationMin} min · {formatDistance(meters)} · {prog.completed ? 'Postal ganada' : prog.started ? `${prog.done} de ${prog.total} sellos` : `${tour.stops.length} paradas`}
        </Text>
      </View>
      {tour.price === 'free' && <View style={s.free}><Text style={s.freeText}>Gratis</Text></View>}
    </PressableScale>
  );
}

/** Fila de un tour de pago bloqueado: su paleta en lugar de foto y el precio */
function LockedRow({ tour, onPress }: { tour: LockedTour; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${tour.title}, tour de pago bloqueado, ${euros(tour.eur)}`} scaleTo={0.975} onPress={onPress} style={s.row}>
      <View style={[s.thumb, { backgroundColor: tour.palette.deep, alignItems: 'center', justifyContent: 'center' }]}>
        <View style={[s.dot, { backgroundColor: tour.palette.t2 }]} />
      </View>
      <View style={[s.swatch, { backgroundColor: tour.palette.t }]} />
      <View style={[s.rowText, { opacity: 0.85 }]}>
        <Text style={[s.cat, { color: tour.palette.t }]} numberOfLines={1}>{tour.category}</Text>
        <Text style={s.title} numberOfLines={3}>{tour.title}</Text>
        <Text style={type.caption} numberOfLines={1}>{tour.durationMin} min · {tour.stops} paradas</Text>
      </View>
      <View style={s.price}>
        <Lock color="#fff" />
        <Text style={s.priceText}>{euros(tour.eur)}</Text>
      </View>
    </PressableScale>
  );
}

/** Tours de un país, agrupados por ciudad. Desde aquí se abre un tour o se cambia la ciudad de Inicio. */
export default function Pais() {
  const insets = useSafeAreaInsets();
  const { pais } = useLocalSearchParams<{ pais: string }>();
  const country = getCountry(pais);
  const city = useSettings(s => s.city);
  const setCity = useSettings(s => s.setCity);
  const [sheet, setSheet] = useState<LockedTour | null>(null);
  const groups = country ? toursInCountry(country.id) : [];
  let n = 3;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 18, gap: 10 }}>
        <IconButton label="Volver" icon="back" onPress={() => router.back()} />
        <Animated.View entering={rise(1)} style={s.head}>
          <Text style={s.flag}>{country?.flag}</Text>
          <Text style={[type.hero, { fontSize: 38, lineHeight: 42, flex: 1 }]}>{country?.name ?? 'País'}</Text>
        </Animated.View>
        {groups.length === 0 && <Animated.Text entering={rise(2)} style={type.body}>Aún no hay tours en este país. Muy pronto.</Animated.Text>}

        {groups.map(g => (
          <View key={g.city.id} style={{ gap: 10 }}>
            <Animated.View entering={rise(n++)} style={s.cityHead}>
              <View style={{ flex: 1 }}>
                <Text style={type.overline}>{g.city.region}</Text>
                <Text style={type.title}>{g.city.name}</Text>
              </View>
              {city === g.city.id ? (
                <Text style={s.homeOn}>En Inicio</Text>
              ) : (
                <PressableScale accessibilityRole="button" accessibilityLabel={`Ver ${g.city.name} en Inicio`} onPress={() => { setCity(g.city.id); router.dismissTo('/'); }} style={s.homeBtn}>
                  <Text style={s.homeBtnText}>Ver en Inicio</Text>
                </PressableScale>
              )}
            </Animated.View>
            {g.open.map(t => (
              <Animated.View key={t.id} entering={rise(n++)}><OpenRow tour={t} /></Animated.View>
            ))}
            {g.locked.map(t => (
              <Animated.View key={t.id} entering={rise(n++)}><LockedRow tour={t} onPress={() => setSheet(t)} /></Animated.View>
            ))}
          </View>
        ))}
      </ScrollView>
      {sheet && <LockedTourSheet tour={sheet} onClose={() => setSheet(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  flag: { fontSize: 40, lineHeight: 48 },
  cityHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14 },
  homeBtn: { height: 32, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: neutral.bg2, justifyContent: 'center' },
  homeBtnText: { fontFamily: font.black, fontSize: 12.5, color: neutral.ink },
  homeOn: { fontFamily: font.black, fontSize: 12.5, color: neutral.ink3, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, backgroundColor: neutral.surface, ...shadow[1] },
  thumb: { width: 60, height: 60, borderRadius: 14, overflow: 'hidden' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: '#fff' },
  swatch: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  rowText: { flex: 1, minWidth: 0 },
  cat: { fontFamily: font.black, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: font.serif, fontSize: 18, lineHeight: 21, color: neutral.ink, marginVertical: 2 },
  free: { alignSelf: 'flex-start', backgroundColor: brand.sun, borderRadius: radius.pill, paddingHorizontal: 9, height: 24, justifyContent: 'center' },
  freeText: { fontFamily: font.black, fontSize: 11.5, color: neutral.ink },
  price: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: neutral.ink, borderRadius: radius.pill, paddingHorizontal: 9, height: 24 },
  priceText: { fontFamily: font.black, fontSize: 11.5, color: '#fff' },
});
