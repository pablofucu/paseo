import type { CityId } from '@/store/settings';
import type { LockedTour, Tour } from '../types';
import { LOCKED_TOURS } from './locked';
import { sevilla } from './sevilla';
import { tomares } from './tomares';

export const TOURS: Tour[] = [sevilla, tomares];

export const getTour = (id: string) => TOURS.find(t => t.id === id);

export { LOCKED_TOURS };

/** Ciudades del selector, con sus tours disponibles y los de pago bloqueados */
export const CITIES: { id: CityId; name: string; region: string }[] = [
  { id: 'sevilla', name: 'Sevilla', region: 'Andalucía' },
  { id: 'madrid', name: 'Madrid', region: 'Comunidad de Madrid' },
];

export const toursIn = (city: CityId): { open: Tour[]; locked: LockedTour[] } => ({
  open: TOURS.filter(t => t.area === city),
  locked: LOCKED_TOURS.filter(t => t.area === city),
});
