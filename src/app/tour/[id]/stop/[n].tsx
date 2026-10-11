import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from '@/components/AudioPlayer';
import { DuotoneImage } from '@/components/DuotoneImage';
import { useHeroMotion } from '@/components/HeroMotion';
import { rise } from '@/components/motion';
import { StampPlacer } from '@/components/passport/StampPlacer';
import { RubberStamp } from '@/components/RubberStamp';
import { Scrim } from '@/components/Scrim';
import { GhostButton, IconButton, PrimaryButton } from '@/components/ui';
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
const HERO = 330;

/**
 * Una parada. Se abre encima del mapa (al llegar, o tocando su pin) y al
 * cerrarla se vuelve al mapa. Al llegar, el audio empieza solo; el sello se
 * pone al final, con «Poner el sello», y solo si de verdad has llegado.
 */
export default function StopScreen() {
  const tour = useTourParam();
  const params = useLocalSearchParams<{ n: string; arrived?: string }>();
  const n = Number(params.n);
  const stop = tour.stops[n];
  const p = tour.palette;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const saved = useRoute(tour.id);
  const walk = usePassport(s => s.walk);
  const advanceWalk = usePassport(s => s.advanceWalk);
  const mine = saved?.stamps.find(x => x.stopId === stop.id);
  const pageNumber = Math.max(0, usePassport(s => s.passport.pageOrder.indexOf(tour.id))) + 2;
  const arrivedNow = params.arrived === '1' || params.arrived === 'repeat';
  const onWalk = walk?.tourId === tour.id;
  const current = onWalk && walk.target === n;
  // Solo se sella la parada a la que se ha llegado de verdad, y una sola vez
  const canStamp = current && walk.arrived === stop.id && !mine;
  const last = n === tour.stops.length - 1;
  const [placing, setPlacing] = useState(false);
  const [justStamped, setJustStamped] = useState(false);
  const [banner, setBanner] = useState(arrivedNow);
  const [gal, setGal] = useState(0);
  const [color, setColor] = useState(false);
  const sheetW = Math.floor(Math.min(width - 48, (height - insets.top - insets.bottom - 260) * SHEET_RATIO, 440));
  const script = `${stop.name}. ${stop.p1} Fíjate en ${stop.look.charAt(0).toLowerCase()}${stop.look.slice(1)} ${stop.p2} ¿Sabías que…? ${stop.fact}`;
  const player = useNarrationPlayer(script);

  // Al llegar, el aviso baja, se va solo y el audio arranca
  const playRef = useRef(player.play);
  useEffect(() => { playRef.current = player.play; });
  useEffect(() => {
    if (!arrivedNow) return;
    const a = setTimeout(() => playRef.current(), 1400);
    const b = setTimeout(() => setBanner(false), 3400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [arrivedNow]);

  // Foto: zoom lento continuo y paralaje al hacer scroll
  const { onScroll, photo: hero, veil: heroShade } = useHeroMotion(HERO);

  const close = () => { player.pause(); router.back(); };
  const next = () => {
    player.pause();
    advanceWalk();
    router.back();
  };
  const crop = CROPS[gal];
  const look = stampBox(stop.rubber.shape, 84 / 0.325);

  return (
    <TourThemeProvider palette={p}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Siguiente foto" onPress={() => setGal(g => (g + 1) % CROPS.length)} style={s.gallery}>
          <Animated.View style={[StyleSheet.absoluteFill, hero]}>
            <DuotoneImage source={stop.photo} palette={p} duotone={!color} zoom={crop.zoom} focus={crop} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Scrim opacity={0.55} />
          <Scrim opacity={0.35} from="top" style={{ height: 110 }} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: neutral.bg }, heroShade]} />
          <Animated.Text key={gal} entering={FadeIn.duration(300)} style={s.cap} numberOfLines={1}>{stop.captions[gal] ?? ''}</Animated.Text>
          <View style={s.dots}>{CROPS.map((_, i) => <View key={i} style={[s.dot, i === gal && s.dotOn]} />)}</View>
        </Pressable>
        {stop.photoCredit && <Text style={s.credit}>Foto: {stop.photoCredit.author} · {stop.photoCredit.license} · Wikimedia Commons</Text>}

        <View style={s.body}>
          <Animated.Text entering={rise(1)} style={[type.overline, { color: p.t }]}>Parada {n + 1} de {tour.stops.length} · {KIND_LABEL[stop.kind]}</Animated.Text>
          <Animated.Text entering={rise(2)} style={type.title}>{stop.name}</Animated.Text>
          <Animated.View entering={rise(3)}><AudioPlayer title={stop.audioTitle} player={player} /></Animated.View>
          <Animated.Text entering={rise(4)} style={type.body}>{stop.p1}</Animated.Text>
          <Animated.View entering={rise(5)} style={[s.look, { backgroundColor: p.soft }]}>
            <View style={{ width: 84, alignItems: 'center', opacity: mine ? 1 : 0.25 }}>
              <RubberStamp tour={tour} stop={stop} date={mine?.date ?? new Date().toISOString()} width={look.w} height={look.h} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.lookOver, { color: p.deep }]}>Fíjate en</Text>
              <Text style={s.lookText}>{stop.look}</Text>
            </View>
          </Animated.View>
          <Animated.Text entering={rise(6)} style={type.body}>{stop.p2}</Animated.Text>
          <Animated.View entering={rise(7)} style={[s.fact, { backgroundColor: p.t2 }]}>
            <Text style={s.factOver}>¿Sabías que…?</Text>
            <Text style={s.factText}>{stop.fact}</Text>
          </Animated.View>
        </View>
      </Animated.ScrollView>

      <IconButton label="Volver al mapa" icon="close" onPress={close} style={{ position: 'absolute', left: 16, top: insets.top + 8 }} />
      <Pressable accessibilityRole="button" onPress={() => setColor(v => !v)} style={[s.colorBtn, { top: insets.top + 14 }]}>
        <Text style={s.colorText}>{color ? 'Duotono' : 'Ver en color'}</Text>
      </Pressable>

      {banner && (
        <Animated.View entering={reduced ? FadeIn : SlideInUp.springify().damping(16)} exiting={reduced ? FadeOut : SlideOutUp.duration(260)} pointerEvents="none" style={[s.banner, { top: insets.top + 64, backgroundColor: p.deep }]}>
          <Text style={[s.bannerOver, { color: p.t2 }]}>{params.arrived === 'repeat' ? 'Ya tenías este sello' : `Has llegado · parada ${n + 1} de ${tour.stops.length}`}</Text>
          <Text style={s.bannerText}>El audio empieza ahora{canStamp ? '. Al terminar, pon tu sello.' : ''}</Text>
        </Animated.View>
      )}

      {/* Abajo: sellar al final de la parada, seguir a la siguiente o volver al mapa */}
      <Animated.View entering={FadeIn.delay(250)} style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
        {canStamp ? (
          <PrimaryButton label="Poner el sello" onPress={() => { player.pause(); setPlacing(true); }} />
        ) : current && (mine || walk.arrived === stop.id) ? (
          <PrimaryButton label={last ? 'Terminar tour' : 'Siguiente parada'} onPress={next} />
        ) : (
          <>
            {current && !mine && <Text style={s.need}>Llega a la parada para poner el sello</Text>}
            <GhostButton label="Volver al mapa" onPress={close} />
          </>
        )}
      </Animated.View>

      {placing && (
        <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(260)} style={[StyleSheet.absoluteFill, s.place, { backgroundColor: p.deep, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
          <Animated.Text entering={rise(1)} style={[s.placeOver, { color: p.t2 }]}>{stop.name}</Animated.Text>
          <Animated.Text entering={rise(2)} style={s.placeTitle}>Pon tu sello</Animated.Text>
          <Animated.View entering={rise(3)}>
            <StampPlacer tour={tour} width={sheetW} target={stop.id} pageNumber={pageNumber} onStamped={() => setJustStamped(true)} />
          </Animated.View>
          {justStamped && (
            <Animated.View entering={rise(0)} style={{ alignSelf: 'stretch', marginTop: 'auto' }}>
              <PrimaryButton label={last ? 'Terminar tour' : 'Siguiente parada'} onPress={next} />
              <Pressable accessibilityRole="button" onPress={() => setPlacing(false)} style={{ alignSelf: 'center', padding: 12 }}>
                <Text style={s.placeBack}>Volver a la parada</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  gallery: { height: HERO, overflow: 'hidden' },
  cap: { position: 'absolute', left: 16, right: 16, bottom: 30, color: '#fff', fontFamily: font.heavy, fontSize: 12.5 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.55)' },
  dotOn: { width: 20, backgroundColor: '#fff' },
  colorBtn: { position: 'absolute', right: 16, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center' },
  colorText: { fontFamily: font.black, fontSize: 12.5, color: neutral.ink },
  credit: { fontFamily: font.bold, fontSize: 10.5, color: neutral.ink3, paddingHorizontal: 18, paddingTop: 6 },
  body: { padding: 18, gap: 14, backgroundColor: neutral.bg },
  look: { flexDirection: 'row', gap: 12, borderRadius: 18, padding: 12, alignItems: 'center' },
  lookOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase' },
  lookText: { fontFamily: font.bold, fontSize: 14.5, lineHeight: 20, color: neutral.ink, marginTop: 2 },
  fact: { borderRadius: 18, padding: 16 },
  factOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: neutral.ink },
  factText: { fontFamily: font.serifBold, fontSize: 18, lineHeight: 24, color: neutral.ink, marginTop: 4 },
  banner: { position: 'absolute', left: 16, right: 16, borderRadius: 20, padding: 14, gap: 2 },
  bannerOver: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  bannerText: { fontFamily: font.bold, fontSize: 14.5, color: '#fff' },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, gap: 8, backgroundColor: neutral.bg, borderTopWidth: 1, borderTopColor: neutral.line },
  need: { fontFamily: font.bold, fontSize: 13.5, color: neutral.ink3, textAlign: 'center' },
  place: { alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  placeOver: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  placeTitle: { fontFamily: font.serif, fontSize: 30, lineHeight: 33, color: '#fff', textAlign: 'center', letterSpacing: -0.5, marginBottom: 6 },
  placeBack: { fontFamily: font.black, fontSize: 14, color: 'rgba(255,255,255,0.85)', borderRadius: radius.pill },
});
