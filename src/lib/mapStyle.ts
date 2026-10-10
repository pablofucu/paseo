import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import type { TourPalette } from '@/theme/tokens';

/**
 * Teselas vectoriales con el esquema OpenMapTiles.
 * Por defecto, OpenFreeMap (gratis y sin clave) para desarrollo.
 * En producción: Protomaps autoalojado o MapTiler, vía EXPO_PUBLIC_MAP_TILES.
 */
const TILES = process.env.EXPO_PUBLIC_MAP_TILES ?? 'https://tiles.openfreemap.org/planet';
const GLYPHS = process.env.EXPO_PUBLIC_MAP_GLYPHS ?? 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
// TODO: publicar glifos de Nunito para que las calles usen la tipografía de Paseo.
const LABEL_FONT = ['Noto Sans Bold'];

/** Mezcla dos colores hex: t = 0 devuelve a, t = 1 devuelve b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) | (c(16) << 8 << 8) | (c(8) << 8) | c(0)).toString(16).slice(1);
}

/** Colores del mapa sacados de la paleta del tour (igual que en el prototipo). */
export function mapColors(p: TourPalette) {
  if (p.darkMap) {
    return { bg: '#151938', block: '#1C214C', road: '#2B3170', minor: '#22285E', park: '#1A2D3D', water: '#12224A', label: '#8B91CC', halo: '#151938', route: p.t2 };
  }
  return {
    bg: mix('#F3EEE5', p.soft, 0.5),
    block: mix('#ECE6DB', p.t, 0.14),
    road: '#FFFFFF',
    minor: mix('#F7F3EC', p.t, 0.05),
    park: mix('#DAE5CC', p.t2, 0.3),
    water: mix('#D5E6F1', p.t, 0.38),
    label: mix('#B5AD9F', p.deep, 0.55),
    halo: '#FFFFFF',
    route: p.t,
  };
}

export function buildMapStyle(p: TourPalette): StyleSpecification {
  const c = mapColors(p);
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { omt: { type: 'vector', url: TILES } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.park } },
      { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]], paint: { 'fill-color': c.park, 'fill-opacity': 0.7 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': c.block } },
      {
        id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'path', 'track']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.minor, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 2, 18, 12] },
      },
      {
        id: 'road', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk', 'motorway']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 18, 22] },
      },
      {
        id: 'road-label', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 15,
        layout: { 'symbol-placement': 'line', 'text-field': ['upcase', ['coalesce', ['get', 'name:es'], ['get', 'name']]], 'text-font': LABEL_FONT, 'text-size': 10, 'text-letter-spacing': 0.12 },
        paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.4 },
      },
    ],
  };
}
