import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { DuotoneImage } from '@/components/DuotoneImage';
import { GuideButton } from '@/components/GuideButton';
import { ManeuverIcon, type ManeuverKind } from '@/components/ManeuverIcon';
import { StopMarkers, StopPopup } from '@/components/MapPins';
import { MeMarker } from '@/components/MeMarker';
import { DUR, EASE_OUT, lightTap, PressableScale } from '@/components/motion';
import { StopList } from '@/components/StopList';
import { IconButton } from '@/components/ui';
import type { LngLat, Tour } from '@/data/types';
import { cumulative, distance, formatDistance, pointAlong, projectOnRoute, walkingMinutes } from '@/lib/geo';
import { startArrivalWatch, stopArrivalWatch } from '@/lib/arrivalWatch';
import { entryMode } from '@/lib/entry';
import { accuracySlack, ARRIVE_RADIUS_M, arrivalAllowed, instruction, prepareLeg } from '@/lib/guidance';
import { buildMapStyle, mapColors } from '@/lib/mapStyle';
import { wayScript } from '@/lib/spoken';
import { usePausedWalk } from '@/lib/pausedWalk';
import { useGuide } from '@/lib/useGuide';
import { useNarration } from '@/lib/useNarration';
import { useReroute } from '@/lib/useReroute';
import { useTourParamSafe } from '@/lib/useTour';
import { useApproachRoute, useTourRoute } from '@/lib/useTourRoute';
import { MAX_ACCURACY_M, useWalkPosition, type PositionSource } from '@/lib/useWalkPosition';
import { canSkip, nextTarget } from '@/lib/walkPlan';
import { usePassport } from '@/store/passport';
import { useSettings, type SimSpeed } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, functional, neutral, radius, shadow } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';

const line = (coords: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });

/** Punto de partida simulado para ir a la primera parada: ~150 m al suroeste */
const approachFrom = (c: LngLat): LngLat => [c[0] - 0.0012, c[1] - 0.0009];

/** Más lejos que esto de la primera parada no se dibuja la ruta: se ofrece abrir el mapa del sistema */
const FAR_START_M = 2000;
const FAR_START_BACK_M = 1800;
/** Más lejos que esto de la parada, el GPS gasta menos batería (y vuelve a la precisión alta al acercarte) */
const FAR_TARGET_M = 250;
const NEAR_TARGET_M = 180;
/** Cuánto se deja de mover el trazo ya recorrido (metros) para no actualizar el mapa en cada lectura */
const WALKED_STEP_M = 3;
/** Alto del selector Mapa / Paradas con su hueco */
const TOGGLE_H = 48;

