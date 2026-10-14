import type { ImageSourcePropType } from 'react-native';
import type { CityId } from '@/store/settings';
import { POSTCARD_BLUR, POSTCARD_MID, POSTCARD_THUMB } from '@/lib/postcard';

/** Un sello de carta del pack: el tour (abierto o de pago bloqueado) y su nombre corto para la etiqueta */
export interface PackTour {
  id: string;
  label: string;
}

/** Postal que se desbloquea al juntar todos los sellos del pack. Mismos formatos que `Tour.postcard`, más las variantes pequeñas. */
export interface PackPostcard {
  /** Ilustración 832 × 444 con textura de imprenta */
  art: ImageSourcePropType;
  /** Versión a 832 px (lista) */
  mid?: ImageSourcePropType;
  /** Miniatura */
  thumb?: ImageSourcePropType;
  /** Silueta ya difuminada, para cuando aún no está ganada (sin blurRadius) */
  blur?: ImageSourcePropType;
  value: string;
  subtitle: string;
}

/**
 * Grupo de tours de una ciudad. Con el sello de carta de todos ellos se
 * desbloquea una postal. Los nombres y las agrupaciones son provisionales.
 */
export interface Pack {
  id: string;
  city: CityId;
  name: string;
  tours: PackTour[];
  /** Sin postal: todavía por dibujar */
  postcard?: PackPostcard;
  /** Color de acento: el marco de su postal */
  accent: string;
}

export const PACKS: Pack[] = [
  {
    id: 'sevilla-monumental',
    city: 'sevilla',
    name: 'Sevilla monumental',
    accent: '#086f81',
    tours: [
      { id: 'sevilla-centro', label: 'Río y judería' },
      { id: 'sevilla-arenal', label: 'Arenal' },
      { id: 'murillo', label: 'Murillo' },
    ],
    postcard: {
      art: require('../../assets/postcards/sevilla-arenal.jpg'),
      mid: POSTCARD_MID['sevilla-arenal'],
      thumb: POSTCARD_THUMB['sevilla-arenal'],
      blur: POSTCARD_BLUR['sevilla-arenal'],
      value: '3,90€',
      subtitle: 'UNA BARCA EN EL CANAL DE LA PLAZA DE ESPAÑA',
    },
  },
  {
    id: 'sevilla-otro-lado',
    city: 'sevilla',
    name: 'Al otro lado del río',
    accent: '#912455',
    tours: [
      { id: 'triana', label: 'Triana' },
      { id: 'tomares-4-paradas', label: 'Tomares' },
    ],
    postcard: {
      art: require('../../assets/postcards/sevilla.jpg'),
      mid: POSTCARD_MID['sevilla-centro'],
      thumb: POSTCARD_THUMB['sevilla-centro'],
      blur: POSTCARD_BLUR['sevilla-centro'],
      value: '3,20€',
      subtitle: 'ATARDECER EN EL GUADALQUIVIR',
    },
  },
  {
    id: 'madrid-austrias',
    city: 'madrid',
    name: 'El Madrid de los Austrias',
    accent: '#A92963',
    tours: [
      { id: 'austrias', label: 'Austrias' },
      { id: 'letras', label: 'Las Letras' },
    ],
  },
  {
    id: 'madrid-arte',
    city: 'madrid',
    name: 'Paseo del Arte',
    accent: '#6B3A8A',
    tours: [{ id: 'retiro-prado', label: 'Retiro y Prado' }],
  },
];

export const getPack = (id: string) => PACKS.find(p => p.id === id);

/** El pack al que pertenece un tour, si tiene alguno */
export const packOf = (tourId: string) => PACKS.find(p => p.tours.some(t => t.id === tourId));
