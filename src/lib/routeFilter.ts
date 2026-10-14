/** Con esta cantidad de rutas o más, la lista de una ciudad ofrece filtros (con menos, los filtros ocupan más que las rutas) */
export const FILTER_MIN_ROUTES = 7;

export type DurationFilter = 'all' | 'short' | 'mid' | 'long';
export type PriceFilter = 'all' | 'free' | 'paid';

/** Opciones elegibles; «all» (sin filtro) es no tener ninguna elegida: volver a tocar la elegida la quita */
export const DURATION_FILTERS: { id: DurationFilter; label: string }[] = [
  { id: 'short', label: 'Hasta 1 h' },
  { id: 'mid', label: '1 h – 1 h 30' },
  { id: 'long', label: 'Más de 1 h 30' },
];
export const PRICE_FILTERS: { id: PriceFilter; label: string }[] = [
  { id: 'free', label: 'Gratis' },
  { id: 'paid', label: 'De pago' },
];

export function matchesDuration(min: number, f: DurationFilter) {
  if (f === 'short') return min <= 60;
  if (f === 'mid') return min > 60 && min <= 90;
  if (f === 'long') return min > 90;
  return true;
}

export function matchesPrice(free: boolean, f: PriceFilter) {
  return f === 'all' || (f === 'free' ? free : !free);
}

export const shouldFilter = (routeCount: number) => routeCount >= FILTER_MIN_ROUTES;
