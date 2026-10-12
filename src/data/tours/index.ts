import type { CityId } from '@/store/settings';
import type { LockedTour, Tour } from '../types';
import { LOCKED_TOURS } from './locked';
import { sevilla } from './sevilla';
import { tomares } from './tomares';

export const TOURS: Tour[] = [sevilla, tomares];

export const getTour = (id: string) => TOURS.find(t => t.id === id);

export { LOCKED_TOURS };

export type CountryId = 'es' | 'pt' | 'it' | 'fr';

/** Países del selector. Solo España tiene tours; el resto sale como «próximamente». */
export const COUNTRIES: { id: CountryId; name: string; flag: string }[] = [
  { id: 'es', name: 'España', flag: '🇪🇸' },
  { id: 'pt', name: 'Portugal', flag: '🇵🇹' },
  { id: 'it', name: 'Italia', flag: '🇮🇹' },
  { id: 'fr', name: 'Francia', flag: '🇫🇷' },
];

/** Ciudades del selector, con sus tours disponibles y los de pago bloqueados */
export const CITIES: { id: CityId; name: string; region: string; country: CountryId }[] = [
  { id: 'sevilla', name: 'Sevilla', region: 'Andalucía', country: 'es' },
  { id: 'madrid', name: 'Madrid', region: 'Comunidad de Madrid', country: 'es' },
];

export const getCountry = (id: string) => COUNTRIES.find(c => c.id === id);

export const toursIn = (city: CityId): { open: Tour[]; locked: LockedTour[] } => ({
  open: TOURS.filter(t => t.area === city),
  locked: LOCKED_TOURS.filter(t => t.area === city),
});

/** Los tours de un país, ciudad por ciudad (solo las ciudades que tienen alguno) */
export const toursInCountry = (country: CountryId) =>
  CITIES.filter(c => c.country === country)
    .map(c => ({ city: c, ...toursIn(c.id) }))
    .filter(g => g.open.length + g.locked.length > 0);
