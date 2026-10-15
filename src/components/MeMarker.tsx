import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { LngLat } from '@/data/types';
import { destination } from '@/lib/geo';
import { easeInOut, glideMs, lerpLngLat } from '@/lib/smooth';
import { functional } from '@/theme/tokens';

/** Cada cuánto se mueve el punto mientras se desliza hasta la nueva lectura (~10 Hz) */
const FRAME_MS = 100;
/** Alcance del cono de dirección, en metros, y su abertura a cada lado, en grados */
const CONE_M = 30;
const CONE_HALF_DEG = 32;

/** Sector de circunferencia hacia donde miras, como polígono */
function cone(center: LngLat, heading: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring: LngLat[] = [center];
  for (let a = -CONE_HALF_DEG; a <= CONE_HALF_DEG; a += CONE_HALF_DEG / 4) ring.push(destination(center, heading + a, CONE_M));
  ring.push(center);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

/**
 * Tu posición en el mapa, dibujada como capas del propio mapa (punto azul con
 * borde blanco, halo y cono de dirección) y no como un marcador de vista: así
 * moverla es solo cambiar unos datos. Cada lectura nueva del GPS no salta: el
 * punto se desliza hasta ella en lo que tardó en llegar, a ~10 imágenes por
 * segundo, y solo se repinta este componente, no la pantalla entera.
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
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - at) / ms);
      now.current = lerpLngLat(from, position, easeInOut(t));
      setShown(now.current);
      if (t >= 1) clearInterval(id);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [position, reduced]);

  const dot = useMemo<GeoJSON.Feature<GeoJSON.Point>>(() => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: shown } }), [shown]);
  const fan = useMemo(() => (heading != null ? cone(shown, heading) : null), [shown, heading]);

  return (
    <>
      {fan && (
        <GeoJSONSource id="me-cone" data={fan}>
          <Layer id="me-cone-fill" type="fill" paint={{ 'fill-color': functional.me, 'fill-opacity': 0.25 }} />
        </GeoJSONSource>
      )}
      <GeoJSONSource id="me" data={dot}>
        <Layer id="me-halo" type="circle" paint={{ 'circle-radius': 25, 'circle-color': functional.me, 'circle-opacity': 0.2 }} />
        <Layer id="me-dot" type="circle" paint={{ 'circle-radius': 10.5, 'circle-color': functional.me, 'circle-stroke-width': 5, 'circle-stroke-color': '#ffffff' }} />
      </GeoJSONSource>
    </>
  );
}
