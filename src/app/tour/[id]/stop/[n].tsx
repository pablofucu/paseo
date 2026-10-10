import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from '@/components/AudioPlayer';
import { DuotoneImage } from '@/components/DuotoneImage';
import { Scrim } from '@/components/Scrim';
import { Guilloche } from '@/components/PassportPage';
import { inkFor, StopStamp } from '@/components/Stamp';
import { PRESS_MS, StampPress } from '@/components/StampPress';
import { IconButton, PrimaryButton } from '@/components/ui';
import { KIND_LABEL, SHAPE_FOR_KIND } from '@/data/types';
import { useNarrationPlayer } from '@/lib/useNarrationPlayer';
import { useTourParam } from '@/lib/useTour';
import { stampDate, useActiveVisit } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral, radius } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

/** La galería muestra la foto con cuatro encuadres */
const CROPS = [{ x: 0.5, y: 0.5, zoom: 1 }, { x: 0.25, y: 0.35, zoom: 1.8 }, { x: 0.75, y: 0.4, zoom: 1.8 }, { x: 0.5, y: 0.8, zoom: 1.5 }];
const STAMP = 168;

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
  const [color, setColor] = useState(false);
  const script = `${stop.name}. ${stop.p1} Fíjate en ${stop.look.charAt(0).toLowerCase()}${stop.look.slice(1)} ${stop.p2} ¿Sabías que…? ${stop.fact}`;
  const player = useNarrationPlayer(script);
  const last = n === tour.stops.length - 1;

  // Llegada: el tampón estampa el sello y el audio empieza solo unos segundos después
  const started = useRef(false);
  const playRef = useRef(player.play);
  useEffect(() => { playRef.current = player.play; });
  const listenNow = useCallback(() => {
    setArriving(false);
    if (!started.current) { started.current = true; playRef.current(); }
  }, []);
  useEffect(() => {
    if (!arriving) return;
    const t = setTimeout(() => (count <= 1 ? listenNow() : setCount(c => c - 1)), count === 3 ? 1000 + PRESS_MS : 1000);
    return () => clearTimeout(t);
  }, [arriving, count, listenNow]);

  const next = () => {
    player.pause();
    if (last) router.replace({ pathname: '/tour/[id]/done', params: { id: tour.id } });
    else router.replace({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(n + 1) } });
  };
  const crop = CROPS[gal];

  return (
    <TourThemeProvider palette={p}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Siguiente foto" onPress={() => setGal(g => (g + 1) % CROPS.length)} style={s.gallery}>
          <DuotoneImage source={stop.photo} palette={p} duotone={!color} zoom={crop.zoom} focus={crop} style={StyleSheet.absoluteFill} />
          <Scrim opacity={0.55} />
          <Scrim opacity={0.35} from="top" style={{ height: 110 }} />
          <Text style={s.cap} numberOfLines={1}>{stop.captions[gal] ?? ''}</Text>
          <View style={s.dots}>{CROPS.map((_, i) => <View key={i} style={[s.dot, i === gal && s.dotOn]} />)}</View>
        </Pressable>
        <IconButton label="Volver al tour" icon="close" onPress={() => { player.pause(); router.back(); }} style={{ position: 'absolute', left: 16, top: insets.top + 8 }} />
        <Pressable accessibilityRole="button" onPress={() => setColor(v => !v)} style={[s.colorBtn, { top: insets.top + 14 }]}>
          <Text style={s.colorText}>{color ? 'Duotono' : 'Ver en color'}</Text>
        </Pressable>
        {stop.photoCredit && <Text style={s.credit}>Foto: {stop.photoCredit.author} · {stop.photoCredit.license} · Wikimedia Commons</Text>}

        <View style={s.body}>
          <Text style={[type.overline, { color: p.t }]}>Parada {n + 1} de {tour.stops.length} · {KIND_LABEL[stop.kind]}</Text>
          <Text style={type.title}>{stop.name}</Text>
          <AudioPlayer title={stop.audioTitle} player={player} />
          <Text style={type.body}>{stop.p1}</Text>
          <View style={[s.look, { backgroundColor: p.soft }]}>
            <StopStamp tour={tour} index={n} date={date} size={78} ghost={!visit?.stamps[stop.id]} />
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
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(350)} style={[StyleSheet.absoluteFill, s.arrive, { backgroundColor: p.deep, paddingTop: insets.top + 56 }]}>
          <View style={s.arrivePic}>
            <DuotoneImage source={stop.photo} palette={p} style={StyleSheet.absoluteFill} />
            <Scrim color={p.deep} opacity={1} from="top" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: p.deep, opacity: 0.15 }]} />
          </View>
          <View style={s.paper}>
            <Guilloche width={STAMP + 44} height={STAMP + 44} color={p.deep} />
            <Text style={s.paperHead}>Pasaporte Paseo · {tour.city}</Text>
            <StampPress width={STAMP} height={STAMP} ink={inkFor(tour, n)} delay={350} shape={['round', 'oval', 'chapa'].includes(SHAPE_FOR_KIND[stop.kind]) ? 'round' : 'rect'}>
              <StopStamp tour={tour} index={n} date={date} size={STAMP} />
            </StampPress>
          </View>
          <Animated.Text entering={FadeInDown.delay(350 + PRESS_MS * 0.5)} style={[s.arriveOver, { color: p.t2 }]}>Has llegado · Sello {n + 1} de {tour.stops.length}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(500 + PRESS_MS * 0.5)} style={s.arriveTitle}>{stop.name}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(750 + PRESS_MS * 0.5)} style={s.arriveHint}>{stop.arriveHint}</Animated.Text>
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
  gallery: { height: 310, overflow: 'hidden' },
  cap: { position: 'absolute', left: 16, right: 16, bottom: 30, color: '#fff', fontFamily: font.heavy, fontSize: 12.5 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.55)' },
  dotOn: { width: 20, backgroundColor: '#fff' },
  colorBtn: { position: 'absolute', right: 16, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center' },
  colorText: { fontFamily: font.black, fontSize: 12.5, color: neutral.ink },
  credit: { fontFamily: font.bold, fontSize: 10.5, color: neutral.ink3, paddingHorizontal: 18, paddingTop: 6 },
  body: { padding: 18, gap: 14 },
  look: { flexDirection: 'row', gap: 12, borderRadius: 18, padding: 12, alignItems: 'center' },
  lookOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase' },
  lookText: { fontFamily: font.bold, fontSize: 14.5, lineHeight: 20, color: neutral.ink, marginTop: 2 },
  fact: { borderRadius: 18, padding: 16 },
  factOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: neutral.ink },
  factText: { fontFamily: font.serifBold, fontSize: 18, lineHeight: 24, color: neutral.ink, marginTop: 4 },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, backgroundColor: neutral.bg, borderTopWidth: 1, borderTopColor: neutral.line },
  arrive: { alignItems: 'center', paddingHorizontal: 24, gap: 10 },
  arrivePic: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '48%' },
  paper: { padding: 22, paddingTop: 30, borderRadius: 10, backgroundColor: neutral.paper, overflow: 'hidden', transform: [{ rotate: '-2deg' }], boxShadow: '0px 18px 40px rgba(0,0,0,0.45)' },
  paperHead: { position: 'absolute', top: 10, left: 14, fontFamily: font.black, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: neutral.ink3 },
  arriveOver: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 16 },
  arriveTitle: { fontFamily: font.serif, fontSize: 40, lineHeight: 43, color: '#fff', textAlign: 'center', letterSpacing: -1 },
  arriveHint: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.92)', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, padding: 12, overflow: 'hidden' },
  listen: { marginTop: 'auto', alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, height: 64, alignItems: 'center', justifyContent: 'center' },
  listenText: { fontFamily: font.black, fontSize: 17, color: neutral.ink },
  listenSub: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3, fontVariant: ['tabular-nums'] },
});