/** Abre la app de mapas del sistema con la ruta a pie hasta un punto */
function openSystemMaps(coord: LngLat, name: string) {
  const [lng, lat] = coord;
  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`,
    default: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`,
  })!;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`).catch(() => {}));
}

/**
 * El mapa del paseo es la pantalla central del tour: guía hasta la parada a la
 * que vas (en orden) y al llegar abre la parada encima. Al cerrarla se vuelve
 * aquí. Tocando cualquier pin se ve esa parada y se puede entrar a leerla.
 */
export default function Walk() {
  const tour = useTourParamSafe();
  // Un id que no existe (enlace viejo) lleva al inicio en vez de romper la app
  if (!tour) return <Redirect href="/" />;
  return <WalkScreen tour={tour} />;
}

function WalkScreen({ tour }: { tour: Tour }) {
  useKeepAwake();
  const focused = useIsFocused();
  const rawParam = Number(useLocalSearchParams<{ target: string }>().target ?? 0);
  // El parámetro puede venir roto (NaN, negativo, pasado de rango): se queda en una parada que exista
  const param = Number.isInteger(rawParam) ? Math.min(Math.max(rawParam, 0), tour.stops.length - 1) : 0;
  const walkState = usePassport(s => s.walk);
  const startWalk = usePassport(s => s.startWalk);
  const goTo = usePassport(s => s.goTo);
  const skipStop = usePassport(s => s.skipStop);
  const endWalk = usePassport(s => s.endWalk);
  const saved = usePassport(s => s.routes[tour.id]);
  const mine = walkState?.tourId === tour.id;
  const target = mine ? walkState.target : param;
  const finished = target >= tour.stops.length;
  const stop = tour.stops[Math.min(target, tour.stops.length - 1)];
  const skipped = mine ? walkState.skipped : undefined;
  const ids = useMemo(() => tour.stops.map(st => st.id), [tour]);
  const stamped = useMemo(() => new Set(saved?.stamps.map(x => x.stopId)), [saved]);
  const [selected, setSelected] = useState<number | null>(null);
  /** Mapa o lista de paradas (el respaldo cuando el GPS no ayuda) */
  const [view, setView] = useState<'map' | 'list'>('map');
  /** Tarjeta «Estás en…» tras llegar (el GPS es fiable): escuchar o dejarlo para luego */
  const [prompt, setPrompt] = useState<{ idx: number; repeat: boolean } | null>(null);
  const [sheetH, setSheetH] = useState(230);
  const [bannerH, setBannerH] = useState(120);
  // Si se entra directamente (sin pasar por la ficha), el paseo empieza aquí
  useEffect(() => { if (!mine) startWalk(tour.id, param); }, [mine, startWalk, tour.id, param]);
  // Pasada la última parada, al resumen final (cuando el mapa vuelve a estar delante, no con la guía encima)
  useFocusEffect(useCallback(() => {
    if (finished) router.replace({ pathname: '/tour/[id]/done', params: { id: tour.id } });
  }, [finished, tour.id]));
  // Una parada ya sellada (p. ej. sellada fuera de orden) no se vuelve a guiar: se pasa a la siguiente sin sellar
  useEffect(() => {
    if (!mine || finished || !stamped.has(stop.id) || walkState.arrived === stop.id) return;
    goTo(nextTarget(ids, stamped, target, skipped));
  }, [mine, finished, stamped, stop.id, walkState?.arrived, goTo, ids, target, skipped]);
  const visited = mine && walkState.guide != null ? tour.stops[walkState.guide] : null;
  const p = tour.palette;
  const insets = useSafeAreaInsets();
  const { testMode, simSpeed, setSimSpeed } = useSettings();
  const [source, setSource] = useState<PositionSource>(testMode ? 'simulated' : 'gps');
  const [paused, setPaused] = useState(false);
  /** Modo prueba: posición puesta a mano tocando el mapa (puede estar fuera de la ruta) */
  const [manual, setManual] = useState<LngLat | null>(null);
  const [resumeFrom, setResumeFrom] = useState<{ along: number; key: number } | undefined>(undefined);
  /** Dónde empieza el camino hasta la parada `target` cuando no sale de la parada anterior (primera lectura del GPS) */
  const [gpsOrigin, setGpsOrigin] = useState<{ target: number; from: LngLat } | null>(null);
  /** Nuevo punto de partida tras salirte del camino */
  const [rerouted, setRerouted] = useState<{ source: PositionSource; target: number; from: LngLat } | null>(null);
  /** Muy lejos de la primera parada: no se calcula ruta, se ofrece el mapa del sistema */
  const [farStart, setFarStart] = useState(false);
  /** La parada queda lejos: el GPS pasa a precisión media y menos lecturas */
  const [farTarget, setFarTarget] = useState(false);
  /** Mapa libre: el usuario lo ha movido con el dedo y deja de seguirle */
  const [follow, setFollow] = useState(true);
  const arrive = usePassport(s => s.arrive);
  const narration = useNarration();

  const route = useTourRoute(tour);
  const simOrigin = useMemo(() => approachFrom(stop.coord), [stop]);
  // El tramo sale de la parada anterior solo si vienes de ella; la primera parada, o tras saltar, retomar o ir a otra, se calcula desde donde estés
  const sequential = target > 0 && mine && walkState.guide === target - 1;
  const gpsFrom = gpsOrigin?.target === target ? gpsOrigin.from : null;
  const origin = sequential || farStart ? null : rerouted?.source === source && rerouted.target === target ? rerouted.from : source === 'simulated' ? simOrigin : gpsFrom;

  // Tramo actual: de la parada anterior a esta; para la primera, por calles desde donde estés
  const approach = useApproachRoute(origin, stop.coord);
  const leg = useMemo(() => {
    // Pasada la última parada no hay tramo (el paseo se va a la pantalla final)
    if (finished) return null;
    if (sequential && route.legs[target - 1]) return prepareLeg(route.legs[target - 1].line, route.legs[target - 1].steps);
    return approach.leg ? prepareLeg(approach.leg.line, approach.leg.steps) : null;
  }, [route, target, finished, sequential, approach.leg]);
  const quality = sequential ? route.quality : approach.quality;

  const sim = useMemo(() => ({ speed: simSpeed, paused: paused || !!manual, resumeFrom }), [simSpeed, paused, manual, resumeFrom]);
  const gpsOpts = useMemo(() => ({ far: farTarget, heading: focused }), [farTarget, focused]);
  const walk = useWalkPosition(source, leg, sim, gpsOpts);
  const { heading, permission, accuracy, retry } = walk;
  const position = manual ?? walk.position;

  // Modo prueba: tocar el mapa te lleva allí; «Seguir» retoma el paseo desde el punto de la ruta más cercano
  const moveTo = (pt: LngLat) => { setSource('simulated'); setManual(pt); };
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
    setPrompt(null);
    setFollow(true);
  }, [target]);
  /** Abre la parada; con `arrived` el audio empieza solo (el usuario ha elegido escucharla) */
  const openStop = useCallback((n: number, arrived?: '1' | 'repeat') => {
    narration.stop();
    setSelected(null);
    router.push({ pathname: '/tour/[id]/stop/[n]', params: arrived ? { id: tour.id, n: String(n), arrived } : { id: tour.id, n: String(n) } });
  }, [tour.id, narration]);
  const onSelectStop = useCallback((i: number) => setSelected(v => (v === i ? null : i)), []);
  // La primera posición GPS marca el inicio del camino hasta la parada (si no estás a cientos de km)
  if (!sequential && !finished && source === 'gps' && position && gpsOrigin?.target !== target && !farStart) setGpsOrigin({ target, from: position });

  // Lejos de la primera parada (> 2 km) no se dibuja una ruta enorme: se ofrece abrir el mapa del sistema
  const startD = target === 0 && source === 'gps' && position ? distance(position, tour.stops[0].coord) : null;
  const farStartNow = startD == null ? false : farStart ? startD > FAR_START_BACK_M : startD > FAR_START_M;
  if (farStartNow !== farStart) setFarStart(farStartNow);
  // De lejos el GPS gasta menos; al acercarte a la parada vuelve a la precisión alta
  const targetD = source === 'gps' && position ? distance(position, stop.coord) : null;
  const farTargetNow = targetD == null ? farTarget : farTarget ? targetD > NEAR_TARGET_M : targetD > FAR_TARGET_M;
  if (farTargetNow !== farTarget) setFarTarget(farTargetNow);

  const g = useGuide(leg, position, stop.coord, source === 'gps' ? accuracy : null);
  // Si el camino sale de donde estabas, al salirte de él se recalcula desde donde estés; el tramo fijo entre paradas no
  const rerouting = useReroute(!sequential && !farStart, position, !!g?.offRoute, from => setRerouted({ source, target, from }), quality);

  // Sin posición suficiente del GPS: avisa y deja marcar la llegada a mano
  const [noFix, setNoFix] = useState(false);
  useEffect(() => {
    if (source !== 'gps' || permission !== 'granted' || position) return;
    const t = setTimeout(() => setNoFix(true), 15000);
    return () => clearTimeout(t);
  }, [source, permission, position]);
  const poorGps = source === 'gps' && permission === 'granted' && ((accuracy != null && accuracy > MAX_ACCURACY_M) || (!position && noFix));
  // Con GPS y permiso, la ubicación también se sigue con la pantalla apagada para avisar al llegar
  useEffect(() => {
    if (source !== 'gps' || permission !== 'granted' || !mine || finished) return;
    startArrivalWatch();
    return () => { stopArrivalWatch(); };
  }, [source, permission, mine, finished]);

  // Llegada: vibración y aviso en el mapa; la guía solo se abre si el usuario lo pide. Desde ahora se puede sellar.
  const arrivedFor = useRef<number | null>(null);
  const lastArrival = useRef<{ at: number; coord: LngLat; stopCoord: LngLat } | null>(null);
  /** Ir a otra parada: las que quedan por el camino sin sellar se dejan «saltadas» para sellarlas luego */
  const jumpTo = useCallback((i: number) => {
    if (i > target) ids.slice(target, i).filter(id => !stamped.has(id)).forEach(id => skipStop(id, i));
    else goTo(i);
  }, [ids, stamped, target, skipStop, goTo]);
  /** Registra la llegada (vibra y deja sellar); devuelve si la parada ya estaba sellada */
  const register = useCallback((idx: number, from: LngLat | null) => {
    const st = tour.stops[idx];
    // Llegar a una parada que no era la siguiente la convierte en la parada actual
    if (idx !== target) jumpTo(idx);
    // Cada parada se sella una vez; si ya estaba sellada, la llegada solo queda en el historial
    const repeat = arrive(tour.id, st.id);
    narration.stop();
    setSelected(null);
    lastArrival.current = { at: Date.now(), coord: from ?? st.coord, stopCoord: st.coord };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return repeat;
  }, [tour, target, jumpTo, arrive, narration]);
  const doArrive = useCallback((idx: number, from: LngLat | null) => {
    const repeat = register(idx, from);
    openStop(idx, repeat ? 'repeat' : '1');
  }, [register, openStop]);
  useEffect(() => {
    if (!g?.arrived || finished || !position || arrivedFor.current === target) return;
    // Ya se llegó a esta parada (aunque la pantalla se haya vuelto a montar): no se repite
    if (mine && walkState.arrived === stop.id) { arrivedFor.current = target; return; }
    // Paradas a menos de 25 m una de otra: la siguiente espera a que te hayas movido o pase un rato
    if (!arrivalAllowed(lastArrival.current, stop.coord, position, Date.now())) return;
    arrivedFor.current = target;
    const repeat = register(target, position);
    setPrompt({ idx: target, repeat });
  }, [g?.arrived, position, finished, target, mine, walkState?.arrived, stop.id, stop.coord, register]);

  // A 60 m de la parada: «¡Ya estás aquí!» con una vibración suave antes de llegar
  const previewFor = useRef<number | null>(null);
  const near = !!g?.near && !g.offRoute;
  useEffect(() => {
    if (!near || previewFor.current === target) return;
    previewFor.current = target;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [near, target]);

  // Has llegado a OTRA parada sin sellar (no la que toca): se ofrece sellarla
  const [declined, setDeclined] = useState<string[]>([]);
  const here = useMemo(() => {
    if (!position || finished) return -1;
    const reach = ARRIVE_RADIUS_M + accuracySlack(source === 'gps' ? accuracy : null) / 2;
    return tour.stops.findIndex((st, i) => i !== target && !stamped.has(st.id) && distance(position, st.coord) <= reach);
  }, [position, finished, tour.stops, target, stamped, source, accuracy]);
  // Lo que dijiste «ahora no» vuelve a ofrecerse cuando te has alejado
  if (position && declined.length) {
    const still = declined.filter(id => { const st = tour.stops.find(x => x.id === id); return st && distance(position, st.coord) < 60; });
    if (still.length !== declined.length) setDeclined(still);
  }
  const offer = here >= 0 && !g?.arrived && !declined.includes(tour.stops[here].id) && selected == null ? here : -1;

  const style = useMemo(() => buildMapStyle(p), [p]);
  const c = useMemo(() => mapColors(p), [p]);

  // El trazo recorrido solo se rehace cuando avanzas unos metros, y la geometría se guarda por tramo
  const alongQ = g ? Math.floor(g.along / WALKED_STEP_M) * WALKED_STEP_M : 0;
  const routeGeo = useMemo(() => {
    if (!leg) return null;
    const cut = pointAlong(leg.line, alongQ, leg.cum);
    const done = alongQ > 0 ? [...leg.line.filter((_, i) => leg.cum[i] < alongQ), cut] : [];
    const rest = [cut, ...leg.line.filter((_, i) => leg.cum[i] > alongQ)];
    return { walked: done.length > 1 ? line(done) : null, rest: rest.length > 1 ? line(rest) : null };
  }, [leg, alongQ]);

  const lens = useMemo(() => route.legs.map(l => cumulative(l.line).at(-1) ?? 0), [route.legs]);
  const total = useMemo(() => lens.reduce((a, l) => a + l, 0), [lens]);
  const totalBefore = useMemo(() => lens.slice(0, Math.max(0, target - 1)).reduce((a, l) => a + l, 0), [lens, target]);
  const frac = leg && g && leg.length > 0 ? Math.min(1, Math.max(0, g.along / leg.length)) : 0;
  const way = tour.onTheWay.find(w => w.afterStop === target - 1);
  const showWay = !!way && frac > 0.12 && frac < 0.65;

  // Cámara: sigue tu posición hasta que mueves el mapa; la parada elegida tiene prioridad
  const [cam, setCam] = useState<LngLat>(position ?? stop.coord);
  const want = selected != null ? tour.stops[selected].coord : follow ? position ?? stop.coord : null;
  if (want && (want[0] !== cam[0] || want[1] !== cam[1])) setCam(want);
  const camCenter = want ?? cam;
  const padBottom = selected != null ? sheetH + 110 : sheetH + 10;
  const padTop = insets.top + bannerH + 8 + TOGGLE_H;

  // Avisos debajo de la indicación: uno solo, con todo lo que pasa
  const blocked = source === 'gps' && (permission === 'denied' || permission === 'unavailable');
  // Sin ubicación utilizable la lista pasa sola al frente, una vez; se puede volver al mapa
  const autoList = useRef(false);
  const gpsUnusable = blocked || (source === 'gps' && noFix && !position);
  useEffect(() => {
    if (!gpsUnusable || autoList.current) return;
    autoList.current = true;
    setSelected(null);
    setView('list');
  }, [gpsUnusable]);
  const notice = (() => {
    if (blocked || farStart) return null;
    const parts: string[] = [];
    if (source === 'gps' && permission === 'granted' && !position) parts.push('Buscando tu posición…');
    else if (poorGps) parts.push('Señal GPS débil');
    if (leg && quality === 'loading') parts.push('Calculando la ruta por calles…');
    if (leg && quality === 'approximate') parts.push('Sin conexión: ruta en línea recta');
    return parts.length ? parts.join(' · ') : null;
  })();
  // El selector Mapa / Paradas va bajo la indicación (y bajo el aviso, si lo hay); lo demás cuelga de él
  const toggleTop = insets.top + 8 + bannerH + 8 + (notice ? 40 : 0);
  const belowToggle = toggleTop + TOGGLE_H;

  const kind: ManeuverKind = !g ? 'wait' : g.offRoute ? 'back' : near || g.arrived ? 'arrive' : g.next ? g.next.direction : 'straight';
  const text = rerouting
    ? { text: 'Recalculando la ruta…', then: `Te llevamos a ${stop.name} desde donde estás` }
    : g?.arrived ? { text: 'Has llegado', then: stop.name }
    : near ? { text: '¡Ya estás aquí!', then: `${stop.name}: te avisamos al llegar` }
    : g ? instruction(g, stop.name)
    : { text: `Vamos a ${stop.name}`, then: 'Al llegar se estampa tu sello' };
  const bannerDist = g ? formatDistance(g.offRoute ? g.offRouteBy : near || g.arrived ? g.toStop : g.distToNext) : '—';

  const skipNext = canSkip(ids, stamped, target) ? ids.findIndex((id, i) => i > target && !stamped.has(id)) : -1;
  const skip = () => {
    if (skipNext < 0) return;
    narration.stop();
    skipStop(stop.id, skipNext);
  };
  const pause = () => {
    narration.stop();
    usePausedWalk.getState().pause({ tourId: tour.id, target, skipped: skipped ?? [] });
    endWalk();
    router.back();
  };
  const goHere = (i: number) => {
    jumpTo(i);
    setSelected(null);
  };
  const statusFor = (i: number) => {
    const id = tour.stops[i].id;
    if (stamped.has(id)) return 'Sellada · puedes volver a leerla';
    if (i === target) return `Vas aquí${g ? ` · ${walkingMinutes(g.remaining)} min` : ''}`;
    if (skipped?.includes(id)) return 'La saltaste · aún sin sellar';
    return i < target ? 'Aún sin sellar' : 'Más adelante en la ruta';
  };

  // Entrar a la guía de la parada a la que vas: el modo según lo fiable que sea el GPS
  const mode = entryMode({ arrived: mine && walkState.arrived === stop.id, distance: position ? distance(position, stop.coord) : null, accuracy: source === 'gps' ? accuracy : null, permission, hasFix: !!position, noFix, source });
  const listen = (i: number) => {
    if (i !== target || finished) return openStop(i);
    lightTap();
    if (mode === 'far') return openStop(target);
    arrivedFor.current = target;
    const repeat = mode === 'here' ? stamped.has(stop.id) : register(target, position);
    setPrompt(null);
    openStop(target, repeat ? 'repeat' : '1');
  };
  const listenCopy = mode === 'here' ? { title: 'Escuchar ahora', sub: stamped.has(stop.id) ? 'Ya tienes su sello' : 'Después, tu sello' }
    : mode === 'confirm' ? { title: `¿Ya estás en ${stop.name}?`, sub: 'Toca para escuchar y sellar' }
    : { title: `Escuchar ${stop.name}`, sub: 'Puedes escucharla ya; el sello, al llegar' };
  const promptOn = prompt != null && !finished && offer < 0 && selected == null && view === 'map';

  return (
    <TourThemeProvider palette={p}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={style}
          compass={false}
          logo={false}
          attribution
          attributionPosition={{ bottom: sheetH + 8, right: 8 }}
          onPress={testMode ? e => moveTo(e.nativeEvent.lngLat) : undefined}
          onRegionWillChange={e => { if (e.nativeEvent.userInteraction) setFollow(false); }}
        >
          {/* Con una parada elegida, el mapa vuela hasta ella; si no, sigue tu posición */}
          <Camera center={camCenter} zoom={selected != null ? 17.3 : 17} duration={selected != null ? 900 : 700} easing={selected != null ? 'fly' : 'ease'} padding={{ top: padTop, bottom: padBottom, left: 0, right: 0 }} />
          {routeGeo?.walked && (
            <GeoJSONSource id="walked" data={routeGeo.walked}>
              <Layer id="walked-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': c.route, 'line-width': 4, 'line-opacity': 0.35 }} />
            </GeoJSONSource>
          )}
          {routeGeo?.rest && (
            <GeoJSONSource id="route" data={routeGeo.rest}>
              <Layer id="route-case" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': c.road, 'line-width': 12 }} />
              <Layer id="route-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': c.route, 'line-width': 7.5 }} />
            </GeoJSONSource>
          )}
          <StopMarkers stops={tour.stops} stamped={stamped} target={target} selected={selected} palette={p} onSelect={onSelectStop} />
          {position && <MeMarker position={position} heading={heading} />}
        </Map>

        {/* Indicación */}
        <View
          onLayout={e => setBannerH(e.nativeEvent.layout.height)}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${bannerDist}. ${text.text}. ${text.then}`}
          style={[s.dir, { top: insets.top + 8, backgroundColor: g?.offRoute ? functional.warn : p.deep }]}
        >
          <View style={s.dirMain}>
            <View style={[s.arrow, { backgroundColor: g?.offRoute ? 'rgba(255,255,255,0.55)' : p.t2 }]}>
              <ManeuverIcon kind={kind} color={neutral.ink} size={34} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.dist, g?.offRoute && { color: neutral.ink }]}>{bannerDist}</Text>
              <Text style={[s.instr, g?.offRoute && { color: neutral.ink }]}>{text.text}</Text>
            </View>
          </View>
          <View style={s.then}><Text style={[s.thenText, g?.offRoute && { color: neutral.ink }]} numberOfLines={1}>{text.then}</Text></View>
        </View>

        {notice && (
          <View accessibilityLiveRegion="polite" style={[s.notice, { top: insets.top + 8 + bannerH + 8 }]}>
            <Text style={s.noticeText}>{notice}</Text>
          </View>
        )}
        {blocked && view === 'map' && (
          <View style={[s.card, { top: belowToggle }]}>
            <Text style={s.cardTitle}>{permission === 'denied' ? 'Paseo necesita tu ubicación' : 'La ubicación está apagada'}</Text>
            <Text style={s.cardText}>{permission === 'denied' ? 'Activa la ubicación en Ajustes para que Paseo te guíe, o usa el paseo simulado.' : 'Enciende la ubicación del móvil para que Paseo te guíe.'}</Text>
            <View style={s.cardRow}>
              <PressableScale accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => {})} style={[s.cardBtn, { backgroundColor: p.t }]}><Text style={[s.cardBtnText, { color: p.on }]}>Abrir ajustes</Text></PressableScale>
              <PressableScale accessibilityRole="button" onPress={retry} style={[s.cardBtn, s.cardBtnGhost]}><Text style={[s.cardBtnText, { color: neutral.ink }]}>Reintentar</Text></PressableScale>
            </View>
          </View>
        )}
        {farStart && view === 'map' && (
          <View style={[s.card, { top: belowToggle }]}>
            <Text style={s.cardTitle}>Estás lejos del inicio</Text>
            <Text style={s.cardText}>La primera parada, {tour.stops[0].name}, queda a {formatDistance(position ? distance(position, tour.stops[0].coord) : FAR_START_M)}. Usa tu app de mapas para llegar; el paseo empieza al acercarte.</Text>
            <View style={s.cardRow}>
              <PressableScale accessibilityRole="button" onPress={() => openSystemMaps(tour.stops[0].coord, tour.stops[0].name)} style={[s.cardBtn, { backgroundColor: p.t }]}><Text style={[s.cardBtnText, { color: p.on }]}>Abrir en Mapas</Text></PressableScale>
            </View>
          </View>
        )}

        {view === 'list' && (
          <StopList tour={tour} stamped={stamped} target={target} position={position} status={statusFor} onPlay={listen} top={toggleTop - 6} bottom={sheetH + 12} background={c.bg} />
        )}
        <View style={[s.toggle, { top: toggleTop }]}>
          {(['map', 'list'] as const).map(v => (
            <Pressable
              key={v}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === v }}
              onPress={() => { setSelected(null); setView(v); }}
              style={[s.toggleHalf, view === v && { backgroundColor: p.deep }]}
            >
              <Text style={[s.toggleText, view === v && { color: '#fff' }]}>{v === 'map' ? 'Mapa' : 'Paradas'}</Text>
            </Pressable>
          ))}
        </View>

        {view === 'map' && <IconButton label="Salir del tour" icon="close" onPress={() => { endWalk(); router.back(); }} style={{ position: 'absolute', left: 14, bottom: sheetH + 14 }} />}
        {/* Entrar y salir de la guía de la parada visitada */}
        {view === 'map' && visited && selected == null && !promptOn && <GuideButton to="guide" photo={visited.thumb} palette={p} onPress={() => openStop(walkState!.guide!)} style={{ bottom: sheetH + 12 }} />}
        {view === 'map' && !follow && selected == null && !promptOn && (
          <PressableScale accessibilityRole="button" accessibilityLabel="Centrar en mí" onPress={() => setFollow(true)} scaleTo={0.94} style={[s.center, { bottom: sheetH + (visited ? 72 : 14) }]}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={4} fill="none" stroke={neutral.ink} strokeWidth={2.6} />
              <Path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" stroke={neutral.ink} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
            <Text style={s.centerText}>Centrar en mí</Text>
          </PressableScale>
        )}

        {/* Modo prueba: controles para recorrer el tour sin moverse */}
        {testMode && view === 'map' && (
          <View style={[s.test, { top: belowToggle + 8 }]}>
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

        {/* Estás en otra parada sin sellar */}
        {offer >= 0 && view === 'map' && (
          <Animated.View entering={FadeInDown.duration(DUR.base).easing(EASE_OUT)} style={[s.popWrap, { bottom: sheetH + 12 }]}>
            <View style={s.offer}>
              <Text style={s.offerTitle}>Estás en {tour.stops[offer].name}</Text>
              <Text style={s.offerText}>No es la que tocaba, pero puedes sellarla ahora.</Text>
              <View style={s.cardRow}>
                <PressableScale accessibilityRole="button" onPress={() => doArrive(offer, position)} style={[s.cardBtn, { backgroundColor: p.t }]}><Text style={[s.cardBtnText, { color: p.on }]}>Sí, sellarla</Text></PressableScale>
                <PressableScale accessibilityRole="button" onPress={() => setDeclined(d => [...d, tour.stops[offer].id])} style={[s.cardBtn, s.cardBtnGhost]}><Text style={[s.cardBtnText, { color: neutral.ink }]}>Ahora no</Text></PressableScale>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Has llegado (GPS fiable): la guía no se abre sola */}
        {promptOn && (
          <Animated.View entering={FadeInDown.duration(DUR.base).easing(EASE_OUT)} style={[s.popWrap, { bottom: sheetH + 12 }]}>
            <View style={s.offer}>
              <View style={s.promptTop}>
                <DuotoneImage source={tour.stops[prompt.idx].thumb} palette={p} style={s.promptPic} />
                <View style={{ flex: 1 }}>
                  <Text style={s.offerTitle}>Estás en {tour.stops[prompt.idx].name}</Text>
                  <Text style={s.offerText}>¿Escuchas su historia?</Text>
                </View>
              </View>
              <View style={s.cardRow}>
                <PressableScale accessibilityRole="button" onPress={() => setPrompt(null)} style={[s.cardBtn, s.cardBtnGhost, { flex: 1, alignItems: 'center' }]}><Text style={[s.cardBtnText, { color: neutral.ink }]}>Luego</Text></PressableScale>
                <PressableScale accessibilityRole="button" accessibilityLabel={`Escuchar ${tour.stops[prompt.idx].name}`} onPress={() => { setPrompt(null); openStop(prompt.idx, prompt.repeat ? 'repeat' : '1'); }} style={[s.cardBtn, { flex: 1.4, alignItems: 'center', backgroundColor: p.t }]}><Text style={[s.cardBtnText, { color: p.on }]}>▶ Escuchar</Text></PressableScale>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Hoja inferior (y, después, encima de ella la ventana de la parada elegida en el mapa) */}
        <Animated.View entering={FadeInDown.delay(150).duration(DUR.base).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })} onLayout={e => setSheetH(e.nativeEvent.layout.height)} style={[s.bottom, { paddingBottom: insets.bottom + 14 }]}>
          {showWay && (
            <Pressable accessibilityRole="button" onPress={() => (narration.speaking ? narration.stop() : narration.speak(wayScript(way!)))} style={[s.way, { backgroundColor: p.soft }]}>
              <View style={[s.wayPlay, { backgroundColor: p.t }]}><Text style={{ color: p.on, fontFamily: font.black }}>{narration.speaking ? 'II' : '▶'}</Text></View>
              <Text style={[s.wayText, { color: p.deep }]} numberOfLines={1}>{way!.text}</Text>
            </Pressable>
          )}
          <View style={s.progressTop}>
            <Text style={s.progressLabel}><Text style={{ color: neutral.ink, fontFamily: font.black }}>Parada {Math.min(target, tour.stops.length - 1) + 1}</Text> de {tour.stops.length}</Text>
            <Text style={s.progressLabel}>{formatDistance(totalBefore + (g?.along ?? 0))} / {formatDistance(total)}</Text>
          </View>
          <View style={s.bar}>
            {tour.stops.map((st, i) => (
              <View key={st.id} style={[s.seg, stamped.has(st.id) && { backgroundColor: p.t }]}>
                {i === target && !stamped.has(st.id) && <View style={[StyleSheet.absoluteFill, { width: `${Math.round(frac * 100)}%`, backgroundColor: p.t2, borderRadius: 4 }]} />}
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
          {!finished && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${listenCopy.title}. ${listenCopy.sub}`}
              onPress={() => listen(target)}
              scaleTo={0.98}
              style={[s.listen, mode === 'far' ? { backgroundColor: p.deep } : { backgroundColor: p.t2, borderColor: `${p.t2}66` }]}
            >
              <View style={[s.listenPlay, { backgroundColor: mode === 'far' ? p.t : p.deep }]}><Text style={s.listenGlyph}>▶</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.listenTitle, { color: mode === 'far' ? '#fff' : neutral.ink }]} numberOfLines={1}>{listenCopy.title}</Text>
                <Text style={[s.listenSub, { color: mode === 'far' ? 'rgba(255,255,255,0.8)' : neutral.ink2 }]} numberOfLines={1}>{listenCopy.sub}</Text>
              </View>
            </PressableScale>
          )}
          <View style={s.actions}>
            {skipNext >= 0 && (
              <PressableScale accessibilityRole="button" accessibilityHint="Pasa a la siguiente parada; esta queda sin sellar" onPress={skip} scaleTo={0.96} style={s.action}>
                <Text style={s.actionText}>Saltar esta parada</Text>
              </PressableScale>
            )}
            <PressableScale accessibilityRole="button" accessibilityHint="Guarda el paseo para seguir más tarde" onPress={pause} scaleTo={0.96} style={s.action}>
              <Text style={s.actionText}>Pausar paseo</Text>
            </PressableScale>
          </View>
        </Animated.View>
        {selected != null && (
          <View style={[s.popWrap, { bottom: sheetH + 12 }]}>
            <StopPopup
              key={selected}
              stop={tour.stops[selected]}
              index={selected}
              total={tour.stops.length}
              palette={p}
              status={statusFor(selected)}
              action={{ label: 'Ver guía', onPress: () => openStop(selected) }}
              footer={
                selected !== target && !stamped.has(tour.stops[selected].id)
                  ? { label: 'Ir aquí', hint: selected > target ? `Te saltas ${selected - target === 1 ? 'una parada' : `${selected - target} paradas`}; las puedes sellar luego` : 'Vuelves a una parada que dejaste sin sellar', onPress: () => goHere(selected) }
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
  dist: { fontFamily: font.black, fontSize: 32, color: '#fff', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  instr: { fontFamily: font.bold, fontSize: 15, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  then: { backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 14, paddingVertical: 8 },
  thenText: { fontFamily: font.heavy, fontSize: 13, color: '#fff' },
  notice: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(28,26,23,0.82)', borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center' },
  noticeText: { fontFamily: font.black, fontSize: 12, color: '#fff' },
  card: { position: 'absolute', left: 12, right: 12, backgroundColor: neutral.surface, borderRadius: 20, padding: 14, gap: 6, ...shadow[3] },
  cardTitle: { fontFamily: font.black, fontSize: 15, color: neutral.ink },
  cardText: { fontFamily: font.bold, fontSize: 13, color: neutral.ink2 },
  cardRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  cardBtn: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center' },
  cardBtnGhost: { backgroundColor: neutral.bg2 },
  cardBtnText: { fontFamily: font.black, fontSize: 14 },
  center: { position: 'absolute', right: 14, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.95)', ...shadow[2] },
  centerText: { fontFamily: font.black, fontSize: 14, color: neutral.ink },
  test: { position: 'absolute', left: 12, right: 12, backgroundColor: 'rgba(28,26,23,0.86)', borderRadius: 18, padding: 10, gap: 8 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  testTitle: { flex: 1, fontFamily: font.black, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: brand.sun },
  testChip: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' },
  testOn: { backgroundColor: brand.primary },
  testChipText: { fontFamily: font.black, fontSize: 13, color: '#fff' },
  testHint: { fontFamily: font.bold, fontSize: 11.5, color: 'rgba(255,255,255,0.75)' },
  popWrap: { position: 'absolute', left: 12, right: 12 },
  offer: { backgroundColor: neutral.surface, borderRadius: 22, padding: 14, gap: 2, ...shadow[3] },
  offerTitle: { fontFamily: font.serif, fontSize: 18, color: neutral.ink },
  offerText: { fontFamily: font.bold, fontSize: 13, color: neutral.ink3 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: neutral.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 14, gap: 10, ...shadow[3] },
  way: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.pill, padding: 5, paddingRight: 14, marginTop: -2 },
  wayPlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  wayText: { flex: 1, fontFamily: font.heavy, fontSize: 13 },
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
  toggle: { position: 'absolute', left: 12, right: 12, height: 40, flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: neutral.surface, ...shadow[2] },
  toggleHalf: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontFamily: font.black, fontSize: 14, color: neutral.ink },
  promptTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  promptPic: { width: 64, height: 64, borderRadius: 16 },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 4, borderColor: 'transparent' },
  listenPlay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listenGlyph: { fontFamily: font.black, fontSize: 15, color: '#fff' },
  listenTitle: { fontFamily: font.black, fontSize: 16 },
  listenSub: { fontFamily: font.bold, fontSize: 12.5, marginTop: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: neutral.bg2, justifyContent: 'center' },
  actionText: { fontFamily: font.heavy, fontSize: 13, color: neutral.ink2 },
});
