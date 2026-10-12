import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import type { LngLat } from '@/data/types';
import { bearing, pointAlong } from './geo';
import type { PreparedLeg } from './guidance';
import { angleDelta } from './smooth';

export type PositionSource = 'gps' | 'simulated';

interface WalkPosition {
  position: LngLat | null;
  heading: number | null;
  permission: 'unknown' | 'granted' | 'denied';
}

interface SimOptions {
  /** Multiplica la velocidad de paseo (1,4 m/s) */
  speed: number;
  paused: boolean;
  /** Si cambia, el paseo simulado sigue desde este punto de la ruta (metros) */
  resumeFrom?: { along: number; key: number };
}

const WALK_MS = 1.4;
const TICK = 0.25;

/**
 * Posición del usuario: GPS real o un paseo simulado sobre la ruta, para
 * probar la app sin moverse (modo prueba).
 */
export function useWalkPosition(source: PositionSource, leg: PreparedLeg | null, sim: SimOptions): WalkPosition {
  const [state, setState] = useState<WalkPosition>({ position: null, heading: null, permission: 'unknown' });
  const along = useRef(0);
  const opts = useRef(sim);
  useEffect(() => { opts.current = sim; }, [sim]);

  useEffect(() => {
    if (source !== 'gps') return;
    let pos: Location.LocationSubscription | undefined;
    let head: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') { setState(s => ({ ...s, permission: 'denied' })); return; }
      setState(s => ({ ...s, permission: 'granted' }));
      pos = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 1000 },
        l => setState(s => ({ ...s, position: [l.coords.longitude, l.coords.latitude] })),
      );
      head = await Location.watchHeadingAsync(h => {
        const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        // La brújula manda lecturas sin parar: menos de 2° es temblor y no repinta el mapa
        setState(s => (s.heading != null && Math.abs(angleDelta(s.heading, heading)) < 2 ? s : { ...s, heading }));
      });
    })();
    return () => { cancelled = true; pos?.remove(); head?.remove(); };
  }, [source]);

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
      setState(s => ({ permission: 'granted', position: p, heading: along.current < leg.length ? bearing(p, ahead) : s.heading }));
    };
    const first = setTimeout(() => step(0), 0);
    const id = setInterval(() => step(TICK), TICK * 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [source, leg]);

  return state;
}
