import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from '@/components/AudioPlayer';
import { DuotoneImage } from '@/components/DuotoneImage';
import { Scrim } from '@/components/Scrim';
import { RouteSheet } from '@/components/passport/RouteSheet';
import { StampPlacer } from '@/components/passport/StampPlacer';
import { RubberStamp } from '@/components/RubberStamp';
import { IconButton, PrimaryButton } from '@/components/ui';
import { KIND_LABEL } from '@/data/types';
import { SHEET_RATIO, stampBox } from '@/lib/sheet';
import { useNarrationPlayer } from '@/lib/useNarrationPlayer';
import { useTourParam } from '@/lib/useTour';
import { usePassport, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral, radius } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

/** La galería muestra la foto con cuatro encuadres */
const CROPS = [{ x: 0.5, y: 0.5, zoom: 1 }, { x: 0.25, y: 0.35, zoom: 1.8 }, { x: 0.75, y: 0.4, zoom: 1.8 }, { x: 0.5, y: 0.8, zoom: 1.5 }];

export default function StopScreen() {
  const tour = useTourParam();
  const params = useLocalSearchParams<{ n: string; arrived?: string }>();
  const n = Number(params.n);
  const stop = tour.stops[n];
  const p = tour.palette;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const saved = useRoute(tour.id);
  const mine = saved?.stamps.find(x => x.stopId === stop.id);
  const pageNumber = usePassport(s => s.passport.pageOrder.indexOf(tour.id));
  const repeat = params.arrived === 'repeat';
  const [arriving, setArriving] = useState(params.arrived === '1' || repeat);
  // El audio cuenta atrás cuando el sello ya está en la hoja
  const [stamped, setStamped] = useState(repeat);
  const [count, setCount] = useState(3);
  const sheetW = Math.floor(Math.min(width - 48, (height - insets.top - insets.bottom - 330) * SHEET_RATIO, 440));
  const [gal, setGal] = useState(0);
  const [color, setColor] = useState(false);
  const script = `${stop.name}. ${stop.p1} Fíjate en ${stop.look.charAt(0).toLowerCase()}${stop.look.slice(1)} ${stop.p2} ¿Sabías que…? ${stop.fact}`;
  const player = useNarrationPlayer(script);
  const last = n === tour.stops.length - 1;

  // Llegada: se coloca el sello en la hoja y el audio empieza solo unos segundos después
  const started = useRef(false);
  const playRef = useRef(player.play);
  useEffect(() => { playRef.current = player.play; });
  const listenNow = useCallback(() => {
    setArriving(false);
    if (!started.current) { started.current = true; playRef.current(); }
  }, []);
  useEffect(() => {
    if (!arriving || !stamped) return;
    const t = setTimeout(() => (count <= 1 ? listenNow() : setCount(c => c - 1)), count === 3 ? 1600 : 1000);
    return () => clearTimeout(t);
  }, [arriving, stamped, count, listenNow]);

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
            <View style={{ width: 84, alignItems: 'center', opacity: mine ? 1 : 0.25 }}>
              <RubberStamp tour={tour} stop={stop} date={mine?.date ?? new Date().toISOString()} seed={mine?.seed ?? 5} width={stampBox(stop.rubber.shape, 84 / 0.4).w} height={stampBox(stop.rubber.shape, 84 / 0.4).h} />
            </View>
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
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(350)} style={[StyleSheet.absoluteFill, s.arrive, { backgroundColor: p.deep, paddingTop: insets.top + 24 }]}>
          <View style={s.arrivePic}>
            <DuotoneImage source={stop.photo} palette={p} style={StyleSheet.absoluteFill} />
            <Scrim color={p.deep} opacity={1} from="top" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: p.deep, opacity: 0.15 }]} />
          </View>
          <Animated.Text entering={FadeInDown.delay(150)} style={[s.arriveOver, { color: p.t2 }]}>{repeat ? 'Ya tenías este sello' : `Has llegado · parada ${n + 1} de ${tour.stops.length}`}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250)} style={s.arriveTitle} numberOfLines={2}>{stop.name}</Animated.Text>
          <Animated.View entering={FadeInDown.delay(350)} style={{ marginTop: 6 }}>
            {repeat ? (
              <RouteSheet tour={tour} route={saved} width={sheetW} pageNumber={pageNumber + 2} />
            ) : (
              <StampPlacer tour={tour} width={sheetW} target={stop.id} pageNumber={Math.max(0, pageNumber) + 2} onStamped={() => setStamped(true)} />
            )}
          </Animated.View>
          {stamped && (
            <Animated.View entering={FadeInDown} style={[s.listenWrap, { marginBottom: insets.bottom + 20 }]}>
              <Pressable accessibilityRole="button" onPress={listenNow} style={s.listen}>
                <Text style={s.listenText}>Escuchar ahora</Text>
                <Text style={s.listenSub}>El audio empieza en {count} s</Text>
              </Pressable>
            </Animated.View>
          )}
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
  arriveOver: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  arriveTitle: { fontFamily: font.serif, fontSize: 30, lineHeight: 33, color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  arriveHint: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.92)', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, padding: 12, overflow: 'hidden' },
  listenWrap: { marginTop: 'auto', alignSelf: 'stretch' },
  listen: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, height: 64, alignItems: 'center', justifyContent: 'center' },
  listenText: { fontFamily: font.black, fontSize: 17, color: neutral.ink },
  listenSub: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3, fontVariant: ['tabular-nums'] },
});
