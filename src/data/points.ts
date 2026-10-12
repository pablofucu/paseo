import type { LngLat } from './types';

export type PointKind = 'curiosidad' | 'mirador' | 'foto' | 'tapa';

export const POINT_ICON: Record<PointKind, string> = { curiosidad: '👀', mirador: '🔭', foto: '📸', tapa: '🍷' };

/** Un punto marcado en el mapa: un secreto pequeño que salta al pasar cerca o al tocarlo */
export interface MapPoint {
  id: string;
  kind: PointKind;
  name: string;
  /** Una o dos frases; cabe en la burbuja */
  text: string;
  coord: LngLat;
}

/*
 * Puntos marcados del mapa. Es una sola lista para toda la app: cada ruta los
 * enseña todos, así que un punto añadido aquí aparece en todos los paseos que
 * pasen por allí. Los que no son paradas de ninguna ruta.
 *
 * Coordenadas: APROXIMADAS (puestas a mano sobre OpenStreetMap, octubre de
 * 2026). Comprobar en el sitio antes de publicar.
 */
export const POINTS: MapPoint[] = [
  {
    id: 'inmaculada-triunfo',
    kind: 'curiosidad',
    name: 'Monumento a la Inmaculada',
    text: 'En la plaza del Triunfo. Sevilla defendió la Inmaculada siglos antes de que fuera dogma.',
    coord: [-5.99214, 37.38558],
  },
  {
    id: 'venerables',
    kind: 'curiosidad',
    name: 'Hospital de los Venerables',
    text: 'Residencia barroca para sacerdotes mayores. Su iglesia guarda pinturas de Valdés Leal.',
    coord: [-5.99042, 37.38536],
  },
  {
    id: 'callejon-agua',
    kind: 'foto',
    name: 'Callejón del Agua',
    text: 'Pegado a la muralla del Alcázar, por aquí pasaba el agua que llegaba a los jardines.',
    coord: [-5.98968, 37.38394],
  },
  {
    id: 'mateos-gago',
    kind: 'tapa',
    name: 'Calle Mateos Gago',
    text: 'Bares de tapas con la Giralda de fondo. Buena excusa para parar.',
    coord: [-5.99137, 37.3872],
  },
  {
    id: 'maestranza',
    kind: 'mirador',
    name: 'Real Maestranza',
    text: 'La plaza de toros de albero, con su fachada blanca y almagra junto al río.',
    coord: [-5.99871, 37.38639],
  },
  {
    id: 'puerta-jerez',
    kind: 'foto',
    name: 'Puerta de Jerez',
    text: 'Ya no hay puerta: solo queda el nombre y la fuente de Hispalis en medio de la glorieta.',
    coord: [-5.99347, 37.38085],
  },
];
