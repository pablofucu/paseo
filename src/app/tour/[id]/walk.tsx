import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
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

export default function Walk() {
  const tour = useTourParam();
  const target = Number(useLocalSearchParams<{ target: string }>().target ?? 0);
  const stop = tour.stops[target];
  const p = tour.palette;
  const insets = useSafeAreaInsets();
  const { testMode, simSpeed, setSimSpeed } = useSettings();
  const [source, setSource] = useState<PositionSource>(testMode ? 'simulated' : 'gps');
  const [paused, setPaused] = useState(false);
  /** Modo prueba: posición puesta a mano tocando el mapa (puede estar fuera de la ruta) */
  const [manual, setManual] = useState<LngLat | null>(null);
  const [resumeFrom, setResumeFrom] = useState<{ along: number; key: number } | undefined>(undefined);
  const [gpsOrigin, setGpsOrigin] = useState<LngLat | null>(null);
  const collectStamp = usePassport(s => s.collectStamp);
  const narration = useNarration();

  const route = useTourRoute(tour);
  const simOrigin = useMemo(() => approachFrom(stop.coord), [stop]);
  const origin = target !== 0 ? null : source === 'simulated' ? simOrigin : gpsOrigin;

  // Tramo actual: de la parada anterior a esta; para la primera, por calles desde donde estés
  const approach = useApproachRoute(origin, stop.coord);
  const leg = useMemo(() => {
    if (target > 0) return prepareLeg(route.legs[target - 1].line, route.legs[target - 1].steps);
    return approach.leg ? prepareLeg(approach.leg.line, approach.leg.steps) : null;
  }, [route, target, approach.leg]);
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
  // La primera posición GPS marca el inicio del camino hacia la primera parada
  if (target === 0 && source === 'gps' && position && !gpsOrigin) setGpsOrigin(position);

  const g = leg && position ? guide(leg, position, stop.coord) : null;
  const text = g ? instruction(g, stop.name) : { text: 'Buscando tu posición…', then: 'Necesitas el GPS activado' };

  // Llegada: sello, vibración y pantalla de la parada
  const arrivedRef = useRef(false);
  useEffect(() => {
    if (!g?.arrived || arrivedRef.current) return;
    arrivedRef.current = true;
    collectStamp(stop.id);
    narration.stop();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace({ pathname: '/tour/[id]/stop/[n]', params: { id: tour.id, n: String(target), arrived: '1' } });
  }, [g?.arrived, collectStamp, stop.id, tour.id, target, narration]);

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
          <Camera center={position ?? stop.coord} zoom={17} duration={700} easing="ease" padding={{ top: 160, bottom: 240, left: 0, right: 0 }} />
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
              <View style={[s.pin, i < target && { backgroundColor: p.t, opacity: 0.55, borderColor: p.t }, i === target && [s.pinNow, { backgroundColor: p.t2 }], i > target && { borderColor: p.t }]}>
                <Text style={[s.pinText, { color: i < target ? p.on : i === target ? neutral.ink : p.t }]}>{i + 1}</Text>
              </View>
            </Marker>
          ))}
          {position && (
            <Marker id="me" lngLat={position} anchor="center">
              <View style={s.meWrap}>
                {heading != null && <View style={[s.cone, { transform: [{ rotate: `${heading}deg` }] }]} />}
                <View style={s.me} />
              </View>
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

        <IconButton label="Salir del tour" icon="close" onPress={() => router.back()} style={{ position: 'absolute', left: 14, bottom: 262 + insets.bottom }} />
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

        {/* Hoja inferior */}
        <View style={[s.bottom, { paddingBottom: insets.bottom + 14 }]}>
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
          <View style={s.next}>
            <DuotoneImage source={stop.photo} palette={p} style={s.nextPic} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.nextOver, { color: p.t }]}>Siguiente</Text>
              <Text style={s.nextName} numberOfLines={1}>{stop.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.eta}>{g ? `${walkingMinutes(g.remaining)} min` : '—'}</Text>
              <Text style={s.etaSub}>{g ? formatDistance(g.remaining) : ''}</Text>
            </View>
          </View>
        </View>
      </View>
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  pin: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#fff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  pinNow: { width: 48, height: 48, borderRadius: 24, borderWidth: 4, borderColor: '#fff' },
  pinText: { fontFamily: font.black, fontSize: 16 },
  meWrap: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  cone: { position: 'absolute', width: 0, height: 0, top: 2, borderLeftWidth: 14, borderRightWidth: 14, borderBottomWidth: 32, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(45,127,249,0.25)', transformOrigin: 'center 33px' },
  me: { width: 22, height: 22, borderRadius: 11, backgroundColor: functional.me, borderWidth: 4, borderColor: '#fff', ...shadow[2] },
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
