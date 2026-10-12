import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { GuideButton } from '@/components/GuideButton';
import { MePin, StopPin, StopPopup } from '@/components/MapPins';
import { DUR, EASE_OUT, PressableScale } from '@/components/motion';
import { IconButton } from '@/components/ui';
import type { LngLat } from '@/data/types';
import { cumulative, formatDistance, projectOnRoute, walkingMinutes } from '@/lib/geo';
import { guide, instruction, prepareLeg } from '@/lib/guidance';
import { buildMapStyle, mapColors } from '@/lib/mapStyle';
import { useNarration } from '@/lib/useNarration';
import { useTourParam } from '@/lib/useTour';
import { useApproachRoute, useTourRoute } from '@/lib/useTourRoute';
import { useWalkPosition, type PositionSource } from '@/lib/useWalkPosition';
import { usePassport } from '@/store/passport';
import { useSettings, type SimSpeed } from '@/store/settings';
import { font } from '@/theme/fonts';
import { functional, neutral, radius, shadow } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';

const line = (coords: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });

/** Punto de partida simulado para ir a la primera parada: ~150 m al suroeste */
const approachFrom = (c: LngLat): LngLat => [c[0] - 0.0012, c[1] - 0.0009];

/**
 * El mapa del paseo es la pantalla central del tour: guía hasta la parada a la
 * que vas (en orden) y al llegar abre la parada encima. Al cerrarla se vuelve
 * aquí. Tocando cualquier pin se ve esa parada y se puede entrar a leerla.
 */
