import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { useHeroMotion } from '@/components/HeroMotion';
import { Scrim } from '@/components/Scrim';
import { DUR, EASE_OUT, rise } from '@/components/motion';
import { Postcard } from '@/components/Postcard';
import { inkOf, RubberStamp } from '@/components/RubberStamp';
import { Chip, IconButton, PrimaryButton } from '@/components/ui';
import { KIND_LABEL } from '@/data/types';
import { cumulative, formatDistance } from '@/lib/geo';
import { useTourParam } from '@/lib/useTour';
import { useTourRoute } from '@/lib/useTourRoute';
import { stampBox } from '@/lib/sheet';
import { routeProgress, usePassport, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

const HERO = 290;

/** Los sellos asoman como tinta que se asienta, uno detrás de otro, sin rebote */
const stampIn = (i: number) => ZoomIn.delay(350 + i * 80).duration(DUR.slow).easing(EASE_OUT).withInitialValues({ transform: [{ scale: 1.04 }] });

export default function Cover() {
  const tour = useTourParam();
  const insets = useSafeAreaInsets();
  const startWalk = usePassport(s => s.startWalk);
  const saved = useRoute(tour.id);
  const prog = routeProgress(tour.id, saved);
  const route = useTourRoute(tour);
  const meters = route.legs.reduce((a, l) => a + cumulative(l.line).at(-1)!, 0);
  const p = tour.palette;
  const ink = inkOf(tour);

  // Cada parada se sella una vez: si la ruta está a medias, se sigue por la primera sin sellar
  const nextStop = prog.started && !prog.allStamped ? tour.stops.findIndex(st => !saved?.stamps.some(x => x.stopId === st.id)) : -1;
  const walkFrom = (target: number) => {
    startWalk(tour.id, target);
    router.push({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(target) } });
  };
  const cell = tour.stops.length > 4 ? 300 * 0.21 : 300 * 0.25;
  const { onScroll, photo, veil } = useHeroMotion(HERO);

  return (
    <TourThemeProvider palette={p}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ height: HERO, overflow: 'hidden' }}>
          <Animated.View style={[StyleSheet.absoluteFill, photo]}>
            <DuotoneImage source={tour.stops[tour.emblemStop].photo} palette={p} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Scrim opacity={0.5} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: neutral.bg }, veil]} />
          <Animated.Text entering={FadeInDown.delay(120).duration(DUR.slow).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })} style={s.heroCity}>{tour.city}</Animated.Text>
        </View>
        <Animated.View entering={rise(1)} style={s.body}>
          <Text style={[type.overline, { color: p.t }]}>{tour.category} · {tour.city}</Text>
          <Text style={type.title}>{tour.title}</Text>
          <View style={s.chips}>
            <Chip>{tour.durationMin} min</Chip>
            <Chip>{formatDistance(meters)}</Chip>
            <Chip>{tour.stops.length} paradas</Chip>
          </View>
          <Text style={type.body}>{tour.intro}</Text>

          <Text style={[type.headline, s.h]}>Paradas</Text>
          {tour.stops.map((st, i) => (
            <Animated.View key={st.id} entering={rise(i + 3)} style={s.stop}>
              <View style={[s.pin, { borderColor: p.t }]}><Text style={[s.pinText, { color: p.t }]}>{i + 1}</Text></View>
              <DuotoneImage source={st.photo} palette={p} style={s.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={s.stopName}>{st.name}</Text>
                <Text style={type.caption}>{i === 0 ? 'Inicio' : KIND_LABEL[st.kind]}</Text>
              </View>
            </Animated.View>
          ))}
          <Text style={[type.headline, s.h]}>Sellos que puedes conseguir</Text>
          <View style={s.progress}>
            <View style={[s.bar, { width: `${(prog.done / prog.total) * 100}%`, backgroundColor: ink }]} />
          </View>
          <Text style={type.caption}>{prog.done} de {prog.total} sellos · cada parada se sella una vez</Text>
          <View style={s.stamps}>
            {tour.stops.map((st, i) => {
              const got = saved?.stamps.find(x => x.stopId === st.id);
              const b = stampBox(st.rubber.shape, cell * 2.5);
              return (
                <Animated.View key={st.id} entering={stampIn(i)} style={[s.stampCell, { width: `${100 / Math.min(5, tour.stops.length)}%` }]}>
                  <View style={{ height: cell * 0.85, justifyContent: 'center', opacity: got ? 1 : 0.22 }}>
                    <RubberStamp tour={tour} stop={st} date={got?.date ?? new Date().toISOString()} width={b.w} height={b.h} style={{ transform: [{ rotate: `${got ? got.rot / 2 : 0}deg` }] }} />
                  </View>
                  <Text style={s.stampName} numberOfLines={2}>{st.name}</Text>
                </Animated.View>
              );
            })}
          </View>

          <Text style={[type.headline, s.h]}>Tu postal</Text>
          <Pressable accessibilityRole="button" disabled={!prog.completed} onPress={() => router.push({ pathname: '/postal/[id]', params: { id: tour.id } })} style={{ alignItems: 'center', gap: 6 }}>
            <Postcard tour={tour} route={saved} width={300} />
            <Text style={type.caption}>{prog.completed ? 'Ganada · tócala para verla' : 'Con todos los sellos te llevas esta postal'}</Text>
          </Pressable>

        </Animated.View>
      </Animated.ScrollView>
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
  restart: { alignSelf: 'center', paddingTop: 10 },
  restartText: { fontFamily: font.heavy, fontSize: 14, color: neutral.ink2, textDecorationLine: 'underline' },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, backgroundColor: neutral.bg, borderTopWidth: 1, borderTopColor: neutral.line },
});
