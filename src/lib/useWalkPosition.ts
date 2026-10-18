import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LngLat } from '@/data/types';
import { bearing, distance, pointAlong } from './geo';
import { reliableCourse } from './mapBearing';
import type { PreparedLeg } from './guidance';
import { angleDelta } from './smooth';

export type PositionSource = 'gps' | 'simulated';

export interface WalkPosition {
  position: LngLat | null;
  heading: number | null;
  /** Hacia dónde te mueves (rumbo del GPS), solo si andas; null parado o sin dato */
  course: number | null;
  /** «denied»: sin permiso; «unavailable»: los servicios de ubicación están apagados o fallan */
  permission: 'unknown' | 'granted' | 'denied' | 'unavailable';
  /** Error de la última lectura del GPS, en metros (null si no se conoce o es simulado) */
  accuracy: number | null;
}

interface SimOptions {
  /** Multiplica la velocidad de paseo (1,4 m/s) */
  speed: number;
  paused: boolean;
  /** Si cambia, el paseo simulado sigue desde este punto de la ruta (metros) */
  resumeFrom?: { along: number; key: number };
}

interface GpsOptions {
  /** La parada queda lejos (> ~200 m): menos precisión y menos lecturas para gastar menos batería */
  far: boolean;
  /** Leer la brújula (se pausa cuando la pantalla del paseo no está delante) */
  heading: boolean;
}

/** Con peor precisión que esto (m) se ignora la lectura del GPS */
export const MAX_ACCURACY_M = 35;
/** Aunque sea mala, se acepta si llevamos tanto tiempo sin ninguna buena (para no quedarse parado) */
export const STALE_FIX_MS = 20000;

/** Aunque encaje con lo andado, una lectura con peor precisión que esto (m) no se acepta */
export const MAX_COHERENT_ACCURACY_M = 100;
/** Velocidad máxima de paseo (m/s) para decidir si una lectura imprecisa encaja con lo andado */
export const MAX_WALK_SPEED_MS = 2;

/**
 * ¿Encaja una lectura imprecisa con lo andado? Sí si queda a una distancia del último
 * punto aceptado que se explica andando (2 m/s × el tiempo pasado) más su propio error.
 * En calles estrechas el GPS da errores de 40-80 m: así no se congela la posición.
 */
export function coherentFix(last: LngLat | null, next: LngLat, accuracy: number | null | undefined, sinceLastMs: number): boolean {
  if (!last || accuracy == null || accuracy > MAX_COHERENT_ACCURACY_M) return false;
  return distance(last, next) <= MAX_WALK_SPEED_MS * (sinceLastMs / 1000) + accuracy;
}

/**
 * ¿Se usa esta lectura del GPS? La primera siempre, para no dejar al usuario sin posición.
 * Una imprecisa solo si es coherente con lo andado (`coherent`) o si llevamos mucho sin ninguna.
 */
export function acceptFix(accuracy: number | null | undefined, hasFix: boolean, sinceLastMs: number, coherent = false): boolean {
  if (!hasFix || accuracy == null || accuracy <= MAX_ACCURACY_M) return true;
  return coherent || sinceLastMs >= STALE_FIX_MS;
}

/** Por debajo de estos cambios la pantalla no se repinta: temblor del GPS */
export const MIN_MOVE_M = 1;
export const MIN_COURSE_DEG = 8;
export const MIN_ACCURACY_STEP_M = 3;

/**
 * Estado nuevo a partir de una lectura, o el mismo objeto si lo único que cambia es
 * temblor (menos de ~1 m, pocos grados de rumbo, error casi igual): así React no repinta.
 */
export function stableReading(prev: WalkPosition, next: { position: LngLat | null; accuracy: number | null; course: number | null }): WalkPosition {
  const position = prev.position && next.position && distance(prev.position, next.position) < MIN_MOVE_M ? prev.position : next.position;
  const course = prev.course != null && next.course != null && Math.abs(angleDelta(prev.course, next.course)) < MIN_COURSE_DEG ? prev.course : next.course;
  // El error solo cuenta si cambia de verdad o cruza el límite de «señal débil»
  const sameSide = prev.accuracy != null && next.accuracy != null && (prev.accuracy > MAX_ACCURACY_M) === (next.accuracy > MAX_ACCURACY_M);
  const accuracy = sameSide && Math.abs(prev.accuracy! - next.accuracy!) < MIN_ACCURACY_STEP_M ? prev.accuracy : next.accuracy;
  if (position === prev.position && course === prev.course && accuracy === prev.accuracy) return prev;
  return { ...prev, position, course, accuracy };
}

const WALK_MS = 1.4;
const TICK = 0.25;

/**
 * Posición del usuario: GPS real o un paseo simulado sobre la ruta, para
 * probar la app sin moverse (modo prueba).
 */
