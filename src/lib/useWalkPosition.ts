import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LngLat } from '@/data/types';
import { bearing, pointAlong } from './geo';
import type { PreparedLeg } from './guidance';
import { angleDelta } from './smooth';

export type PositionSource = 'gps' | 'simulated';

export interface WalkPosition {
  position: LngLat | null;
  heading: number | null;
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

/** ¿Se usa esta lectura del GPS? La primera siempre, para no dejar al usuario sin posición. */
export function acceptFix(accuracy: number | null | undefined, hasFix: boolean, sinceLastMs: number): boolean {
  if (!hasFix || accuracy == null || accuracy <= MAX_ACCURACY_M) return true;
  return sinceLastMs >= STALE_FIX_MS;
}

const WALK_MS = 1.4;
const TICK = 0.25;

/**
 * Posición del usuario: GPS real o un paseo simulado sobre la ruta, para
 * probar la app sin moverse (modo prueba).
 */
export function useWalkPosition(source: PositionSource, leg: PreparedLeg | null, sim: SimOptions, gps: GpsOptions = { far: false, heading: true }): WalkPosition & { retry: () => void } {
  const [state, setState] = useState<WalkPosition>({ position: null, heading: null, permission: 'unknown', accuracy: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  const along = useRef(0);
  const opts = useRef(sim);
  useEffect(() => { opts.current = sim; }, [sim]);
  const lastFix = useRef(0);
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
    (async () => {
      try {
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
            const use = acceptFix(accuracy, lastFix.current > 0, now - lastFix.current);
            if (use) lastFix.current = now;
            setState(s => ({ ...s, accuracy, position: use ? [l.coords.longitude, l.coords.latitude] : s.position }));
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
    const step = (dt: number) => {
      if (opts.current.paused && dt > 0) return;
      along.current = Math.min(leg.length, along.current + WALK_MS * opts.current.speed * dt);
      const p = pointAlong(leg.line, along.current, leg.cum);
      const ahead = pointAlong(leg.line, Math.min(leg.length, along.current + 3), leg.cum);
      setState(s => ({ permission: 'granted', accuracy: null, position: p, heading: along.current < leg.length ? bearing(p, ahead) : s.heading }));
    };
    const first = setTimeout(() => step(0), 0);
    const id = setInterval(() => step(TICK), TICK * 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [source, leg]);

  return { ...state, retry };
}
