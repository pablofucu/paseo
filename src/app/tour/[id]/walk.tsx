import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { DuotoneImage } from '@/components/DuotoneImage';
import { GuideButton } from '@/components/GuideButton';
import { ManeuverIcon, type ManeuverKind } from '@/components/ManeuverIcon';
import { StopMarkers, StopPopup } from '@/components/MapPins';
import { MeMarker } from '@/components/MeMarker';
import { OrientationButton } from '@/components/OrientationButton';
import { DUR, EASE_OUT, lightTap, PressableScale } from '@/components/motion';
import { RubberStamp } from '@/components/RubberStamp';
import { StopGuide } from '@/components/StopGuide';
import type { LngLat, Tour } from '@/data/types';
import { distance, formatDistance, pointAlong, projectOnRoute, walkingMinutes } from '@/lib/geo';
import { startArrivalWatch, stopArrivalWatch } from '@/lib/arrivalWatch';
import { entryMode } from '@/lib/entry';
import { accuracySlack, arriveRadiusOf, arrivalAllowed, DWELL_MS, dwellRestart, instruction, prepareLeg, PREVIEW_RADIUS_M } from '@/lib/guidance';
import { nextMapBearing, rotateMs, routeBearing } from '@/lib/mapBearing';
import { FIT_BACK_M, FIT_FAR_M, FOLLOW_ZOOM, fitTwo } from '@/lib/mapFit';
import { buildMapStyle, mapColors } from '@/lib/mapStyle';
import { stampBox } from '@/lib/sheet';
import { stopScript, wayScript } from '@/lib/spoken';
import { TURN_PATTERNS, turnCue, type HapticKind, type TurnCue } from '@/lib/turnCue';
import { usePausedWalk } from '@/lib/pausedWalk';
import { useGuide } from '@/lib/useGuide';
import { useAutoPause } from '@/lib/useAutoPause';
import { useNarration } from '@/lib/useNarration';
import { narrationMinutes, useNarrationPlayer } from '@/lib/useNarrationPlayer';
import { useReroute } from '@/lib/useReroute';
import { useTourParamSafe } from '@/lib/useTour';
import { useApproachRoute, useTourRoute } from '@/lib/useTourRoute';
import { MAX_ACCURACY_M, useWalkPosition, type PositionSource } from '@/lib/useWalkPosition';
import { canSkip, legStart, nextTarget } from '@/lib/walkPlan';
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
/** Rojo de «Terminar paseo» (la acción que no se puede deshacer) */
const DANGER = '#B3261E';
/** Sin tocar el mapa durante tanto tiempo, vuelve a seguirte */
const FOLLOW_RESUME_MS = 12000;
/** Duración de subir y bajar la hoja */
const SHEET_MS = 260;
/** Inclinación del mapa con la ruta arriba, en grados, y cuánto baja tu punto al seguirte de cerca (fracción del alto de pantalla), para ver más calle por delante */
const TILT_DEG = 45;
const TILT_LIFT = 0.16;
/** Tras llegar, alejarte tanto de la parada (más su radio) pliega el aviso de la hoja */
const FOLD_AWAY_M = 40;
/** Arrastrar la guía hacia abajo más que esto (o rápido) la baja al mapa */
const GUIDE_CLOSE_DY = 120;

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

const HAPTIC: Record<HapticKind, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
/** Vibra el patrón de un giro (toques sueltos, separados por unos ms) */
const playTurnCue = (cue: TurnCue) => TURN_PATTERNS[cue].forEach(st => setTimeout(() => { HAPTIC[st.kind]().catch(() => {}); }, st.at));

/** Trazo del tramo: lo recorrido atenuado y lo que falta con borde. Aparte y memoizado para que no se rehaga con cada lectura del GPS */
const RouteLayers = memo(function RouteLayers({ walked, rest, route, road }: { walked: GeoJSON.Feature<GeoJSON.LineString> | null; rest: GeoJSON.Feature<GeoJSON.LineString> | null; route: string; road: string }) {
  return (
    <>
      {walked && (
        <GeoJSONSource id="walked" data={walked}>
          <Layer id="walked-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': route, 'line-width': 5, 'line-opacity': 0.35 }} />
        </GeoJSONSource>
      )}
      {rest && (
        <GeoJSONSource id="route" data={rest}>
          <Layer id="route-case" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': road, 'line-width': 16 }} />
          <Layer id="route-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': route, 'line-width': 10 }} />
        </GeoJSONSource>
      )}
    </>
  );
});

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
 * que vas (en orden). Al llegar avisa la hoja de abajo (nunca se abre nada
 * solo); al escuchar, esa hoja sube y es la guía de la parada, y al bajarla se
 * vuelve al mapa con el audio sonando. Tocando cualquier pin se ve esa parada.
 */
export default function Walk() {
  const tour = useTourParamSafe();
  // Un id que no existe (enlace viejo) lleva al inicio en vez de romper la app
  if (!tour) return <Redirect href="/" />;
  return <WalkScreen tour={tour} />;
}

