import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { StopStamp, TourSeal } from '@/components/Stamp';
import { Chip, IconButton, PrimaryButton } from '@/components/ui';
import { KIND_LABEL } from '@/data/types';
import { cumulative, formatDistance } from '@/lib/geo';
import { useTourParam } from '@/lib/useTour';
import { useTourRoute } from '@/lib/useTourRoute';
import { stampDate, usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

export default function Cover() {
  const tour = useTourParam();
  const insets = useSafeAreaInsets();
  const startVisit = usePassport(s => s.startVisit);
  const lastVisit = usePassport(s => [...s.visits].reverse().find(v => v.tourId === tour.id));
  const route = useTourRoute(tour);
  const meters = route.legs.reduce((a, l) => a + cumulative(l.line).at(-1)!, 0);
  const p = tour.palette;

  // Si hay una visita a medias de este tour, se puede continuar donde se dejó
  const resumeVisit = usePassport(s => s.resumeVisit);
  const unfinished = usePassport(s => [...s.visits].reverse().find(v => v.tourId === tour.id && !v.completedAt && Object.keys(v.stamps).length > 0));
  const nextStop = unfinished ? tour.stops.findIndex(st => !unfinished.stamps[st.id]) : -1;
  const start = () => {
    startVisit(tour.id);
    router.push({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: '0' } });
  };
  const resume = () => {
    if (!unfinished) return;
    resumeVisit(unfinished.id);
    router.push({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(Math.max(0, nextStop)) } });
  };

  return (
    <TourThemeProvider palette={p}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ height: 270 }}>
          <DuotoneImage source={tour.stops[tour.emblemStop].photo} palette={p} style={StyleSheet.absoluteFill} />
          <IconButton label="Volver" icon="back" onPress={() => router.back()} style={{ position: 'absolute', left: 16, top: insets.top + 8 }} />
        </View>
        <View style={s.body}>
          <Text style={[type.overline, { color: p.t }]}>{tour.category} · {tour.city}</Text>
          <Text style={type.title}>{tour.title}</Text>
          <View style={s.chips}>
            <Chip>{tour.durationMin} min</Chip>
            <Chip>{formatDistance(meters)}</Chip>
            <Chip>{tour.stops.length} paradas</Chip>
          </View>
          <Text style={type.body}>{tour.intro}</Text>

          <Text style={[type.headline, s.h]}>Sellos que puedes conseguir</Text>
          <View style={s.stamps}>
            {tour.stops.map((st, i) => {
              const got = lastVisit?.stamps[st.id];
              return (
                <View key={st.id} style={[s.stampCell, { width: `${100 / Math.min(5, tour.stops.length)}%` }]}>
                  <StopStamp tour={tour} index={i} date={stampDate(got)} ghost={!got} size={tour.stops.length > 4 ? 62 : 72} />
                  <Text style={s.stampName} numberOfLines={2}>{st.name}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ alignItems: 'center', marginTop: 14, gap: 4 }}>
            <TourSeal tour={tour} width={210} date={stampDate(lastVisit?.completedAt)} collected={tour.stops.map(st => !!lastVisit?.stamps[st.id])} ghost={!lastVisit?.completedAt} />
            <Text style={type.caption}>Con todos los sellos consigues el visado del tour</Text>
          </View>

          <Text style={[type.headline, s.h]}>Paradas</Text>
          {tour.stops.map((st, i) => (
            <View key={st.id} style={s.stop}>
              <View style={[s.pin, { borderColor: p.t }]}><Text style={[s.pinText, { color: p.t }]}>{i + 1}</Text></View>
              <DuotoneImage source={st.photo} palette={p} style={s.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={s.stopName}>{st.name}</Text>
                <Text style={type.caption}>{i === 0 ? 'Inicio' : KIND_LABEL[st.kind]}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
        {unfinished && nextStop >= 0 ? (
          <>
            <PrimaryButton label={`Continuar · parada ${nextStop + 1} de ${tour.stops.length}`} onPress={resume} />
            <Pressable accessibilityRole="button" onPress={start} style={s.restart} hitSlop={6}>
              <Text style={s.restartText}>Empezar de nuevo</Text>
            </Pressable>
          </>
        ) : (
          <PrimaryButton label="Empezar tour" onPress={start} />
        )}
      </View>
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  body: { padding: 18, gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  h: { marginTop: 18, marginBottom: 8 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 10 },
  stampCell: { alignItems: 'center', gap: 4 },
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
