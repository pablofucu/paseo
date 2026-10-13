import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from '@/components/AudioPlayer';
import { DuotoneImage } from '@/components/DuotoneImage';
import { GuideButton } from '@/components/GuideButton';
import { useHeroMotion } from '@/components/HeroMotion';
import { DUR, EASE_OUT, rise } from '@/components/motion';
import { StampPlacer } from '@/components/passport/StampPlacer';
import { RubberStamp } from '@/components/RubberStamp';
import { Scrim } from '@/components/Scrim';
import { GhostButton, IconButton, PrimaryButton } from '@/components/ui';
import { getTour } from '@/data/tours';
import { creditPending, KIND_LABEL, type Tour } from '@/data/types';
import { SHEET_RATIO, stampBox } from '@/lib/sheet';
import { prefetchPhoto } from '@/lib/prefetch';
import { stopScript } from '@/lib/spoken';
import { useAutoPause } from '@/lib/useAutoPause';
import { useNarrationPlayer } from '@/lib/useNarrationPlayer';
import { usePassport, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral, radius } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

const HERO = 330;

/** Late suavemente para llamar la atención sobre «Poner el sello» al acabar el audio */
function Pulse({ on, children }: { on: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(1);
  useEffect(() => {
    if (on && !reduced) k.set(withRepeat(withSequence(withTiming(1.035, { duration: 650 }), withTiming(1, { duration: 650 })), -1));
    else { cancelAnimation(k); k.set(withTiming(1, { duration: 150 })); }
  }, [on, reduced, k]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Una parada. Se abre encima del mapa (al llegar, o tocando su pin) y al
 * cerrarla se vuelve al mapa. Al llegar, el audio empieza solo; el sello se
 * pone al final, con «Poner el sello», y solo si de verdad has llegado.
 */
export default function StopScreen() {
  const params = useLocalSearchParams<{ id: string; n: string }>();
  const tour = getTour(params.id);
  // Un enlace roto no debe cerrar la app: a Inicio si no hay ruta, a la portada de la ruta si no hay parada
  if (!tour) return <Redirect href="/" />;
  const n = /^\d+$/.test(params.n ?? '') ? Number(params.n) : -1;
  if (n < 0 || n >= tour.stops.length) return <Redirect href={{ pathname: '/tour/[id]', params: { id: tour.id } }} />;
  return <Stop tour={tour} n={n} />;
}

function Stop({ tour, n }: { tour: Tour; n: number }) {
  const params = useLocalSearchParams<{ arrived?: string }>();
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
  // Esta es la parada visitada (su guía se abre y se cierra con el botón del mapa)
  const visitedHere = onWalk && walk.guide === n;
  const [placing, setPlacing] = useState(false);
  const [justStamped, setJustStamped] = useState(false);
  const [banner, setBanner] = useState(arrivedNow);
  const [color, setColor] = useState(false);
  const [ctaH, setCtaH] = useState(90);
  const sheetW = Math.floor(Math.min(width - 48, (height - insets.top - insets.bottom - 260) * SHEET_RATIO, 440));
  const player = useNarrationPlayer(stopScript(stop));
  // Sin voz cuando otra pantalla tapa la parada o la app queda en segundo plano
  useAutoPause(player.pause);
  // La foto de la siguiente parada ya está en caché cuando se abra
  const nextPhoto = tour.stops[n + 1]?.photo;
  useEffect(() => { prefetchPhoto(nextPhoto); }, [nextPhoto]);

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
  // Con el sello en la hoja, el paseo pasa solo a la siguiente parada; la guía sigue abierta
  const stamped = () => {
    setJustStamped(true);
    advanceWalk();
  };
  const look = stampBox(stop.rubber.shape, 84 / 0.325);

  return (
    <TourThemeProvider palette={p}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        <View style={s.gallery}>
          <Animated.View style={[StyleSheet.absoluteFill, hero]}>
            <DuotoneImage source={stop.photo} palette={p} duotone={!color} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Scrim opacity={0.55} />
          <Scrim opacity={0.35} from="top" style={{ height: 110 }} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: neutral.bg }, heroShade]} />
          <Text style={s.cap} numberOfLines={1}>{stop.captions[0] ?? ''}</Text>
        </View>
        {!creditPending(stop.photoCredit) && (
          <Pressable accessibilityRole="link" accessibilityLabel={`Foto de ${stop.photoCredit.author}, licencia ${stop.photoCredit.license}. Abre la fuente`} onPress={() => Linking.openURL(stop.photoCredit.source).catch(() => {})} hitSlop={{ top: 6, bottom: 10 }}>
            <Text style={s.credit}>Foto: {stop.photoCredit.author} · {stop.photoCredit.license} · Wikimedia Commons</Text>
          </Pressable>
        )}

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
      <Pressable accessibilityRole="switch" accessibilityLabel="Ver la foto en color" accessibilityState={{ checked: color }} onPress={() => setColor(v => !v)} style={[s.colorBtn, { top: insets.top + 14 }]}>
        <Text style={s.colorText}>{color ? 'Duotono' : 'Ver en color'}</Text>
      </Pressable>

      {banner && (
        <Animated.View entering={reduced ? FadeIn : FadeInDown.duration(DUR.base).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: -12 }] })} exiting={FadeOut.duration(DUR.base)} pointerEvents="none" style={[s.banner, { top: insets.top + 64, backgroundColor: p.deep }]}>
          <Text style={[s.bannerOver, { color: p.t2 }]}>{params.arrived === 'repeat' ? 'Ya tenías este sello' : `Has llegado · parada ${n + 1} de ${tour.stops.length}`}</Text>
          <Text style={s.bannerText}>El audio empieza ahora{canStamp ? '. Al terminar, pon tu sello.' : ''}</Text>
        </Animated.View>
      )}

      {/* Abajo: sellar al final de la parada, seguir a la siguiente o volver al mapa */}
      <Animated.View entering={FadeIn.delay(250).duration(DUR.base).easing(EASE_OUT)} onLayout={e => setCtaH(e.nativeEvent.layout.height)} style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
        {canStamp ? (
          <>
            {player.ended && !placing && <Text style={s.need}>Audio terminado: ya puedes poner tu sello</Text>}
            <Pulse on={player.ended && !placing}>
              <PrimaryButton label="Poner el sello" onPress={() => { player.pause(); setPlacing(true); }} />
            </Pulse>
          </>
        ) : mine && visitedHere && !current ? (
          <PrimaryButton label={last ? 'Terminar tour' : 'Ir a la siguiente parada'} onPress={close} />
        ) : current && walk.arrived === stop.id ? (
          <PrimaryButton label={last ? 'Terminar tour' : 'Siguiente parada'} onPress={next} />
        ) : (
          <>
            {current && !mine && <Text style={s.need}>Llega a la parada para poner el sello</Text>}
            <GhostButton label="Volver al mapa" onPress={close} />
          </>
        )}
      </Animated.View>

      {/* Salir de la guía al mapa, en la misma esquina que el botón «Guía» del mapa */}
      {onWalk && !placing && <GuideButton to="map" photo={stop.thumb} palette={p} onPress={close} style={{ bottom: ctaH + 12 }} />}

      {placing && (
        <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(260)} style={[StyleSheet.absoluteFill, s.place, { backgroundColor: p.deep, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
          {/* Con el sello puesto, tocar en cualquier sitio cierra esta pantalla */}
          {justStamped && <Pressable accessibilityRole="button" accessibilityLabel="Seguir" onPress={() => setPlacing(false)} style={[StyleSheet.absoluteFill, { zIndex: 10 }]} />}
          <Animated.Text entering={rise(1)} style={[s.placeOver, { color: p.t2 }]}>{stop.name}</Animated.Text>
          <Animated.Text entering={rise(2)} style={s.placeTitle}>Pon tu sello</Animated.Text>
          <Animated.View entering={rise(3)}>
            <StampPlacer tour={tour} width={sheetW} target={stop.id} pageNumber={pageNumber} onStamped={stamped} />
          </Animated.View>
          {justStamped && (
            <Animated.Text entering={FadeIn.delay(500).duration(400)} style={[s.placeBack, { marginTop: 'auto' }]}>
              {last ? 'Ruta terminada · toca para seguir' : `Siguiente: ${tour.stops[n + 1].name} · toca para seguir`}
            </Animated.Text>
          )}
        </Animated.View>
      )}
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  gallery: { height: HERO, overflow: 'hidden' },
  cap: { position: 'absolute', left: 16, right: 16, bottom: 14, color: '#fff', fontFamily: font.heavy, fontSize: 12.5 },
  colorBtn: { position: 'absolute', right: 16, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center' },
  colorText: { fontFamily: font.black, fontSize: 12.5, color: neutral.ink },
  credit: { fontFamily: font.bold, fontSize: 12, color: neutral.ink3, paddingHorizontal: 18, paddingTop: 6, textDecorationLine: 'underline' },
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