export function useWalkPosition(source: PositionSource, leg: PreparedLeg | null, sim: SimOptions, gps: GpsOptions = { far: false, heading: true }): WalkPosition & { retry: () => void } {
  const [state, setState] = useState<WalkPosition>({ position: null, heading: null, course: null, permission: 'unknown', accuracy: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  const along = useRef(0);
  const opts = useRef(sim);
  useEffect(() => { opts.current = sim; }, [sim]);
  const lastFix = useRef(0);
  /** Se pasó por el paseo simulado: al volver al GPS se descarta su punto */
  const fromSim = useRef(false);
  const lastPoint = useRef<LngLat | null>(null);
  const granted = state.permission === 'granted';
  const { far, heading: headingOn } = gps;

  // Al volver a la app (p. ej. tras activar la ubicación en Ajustes) se vuelve a intentar
  const permissionRef = useRef(state.permission);
  useEffect(() => { permissionRef.current = state.permission; }, [state.permission]);
  useEffect(() => {
    if (source !== 'gps') return;
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active' && permissionRef.current !== 'granted') retry();
    });
    return () => sub.remove();
  }, [source, retry]);

  useEffect(() => {
    if (source !== 'gps') return;
    let pos: Location.LocationSubscription | undefined;
    let cancelled = false;
    // Venimos del paseo simulado: su punto no es una lectura de GPS
    lastFix.current = 0; lastPoint.current = null;
    (async () => {
      try {
        if (fromSim.current) { fromSim.current = false; setState(s => ({ ...s, position: null, accuracy: null, course: null })); }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') { setState(s => ({ ...s, permission: 'denied' })); return; }
        if (!(await Location.hasServicesEnabledAsync())) {
          if (!cancelled) setState(s => ({ ...s, permission: 'unavailable' }));
          return;
        }
        if (cancelled) return;
        setState(s => ({ ...s, permission: 'granted' }));
        const sub = await Location.watchPositionAsync(
          // De lejos basta con una precisión media y menos lecturas; cerca, la mejor
          far
            ? { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 4000 }
            : { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 1000 },
          l => {
            const accuracy = l.coords.accuracy ?? null;
            const now = Date.now();
            const point: LngLat = [l.coords.longitude, l.coords.latitude];
            const since = now - lastFix.current;
            const use = acceptFix(accuracy, lastFix.current > 0, since, coherentFix(lastPoint.current, point, accuracy, since));
            if (use) { lastFix.current = now; lastPoint.current = point; }
            setState(s => stableReading(s, { accuracy, position: use ? point : s.position, course: use ? reliableCourse(l.coords.heading, l.coords.speed) : s.course }));
          },
        );
        if (cancelled) { sub.remove(); return; }
        pos = sub;
      } catch {
        // Sin servicios de ubicación (o fallo del sistema): lo mostramos como «no disponible»
        if (!cancelled) setState(s => ({ ...s, permission: 'unavailable' }));
      }
    })();
    return () => { cancelled = true; pos?.remove(); };
  }, [source, attempt, far]);

  // La brújula va aparte: se pausa cuando la pantalla no está delante
  useEffect(() => {
    if (source !== 'gps' || !granted || !headingOn) return;
    let head: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      try {
        const sub = await Location.watchHeadingAsync(h => {
          const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          // La brújula manda lecturas sin parar: menos de 2° es temblor y no repinta el mapa
          setState(s => (s.heading != null && Math.abs(angleDelta(s.heading, heading)) < 2 ? s : { ...s, heading }));
        });
        if (cancelled) { sub.remove(); return; }
        head = sub;
      } catch {
        // Sin brújula seguimos sin el cono de dirección
      }
    })();
    return () => { cancelled = true; head?.remove(); };
  }, [source, granted, headingOn]);

  // Reanudar el paseo simulado desde otro punto (p. ej. tras tocar el mapa)
  const resumeKey = sim.resumeFrom?.key;
  useEffect(() => {
    if (opts.current.resumeFrom) along.current = opts.current.resumeFrom.along;
  }, [resumeKey]);

  useEffect(() => {
    if (source !== 'simulated' || !leg) return;
    along.current = 0;
    fromSim.current = true;
    const step = (dt: number) => {
      if (opts.current.paused && dt > 0) return;
      along.current = Math.min(leg.length, along.current + WALK_MS * opts.current.speed * dt);
      const p = pointAlong(leg.line, along.current, leg.cum);
      const ahead = pointAlong(leg.line, Math.min(leg.length, along.current + 3), leg.cum);
      const h = along.current < leg.length ? bearing(p, ahead) : null;
      setState(s => ({ permission: 'granted', accuracy: null, position: p, heading: h ?? s.heading, course: h ?? s.course }));
    };
    const first = setTimeout(() => step(0), 0);
    const id = setInterval(() => step(TICK), TICK * 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [source, leg]);

  return { ...state, retry };
}