export default function Walk() {
  const tour = useTourParam();
  const param = Number(useLocalSearchParams<{ target: string }>().target ?? 0);
  const walkState = usePassport(s => s.walk);
  const startWalk = usePassport(s => s.startWalk);
  const goTo = usePassport(s => s.goTo);
  const endWalk = usePassport(s => s.endWalk);
  const saved = usePassport(s => s.routes[tour.id]);
  const mine = walkState?.tourId === tour.id;
  const target = mine ? walkState.target : param;
  const finished = target >= tour.stops.length;
  const stop = tour.stops[Math.min(target, tour.stops.length - 1)];
  const [selected, setSelected] = useState<number | null>(null);
  const [sheetH, setSheetH] = useState(230);
  // Si se entra directamente (sin pasar por la ficha), el paseo empieza aquí
  useEffect(() => { if (!mine) startWalk(tour.id, param); }, [mine, startWalk, tour.id, param]);
  // Pasada la última parada, al resumen final (cuando el mapa vuelve a estar delante, no con la guía encima)
  useFocusEffect(useCallback(() => {
    if (finished) router.replace({ pathname: '/tour/[id]/done', params: { id: tour.id } });
  }, [finished, tour.id]));
  const visited = mine && walkState.guide != null ? tour.stops[walkState.guide] : null;
  const p = tour.palette;
  const insets = useSafeAreaInsets();
  const { testMode, simSpeed, setSimSpeed } = useSettings();
  const [source, setSource] = useState<PositionSource>(testMode ? 'simulated' : 'gps');
  const [paused, setPaused] = useState(false);
  /** Modo prueba: posición puesta a mano tocando el mapa (puede estar fuera de la ruta) */
  const [manual, setManual] = useState<LngLat | null>(null);
  const [resumeFrom, setResumeFrom] = useState<{ along: number; key: number } | undefined>(undefined);
  const [gpsOrigin, setGpsOrigin] = useState<LngLat | null>(null);
  const arrive = usePassport(s => s.arrive);
  const narration = useNarration();

  const route = useTourRoute(tour);
  const simOrigin = useMemo(() => approachFrom(stop.coord), [stop]);
  const origin = target !== 0 ? null : source === 'simulated' ? simOrigin : gpsOrigin;

  // Tramo actual: de la parada anterior a esta; para la primera, por calles desde donde estés
  const approach = useApproachRoute(origin, stop.coord);
  const leg = useMemo(() => {
    // Pasada la última parada no hay tramo (el paseo se va a la pantalla final)
    if (finished) return null;
    if (target > 0) return prepareLeg(route.legs[target - 1].line, route.legs[target - 1].steps);
    return approach.leg ? prepareLeg(approach.leg.line, approach.leg.steps) : null;
  }, [route, target, finished, approach.leg]);
  const quality = target > 0 ? route.quality : approach.quality;

  const sim = useMemo(() => ({ speed: simSpeed, paused: paused || !!manual, resumeFrom }), [simSpeed, paused, manual, resumeFrom]);
  const walk = useWalkPosition(source, leg, sim);
  const { heading, permission } = walk;
  const position = manual ?? walk.position;

  // Modo prueba: tocar el mapa te lleva allí; «Seguir» retoma el paseo desde el punto de la ruta más cercano
  const moveTo = (p: LngLat) => { setSource('simulated'); setManual(p); };
  const resume = () => {
    if (manual && leg) setResumeFrom({ along: projectOnRoute(leg.line, manual, leg.cum).along, key: Date.now() });
    setManual(null);
    setSource('simulated');
    setPaused(false);
  };
  const arriveNow = () => moveTo(stop.coord);
  // Nueva parada objetivo: el paseo simulado sale de la anterior
  const lastTarget = useRef(target);
  useEffect(() => {
    if (lastTarget.current === target) return;
    lastTarget.current = target;
    setManual(null);
    setResumeFrom(undefined);
    setPaused(false);
    setSelected(null);
  }, [target]);
  const openStop = (n: number) => {
    setSelected(null);
    router.push({ pathname: '/tour/[id]/stop/[n]', params: { id: tour.id, n: String(n) } });
  };
  // La primera posición GPS marca el inicio del camino hacia la primera parada
  if (target === 0 && source === 'gps' && position && !gpsOrigin) setGpsOrigin(position);

  const g = leg && position ? guide(leg, position, stop.coord) : null;
  const text = g ? instruction(g, stop.name) : { text: 'Buscando tu posición…', then: 'Necesitas el GPS activado' };

  // Llegada: vibración y la parada se abre encima del mapa. Desde ahora se puede sellar.
  const arrivedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!g?.arrived || finished || arrivedFor.current === target) return;
    arrivedFor.current = target;
    // Cada parada se sella una vez; si ya estaba sellada, la llegada solo queda en el historial
    const repeat = arrive(tour.id, stop.id);
    narration.stop();
    setSelected(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push({ pathname: '/tour/[id]/stop/[n]', params: { id: tour.id, n: String(target), arrived: repeat ? 'repeat' : '1' } });
  }, [g?.arrived, arrive, stop.id, tour.id, target, narration, finished]);

  const style = useMemo(() => buildMapStyle(p), [p]);
  const c = mapColors(p);
  const walked = useMemo(() => {
    if (!leg || !g) return [];
    const pts = leg.line.filter((_, i) => leg.cum[i] < g.along);
    return [...pts, g.snapped];
  }, [leg, g]);

  const totalBefore = route.legs.slice(0, Math.max(0, target - 1)).reduce((a, l) => a + cumulative(l.line).at(-1)!, 0);
  const total = route.legs.reduce((a, l) => a + cumulative(l.line).at(-1)!, 0);
  const frac = leg && g ? g.along / leg.length : 0;
  const way = tour.onTheWay.find(w => w.afterStop === target - 1);
  const showWay = !!way && frac > 0.12 && frac < 0.65;

  return (
    <TourThemeProvider palette={p}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Map style={StyleSheet.absoluteFill} mapStyle={style} compass={false} logo={false} attribution attributionPosition={{ bottom: 250, right: 8 }} onPress={testMode ? e => moveTo(e.nativeEvent.lngLat) : undefined}>
          {/* Con una parada elegida, el mapa vuela hasta ella; si no, sigue tu posición */}
          <Camera center={selected != null ? tour.stops[selected].coord : position ?? stop.coord} zoom={selected != null ? 17.3 : 17} duration={selected != null ? 900 : 700} easing={selected != null ? 'fly' : 'ease'} padding={{ top: 160, bottom: selected != null ? 330 : 240, left: 0, right: 0 }} />
          {leg && (
            <GeoJSONSource id="route" data={line(leg.line)}>
              <Layer id="route-dots" type="line" layout={{ 'line-cap': 'round' }} paint={{ 'line-color': c.route, 'line-width': 5, 'line-dasharray': [0.1, 2] }} />
            </GeoJSONSource>
          )}
          {walked.length > 1 && (
            <GeoJSONSource id="walked" data={line(walked)}>
              <Layer id="walked-case" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': c.road, 'line-width': 11 }} />
              <Layer id="walked-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': c.route, 'line-width': 7 }} />
            </GeoJSONSource>
          )}
          {tour.stops.map((st, i) => (
            <Marker key={st.id} id={`stop-${st.id}`} lngLat={st.coord} anchor="center">
              <StopPin index={i} state={i < target ? 'done' : i === target ? 'now' : 'next'} selected={selected === i} palette={p} onPress={() => setSelected(v => (v === i ? null : i))} />
            </Marker>
          ))}
          {position && (
            <Marker id="me" lngLat={position} anchor="center">
              <MePin heading={heading} />
            </Marker>
          )}
        </Map>

        {/* Indicación */}
        <View style={[s.dir, { top: insets.top + 8, backgroundColor: g?.offRoute ? functional.warn : p.deep }]}>
          <View style={s.dirMain}>
            <View style={[s.arrow, { backgroundColor: g?.offRoute ? 'rgba(255,255,255,0.55)' : p.t2 }]}>
              <Text style={s.arrowGlyph}>{!g ? '…' : g.offRoute ? '↺' : g.next ? (g.next.direction.includes('left') ? '↰' : g.next.direction === 'uturn' ? '↺' : '↱') : '⚑'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.dist, g?.offRoute && { color: neutral.ink }]}>{g ? formatDistance(g.offRoute ? g.offRouteBy : g.distToNext) : '—'}</Text>
              <Text style={[s.instr, g?.offRoute && { color: neutral.ink }]}>{text.text}</Text>
            </View>
          </View>
          <View style={s.then}><Text style={[s.thenText, g?.offRoute && { color: neutral.ink }]} numberOfLines={1}>{text.then}</Text></View>
        </View>

        <IconButton label="Salir del tour" icon="close" onPress={() => { endWalk(); router.back(); }} style={{ position: 'absolute', left: 14, bottom: sheetH + 14 }} />
        {/* Entrar y salir de la guía de la parada visitada */}
        {visited && selected == null && <GuideButton to="guide" photo={visited.photo} palette={p} onPress={() => openStop(walkState!.guide!)} style={{ bottom: sheetH + 12 }} />}
        {quality !== 'streets' && leg && (
          <View style={[s.srcPill, { bottom: 268 + insets.bottom }]}>
            <Text style={s.srcText}>{quality === 'loading' ? 'Calculando la ruta por calles…' : 'Sin conexión: ruta en línea recta'}</Text>
          </View>
        )}

        {/* Modo prueba: controles para recorrer el tour sin moverse */}
        {testMode && (
          <View style={[s.test, { top: insets.top + 150 }]}>
            <View style={s.testRow}>
              <Text style={s.testTitle}>Modo prueba</Text>
              <Pressable accessibilityRole="button" onPress={() => { setManual(null); setSource(v => (v === 'gps' ? 'simulated' : 'gps')); }} style={s.testChip}>
                <Text style={s.testChipText}>{source === 'gps' ? 'GPS real' : 'Simulado'}</Text>
              </Pressable>
            </View>
            <View style={s.testRow}>
              <Pressable accessibilityRole="button" onPress={() => (manual || paused || source === 'gps' ? resume() : setPaused(true))} style={[s.testChip, s.testOn]}>
                <Text style={[s.testChipText, { color: '#fff' }]}>{manual || paused || source === 'gps' ? '▶ Andar' : 'II Parar'}</Text>
              </Pressable>
              {([1, 4, 16] as SimSpeed[]).map(v => (
                <Pressable key={v} accessibilityRole="button" accessibilityLabel={`Velocidad ${v}x`} onPress={() => setSimSpeed(v)} style={[s.testChip, simSpeed === v && s.testOn]}>
                  <Text style={[s.testChipText, simSpeed === v && { color: '#fff' }]}>{v}×</Text>
                </Pressable>
              ))}
              <Pressable accessibilityRole="button" onPress={arriveNow} style={s.testChip}>
                <Text style={s.testChipText}>⚑ Llegar</Text>
              </Pressable>
            </View>
            <Text style={s.testHint}>Toca el mapa para moverte a ese punto (también fuera de la ruta).</Text>
          </View>
        )}

        {/* Hoja inferior (y, después, encima de ella la ventana de la parada elegida en el mapa) */}
        <Animated.View entering={FadeInDown.delay(150).duration(DUR.base).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })} onLayout={e => setSheetH(e.nativeEvent.layout.height)} style={[s.bottom, { paddingBottom: insets.bottom + 14 }]}>
          {showWay && (
            <Pressable accessibilityRole="button" onPress={() => (narration.speaking ? narration.stop() : narration.speak(way!.story ?? way!.text.replace(/^De camino:\s*/i, '')))} style={[s.way, { backgroundColor: p.soft }]}>
              <View style={[s.wayPlay, { backgroundColor: p.t }]}><Text style={{ color: p.on, fontFamily: font.black }}>{narration.speaking ? 'II' : '▶'}</Text></View>
              <Text style={[s.wayText, { color: p.deep }]} numberOfLines={1}>{way!.text}</Text>
            </Pressable>
          )}
          {permission === 'denied' && <Text style={s.warn}>Activa la ubicación en Ajustes para que Paseo te guíe, o usa el paseo simulado.</Text>}
          <View style={s.progressTop}>
            <Text style={s.progressLabel}><Text style={{ color: neutral.ink, fontFamily: font.black }}>Parada {target + 1}</Text> de {tour.stops.length}</Text>
            <Text style={s.progressLabel}>{formatDistance(totalBefore + (g?.along ?? 0))} / {formatDistance(total)}</Text>
          </View>
          <View style={s.bar}>
            {tour.stops.map((st, i) => (
              <View key={st.id} style={[s.seg, i < target && { backgroundColor: p.t }]}>
                {i === target && <View style={[StyleSheet.absoluteFill, { width: `${Math.round(frac * 100)}%`, backgroundColor: p.t2, borderRadius: 4 }]} />}
              </View>
            ))}
          </View>
          <PressableScale accessibilityRole="button" accessibilityLabel={`Abrir ${stop.name}`} onPress={() => openStop(target)} scaleTo={0.98} style={s.next}>
            <DuotoneImage source={stop.photo} palette={p} style={s.nextPic} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.nextOver, { color: p.t }]}>Siguiente</Text>
              <Text style={s.nextName} numberOfLines={1}>{stop.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.eta}>{g ? `${walkingMinutes(g.remaining)} min` : '—'}</Text>
              <Text style={s.etaSub}>{g ? formatDistance(g.remaining) : ''}</Text>
            </View>
          </PressableScale>
        </Animated.View>
        {selected != null && (
          <View style={[s.popWrap, { bottom: sheetH + 12 }]}>
            <StopPopup
              key={selected}
              stop={tour.stops[selected]}
              index={selected}
              total={tour.stops.length}
              palette={p}
              status={
                saved?.stamps.some(x => x.stopId === tour.stops[selected].id)
                  ? 'Sellada · puedes volver a leerla'
                  : selected === target
                    ? `Vas aquí${g ? ` · ${walkingMinutes(g.remaining)} min` : ''}`
                    : selected < target ? 'Ya pasaste por aquí' : 'Más adelante en la ruta'
              }
              action={{ label: 'Ver guía', onPress: () => openStop(selected) }}
              footer={
                selected > target && !saved?.stamps.some(x => x.stopId === tour.stops[selected].id)
                  ? { label: 'Ir aquí', hint: `Te saltas ${selected - target === 1 ? 'una parada' : `${selected - target} paradas`}; puedes volver otro día`, onPress: () => { goTo(selected); setSelected(null); } }
                  : undefined
              }
              onClose={() => setSelected(null)}
            />
          </View>
        )}
      </View>
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  dir: { position: 'absolute', left: 12, right: 12, borderRadius: 24, overflow: 'hidden', ...shadow[3] },
  dirMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  arrow: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  arrowGlyph: { fontFamily: font.black, fontSize: 30, color: neutral.ink },
  dist: { fontFamily: font.black, fontSize: 32, color: '#fff', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  instr: { fontFamily: font.bold, fontSize: 15, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  then: { backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 14, paddingVertical: 8 },
  thenText: { fontFamily: font.heavy, fontSize: 13, color: '#fff' },
  srcPill: { position: 'absolute', right: 14, backgroundColor: 'rgba(28,26,23,0.82)', borderRadius: radius.pill, paddingHorizontal: 12, height: 32, justifyContent: 'center' },
  srcText: { fontFamily: font.black, fontSize: 12, color: '#fff' },
  test: { position: 'absolute', left: 12, right: 12, backgroundColor: 'rgba(28,26,23,0.86)', borderRadius: 18, padding: 10, gap: 8 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  testTitle: { flex: 1, fontFamily: font.black, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#FFC53D' },
  testChip: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' },
  testOn: { backgroundColor: '#F25C3B' },
  testChipText: { fontFamily: font.black, fontSize: 13, color: '#fff' },
  testHint: { fontFamily: font.bold, fontSize: 11.5, color: 'rgba(255,255,255,0.75)' },
  popWrap: { position: 'absolute', left: 12, right: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: neutral.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 14, gap: 10, ...shadow[3] },
  way: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.pill, padding: 5, paddingRight: 14, marginTop: -2 },
  wayPlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  wayText: { flex: 1, fontFamily: font.heavy, fontSize: 13 },
  warn: { fontFamily: font.bold, fontSize: 13, color: '#6B4700', backgroundColor: functional.warnSoft, padding: 10, borderRadius: radius.md },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: font.heavy, fontSize: 13.5, color: neutral.ink2, fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 7, borderRadius: 4, backgroundColor: neutral.line, overflow: 'hidden' },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  nextPic: { width: 56, height: 56, borderRadius: 14 },
  nextOver: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase' },
  nextName: { fontFamily: font.black, fontSize: 18, color: neutral.ink },
  eta: { fontFamily: font.black, fontSize: 20, color: neutral.ink, fontVariant: ['tabular-nums'] },
  etaSub: { fontFamily: font.bold, fontSize: 12, color: neutral.ink3 },
});
