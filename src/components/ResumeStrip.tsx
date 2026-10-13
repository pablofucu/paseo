import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { TourBanner } from '@/components/TourBanner';
import { DUR, EASE_OUT, lightTap, PressableScale } from '@/components/motion';
import { getTour } from '@/data/tours';
import { usePausedWalk } from '@/lib/pausedWalk';
import { routeProgress, unfinishedRoutes, usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral, radius } from '@/theme/tokens';

/**
 * «Sigue donde lo dejaste»: la última ruta a medias, encima de la lista, con
 * un botón para seguir en la parada que toca y otro para cancelarla (borra sus
 * sellos, así que antes pregunta).
 */
export function ResumeStrip({ tourIds }: { tourIds: string[] }) {
  const routes = usePassport(s => s.routes);
  const startWalk = usePassport(s => s.startWalk);
  const dropRoute = usePassport(s => s.dropRoute);
  const [asking, setAsking] = useState(false);
  const pausedWalk = usePausedWalk(s => s.paused);
  const clearPause = usePausedWalk(s => s.clear);
  // Un paseo en pausa va primero; si su ruta ya no existe, se ignora
  const pausedTour = pausedWalk && tourIds.includes(pausedWalk.tourId) ? getTour(pausedWalk.tourId) : undefined;
  const id = pausedTour ? pausedTour.id : unfinishedRoutes(tourIds, routes)[0];
  const tour = id ? getTour(id) : undefined;
  if (!tour) return null;
  const route = routes[tour.id];
  const prog = routeProgress(tour.id, route);
  const firstMissing = tour.stops.findIndex(st => !route?.stamps.some(x => x.stopId === st.id));
  const paused = pausedTour && pausedWalk && pausedWalk.target < tour.stops.length ? pausedWalk : null;
  const next = paused ? paused.target : firstMissing;
  if (next < 0) return null;
  const p = tour.palette;

  const resume = () => {
    startWalk(tour.id, next, paused?.skipped);
    clearPause();
    router.push({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(next) } });
  };

  return (
    <Animated.View layout={LinearTransition.duration(DUR.base).easing(EASE_OUT)} exiting={FadeOut.duration(200)} style={[s.strip, { backgroundColor: p.deep }]}>
      <View style={s.thumb}>
        <TourBanner tour={tour} />
      </View>
      {asking ? (
        <Animated.View key="ask" entering={FadeIn.duration(DUR.fast)} style={s.text}>
          <Text style={s.title} numberOfLines={1}>¿Cancelar la ruta?</Text>
          <Text style={s.sub} numberOfLines={2}>Se borran sus {prog.done} {prog.done === 1 ? 'sello' : 'sellos'} del pasaporte.</Text>
          <View style={s.askRow}>
            <PressableScale accessibilityRole="button" accessibilityHint="Borra los sellos de esta ruta del pasaporte. No se puede deshacer" onPress={() => { lightTap(); setAsking(false); clearPause(); dropRoute(tour.id); }} style={[s.askBtn, { backgroundColor: neutral.white }]}>
              <Text maxFontSizeMultiplier={1.3} style={[s.askText, { color: p.deep }]}>Cancelar ruta</Text>
            </PressableScale>
            <Pressable accessibilityRole="button" onPress={() => setAsking(false)} hitSlop={6} style={s.askBtn}>
              <Text maxFontSizeMultiplier={1.3} style={[s.askText, { color: neutral.white }]}>Seguir</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <>
          <Animated.View key="info" entering={FadeIn.duration(DUR.fast)} style={s.text}>
            <Text maxFontSizeMultiplier={1.3} style={s.kicker}>{paused ? 'Paseo en pausa' : 'Sigue donde lo dejaste'}</Text>
            <Text style={s.title} numberOfLines={1}>{tour.title}</Text>
            <Text style={s.sub} numberOfLines={1}>Parada {next + 1} de {prog.total} · {tour.stops[next].name}</Text>
          </Animated.View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Cancelar ${tour.title}`} accessibilityHint="Te pregunta antes de borrar nada" onPress={() => setAsking(true)} hitSlop={8} style={s.close}>
            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={neutral.white} strokeOpacity={0.8} strokeWidth={3} strokeLinecap="round" /></Svg>
          </Pressable>
          <PressableScale accessibilityRole="button" accessibilityLabel={`Continuar ${tour.title} en la parada ${next + 1}`} onPress={resume} scaleTo={0.9} style={s.go}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M8 5.5v13l10.5-6.5z" fill={p.t} /></Svg>
          </PressableScale>
        </>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 10, paddingRight: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden' },
  text: { flex: 1, minWidth: 0 },
  kicker: { fontFamily: font.black, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' },
  title: { fontFamily: font.serifBold, fontSize: 17, lineHeight: 21, color: neutral.white },
  sub: { fontFamily: font.bold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  close: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  go: { width: 42, height: 42, borderRadius: 21, backgroundColor: neutral.white, alignItems: 'center', justifyContent: 'center' },
  askRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  askBtn: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center' },
  askText: { fontFamily: font.black, fontSize: 13 },
});
