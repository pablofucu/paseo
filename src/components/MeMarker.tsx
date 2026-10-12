import { Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { MePin } from '@/components/MapPins';
import type { LngLat } from '@/data/types';
import { easeInOut, glideMs, lerpLngLat } from '@/lib/smooth';

/**
 * Tu posición en el mapa. Cada lectura nueva del GPS (o del paseo simulado)
 * no salta: el punto se desliza hasta ella en lo que tardó en llegar. Solo se
 * vuelve a pintar este marcador en cada fotograma, no la pantalla entera.
 */
export function MeMarker({ position, heading }: { position: LngLat; heading: number | null }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(position);
  const now = useRef(position);
  const lastAt = useRef(0);

  useEffect(() => {
    const from = now.current;
    const at = Date.now();
    const ms = reduced || !lastAt.current ? 0 : glideMs(from, position, at - lastAt.current);
    lastAt.current = at;
    if (ms === 0) { now.current = position; setShown(position); return; }
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - at) / ms);
      now.current = lerpLngLat(from, position, easeInOut(t));
      setShown(now.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [position, reduced]);

  return (
    <Marker id="me" lngLat={shown} anchor="center">
      <MePin heading={heading} />
    </Marker>
  );
}
