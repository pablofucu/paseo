import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityArt } from '@/components/CityArt';
import { Compass } from '@/components/Compass';
import { TourBanner } from '@/components/TourBanner';
import { PressableScale, rise } from '@/components/motion';
import { ResumeStrip } from '@/components/ResumeStrip';
import { Stat } from '@/components/RouteCard';
import { RouteStamp } from '@/components/RouteStamp';
import { Scrim } from '@/components/Scrim';
import { IconButton } from '@/components/ui';
import { CITIES, getCity, getTour, toursIn, TOURS, type City } from '@/data/tours';
import type { LngLat } from '@/data/types';
import { nearestStart, sortByDistance, startLabel, NEARBY_MAX_M } from '@/lib/nearby';
import { useNearby } from '@/lib/useNearby';
import { routeProgress, usePassport, type UserRoute } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, shadow } from '@/theme/tokens';
import { useType } from '@/theme/type';

/** Tarjeta de ciudad (modelo G1): su foto o dibujo, los sellos de sus paradas y cuántos tours tiene */
function CityCard({ city, routes, pos }: { city: City; routes: Record<string, UserRoute>; pos: LngLat | null }) {
  const { open, locked } = toursIn(city.id);
  const cover = city.coverTour ? getTour(city.coverTour) : undefined;
  const progress = open.map(t => routeProgress(t.id, routes[t.id]));
  const completed = progress.filter(pr => pr.completed).length;
  const free = open.filter(t => t.price === 'free').length;
  const p = city.palette;
  // «Cerca de ti»: solo si ya hay permiso y la ruta más cercana de esta ciudad está a una distancia razonable
  const near = nearestStart(pos, open);
  const nearLabel = near && near.meters <= NEARBY_MAX_M ? startLabel(near.meters) : null;
  const soon = open.length === 0;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${city.name}: ${open.length + locked.length} rutas${open.length ? `, ${completed} completadas` : ', próximamente'}${nearLabel ? `. Cerca de ti: ${nearLabel}` : ''}`}
      scaleTo={0.975}
      onPress={() => router.push({ pathname: '/rutas/[ciudad]', params: { ciudad: city.id } })}
      style={s.card}
    >
      <View style={s.hero}>
        {cover ? <TourBanner tour={cover} /> : <CityArt id={city.id} palette={p} />}
        <Scrim color={p.deep} opacity={0.75} />
        <Text style={s.city}>{city.name}</Text>
        {/* Un sello por ruta, con el dibujo de su postal: matasellado al completarla; los de pago, en blanco */}
        <View style={s.coll}>
          {open.map((t, i) => <RouteStamp key={t.id} tour={t} done={progress[i].done} total={progress[i].total} height={34} />)}
          {locked.map(t => <RouteStamp key={t.id} locked={t} height={34} />)}
        </View>
      </View>
      <View style={s.cardBody}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={s.stats}>
            <Stat icon="ticket" color={p.t}>{open.length + locked.length} rutas</Stat>
            {free > 0 && <View style={s.stat}><View style={s.sunDot} /><Text maxFontSizeMultiplier={1.3} style={s.statText}>{free} gratis</Text></View>}
            {locked.length > 0 && <Stat icon="lock" color={neutral.ink3}>{locked.length} de pago</Stat>}
          </View>
          {soon && <Text style={s.soonText}>Sus rutas todavía se están preparando. Pronto podrás desbloquearlas.</Text>}
          {nearLabel && <Text maxFontSizeMultiplier={1.3} style={[s.nearText, { color: p.t }]}>Cerca de ti · {nearLabel}</Text>}
        </View>
        {soon
          ? <Text maxFontSizeMultiplier={1.3} style={[s.cnt, { backgroundColor: neutral.bg2, color: neutral.ink2 }]}>Próximamente</Text>
          : <Text maxFontSizeMultiplier={1.3} style={[s.cnt, { backgroundColor: p.soft, color: p.deep }]}>{completed}/{open.length} hechas</Text>}
      </View>
    </PressableScale>
  );
}

/** Inicio (modelo G1): las ciudades, cada una con sus sellos; al tocar una se ven sus rutas */
export default function Home() {
  const insets = useSafeAreaInsets();
  const type = useType();
  const pos = useNearby();
  const routes = usePassport(s => s.routes);
  const city = useSettings(s => s.city);
  // La ciudad elegida en la bienvenida va primero
  const chosenFirst = [...CITIES].sort((a, b) => Number(b.id === city) - Number(a.id === city));
  // Con permiso de ubicación ya concedido, la ciudad con una ruta más cerca va delante (si estás en ella)
  const cities = sortByDistance(chosenFirst, pos, c => {
    const m = nearestStart(pos, toursIn(c.id).open)?.meters;
    return m != null && m <= NEARBY_MAX_M ? m : null;
  });
  // Tu colección: todos los sellos, los más recientes delante
  const stamps = TOURS.flatMap(t => (routes[t.id]?.stamps ?? []).map(st => ({ date: st.date, ink: getCity(t.area)?.palette.t ?? brand.primary }))).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 12 }}>
      <Animated.View entering={rise(0)} style={s.top}>
        <View style={s.brandRow} accessible accessibilityRole="header" accessibilityLabel="Paseo">
          <Compass size={28} ring={brand.primary} needle={brand.navy} />
          <Text style={[type.overline, { color: brand.primary }]}>Paseo</Text>
        </View>
        <View style={{ flex: 1 }} />
        <IconButton label="Ajustes" icon="settings" onPress={() => router.push('/ajustes')} style={s.settings} />
      </Animated.View>
      <Animated.Text entering={rise(1)} style={s.hello}>¿Dónde paseamos hoy?</Animated.Text>
      <Animated.View entering={rise(2)} style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row' }}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Tu colección: ${stamps.length} sellos. Abrir el pasaporte`} onPress={() => router.push('/pasaporte')} style={s.sumpill}>
          {stamps.length > 0 && (
            <View style={{ flexDirection: 'row' }}>
              {stamps.slice(0, 4).map((st, i) => <View key={i} style={[s.mini, { backgroundColor: st.ink, marginLeft: i ? -7 : 0 }]} />)}
            </View>
          )}
          <Text maxFontSizeMultiplier={1.3} style={s.sumText}>Tu colección · {stamps.length} {stamps.length === 1 ? 'sello' : 'sellos'}</Text>
        </PressableScale>
        </View>
        {stamps.length === 0 && <Text style={[type.caption, { marginLeft: 6 }]}>Haz tu primera ruta para ganar un sello</Text>}
      </Animated.View>

      <View style={{ height: 4 }} />
      <ResumeStrip tourIds={TOURS.map(t => t.id)} />
      {cities.map((c, i) => (
        <Animated.View key={c.id} entering={rise(i + 3)}>
          <CityCard city={c} routes={routes} pos={pos} />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  soonText: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: neutral.ink2 },
  nearText: { fontFamily: font.black, fontSize: 12.5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settings: { width: 38, height: 38, backgroundColor: neutral.surface, ...shadow[1] },
  hello: { fontFamily: font.serifBold, fontSize: 30, lineHeight: 34, color: neutral.ink },
  sumpill: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, paddingVertical: 4, paddingLeft: 6, paddingRight: 14, borderRadius: 999, backgroundColor: neutral.ink },
  mini: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: neutral.ink },
  sumText: { fontFamily: font.black, fontSize: 13, color: neutral.white, paddingLeft: 6 },
  card: { backgroundColor: neutral.surface, borderRadius: 22, overflow: 'hidden', ...shadow[2] },
  hero: { height: 112 },
  city: { position: 'absolute', left: 16, bottom: 10, fontFamily: font.serif, fontSize: 30, lineHeight: 34, color: neutral.white, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 10 },
  coll: { position: 'absolute', right: 12, bottom: 10, flexDirection: 'row', gap: 6 },
  cardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  stats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontFamily: font.black, fontSize: 13.5, color: neutral.ink },
  sunDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: brand.sun },
  cnt: { fontFamily: font.black, fontSize: 12.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
});
