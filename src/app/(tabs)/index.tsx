import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityArt } from '@/components/CityArt';
import { Compass } from '@/components/Compass';
import { TourBanner } from '@/components/TourBanner';
import { lightTap, PressableScale, rise } from '@/components/motion';
import { ResumeStrip } from '@/components/ResumeStrip';
import { durationLabel, Icon } from '@/components/RouteCard';
import { IconButton } from '@/components/ui';
import { CITIES, getTour, toursIn, TOURS, type City } from '@/data/tours';
import type { LngLat } from '@/data/types';
import { nearestStart, sortByDistance, startLabel, NEARBY_MAX_M } from '@/lib/nearby';
import { shortestFree } from '@/lib/routeFilter';
import { useNearby } from '@/lib/useNearby';
import { routeProgress, usePassport, type UserRoute } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, shadow } from '@/theme/tokens';
import { useType } from '@/theme/type';

/** Proporción de las ilustraciones de ciudad (960 × 600): la tarjeta la respeta para que el dibujo se vea entero */
const ART_RATIO = 960 / 600;

/** Tarjeta de ciudad: su ilustración entera, sin nada encima, y debajo el nombre y cuántos tours tiene */
function CityCard({ city, current, routes, pos }: { city: City; current: boolean; routes: Record<string, UserRoute>; pos: LngLat | null }) {
  const setCity = useSettings(s => s.setCity);
  const { open, locked } = toursIn(city.id);
  const cover = city.coverTour ? getTour(city.coverTour) : undefined;
  const completed = open.filter(t => routeProgress(t.id, routes[t.id]).completed).length;
  // «Cerca de ti»: solo si ya hay permiso y la ruta más cercana de esta ciudad está a una distancia razonable
  const near = nearestStart(pos, open);
  const nearLabel = near && near.meters <= NEARBY_MAX_M ? startLabel(near.meters) : null;
  const choose = () => {
    lightTap();
    // La última ciudad elegida sale primero la próxima vez
    setCity(city.id);
    router.push({ pathname: '/rutas/[ciudad]', params: { ciudad: city.id } });
  };
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${city.name}, ${city.region}: ${open.length + locked.length} rutas${open.length ? `, ${completed} completadas` : ', próximamente'}${nearLabel ? `. Cerca de ti: ${nearLabel}` : ''}`}
      accessibilityState={{ selected: current }}
      onPress={choose}
      scaleTo={0.97}
      style={s.card}
    >
      <View style={s.art}>
        {city.art ? <Image source={city.art} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityIgnoresInvertColors /> : cover ? <TourBanner tour={cover} /> : <CityArt id={city.id} palette={city.palette} />}
      </View>
      <View style={s.cardText}>
        <Text style={s.region}>{city.region}</Text>
        <Text style={s.city}>{city.name}</Text>
        <View style={s.badges}>
          {open.length > 0 && <Text maxFontSizeMultiplier={1.3} style={[s.badge, s.badgeOpen]}>{open.length} {open.length === 1 ? 'tour' : 'tours'}</Text>}
          {completed > 0 && <Text maxFontSizeMultiplier={1.3} style={[s.badge, s.badgeLocked]}>{completed}/{open.length} hechas</Text>}
          {locked.length > 0 && (
            <View style={[s.badge, s.badgeLocked, s.badgeRow]}>
              <Icon name="lock" color={neutral.white} size={12} />
              <Text maxFontSizeMultiplier={1.3} style={s.badgeLockedText}>{locked.length} de pago</Text>
            </View>
          )}
          {open.length === 0 && <Text maxFontSizeMultiplier={1.3} style={[s.badge, s.badgeLocked]}>Próximamente</Text>}
          {nearLabel && <Text maxFontSizeMultiplier={1.3} style={[s.badge, s.badgeLocked]}>Cerca de ti · {nearLabel}</Text>}
        </View>
      </View>
    </PressableScale>
  );
}

/** Inicio: aquí se elige ciudad (cada una con su ilustración); al tocar una se ven sus rutas */
export default function Home() {
  const insets = useSafeAreaInsets();
  const type = useType();
  const pos = useNearby();
  const routes = usePassport(s => s.routes);
  const city = useSettings(s => s.city);
  // La última ciudad elegida va primero
  const chosenFirst = [...CITIES].sort((a, b) => Number(b.id === city) - Number(a.id === city));
  // Con permiso de ubicación ya concedido, la ciudad con una ruta más cerca va delante (si estás en ella)
  const cities = sortByDistance(chosenFirst, pos, c => {
    const m = nearestStart(pos, toursIn(c.id).open)?.meters;
    return m != null && m <= NEARBY_MAX_M ? m : null;
  });
  // Cuántos sellos lleva en total (sin ninguno, se sugiere la primera ruta)
  const stamps = TOURS.flatMap(t => routes[t.id]?.stamps ?? []);

  // Sin ningún sello aún: se sugiere la ruta gratis más corta
  const first = stamps.length === 0 ? shortestFree(TOURS) : undefined;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 12 }}>
      <Animated.View entering={rise(0)} style={s.top}>
        <View style={s.brandRow} accessible accessibilityRole="header" accessibilityLabel="Paseo">
          <Compass size={28} ring={brand.primary} needle={brand.navy} />
          <Text style={[type.overline, { color: brand.primary }]}>Paseo</Text>
        </View>
        <View style={{ flex: 1 }} />
        <IconButton label="Mapa de rutas" icon="map" onPress={() => router.push('/mapa')} style={s.settings} />
        <IconButton label="Ajustes" icon="settings" onPress={() => router.push('/ajustes')} style={s.settings} />
      </Animated.View>
      <Animated.Text entering={rise(1)} accessibilityRole="header" style={s.hello}>¿Dónde paseamos hoy?</Animated.Text>
      <Animated.View entering={rise(2)} style={{ gap: 6 }}>
        {first ? (
          <PressableScale accessibilityRole="button" accessibilityLabel={`Tu primer paseo: ${first.title}, ${durationLabel(first.durationMin)}, ${first.stops.length} paradas, gratis`} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: first.id } })} scaleTo={0.975} style={[s.first, { backgroundColor: first.palette.deep }]}>
            <Text style={[s.firstOver, { color: first.palette.t2 }]}>Tu primer paseo</Text>
            <Text style={s.firstTitle}>{first.title}</Text>
            <Text style={s.firstMeta}>{durationLabel(first.durationMin)} · {first.stops.length} paradas · gratis</Text>
          </PressableScale>
        ) : null}
        {stamps.length === 0 && !first && <Text style={[type.caption, { marginLeft: 6 }]}>Haz tu primera ruta para ganar un sello</Text>}
      </Animated.View>

      <View style={{ height: 4 }} />
      <ResumeStrip tourIds={TOURS.map(t => t.id)} />
      {cities.map((c, i) => (
        <Animated.View key={c.id} entering={rise(i + 3)}>
          <CityCard city={c} current={c.id === city} routes={routes} pos={pos} />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settings: { width: 38, height: 38, backgroundColor: neutral.surface, ...shadow[1] },
  hello: { fontFamily: font.serifBold, fontSize: 30, lineHeight: 34, color: neutral.ink },
  first: { borderRadius: 20, padding: 16, gap: 3, ...shadow[1] },
  firstOver: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  firstTitle: { fontFamily: font.serifBold, fontSize: 22, lineHeight: 26, color: neutral.white },
  firstMeta: { fontFamily: font.bold, fontSize: 13.5, color: 'rgba(255,255,255,0.85)' },
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: neutral.ink, ...shadow[2] },
  art: { aspectRatio: ART_RATIO },
  cardText: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 2 },
  region: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  city: { fontFamily: font.serif, fontSize: 36, lineHeight: 40, color: neutral.white },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { fontFamily: font.black, fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeOpen: { backgroundColor: brand.sun, color: neutral.ink },
  badgeLocked: { backgroundColor: 'rgba(255,255,255,0.2)', color: neutral.white },
  badgeLockedText: { fontFamily: font.black, fontSize: 12, color: neutral.white },
});
