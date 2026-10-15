import type { FilterSpecification, LayerSpecification, StyleSpecification } from '@maplibre/maplibre-react-native';
import type { TourPalette } from '@/theme/tokens';

/**
 * Teselas vectoriales con el esquema OpenMapTiles.
 * Por defecto, OpenFreeMap (gratis y sin clave) para desarrollo.
 * En producción: Protomaps autoalojado o MapTiler, vía EXPO_PUBLIC_MAP_TILES.
 */
// El paquete sin conexión (components/OfflinePack) se descarga con este mismo estilo: MapLibre guarda teselas y glifos por URL,
// así que TILES y GLYPHS no deben cambiar entre la descarga y el paseo (los colores sí, no cuentan).
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
    return { bg: '#151938', block: '#1C214C', blockLine: '#262C63', road: '#2E3576', casing: '#0D102B', park: '#1A2D3D', water: '#12224A', label: '#8B91CC', halo: '#151938', route: p.t2 };
  }
  const bg = mix('#F3EEE5', p.soft, 0.5);
  return {
    bg,
    block: mix('#E9E2D6', p.t, 0.12),
    blockLine: mix('#D3C9B9', p.deep, 0.18),
    road: '#FFFFFF',
    // Contorno de las calles: el fondo oscurecido hacia el tono profundo del tour
    casing: mix(bg, p.deep, 0.3),
    park: mix('#DAE5CC', p.t2, 0.3),
    water: mix('#D5E6F1', p.t, 0.38),
    label: mix('#A79E90', p.deep, 0.6),
    halo: '#FFFFFF',
    route: p.t,
  };
}

const MAJOR = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
const MINOR = ['minor', 'service', 'track', 'raceway'];
const PATH = ['path'];
const byClass = (classes: string[]) => ['in', ['get', 'class'], ['literal', classes]] as unknown as FilterSpecification;
/** Ancho en píxeles según el zoom: [zoom, ancho] */
const width = (...stops: [number, number][]) => ['interpolate', ['exponential', 1.6], ['zoom'], ...stops.flat()] as unknown as number;

/** `labelSize`: tamaño de los nombres de las calles (el paseo los lleva más grandes, para leerlos andando). */
export function buildMapStyle(p: TourPalette, labelSize = 10): StyleSpecification {
  const c = mapColors(p);
  const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
  const line = (id: string, classes: string[], color: string, w: [number, number][], extra: object = {}): LayerSpecification =>
    ({ id, type: 'line', source: 'omt', 'source-layer': 'transportation', filter: byClass(classes), layout: round, paint: { 'line-color': color, 'line-width': width(...w), ...extra } }) as LayerSpecification;
  // El contorno es la misma calle, más ancha y debajo
  const pad = (w: [number, number][], by: number) => w.map(([z, v]) => [z, v + by] as [number, number]);
  const wMajor: [number, number][] = [[12, 1.5], [15, 7], [18, 26]];
  const wMinor: [number, number][] = [[13, 0.8], [15, 4], [18, 16]];
  const wPath: [number, number][] = [[15, 1], [18, 5]];
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { omt: { type: 'vector', url: TILES } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.park } },
      { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: byClass(['grass', 'wood']), paint: { 'fill-color': c.park, 'fill-opacity': 0.7 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': c.block, 'fill-outline-color': c.blockLine } },
      line('path-casing', PATH, c.casing, pad(wPath, 1.5), { 'line-opacity': 0.6 }),
      line('minor-casing', MINOR, c.casing, pad(wMinor, 2.5)),
      line('major-casing', MAJOR, c.casing, pad(wMajor, 3)),
      line('path', PATH, c.road, wPath),
      line('minor', MINOR, c.road, wMinor),
      line('major', MAJOR, c.road, wMajor),
      {
        id: 'road-label', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 15,
        layout: { 'symbol-placement': 'line', 'text-field': ['upcase', ['coalesce', ['get', 'name:es'], ['get', 'name']]], 'text-font': LABEL_FONT, 'text-size': labelSize, 'text-letter-spacing': 0.12 },
        paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.4 },
      },
    ],
  };
}
