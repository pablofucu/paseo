import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { StopMarkers } from '@/components/MapPins';
import type { Tour } from '@/data/types';
import { boundsOf } from '@/lib/geo';
import { buildMapStyle, mapColors } from '@/lib/mapStyle';
import { neutral } from '@/theme/tokens';

const noop = () => {};
const round = { 'line-cap': 'round', 'line-join': 'round' } as const;

/**
 * Mapa pequeño de la ficha: trazo y paradas numeradas, encuadrado a toda la ruta.
 * No se mueve; tocarlo abre el mapa a pantalla completa de esta ruta.
 */
export function TourMapPreview({ tour, lines, stamped }: { tour: Tour; lines: [number, number][][]; stamped: ReadonlySet<string> }) {
  const p = tour.palette;
  const style = useMemo(() => buildMapStyle(p), [p]);
  const c = mapColors(p);
  const line = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(() => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: lines.flat() } }), [lines]);
  const bounds = boundsOf([...lines.flat(), ...tour.stops.map(st => st.coord)])!;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ver el mapa de la ruta a pantalla completa" onPress={() => router.push({ pathname: '/mapa', params: { tour: tour.id } })} style={s.box}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={style}
        compass={false}
        logo={false}
        attribution={false}
        dragPan={false}
        touchZoom={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        touchRotate={false}
        touchPitch={false}
      >
        <Camera initialViewState={{ bounds, padding: { top: 36, bottom: 36, left: 36, right: 36 } }} />
        <GeoJSONSource id="route" data={line}>
          <Layer id="route-case" type="line" layout={round} paint={{ 'line-color': c.road, 'line-width': 9 }} />
          <Layer id="route-line" type="line" layout={round} paint={{ 'line-color': c.route, 'line-width': 5 }} />
        </GeoJSONSource>
        <StopMarkers stops={tour.stops} stamped={stamped} target={-1} selected={null} palette={p} onSelect={noop} />
      </Map>
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: neutral.bg2 },
});
