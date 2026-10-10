import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StopStamp } from '@/components/Stamp';
import { IconButton, PrimaryButton } from '@/components/ui';
import { KIND_LABEL } from '@/data/types';
import { useNarration } from '@/lib/useNarration';
import { useTourParam } from '@/lib/useTour';
import { stampDate, useActiveVisit } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral, radius } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

const CROPS = [{ x: 0.5, y: 0.5, zoom: 1 }, { x: 0.2, y: 0.3, zoom: 1.9 }, { x: 0.8, y: 0.4, zoom: 1.9 }, { x: 0.5, y: 0.85, zoom: 1.6 }];

export default function StopScreen() {
  const tour = useTourParam();
  const params = useLocalSearchParams<{ n: string; arrived?: string }>();
  const n = Number(params.n);
  const stop = tour.stops[n];
  const p = tour.palette;
  const insets = useSafeAreaInsets();
  const visit = useActiveVisit();
  const date = stampDate(visit?.stamps[stop.id]);
  const [arriving, setArriving] = useState(params.arrived === '1');
  const [count, setCount] = useState(3);
  const [gal, setGal] = useState(0);
  const narration = useNarration();
  const script = `${stop.name}. ${stop.p1} Fíjate en ${stop.look} ${stop.p2} ¿Sabías que ${stop.fact}`;
  const last = n === tour.stops.length - 1;

  // Pantalla de llegada: el sello cae y el audio empieza solo a los 3 segundos
  const { speak } = narration;
  const listenNow = useCallback(() => { setArriving(false); speak(script); }, [speak, script]);
  useEffect(() => {
    if (!arriving) return;
    const t = setTimeout(() => (count <= 1 ? listenNow() : setCount(c => c - 1)), 1000);
    return () => clearTimeout(t);
  }, [arriving, count, listenNow]);

  const next = () => {
    narration.stop();
    if (last) router.replace({ pathname: '/tour/[id]/done', params: { id: tour.id } });
    else router.replace({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(n + 1) } });
  };
  const crop = CROPS[gal];

  return (
    <TourThemeProvider palette={p}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Siguiente foto" onPress={() => setGal(g => (g + 1) % 4)} style={s.gallery}>
          <Image source={stop.photo} style={[StyleSheet.absoluteFill, { transform: [{ scale: crop.zoom }] }]} contentFit="cover" contentPosition={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%` }} transition={250} />
          <Text style={s.cap}>{stop.captions[gal] ?? ''}</Text>
          <View style={s.dots}>{CROPS.map((_, i) => <View key={i} style={[s.dot, i === gal && s.dotOn]} />)}</View>
        </Pressable>
        <IconButton label="Volver al tour" glyph="×" onPress={() => { narration.stop(); router.back(); }} style={{ position: 'absolute', left: 16, top: insets.top + 8 }} />
        <View style={s.body}>
          <Text style={[type.overline, { color: p.t }]}>Parada {n + 1} de {tour.stops.length} · {KIND_LABEL[stop.kind]}</Text>
          <Text style={type.title}>{stop.name}</Text>
          <View style={[s.player, { backgroundColor: p.deep }]}>
            <Text style={s.playerTitle} numberOfLines={1}>{stop.audioTitle}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={narration.speaking ? 'Pausar' : 'Escuchar'} onPress={() => (narration.speaking ? narration.stop() : narration.speak(script))} style={[s.play, { backgroundColor: p.t2 }]}>
              <Text style={s.playGlyph}>{narration.speaking ? 'II' : '▶'}</Text>
            </Pressable>
          </View>
          <Text style={type.body}>{stop.p1}</Text>
          <View style={[s.look, { backgroundColor: p.soft }]}>
            <StopStamp stop={stop} index={n} date={date} color={p.t} size={74} ghost={!visit?.stamps[stop.id]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.lookOver, { color: p.deep }]}>Fíjate en</Text>
              <Text style={s.lookText}>{stop.look}</Text>
            </View>
          </View>
          <Text style={type.body}>{stop.p2}</Text>
          <View style={[s.fact, { backgroundColor: p.t2 }]}>
            <Text style={s.factOver}>¿Sabías que…?</Text>
            <Text style={s.factText}>{stop.fact}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label={last ? 'Terminar tour' : 'Siguiente parada'} onPress={next} />
      </View>

      {arriving && (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(350)} style={[StyleSheet.absoluteFill, s.arrive, { backgroundColor: p.deep, paddingTop: insets.top + 60 }]}>
          <Image source={stop.photo} style={s.arrivePic} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: p.deep, opacity: 0.72 }]} />
          <StopStamp stop={stop} index={n} date={date} color={p.t2} size={150} slam delay={250} />
          <Animated.Text entering={FadeInDown.delay(500)} style={[s.arriveOver, { color: p.t2 }]}>Has llegado · Sello {n + 1} de {tour.stops.length}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(650)} style={s.arriveTitle}>{stop.name}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(900)} style={s.arriveHint}>{stop.arriveHint}</Animated.Text>
          <Pressable accessibilityRole="button" onPress={listenNow} style={[s.listen, { marginBottom: insets.bottom + 24 }]}>
            <Text style={s.listenText}>Escuchar ahora</Text>
            <Text style={s.listenSub}>El audio empieza en {count} s</Text>
          </Pressable>
        </Animated.View>
      )}
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  gallery: { height: 300, overflow: 'hidden', backgroundColor: '#ddd' },
  cap: { position: 'absolute', left: 16, bottom: 30, color: '#fff', fontFamily: font.heavy, fontSize: 12, textShadowColor: 'rgba(0,0,0,.5)', textShadowRadius: 6 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.55)' },
  dotOn: { width: 20, backgroundColor: '#fff' },
  body: { padding: 18, gap: 14 },
  player: { borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerTitle: { flex: 1, color: '#fff', fontFamily: font.black, fontSize: 16 },
  play: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  playGlyph: { fontFamily: font.black, fontSize: 18, color: neutral.ink },
  look: { flexDirection: 'row', gap: 12, borderRadius: 18, padding: 12, alignItems: 'center' },
  lookOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase' },
  lookText: { fontFamily: font.bold, fontSize: 14.5, lineHeight: 20, color: neutral.ink, marginTop: 2 },
  fact: { borderRadius: 18, padding: 16 },
  factOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: neutral.ink },
  factText: { fontFamily: font.serifBold, fontSize: 18, lineHeight: 24, color: neutral.ink, marginTop: 4 },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, backgroundColor: 'rgba(250,246,240,0.96)' },
  arrive: { alignItems: 'center', paddingHorizontal: 24, gap: 10 },
  arrivePic: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', opacity: 0.9 },
  arriveOver: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 18 },
  arriveTitle: { fontFamily: font.serif, fontSize: 42, lineHeight: 44, color: '#fff', textAlign: 'center', letterSpacing: -1 },
  arriveHint: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.9)', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, padding: 12, overflow: 'hidden' },
  listen: { marginTop: 'auto', alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, height: 64, alignItems: 'center', justifyContent: 'center' },
  listenText: { fontFamily: font.black, fontSize: 17, color: neutral.ink },
  listenSub: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3, fontVariant: ['tabular-nums'] },
});
