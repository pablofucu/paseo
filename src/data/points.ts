import type { ImageSourcePropType } from 'react-native';
import type { LngLat } from './types';

export type PointKind = 'curiosidad' | 'mirador' | 'foto' | 'tapa';

export const POINT_ICON: Record<PointKind, string> = { curiosidad: '👀', mirador: '🔭', foto: '📸', tapa: '🍷' };

/**
 * Un punto marcado en el mapa (un comercio, un rincón): al pasar cerca, su pin
 * se abre en su foto redonda con el nombre debajo.
 */
export interface MapPoint {
  id: string;
  kind: PointKind;
  name: string;
  /** Foto cuadrada o casi (se recorta en círculo). Si falta, el círculo lleva el icono del tipo */
  photo?: ImageSourcePropType;
  coord: LngLat;
}

/*
 * Puntos marcados del mapa. Es una sola lista para toda la app: cada ruta los
 * enseña todos, así que un punto añadido aquí aparece en todos los paseos que
 * pasen por allí. Los que no son paradas de ninguna ruta.
 *
 * Fotos: guárdalas en assets/points/<id>.jpg y ponlas con
 * `photo: require('../../assets/points/<id>.jpg')`.
 *
 * Coordenadas: APROXIMADAS (puestas a mano sobre OpenStreetMap, octubre de
 * 2026). Comprobar en el sitio antes de publicar.
 */
export const POINTS: MapPoint[] = [
  {
    id: 'inmaculada-triunfo',
    kind: 'curiosidad',
    name: 'Monumento a la Inmaculada',
    coord: [-5.99214, 37.38558],
  },
  {
    id: 'venerables',
    kind: 'curiosidad',
    name: 'Hospital de los Venerables',
    coord: [-5.99042, 37.38536],
  },
  {
    id: 'callejon-agua',
    kind: 'foto',
    name: 'Callejón del Agua',
    coord: [-5.98968, 37.38394],
  },
  {
    id: 'mateos-gago',
    kind: 'tapa',
    name: 'Calle Mateos Gago',
    coord: [-5.99137, 37.3872],
  },
  {
    id: 'maestranza',
    kind: 'mirador',
    name: 'Real Maestranza',
    coord: [-5.99871, 37.38639],
  },
  {
    id: 'puerta-jerez',
    kind: 'foto',
    name: 'Puerta de Jerez',
    coord: [-5.99347, 37.38085],
  },
];
