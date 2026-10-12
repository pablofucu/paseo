import type { CityId } from '@/store/settings';
import type { TourPalette } from '@/theme/tokens';
import type { LockedTour, Tour } from '../types';
import { LOCKED_TOURS } from './locked';
import { sevilla } from './sevilla';
import { sevillaArenal } from './sevilla-arenal';
import { tomares } from './tomares';

export const TOURS: Tour[] = [sevilla, sevillaArenal, tomares];

export const getTour = (id: string) => TOURS.find(t => t.id === id);

export { LOCKED_TOURS };

export interface City {
  id: CityId;
  name: string;
  region: string;
  /** Colores de su tarjeta en Inicio */
  palette: TourPalette;
  /** Tour cuya foto emblema sirve de portada; sin él, la tarjeta se dibuja */
  coverTour?: string;
}

/** Ciudades del selector, con sus tours disponibles y los de pago bloqueados */
export const CITIES: City[] = [
  { id: 'sevilla', name: 'Sevilla', region: 'Andalucía', palette: sevilla.palette, coverTour: sevilla.id },
  { id: 'madrid', name: 'Madrid', region: 'Comunidad de Madrid', palette: { t: '#B5462E', t2: '#F2C14E', soft: '#F7E4DD', deep: '#4A1A10', on: '#FFFFFF' } },
];

export const getCity = (id: string) => CITIES.find(c => c.id === id);

export const toursIn = (city: CityId): { open: Tour[]; locked: LockedTour[] } => ({
  open: TOURS.filter(t => t.area === city),
  locked: LOCKED_TOURS.filter(t => t.area === city),
});
