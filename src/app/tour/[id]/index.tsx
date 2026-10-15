import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { TourBanner } from '@/components/TourBanner';
import { useHeroMotion } from '@/components/HeroMotion';
import { Scrim } from '@/components/Scrim';
import { DUR, EASE_OUT, rise } from '@/components/motion';
import { OfflinePack } from '@/components/OfflinePack';
import { TourMapPreview } from '@/components/TourMapPreview';
import { Postcard } from '@/components/Postcard';
import { inkOf, RubberStamp } from '@/components/RubberStamp';
import { RouteStamp } from '@/components/RouteStamp';
import { Chip, GhostButton, IconButton, PrimaryButton } from '@/components/ui';
import { KIND_LABEL } from '@/data/types';
import { cumulative, formatDistance } from '@/lib/geo';
import { formatDuration } from '@/lib/duration';
import { metersToStart, startLabel, walkingDirectionsUrl } from '@/lib/nearby';
import { useNearby } from '@/lib/useNearby';
import { useTourParam } from '@/lib/useTour';
import { useTourRoute } from '@/lib/useTourRoute';
import { stampBox } from '@/lib/sheet';
import { routeProgress, usePassport, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

const HERO = 290;

export default function Cover() {
  const tour = useTourParam();
  const insets = useSafeAreaInsets();
  const startWalk = usePassport(s => s.startWalk);
  const saved = useRoute(tour.id);
  const prog = routeProgress(tour.id, saved);
  const route = useTourRoute(tour);
  const pos = useNearby();
  const meters = route.legs.reduce((a, l) => a + cumulative(l.line).at(-1)!, 0);
  const p = tour.palette;
  const ink = inkOf(tour);
  const routeLines = useMemo(() => route.legs.map(l => l.line), [route]);
  const stampedIds = useMemo(() => new Set(saved?.stamps.map(x => x.stopId)), [saved]);

  // Cada parada se sella una vez: si la ruta está a medias, se sigue por la primera sin sellar
  const nextStop = prog.started && !prog.allStamped ? tour.stops.findIndex(st => !saved?.stamps.some(x => x.stopId === st.id)) : -1;
  const walkFrom = (target: number) => {
    startWalk(tour.id, target);
    router.push({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(target) } });
  };
  const first = tour.stops[0], last = tour.stops[tour.stops.length - 1];
  const fromYou = pos ? startLabel(metersToStart(pos, tour)) : null;
  // «Cómo llegar»: el mapa del móvil, a pie, hasta las coordenadas de la primera parada
  const directions = () => {
    const url = walkingDirectionsUrl(first.coord, first.name, Platform.OS);
    Linking.openURL(url).catch(() => Linking.openURL(walkingDirectionsUrl(first.coord, first.name, 'web')).catch(() => {}));
  };
  const cell = tour.stops.length > 4 ? 300 * 0.21 : 300 * 0.25;
  const { onScroll, photo, veil } = useHeroMotion(HERO);
  // Parada abierta en la vista previa (foto y sello de goma)
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview == null ? null : tour.stops[preview];
  const shownStamp = shown && saved?.stamps.find(x => x.stopId === shown.id);

  return (
    <TourThemeProvider palette={p}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ height: HERO, overflow: 'hidden' }}>
          <Animated.View style={[StyleSheet.absoluteFill, photo]}>
            <TourBanner tour={tour} />
          </Animated.View>
          <Scrim opacity={0.5} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: neutral.bg }, veil]} />
          <Animated.Text entering={FadeInDown.delay(120).duration(DUR.slow).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })} style={s.heroCity}>{tour.city}</Animated.Text>
        </View>
        <Animated.View entering={rise(1)} style={s.body}>
          <Text style={[type.overline, { color: p.t }]}>{tour.category} · {tour.city}</Text>
          <Text accessibilityRole="header" style={type.title}>{tour.title}</Text>
          <View style={s.chips}>
            <Chip>{formatDuration(tour.durationMin)}</Chip>
            <Chip>{formatDistance(meters)}</Chip>
            <Chip>{tour.stops.length} paradas</Chip>
          </View>
          <Text style={type.body}>{tour.intro}</Text>
          <Text style={type.body}>Empieza en {first.name}{last.id !== first.id ? ` · Termina en ${last.name}` : ''}</Text>
          {fromYou && <Text style={type.caption}>{fromYou}</Text>}
          <View style={{ marginTop: 6, marginBottom: 4 }}>
            <GhostButton label="Cómo llegar" onPress={directions} />
          </View>
          <OfflinePack tour={tour} />

          <View style={{ marginTop: 14 }}>
            <TourMapPreview tour={tour} lines={routeLines} stamped={stampedIds} />
          </View>
          <Text accessibilityRole="header" style={[type.headline, s.h]}>Paradas</Text>
          {tour.stops.map((st, i) => (
            <View key={st.id}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Parada ${i + 1}: ${st.name}. Ver foto y sello`} onPress={() => setPreview(i)} style={({ pressed }) => [s.stop, pressed && { opacity: 0.6 }]}>
                <View style={[s.pin, { borderColor: p.t }]}><Text style={[s.pinText, { color: p.t }]}>{i + 1}</Text></View>
                <DuotoneImage source={st.thumb} palette={p} style={s.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={s.stopName}>{st.name}</Text>
                  <Text style={type.caption}>{i === 0 ? 'Inicio' : KIND_LABEL[st.kind]}</Text>
                </View>
                <Text style={s.chev}>›</Text>
              </Pressable>
            </View>
          ))}
          <Text accessibilityRole="header" style={[type.headline, s.h]}>Sellos que puedes conseguir</Text>
          <View style={s.progress}>
            <View style={[s.bar, { width: `${(prog.done / prog.total) * 100}%`, backgroundColor: ink }]} />
          </View>
          <Text style={type.caption}>{prog.done} de {prog.total} sellos · cada parada se sella una vez</Text>
          <View style={s.stamps}>
            {tour.stops.map((st, i) => {
              const got = saved?.stamps.find(x => x.stopId === st.id);
              const b = stampBox(st.rubber.shape, cell * 2.5);
              return (
                <View key={st.id} style={[s.stampCell, { width: `${100 / Math.min(5, tour.stops.length)}%` }]}>
                  <View style={{ height: cell * 0.85, justifyContent: 'center', opacity: got ? 1 : 0.22 }}>
                    <RubberStamp tour={tour} stop={st} date={got?.date ?? new Date().toISOString()} width={b.w} height={b.h} style={{ transform: [{ rotate: `${got ? got.rot / 2 : 0}deg` }] }} />
                  </View>
                  <Text style={s.stampName} numberOfLines={2}>{st.name}</Text>
                </View>
              );
            })}
          </View>

          <Text accessibilityRole="header" style={[type.headline, s.h]}>Sello de la ruta</Text>
          <View style={s.routeStamp}>
            <RouteStamp tour={tour} done={prog.done} total={prog.total} height={132} rotate={-3} />
            <Text style={[type.body, { flex: 1 }]}>{tour.stamp.symbol}</Text>
          </View>

          <Text accessibilityRole="header" style={[type.headline, s.h]}>Tu postal</Text>
          <Pressable accessibilityRole="button" disabled={!prog.completed} onPress={() => router.push({ pathname: '/postal/[id]', params: { id: tour.id } })} style={{ alignItems: 'center', gap: 6 }}>
            <Postcard tour={tour} route={saved} width={300} />
            <Text style={type.caption}>{prog.completed ? 'Ganada · tócala para verla' : 'Con todos los sellos te llevas esta postal'}</Text>
          </Pressable>

        </Animated.View>
      </Animated.ScrollView>
 
      <Modal visible={shown != null} transparent animationType="fade" onRequestClose={() => setPreview(null)} statusBarTranslucent>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar la vista previa" onPress={() => setPreview(null)} style={s.backdrop}>
          {shown && (
            <View style={s.card}>
              <DuotoneImage source={shown.photo} palette={p} style={s.cardPhoto} />
              <View style={s.cardBody}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.overline, { color: p.t }]}>Parada {(preview ?? 0) + 1} de {tour.stops.length} · {KIND_LABEL[shown.kind]}</Text>
                  <Text style={s.stopName}>{shown.name}</Text>
                  <Text style={type.caption}>{shown.arriveHint}</Text>
                </View>
                <View style={{ opacity: shownStamp ? 1 : 0.3 }}>
                  <RubberStamp tour={tour} stop={shown} date={shownStamp?.date ?? new Date().toISOString()} width={stampBox(shown.rubber.shape, 96).w} height={stampBox(shown.rubber.shape, 96).h} />
                </View>
              </View>
              <Text style={s.cardHint}>{shownStamp ? 'Sello conseguido' : 'Sello por conseguir: se pone al llegar a la parada'}</Text>
            </View>
          )}
        </Pressable>
      </Modal>
      <IconButton label="Volver" icon="back" onPress={() => router.back()} style={{ position: 'absolute', left: 16, top: insets.top + 8 }} />
      {/* El botón de empezar aparece con una subida corta cuando la ficha ya está en pantalla */}
      <Animated.View entering={FadeInDown.delay(300).duration(DUR.base).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })} style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
        {nextStop >= 0 ? (
          <>
            <PrimaryButton label={`Continuar · parada ${nextStop + 1} de ${tour.stops.length}`} onPress={() => walkFrom(nextStop)} />
            <Pressable accessibilityRole="button" onPress={() => walkFrom(0)} style={s.restart} hitSlop={6}>
              <Text style={s.restartText}>Empezar desde la primera parada</Text>
            </Pressable>
          </>
        ) : (
          <PrimaryButton label={prog.completed ? 'Volver a hacer la ruta' : 'Empezar tour'} onPress={() => walkFrom(0)} />
        )}
      </Animated.View>
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  body: { padding: 18, gap: 6, backgroundColor: neutral.bg },
  heroCity: { position: 'absolute', left: 18, bottom: 14, fontFamily: font.serif, fontSize: 40, lineHeight: 44, color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  h: { marginTop: 18, marginBottom: 8 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 10 },
  stampCell: { alignItems: 'center', gap: 4 },
  progress: { height: 5, borderRadius: 3, backgroundColor: neutral.line, overflow: 'hidden', marginBottom: 4 },
  bar: { height: 5, borderRadius: 3 },
  stampName: { fontFamily: font.heavy, fontSize: 10.5, color: neutral.ink3, textAlign: 'center' },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  pin: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pinText: { fontFamily: font.black, fontSize: 15 },
  thumb: { width: 46, height: 46, borderRadius: 12 },
  stopName: { fontFamily: font.black, fontSize: 15.5, color: neutral.ink },
  chev: { fontFamily: font.black, fontSize: 24, color: neutral.ink3 },
  routeStamp: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.6)', justifyContent: 'center', padding: 22 },
  card: { backgroundColor: neutral.bg, borderRadius: 22, overflow: 'hidden' },
  cardPhoto: { height: 220 },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  cardHint: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3, paddingHorizontal: 16, paddingBottom: 16, marginTop: -4 },
  restart: { alignSelf: 'center', paddingTop: 10 },
  restartText: { fontFamily: font.heavy, fontSize: 14, color: neutral.ink2, textDecorationLine: 'underline' },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, backgroundColor: neutral.bg, borderTopWidth: 1, borderTopColor: neutral.line },
});
