import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MadridArt } from '@/components/CityArt';
import { DuotoneImage } from '@/components/DuotoneImage';
import { PressableScale, rise } from '@/components/motion';
import { ResumeStrip } from '@/components/ResumeStrip';
import { Stat } from '@/components/RouteCard';
import { RouteStamp } from '@/components/RouteStamp';
import { Scrim } from '@/components/Scrim';
import { IconButton } from '@/components/ui';
import { CITIES, getCity, getTour, toursIn, TOURS, type City } from '@/data/tours';
import { routeProgress, usePassport, type UserRoute } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

/** Tarjeta de ciudad (modelo G1): su foto o dibujo, los sellos de sus paradas y cuántos tours tiene */
function CityCard({ city, routes }: { city: City; routes: Record<string, UserRoute> }) {
  const { open, locked } = toursIn(city.id);
  const cover = city.coverTour ? getTour(city.coverTour) : undefined;
  const progress = open.map(t => routeProgress(t.id, routes[t.id]));
  const completed = progress.filter(pr => pr.completed).length;
  const free = open.filter(t => t.price === 'free').length;
  const p = city.palette;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${city.name}: ${open.length + locked.length} rutas${open.length ? `, ${completed} completadas` : ''}`}
      scaleTo={0.975}
      onPress={() => router.push({ pathname: '/rutas/[ciudad]', params: { ciudad: city.id } })}
      style={s.card}
    >
      <View style={s.hero}>
        {cover ? <DuotoneImage source={cover.stops[cover.emblemStop].photo} palette={cover.palette} style={StyleSheet.absoluteFill} /> : city.id === 'madrid' ? <MadridArt /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: p.deep }]} />}
        <Scrim color={p.deep} opacity={0.75} />
        <Text style={s.city}>{city.name}</Text>
        {/* Un sello por ruta, con el dibujo de su postal: matasellado al completarla; los de pago, en blanco */}
        <View style={s.coll}>
          {open.map((t, i) => <RouteStamp key={t.id} tour={t} done={progress[i].done} total={progress[i].total} height={34} />)}
          {locked.map(t => <RouteStamp key={t.id} height={34} />)}
        </View>
      </View>
      <View style={s.cardBody}>
        <View style={s.stats}>
          <Stat icon="ticket" color={p.t}>{open.length + locked.length} rutas</Stat>
          {free > 0 && <View style={s.stat}><View style={s.sunDot} /><Text style={s.statText}>{free} gratis</Text></View>}
          {locked.length > 0 && <Stat icon="lock" color={neutral.ink3}>{locked.length} de pago</Stat>}
        </View>
        {open.length > 0 && <Text style={[s.cnt, { backgroundColor: p.soft, color: p.deep }]}>{completed}/{open.length} hechas</Text>}
      </View>
    </PressableScale>
  );
}

/** Inicio (modelo G1): las ciudades, cada una con sus sellos; al tocar una se ven sus rutas */
export default function Home() {
  const insets = useSafeAreaInsets();
  const routes = usePassport(s => s.routes);
  const city = useSettings(s => s.city);
  // La ciudad elegida en la bienvenida va primero
  const cities = [...CITIES].sort((a, b) => Number(b.id === city) - Number(a.id === city));
  // Tu colección: todos los sellos, los más recientes delante
  const stamps = TOURS.flatMap(t => (routes[t.id]?.stamps ?? []).map(st => ({ date: st.date, ink: getCity(t.area)?.palette.t ?? brand.coral }))).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 12 }}>
      <Animated.View entering={rise(0)} style={s.top}>
        <Text style={[type.overline, { color: brand.coral, flex: 1 }]}>Paseo</Text>
        <IconButton label="Ajustes" icon="settings" onPress={() => router.push('/ajustes')} style={s.settings} />
      </Animated.View>
      <Animated.Text entering={rise(1)} style={s.hello}>¿Dónde paseamos hoy?</Animated.Text>
      <Animated.View entering={rise(2)} style={{ flexDirection: 'row' }}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Tu colección: ${stamps.length} sellos. Abrir el pasaporte`} onPress={() => router.push('/pasaporte')} style={s.sumpill}>
          {stamps.length > 0 && (
            <View style={{ flexDirection: 'row' }}>
              {stamps.slice(0, 4).map((st, i) => <View key={i} style={[s.mini, { backgroundColor: st.ink, marginLeft: i ? -7 : 0 }]} />)}
            </View>
          )}
          <Text style={s.sumText}>Tu colección · {stamps.length} {stamps.length === 1 ? 'sello' : 'sellos'}</Text>
        </PressableScale>
      </Animated.View>

      <View style={{ height: 4 }} />
      <ResumeStrip tourIds={TOURS.map(t => t.id)} />
      {cities.map((c, i) => (
        <Animated.View key={c.id} entering={rise(i + 3)}>
          <CityCard city={c} routes={routes} />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settings: { width: 38, height: 38, backgroundColor: neutral.surface, ...shadow[1] },
  hello: { fontFamily: font.serif, fontSize: 30, lineHeight: 34, color: neutral.ink },
  sumpill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingLeft: 6, paddingRight: 14, borderRadius: 999, backgroundColor: neutral.ink },
  mini: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: neutral.ink },
  sumText: { fontFamily: font.black, fontSize: 13, color: '#fff', paddingLeft: 6 },
  card: { backgroundColor: neutral.surface, borderRadius: 22, overflow: 'hidden', ...shadow[2] },
  hero: { height: 112 },
  city: { position: 'absolute', left: 16, bottom: 10, fontFamily: font.serif, fontSize: 30, lineHeight: 34, color: '#fff', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 10 },
  coll: { position: 'absolute', right: 12, bottom: 10, flexDirection: 'row', gap: 6 },
  cardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  stats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontFamily: font.black, fontSize: 13.5, color: neutral.ink },
  sunDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: brand.sun },
  cnt: { fontFamily: font.black, fontSize: 12.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
});