function WalkScreen({ tour }: { tour: Tour }) {
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
  /** Aviso «Has llegado» en la hoja tras llegar (el GPS es fiable): escuchar o dejarlo para luego */
  const [prompt, setPrompt] = useState<{ idx: number; repeat: boolean } | null>(null);
  /** Hoja inferior: alto de su cabecera (asa + escuchar), de lo que hay debajo, y si está subida */
  const [headerH, setHeaderH] = useState(80);
  const [bodyH, setBodyH] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { width: winW, height: winH } = useWindowDimensions();
  const [bannerH, setBannerH] = useState(120);
  // Si se entra directamente (sin pasar por la ficha), el paseo empieza aquí
  // (no con otra pantalla encima: al acabar la ruta, «done» cierra el paseo y el mapa de debajo no debe reabrirlo)
  useEffect(() => { if (!mine && focused) startWalk(tour.id, param); }, [mine, focused, startWalk, tour.id, param]);
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
  /** Alto de la hoja plegada (lo que tapa del mapa) y de la subida, con su recorrido */
  const sheetH = headerH + insets.bottom + 10;
  const fullH = Math.min(winH * 0.82, headerH + bodyH);
  const range = Math.max(0, fullH - sheetH);
  /** Hoja: 0 plegada, 1 subida (se mueve con el dedo) */
  const up = useSharedValue(0);
  const rangeSV = useSharedValue(0);
  const startUp = useSharedValue(0);
  const velUp = useSharedValue(0);
  const dyUp = useSharedValue(0);
  useEffect(() => { rangeSV.set(range); }, [range, rangeSV]);
  const snap = useCallback((open: boolean) => {
    setExpanded(open);
    up.set(withTiming(open ? 1 : 0, { duration: SHEET_MS }));
  }, [up]);
  /** Plegar el aviso de llegada de la cabecera (se rellena más abajo) */
  const foldRef = useRef<() => void>(() => {});
  const callFold = useCallback(() => foldRef.current(), []);
  // Arrastrar el asa: sigue al dedo y al soltar se queda arriba o abajo según la posición y la velocidad
  const drag = usePanGesture({
    activeOffsetY: [-8, 8],
    onBegin: () => { 'worklet'; startUp.set(up.get()); dyUp.set(0); },
    onUpdate: e => {
      'worklet';
      velUp.set(e.velocityY);
      dyUp.set(e.translationY);
      if (rangeSV.get() <= 0) return;
      up.set(Math.min(1, Math.max(0, startUp.get() - e.translationY / rangeSV.get())));
    },
    onFinalize: e => {
      'worklet';
      if (e.canceled) return;
      // Plegada y deslizada hacia abajo: pliega el aviso de llegada, si lo hay
      if (startUp.get() === 0 && dyUp.get() > 40) scheduleOnRN(callFold);
      const open = Math.abs(velUp.get()) > 500 ? velUp.get() < 0 : up.get() > 0.5;
      up.set(withTiming(open ? 1 : 0, { duration: SHEET_MS }));
      scheduleOnRN(setExpanded, open);
    },
  });
  const sheetMove = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - up.get()) * rangeSV.get() }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: up.get() * 0.45 }));
  const { testMode, simSpeed, setSimSpeed, mapOrientation, setMapOrientation, turnHaptics } = useSettings();
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
  /** Parado cerca de la parada sin haber llegado: parada (índice) para la que se ofrece «¿Ya estás aquí?» */
  const [confirmFor, setConfirmFor] = useState<number | null>(null);
  // Tocar el mapa lo suelta; tras un rato sin tocarlo vuelve a seguirte
  const followTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchMap = useCallback(() => {
    setFollow(false);
    clearTimeout(followTimer.current);
    followTimer.current = setTimeout(() => setFollow(true), FOLLOW_RESUME_MS);
  }, []);
  useEffect(() => () => clearTimeout(followTimer.current), []);
  const arrive = usePassport(s => s.arrive);
  const narration = useNarration();
  /** Guía abierta en la hoja: qué parada suena (o se lee) y si está subida encima del mapa */
  const [guide, setGuide] = useState<{ idx: number; play: boolean } | null>(null);
  const [guideUp, setGuideUp] = useState(false);
  const guideStop = guide ? tour.stops[guide.idx] : null;
  const player = useNarrationPlayer(guideStop ? stopScript(guideStop) : '', guide?.play ?? false);
  // Sin voz si otra pantalla tapa el paseo o la app pasa a segundo plano (como en la guía)
  useAutoPause(player.pause);
  /** Arrastre de la guía hacia abajo (px) */
  const guideDy = useSharedValue(0);
  const guideVel = useSharedValue(0);

  const route = useTourRoute(tour);
  const simOrigin = useMemo(() => approachFrom(stop.coord), [stop]);
  // El tramo sale de la parada anterior solo si vienes de ella; la primera parada, o tras saltar, retomar o ir a otra, se calcula desde donde estés
  const sequential = target > 0 && mine && walkState.guide === target - 1;
  const gpsFrom = gpsOrigin?.target === target ? gpsOrigin.from : null;
  // Sellaste antes de llegar a la parada anterior: el fijo sale de ella y tú no estás ahí, así que el camino sale de donde estás (se decide una vez por tramo)
  const [joined, setJoined] = useState<{ target: number; from: LngLat | null } | null>(null);
  const reroutedHere = rerouted?.source === source && rerouted.target === target ? rerouted.from : null;
  const fixed = sequential && !reroutedHere && !(joined?.target === target && joined.from);
  const origin = fixed || farStart ? null : reroutedHere ?? (sequential ? joined?.from ?? null : source === 'simulated' ? simOrigin : gpsFrom);

  // Tramo actual: de la parada anterior a esta; para la primera, por calles desde donde estés
  const approach = useApproachRoute(origin, stop.coord);
  const leg = useMemo(() => {
    // Pasada la última parada no hay tramo (el paseo se va a la pantalla final)
    if (finished) return null;
    if (fixed && route.legs[target - 1]) return prepareLeg(route.legs[target - 1].line, route.legs[target - 1].steps);
    return approach.leg ? prepareLeg(approach.leg.line, approach.leg.steps) : null;
  }, [route, target, finished, fixed, approach.leg]);
  const quality = fixed ? route.quality : approach.quality;

  const sim = useMemo(() => ({ speed: simSpeed, paused: paused || !!manual, resumeFrom }), [simSpeed, paused, manual, resumeFrom]);
  const gpsOpts = useMemo(() => ({ far: farTarget, heading: focused }), [farTarget, focused]);
  const walk = useWalkPosition(source, leg, sim, gpsOpts);
  const { heading, course, permission, accuracy, retry } = walk;
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
    setConfirmFor(null);
  }, [target]);
  /** Sube la guía de la parada en la hoja; con `play` suena (el usuario ha tocado escuchar) */
  const openStop = useCallback((n: number, play = false) => {
    narration.stop();
    setSelected(null);
    snap(false);
    guideDy.set(0);
    if (guide?.idx === n) { if (play && !player.playing) player.play(); }
    else setGuide({ idx: n, play });
    setGuideUp(true);
  }, [narration, snap, guideDy, guide?.idx, player]);
  const closeGuide = useCallback(() => setGuideUp(false), []);
  // Arrastrar la guía hacia abajo la baja al mapa (el audio sigue)
  const guideDrag = usePanGesture({
    activeOffsetY: 8,
    onUpdate: e => { 'worklet'; guideDy.set(Math.max(0, e.translationY)); guideVel.set(e.velocityY); },
    onFinalize: e => {
      'worklet';
      if (!e.canceled && (guideDy.get() > GUIDE_CLOSE_DY || guideVel.get() > 900)) scheduleOnRN(closeGuide);
      else guideDy.set(withTiming(0, { duration: SHEET_MS }));
    },
  });
  const guideMove = useAnimatedStyle(() => ({ transform: [{ translateY: guideDy.get() }] }));
  const onSelectStop = useCallback((i: number) => setSelected(v => (v === i ? null : i)), []);
  // La primera posición GPS marca el inicio del camino hasta la parada (si no estás a cientos de km)
  if (sequential && !finished && !farStart && joined?.target !== target) {
    const d = legStart({ sequential, source, position, accuracy: source === 'gps' ? accuracy : null, legFrom: tour.stops[target - 1].coord });
    if (d !== 'wait') setJoined({ target, from: d === 'approach' ? position : null });
  }
  if (!sequential && !finished && source === 'gps' && position && gpsOrigin?.target !== target && !farStart) setGpsOrigin({ target, from: position });

  // Lejos de la primera parada (> 2 km) no se dibuja una ruta enorme: se ofrece abrir el mapa del sistema
  const startD = target === 0 && source === 'gps' && position ? distance(position, tour.stops[0].coord) : null;
  const farStartNow = startD == null ? false : farStart ? startD > FAR_START_BACK_M : startD > FAR_START_M;
  if (farStartNow !== farStart) setFarStart(farStartNow);
  // De lejos el GPS gasta menos; al acercarte a la parada vuelve a la precisión alta
  const targetD = source === 'gps' && position ? distance(position, stop.coord) : null;
  const farTargetNow = targetD == null ? farTarget : farTarget ? targetD > NEAR_TARGET_M : targetD > FAR_TARGET_M;
  if (farTargetNow !== farTarget) setFarTarget(farTargetNow);

  const g = useGuide(leg, position, stop.coord, source === 'gps' ? accuracy : null, stop.arriveRadius);
  // Al salirte del camino (también del tramo fijo entre paradas) se recalcula desde donde estés
  const rerouting = useReroute(!farStart, position, !!g?.offRoute, from => setRerouted({ source, target, from }), quality);

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
    register(idx, from);
    openStop(idx, true);
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

  // Vibración en los giros: un patrón por lado, una vez por giro a unos 25 m, y otro al salirte de la ruta
  const turnFired = useRef<{ target: number; key: string | null }>({ target, key: null });
  useEffect(() => {
    const r = turnCue(g, turnFired.current.target === target ? turnFired.current.key : null);
    turnFired.current = { target, key: r.fired };
    if (r.cue && turnHaptics && focused) playTurnCue(r.cue);
  }, [g, target, turnHaptics, focused]);

  // Parado cerca de la parada sin haber llegado (plaza grande, GPS flojo): se ofrece confirmar que ya estás
  const dwell = useRef<{ anchor: LngLat | null; timer: ReturnType<typeof setTimeout> | undefined }>({ anchor: null, timer: undefined });
  const dwelling = source === 'gps' && !finished && !!g && !g.arrived && g.toStop <= PREVIEW_RADIUS_M && !g.offRoute;
  useEffect(() => {
    const d = dwell.current;
    if (!dwelling || !position) {
      clearTimeout(d.timer);
      d.anchor = null;
      return;
    }
    if (!dwellRestart(d.anchor, position)) return;
    clearTimeout(d.timer);
    d.anchor = position;
    d.timer = setTimeout(() => setConfirmFor(target), DWELL_MS);
  }, [dwelling, position, target]);
  useEffect(() => () => clearTimeout(dwell.current.timer), []);

  // Has llegado a OTRA parada sin sellar (no la que toca): se ofrece sellarla
  const [declined, setDeclined] = useState<string[]>([]);
  const here = useMemo(() => {
    if (!position || finished) return -1;
    const slack = accuracySlack(source === 'gps' ? accuracy : null) / 2;
    return tour.stops.findIndex((st, i) => i !== target && !stamped.has(st.id) && distance(position, st.coord) <= arriveRadiusOf(st) + slack);
  }, [position, finished, tour.stops, target, stamped, source, accuracy]);
  // Lo que dijiste «ahora no» vuelve a ofrecerse cuando te has alejado
  if (position && declined.length) {
    const still = declined.filter(id => { const st = tour.stops.find(x => x.id === id); return st && distance(position, st.coord) < 60; });
    if (still.length !== declined.length) setDeclined(still);
  }
  const offer = here >= 0 && !g?.arrived && !declined.includes(tour.stops[here].id) && selected == null ? here : -1;

  const style = useMemo(() => buildMapStyle(p, 13), [p]);
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

  const frac = leg && g && leg.length > 0 ? Math.min(1, Math.max(0, g.along / leg.length)) : 0;
  const way = tour.onTheWay.find(w => w.afterStop === target - 1);
  const showWay = !!way && frac > 0.12 && frac < 0.65;

  // Giro del mapa: «ruta arriba» pone hacia arriba el camino que te toca seguir (solo mientras te sigue); «norte arriba», el norte
  const [rot, setRot] = useState({ bearing: 0, ms: 700 });
  const wantBearing = mapOrientation === 'north' ? 0 : follow && selected == null ? nextMapBearing(rot.bearing, routeBearing(leg, g, position, course)) : rot.bearing;
  if (wantBearing !== rot.bearing) setRot({ bearing: wantBearing, ms: rotateMs(rot.bearing, wantBearing) });
  // Lejos de la parada (> 150 m) se encuadran tú y la parada, respetando la tarjeta de arriba y la hoja de abajo; de cerca, zoom fijo
  const padBottom = selected != null ? sheetH + 110 : sheetH + 10;
  const padTop = insets.top + bannerH + 16;
  // Con la ruta arriba, el mapa se inclina como un navegador; con el norte arriba o al elegir una parada, se ve plano desde arriba
  const tilted = mapOrientation === 'route' && selected == null;
  const [fitting, setFitting] = useState(false);
  const fitD = position && !finished ? distance(position, stop.coord) : null;
  const fittingNow = fitD == null ? false : fitting ? fitD > FIT_BACK_M : fitD > FIT_FAR_M;
  if (fittingNow !== fitting) setFitting(fittingNow);
  const fit = fitting && follow && selected == null && position ? fitTwo(position, stop.coord, rot.bearing, { width: winW, height: winH, top: padTop, bottom: padBottom }) : null;
  // Cámara: sigue tu posición hasta que mueves el mapa; la parada elegida tiene prioridad
  const [cam, setCam] = useState<LngLat>(position ?? stop.coord);
  const want = selected != null ? tour.stops[selected].coord : follow ? fit?.center ?? position ?? stop.coord : null;
  if (want && (want[0] !== cam[0] || want[1] !== cam[1])) setCam(want);
  const camCenter = want ?? cam;
  /** Giro real del mapa (también el que haces con los dedos), para la aguja del botón */
  const mapRot = useSharedValue(0);
  const toggleOrientation = () => {
    lightTap();
    setMapOrientation(mapOrientation === 'route' ? 'north' : 'route');
    setFollow(true);
  };

  // Avisos debajo de la indicación: uno solo, con todo lo que pasa
  const blocked = source === 'gps' && (permission === 'denied' || permission === 'unavailable');
  // Sin ubicación utilizable la hoja sube sola, una vez (ahí están las paradas); se puede bajar
  const autoList = useRef(false);
  const gpsUnusable = blocked || (source === 'gps' && noFix && !position);
  useEffect(() => {
    if (!gpsUnusable || autoList.current) return;
    autoList.current = true;
    setSelected(null);
    snap(true);
  }, [gpsUnusable, snap]);
  const notice = (() => {
    if (blocked || farStart) return null;
    const parts: string[] = [];
    if (source === 'gps' && permission === 'granted' && !position) parts.push('Buscando tu posición…');
    else if (poorGps) parts.push('Señal GPS débil');
    if (leg && quality === 'loading') parts.push('Calculando la ruta por calles…');
    if (leg && quality === 'approximate') parts.push('Sin conexión: ruta en línea recta');
    return parts.length ? parts.join(' · ') : null;
  })();
  // Lo demás cuelga de la tarjeta de indicación (y del aviso, si lo hay)
  const belowTop = insets.top + 8 + bannerH + 8 + (notice ? 40 : 0);

  const kind: ManeuverKind = !g ? 'wait' : g.offRoute ? 'back' : near || g.arrived ? 'arrive' : g.next ? g.next.direction : 'straight';
  const text = rerouting
    ? { text: 'Recalculando la ruta…', then: `Te llevamos a ${stop.name} desde donde estás` }
    : g?.arrived ? { text: 'Has llegado', then: stop.name }
    : near ? { text: '¡Ya estás aquí!', then: `${stop.name}: te avisamos al llegar` }
    : g ? instruction(g, stop.name)
    : { text: `Vamos a ${stop.name}`, then: 'Al llegar se estampa tu sello' };
  // Sin sorpresas (ni llegada, ni aviso, ni recálculo, ni fuera de ruta) la tarjeta dice hacia dónde vas; si no, el texto de siempre
  const steady = !!g && !rerouting && !g.arrived && !near && !g.offRoute;
  const stopNo = Math.min(target, tour.stops.length - 1) + 1;
  const toward = `Hacia ${stop.name}${g ? ` · ${walkingMinutes(g.remaining)} min` : ''}`;
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
  // Terminar el paseo (sin guardar el progreso) pide confirmación; la salida normal es «Pausar paseo»
  const finish = () => Alert.alert('¿Terminar el paseo?', 'No se guardará para seguir más tarde. Tus sellos ya conseguidos se quedan.', [
    { text: 'Seguir paseando', style: 'cancel' },
    { text: 'Terminar', style: 'destructive', onPress: () => { narration.stop(); endWalk(); router.back(); } },
  ]);
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
    setPrompt(null);
    setConfirmFor(null);
    // Lejos: se escucha ya y el sello queda para cuando llegues; si no, escuchar también cuenta como llegada
    if (mode === 'confirm') { arrivedFor.current = target; register(target, position); }
    openStop(target, true);
  };
  const listenCopy = mode === 'here' ? { title: 'Escuchar ahora', sub: stamped.has(stop.id) ? 'Ya tienes su sello' : 'Después, tu sello' }
    : mode === 'confirm' ? { title: `¿Ya estás en ${stop.name}?`, sub: 'Toca para escuchar y sellar' }
    : { title: `Escuchar ${stop.name}`, sub: 'Puedes escucharla ya; el sello, al llegar' };
  const promptOn = prompt != null && !finished && offer < 0 && selected == null;
  const confirmOn = confirmFor === target && dwelling && !promptOn && offer < 0 && selected == null;
  // Un solo aviso, en la cabecera de la hoja: otra parada sin sellar, has llegado, o ¿ya estás aquí?
  const pending = offer >= 0 ? { kind: 'offer' as const, idx: offer } : promptOn ? { kind: 'arrived' as const, idx: prompt.idx } : confirmOn ? { kind: 'confirm' as const, idx: target } : null;
  const arrival = pending && !guideUp ? pending : null;
  // Tras llegar, si sigues andando el aviso se pliega solo
  if (prompt && position && distance(position, tour.stops[prompt.idx].coord) > arriveRadiusOf(tour.stops[prompt.idx]) + FOLD_AWAY_M) setPrompt(null);
  /** «Luego»: pliega el aviso de la hoja (también deslizándola hacia abajo) */
  const fold = () => {
    if (!arrival) return;
    if (arrival.kind === 'offer') setDeclined(d => [...d, tour.stops[arrival.idx].id]);
    else if (arrival.kind === 'arrived') setPrompt(null);
    else setConfirmFor(null);
  };
  useEffect(() => { foldRef.current = fold; });
  // Audio de una guía que sigue sonando (o a medias) con la guía bajada: la cabecera es su reproductor
  const nowPlaying = guideStop && !guideUp && (player.playing || (player.position > 0 && !player.ended)) ? guideStop : null;

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
          onRegionWillChange={e => { if (e.nativeEvent.userInteraction) touchMap(); }}
          onRegionIsChanging={e => { mapRot.value = e.nativeEvent.bearing; }}
          onRegionDidChange={e => { mapRot.value = e.nativeEvent.bearing; if (e.nativeEvent.userInteraction) touchMap(); }}
        >
          {/* Con una parada elegida, el mapa vuela hasta ella; si no, sigue tu posición */}
          <Camera center={camCenter} zoom={selected != null ? 17.3 : fit?.zoom ?? FOLLOW_ZOOM} bearing={rot.bearing} pitch={tilted ? TILT_DEG : 0} duration={selected != null ? 900 : Math.max(700, rot.ms)} easing={selected != null ? 'fly' : 'ease'} padding={{ top: padTop + (tilted && !fit ? Math.round(winH * TILT_LIFT) : 0), bottom: padBottom, left: 0, right: 0 }} />
          <RouteLayers walked={routeGeo?.walked ?? null} rest={routeGeo?.rest ?? null} route={c.route} road={c.road} />
          <StopMarkers stops={tour.stops} stamped={stamped} target={target} selected={selected} palette={p} onSelect={onSelectStop} large />
          {position && <MeMarker position={position} heading={heading} />}
        </Map>

        {/* Indicación: giro, hacia qué parada vas y el progreso del paseo */}
        <View
          onLayout={e => setBannerH(e.nativeEvent.layout.height)}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${bannerDist}. ${text.text}. ${text.then}. ${toward}. Parada ${stopNo} de ${tour.stops.length}`}
          style={[s.dir, { top: insets.top + 8, backgroundColor: g?.offRoute ? functional.warn : p.deep }]}
        >
          <View style={s.dirMain}>
            <View style={[s.arrow, { backgroundColor: g?.offRoute ? 'rgba(255,255,255,0.55)' : p.t2 }]}>
              <ManeuverIcon kind={kind} color={neutral.ink} size={42} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.dist, g?.offRoute && { color: neutral.ink }]}>{bannerDist}</Text>
              <Text style={[s.instr, g?.offRoute && { color: neutral.ink }]}>{text.text}</Text>
            </View>
          </View>
          <View style={s.then}>
            <View style={s.thenRow}>
              <DuotoneImage source={stop.thumb} palette={p} style={s.thenPic} />
              <Text style={[s.thenText, g?.offRoute && { color: neutral.ink }]} numberOfLines={1}>{steady ? toward : text.then}</Text>
              <Text style={[s.thenCount, g?.offRoute && { color: neutral.ink }]}>{stopNo}/{tour.stops.length}</Text>
            </View>
            <View style={s.bar}>
              {tour.stops.map((st, i) => (
                <View key={st.id} style={[s.seg, stamped.has(st.id) && { backgroundColor: g?.offRoute ? neutral.ink : p.soft }]}>
                  {i === target && !stamped.has(st.id) && <View style={[StyleSheet.absoluteFill, { width: `${Math.round(frac * 100)}%`, backgroundColor: g?.offRoute ? neutral.ink : p.t2 }]} />}
                </View>
              ))}
            </View>
          </View>
        </View>

        {notice && (
          <View accessibilityLiveRegion="polite" style={[s.notice, { top: insets.top + 8 + bannerH + 8 }]}>
            <Text style={s.noticeText}>{notice}</Text>
          </View>
        )}
        {blocked && (
          <View style={[s.card, { top: belowTop }]}>
            <Text accessibilityRole="header" style={s.cardTitle}>{permission === 'denied' ? 'Paseo necesita tu ubicación' : 'La ubicación está apagada'}</Text>
            <Text style={s.cardText}>{permission === 'denied' ? 'Activa la ubicación en Ajustes para que Paseo te guíe, o usa el paseo simulado.' : 'Enciende la ubicación del móvil para que Paseo te guíe.'}</Text>
            <View style={s.cardRow}>
              <PressableScale accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => {})} style={[s.cardBtn, { backgroundColor: p.t }]}><Text style={[s.cardBtnText, { color: p.on }]}>Abrir ajustes</Text></PressableScale>
              <PressableScale accessibilityRole="button" onPress={retry} style={[s.cardBtn, s.cardBtnGhost]}><Text style={[s.cardBtnText, { color: neutral.ink }]}>Reintentar</Text></PressableScale>
            </View>
          </View>
        )}
        {farStart && (
          <View style={[s.card, { top: belowTop }]}>
            <Text accessibilityRole="header" style={s.cardTitle}>Estás lejos del inicio</Text>
            <Text style={s.cardText}>La primera parada, {tour.stops[0].name}, queda a {formatDistance(position ? distance(position, tour.stops[0].coord) : FAR_START_M)}. Usa tu app de mapas para llegar; el paseo empieza al acercarte.</Text>
            <View style={s.cardRow}>
              <PressableScale accessibilityRole="button" onPress={() => openSystemMaps(tour.stops[0].coord, tour.stops[0].name)} style={[s.cardBtn, { backgroundColor: p.t }]}><Text style={[s.cardBtnText, { color: p.on }]}>Abrir en Mapas</Text></PressableScale>
            </View>
          </View>
        )}

        {/* Brújula: «ruta arriba» o «norte arriba» */}
        {selected == null && !expanded && <OrientationButton mode={mapOrientation} bearing={mapRot} accent={p.t} onToggle={toggleOrientation} style={{ left: 14, bottom: sheetH + 12 }} />}
        {/* Entrar y salir de la guía de la parada visitada; «Centrar en mí» encima, solo si el mapa va libre */}
        {visited && !nowPlaying && selected == null && !expanded && <GuideButton to="guide" photo={visited.thumb} palette={p} onPress={() => openStop(walkState!.guide!)} style={{ bottom: sheetH + 12 }} />}
        {!follow && selected == null && !expanded && (
          <PressableScale accessibilityRole="button" accessibilityLabel="Centrar en mí" onPress={() => setFollow(true)} scaleTo={0.94} style={[s.center, { bottom: sheetH + (visited && !nowPlaying ? 72 : 12) }]}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={4} fill="none" stroke={neutral.ink} strokeWidth={2.6} />
              <Path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" stroke={neutral.ink} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
          </PressableScale>
        )}

        {/* Modo prueba: controles para recorrer el tour sin moverse */}
        {testMode && !expanded && (
          <View style={[s.test, { top: belowTop + 8 }]}>
            <View style={s.testRow}>
              <Text style={s.testTitle}>Modo prueba</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={source === 'gps' ? 'Cambiar a paseo simulado' : 'Cambiar a GPS real'} onPress={() => { setManual(null); setSource(v => (v === 'gps' ? 'simulated' : 'gps')); }} style={s.testChip}>
                <Text style={s.testChipText}>{source === 'gps' ? 'GPS real' : 'Simulado'}</Text>
              </Pressable>
            </View>
            <View style={s.testRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={manual || paused || source === 'gps' ? 'Andar' : 'Parar'} onPress={() => (manual || paused || source === 'gps' ? resume() : setPaused(true))} style={[s.testChip, s.testOn]}>
                <Text style={[s.testChipText, { color: '#fff' }]}>{manual || paused || source === 'gps' ? '▶ Andar' : 'II Parar'}</Text>
              </Pressable>
              {([1, 4, 16] as SimSpeed[]).map(v => (
                <Pressable key={v} accessibilityRole="button" accessibilityLabel={`Velocidad ${v}x`} onPress={() => setSimSpeed(v)} style={[s.testChip, simSpeed === v && s.testOn]}>
                  <Text style={[s.testChipText, simSpeed === v && { color: '#fff' }]}>{v}×</Text>
                </Pressable>
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel="Llegar a la parada" onPress={arriveNow} style={s.testChip}>
                <Text style={s.testChipText}>⚑ Llegar</Text>
              </Pressable>
            </View>
            <Text style={s.testHint}>Toca el mapa para moverte a ese punto (también fuera de la ruta).</Text>
          </View>
        )}

        {/* Hoja inferior: plegada solo deja escuchar la parada; subida, el resto del paseo */}
        <Animated.View pointerEvents={expanded ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, s.scrim, scrim]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar el panel" onPress={() => snap(false)} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[s.bottom, { height: fullH || undefined, paddingBottom: 0 }, sheetMove]}>
          <GestureDetector gesture={drag}>
            <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
              <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Cerrar paradas y opciones' : 'Abrir paradas y opciones'} onPress={() => snap(!expanded)} hitSlop={{ left: 40, right: 40 }} style={s.handleHit}>
                <View style={s.handle} />
              </Pressable>
              {arrival ? (
                <ArrivalHeader
                  tour={tour}
                  kind={arrival.kind}
                  idx={arrival.idx}
                  repeat={arrival.kind === 'arrived' && !!prompt?.repeat}
                  onListen={() => (arrival.kind === 'offer' ? doArrive(arrival.idx, position) : arrival.kind === 'arrived' ? (setPrompt(null), openStop(arrival.idx, true)) : listen(target))}
                  onLater={fold}
                />
              ) : nowPlaying ? (
                <View style={s.listen}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Abrir la guía de ${nowPlaying.name}`} onPress={() => openStop(guide!.idx)} style={s.nowMain}>
                    <DuotoneImage source={nowPlaying.thumb} palette={p} style={s.nowPic} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.listenTitle} numberOfLines={1}>{nowPlaying.name}</Text>
                      <Text style={s.listenSub} numberOfLines={1}>{player.playing ? 'Sonando' : 'En pausa'} · {clock(player.position)} de {clock(player.duration)} · sube para leer</Text>
                    </View>
                  </Pressable>
                  <PressableScale accessibilityRole="button" accessibilityLabel={player.playing ? 'Pausar' : 'Seguir escuchando'} onPress={player.toggle} scaleTo={0.94} style={[s.listenPlay, { backgroundColor: p.t2 }]}>
                    <Text style={[s.listenGlyph, { color: neutral.ink }]}>{player.playing ? 'II' : '▶'}</Text>
                  </PressableScale>
                </View>
              ) : !finished && (
                <View style={s.listen}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.listenTitle} numberOfLines={2}>{listenCopy.title}</Text>
                    <Text style={s.listenSub} numberOfLines={2}>{listenCopy.sub}</Text>
                  </View>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`${listenCopy.title}. ${listenCopy.sub}`}
                    onPress={() => listen(target)}
                    scaleTo={0.94}
                    style={[s.listenPlay, { backgroundColor: mode === 'far' ? p.deep : p.t2 }]}
                  >
                    <Text style={[s.listenGlyph, { color: mode === 'far' ? '#fff' : neutral.ink }]}>▶</Text>
                  </PressableScale>
                </View>
              )}
            </View>
          </GestureDetector>
          <ScrollView
            accessibilityElementsHidden={!expanded}
            importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
            onContentSizeChange={(_, h) => setBodyH(h)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 14 }]}
          >
            {showWay && (
              <Pressable accessibilityRole="button" accessibilityLabel={narration.speaking ? 'Parar el aviso del camino' : `Escuchar: ${way!.text}`} onPress={() => { if (narration.speaking) narration.stop(); else { player.pause(); narration.speak(wayScript(way!)); } }} style={[s.way, { backgroundColor: p.soft }]}>
                <View style={[s.wayPlay, { backgroundColor: p.t }]}><Text style={{ color: p.on, fontFamily: font.black }}>{narration.speaking ? 'II' : '▶'}</Text></View>
                <Text style={[s.wayText, { color: p.deep }]} numberOfLines={1}>{way!.text}</Text>
              </Pressable>
            )}
            <View>
              {tour.stops.map((st, i) => {
                const done = stamped.has(st.id);
                const now = i === target && !done;
                return (
                  <PressableScale
                    key={st.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${done ? 'Volver a escuchar' : 'Escuchar'} ${st.name}. ${statusFor(i)}`}
                    onPress={() => listen(i)}
                    scaleTo={0.98}
                    style={[s.stopRow, now && { backgroundColor: `${p.t2}38` }]}
                  >
                    <Text style={[s.stopText, done && { color: p.t }, now && { fontFamily: font.black }]} numberOfLines={1}>
                      {done ? '✓ ' : ''}{i + 1} · {st.name}{now && g ? ` · ${walkingMinutes(g.remaining)} min` : ''}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <View style={s.actions}>
              {skipNext >= 0 && (
                <PressableScale accessibilityRole="button" accessibilityHint="Pasa a la siguiente parada; esta queda sin sellar" onPress={skip} scaleTo={0.96} style={s.action}>
                  <Text style={s.actionText}>Saltar esta parada</Text>
                </PressableScale>
              )}
              <PressableScale accessibilityRole="button" accessibilityHint="Guarda el paseo para seguir más tarde" onPress={pause} scaleTo={0.96} style={s.action}>
                <Text style={s.actionText}>Pausar paseo</Text>
              </PressableScale>
              <PressableScale accessibilityRole="button" accessibilityHint="Pide confirmación antes de terminar el paseo" onPress={finish} scaleTo={0.96} style={s.actionQuiet}>
                <Text style={s.actionQuietText}>Terminar paseo</Text>
              </PressableScale>
            </View>
          </ScrollView>
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

        {/* La guía de la parada: la hoja sube encima del mapa; al bajarla, el audio sigue */}
        {guideUp && guide && (
          <Animated.View entering={FadeIn.duration(DUR.base)} exiting={FadeOut.duration(DUR.base)} style={[StyleSheet.absoluteFill, s.scrim, { opacity: 0.45 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Bajar la guía al mapa" onPress={closeGuide} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
        {guideUp && guide && (
          <Animated.View
            entering={SlideInDown.duration(DUR.slow).easing(EASE_OUT)}
            exiting={SlideOutDown.duration(SHEET_MS)}
            style={[s.guide, { top: insets.top + 12 }]}
          >
            <Animated.View style={[s.guideIn, guideMove]}>
              <StopGuide tour={tour} n={guide.idx} player={player} onClose={closeGuide} embedded />
              <GestureDetector gesture={guideDrag}>
                <View accessible accessibilityRole="button" accessibilityLabel="Bajar la guía al mapa" accessibilityHint="También puedes deslizarla hacia abajo" onAccessibilityTap={closeGuide} style={s.guideGrip}>
                  <View style={s.guideHandle} />
                </View>
              </GestureDetector>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </TourThemeProvider>
  );
}

interface ArrivalProps {
  tour: Tour;
  kind: 'arrived' | 'confirm' | 'offer';
  idx: number;
  /** La parada ya estaba sellada (llegas otra vez) */
  repeat: boolean;
  onListen: () => void;
  onLater: () => void;
}

/**
 * Cabecera de la hoja al llegar: la foto, el nombre y un botón grande para
 * escuchar. Es el único aviso de llegada; no tapa el mapa y nunca abre nada solo.
 */
function ArrivalHeader({ tour, kind, idx, repeat, onListen, onLater }: ArrivalProps) {
  const p = tour.palette;
  const st = tour.stops[idx];
  const mins = useMemo(() => narrationMinutes(stopScript(st)), [st]);
  const look = stampBox(st.rubber.shape, 40 / 0.325);
  const over = kind === 'arrived' ? `Has llegado · parada ${idx + 1} de ${tour.stops.length}` : kind === 'confirm' ? `¿Ya estás aquí? · parada ${idx + 1}` : 'Otra parada sin sellar';
  const cta = kind === 'offer' ? 'Sí, sellarla' : kind === 'confirm' ? `▶  Sí, escuchar · ${mins} min` : `▶  Escuchar · ${mins} min`;
  const hint = kind === 'offer' ? 'No es la que tocaba, pero puedes sellarla ahora.'
    : kind === 'confirm' ? 'El GPS no lo tiene claro: si ya estás, escúchala y podrás sellar.'
    : repeat ? 'Ya tenías su sello. Si sigues andando, esto se pliega solo.'
    : 'Tu sello te espera al terminar. Si sigues andando, esto se pliega solo.';
  return (
    <Animated.View entering={FadeIn.duration(DUR.base).easing(EASE_OUT)} accessibilityLiveRegion="polite" style={s.arrive}>
      <View style={s.arriveTop}>
        <DuotoneImage source={st.thumb} palette={p} style={s.arrivePic} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.arriveOver, { color: p.t }]} numberOfLines={1}>{over}</Text>
          <Text accessibilityRole="header" style={s.arriveName} numberOfLines={2}>{st.name}</Text>
        </View>
      </View>
      <PressableScale accessibilityRole="button" accessibilityLabel={kind === 'offer' ? `Sellar ${st.name}` : `Escuchar ${st.name}, ${mins} minutos`} onPress={onListen} scaleTo={0.97} style={[s.arriveBtn, { backgroundColor: p.t2 }]}>
        <Text style={s.arriveBtnText}>{cta}</Text>
      </PressableScale>
      <View style={s.arriveHint}>
        <View style={{ width: 40, alignItems: 'center', opacity: repeat ? 0.9 : 0.3 }}>
          <RubberStamp tour={tour} stop={st} date={new Date().toISOString()} width={look.w} height={look.h} />
        </View>
        <Text style={s.arriveHintText}>{hint}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={kind === 'offer' ? 'Ahora no' : 'Luego'} onPress={onLater} hitSlop={10}>
          <Text style={s.arriveLater}>{kind === 'offer' ? 'Ahora no' : 'Luego'}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  dir: { position: 'absolute', left: 12, right: 12, borderRadius: 24, overflow: 'hidden', ...shadow[3] },
  dirMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  arrow: { width: 66, height: 66, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dist: { fontFamily: font.black, fontSize: 40, color: '#fff', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  instr: { fontFamily: font.bold, fontSize: 18, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  then: { backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, gap: 8 },
  thenRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thenPic: { width: 30, height: 30, borderRadius: 9 },
  thenText: { flex: 1, fontFamily: font.heavy, fontSize: 15, color: '#fff' },
  thenCount: { fontFamily: font.black, fontSize: 15, color: '#fff', fontVariant: ['tabular-nums'] },
  notice: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(28,26,23,0.82)', borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center' },
  noticeText: { fontFamily: font.black, fontSize: 12, color: '#fff' },
  card: { position: 'absolute', left: 12, right: 12, backgroundColor: neutral.surface, borderRadius: 20, padding: 14, gap: 6, ...shadow[3] },
  cardTitle: { fontFamily: font.black, fontSize: 15, color: neutral.ink },
  cardText: { fontFamily: font.bold, fontSize: 13, color: neutral.ink2 },
  cardRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  cardBtn: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center' },
  cardBtnGhost: { backgroundColor: neutral.bg2 },
  cardBtnText: { fontFamily: font.black, fontSize: 14 },
  center: { position: 'absolute', right: 14, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.95)', ...shadow[2] },
  test: { position: 'absolute', left: 12, right: 12, backgroundColor: 'rgba(28,26,23,0.86)', borderRadius: 18, padding: 10, gap: 8 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  testTitle: { flex: 1, fontFamily: font.black, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: brand.sun },
  testChip: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' },
  testOn: { backgroundColor: brand.primary },
  testChipText: { fontFamily: font.black, fontSize: 13, color: '#fff' },
  testHint: { fontFamily: font.bold, fontSize: 11.5, color: 'rgba(255,255,255,0.75)' },
  popWrap: { position: 'absolute', left: 12, right: 12 },
  scrim: { backgroundColor: neutral.night },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: neutral.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, ...shadow[3] },
  handleHit: { height: 26, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: neutral.line },
  body: { gap: 12, paddingTop: 12 },
  bar: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  way: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.pill, padding: 5, paddingRight: 14 },
  wayPlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  wayText: { flex: 1, fontFamily: font.heavy, fontSize: 13 },
  stopRow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12 },
  stopText: { fontFamily: font.heavy, fontSize: 15, color: neutral.ink2 },
  arrive: { paddingBottom: 6, gap: 12 },
  arriveTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  arrivePic: { width: 76, height: 76, borderRadius: 16 },
  arriveOver: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase' },
  arriveName: { fontFamily: font.serif, fontSize: 24, lineHeight: 27, color: neutral.ink, marginTop: 2 },
  arriveBtn: { height: 58, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  arriveBtnText: { fontFamily: font.black, fontSize: 18, color: neutral.ink },
  arriveHint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arriveHintText: { flex: 1, fontFamily: font.bold, fontSize: 13, color: neutral.ink3 },
  arriveLater: { fontFamily: font.black, fontSize: 14, color: neutral.ink2 },
  nowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nowPic: { width: 52, height: 52, borderRadius: 12 },
  guide: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  guideIn: { flex: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', backgroundColor: neutral.bg, ...shadow[3] },
  guideGrip: { position: 'absolute', top: 0, left: 70, right: 70, height: 34, alignItems: 'center', justifyContent: 'center' },
  guideHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)' },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingBottom: 2 },
  listenPlay: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  listenGlyph: { fontFamily: font.black, fontSize: 23 },
  listenTitle: { fontFamily: font.serif, fontSize: 21, color: neutral.ink },
  listenSub: { fontFamily: font.bold, fontSize: 14, color: neutral.ink3, marginTop: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: neutral.bg2, justifyContent: 'center' },
  actionQuiet: { height: 36, paddingHorizontal: 8, justifyContent: 'center' },
  actionQuietText: { fontFamily: font.heavy, fontSize: 13, color: DANGER },
  actionText: { fontFamily: font.heavy, fontSize: 13, color: neutral.ink2 },
});
