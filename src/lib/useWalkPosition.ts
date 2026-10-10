import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import type { LngLat } from '@/data/types';
import { bearing, pointAlong } from './geo';
import type { PreparedLeg as Leg } from './guidance';

export type PositionSource = 'gps' | 'simulated';

interface WalkPosition {
  position: LngLat | null;
  heading: number | null;
  permission: 'unknown' | 'granted' | 'denied';
}

/**
 * Posición del usuario: GPS real o un paseo simulado sobre la ruta
 * (para probar en casa). La velocidad simulada va 8× más rápida que andar.
 */
export function useWalkPosition(source: PositionSource, leg: Leg | null): WalkPosition {
  const [state, setState] = useState<WalkPosition>({ position: null, heading: null, permission: 'unknown' });
  const simAlong = useRef(0);

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
      head = await Location.watchHeadingAsync(h => setState(s => ({ ...s, heading: h.trueHeading >= 0 ? h.trueHeading : h.magHeading })));
    })();
    return () => { cancelled = true; pos?.remove(); head?.remove(); };
  }, [source]);

  useEffect(() => {
    if (source !== 'simulated' || !leg) return;
    simAlong.current = 0;
    const speed = 1.4 * 8; // m/s
    const step = (dt: number) => {
      simAlong.current = Math.min(leg.length, simAlong.current + speed * dt);
      const p = pointAlong(leg.line, simAlong.current, leg.cum);
      const ahead = pointAlong(leg.line, Math.min(leg.length, simAlong.current + 3), leg.cum);
      setState(s => ({ permission: 'granted', position: p, heading: simAlong.current < leg.length ? bearing(p, ahead) : s.heading }));
      if (simAlong.current >= leg.length) clearInterval(id);
    };
    const first = setTimeout(() => step(0), 0);
    const id = setInterval(() => step(0.25), 250);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [source, leg]);

  return state;
}

