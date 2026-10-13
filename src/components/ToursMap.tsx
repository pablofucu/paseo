import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { memo, useMemo, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { MeMarker } from '@/components/MeMarker';
import type { LngLat, Tour } from '@/data/types';
import { buildMapStyle } from '@/lib/mapStyle';
import { brandPalette, neutral, shadow } from '@/theme/tokens';

const STYLE = buildMapStyle(brandPalette);
const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
/** Las expresiones de MapLibre no encajan con los tipos de `paint`: mismo atajo que en mapStyle */
const expr = <T,>(e: unknown) => e as T;

/** Cámara inicial: encuadrar una caja [oeste, sur, este, norte] con margen, o centrar en un punto */
export type MapView =
  | { bounds: [number, number, number, number]; padding: { top: number; bottom: number; left: number; right: number } }
  | { center: LngLat; zoom: number };

export interface ToursMapProps {
  tours: Tour[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Tu posición, si la hay */
  me: LngLat | null;
  cameraRef: Ref<CameraRef>;
  initialView: MapView;
}

/** Pin del inicio de una ruta, del color de su paleta; el elegido crece y se pone borde oscuro */
const TourPin = memo(function TourPin({ tour, selected, onPress }: { tour: Tour; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${tour.title}, inicio de la ruta`} accessibilityState={{ selected }} onPress={onPress} hitSlop={10} scaleTo={0.85} style={s.hit}>
      <View style={[s.pin, { backgroundColor: tour.palette.t }, selected && s.pinOn]}>
        <View style={[s.dot, { backgroundColor: tour.palette.t2 }]} />
      </View>
    </PressableScale>
  );
});

/** Mapa con el trazo de cada ruta en su color y un pin en su inicio (nativo; en la web hay ToursMap.web) */
export function ToursMap({ tours, selectedId, onSelect, me, cameraRef, initialView }: ToursMapProps) {
  const lines = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(() => ({
    type: 'FeatureCollection',
    features: tours.map(t => ({
      type: 'Feature',
      properties: { color: t.palette.t, sel: t.id === selectedId },
      geometry: { type: 'LineString', coordinates: t.legs.flat() },
    })),
  }), [tours, selectedId]);
  return (
    <Map style={StyleSheet.absoluteFill} mapStyle={STYLE} compass={false} logo={false} attribution={false} onPress={() => onSelect(null)}>
      <Camera ref={cameraRef} initialViewState={initialView} />
      <GeoJSONSource id="tours" data={lines}>
        <Layer id="tours-case" type="line" layout={round} paint={{ 'line-color': '#FFFFFF', 'line-width': expr<number>(['case', ['get', 'sel'], 11, 7]) }} />
        <Layer id="tours-line" type="line" layout={round} paint={{ 'line-color': expr<string>(['get', 'color']), 'line-width': expr<number>(['case', ['get', 'sel'], 6, 3.5]), 'line-opacity': expr<number>(['case', ['get', 'sel'], 1, 0.8]) }} />
      </GeoJSONSource>
      {tours.map(t => (
        <Marker key={t.id} id={`tour-${t.id}`} lngLat={t.stops[0].coord} anchor="center">
          <TourPin tour={t} selected={t.id === selectedId} onPress={() => onSelect(t.id)} />
        </Marker>
      ))}
      {me && <MeMarker position={me} heading={null} />}
    </Map>
  );
}

const s = StyleSheet.create({
  hit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  pinOn: { width: 38, height: 38, borderRadius: 19, borderColor: neutral.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
