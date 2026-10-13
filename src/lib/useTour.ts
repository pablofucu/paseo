import { useLocalSearchParams } from 'expo-router';
import { getTour } from '@/data/tours';

/** La ruta del parámetro `id`, o undefined si no existe (la pantalla redirige al inicio) */
export function useTourParamSafe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return getTour(id);
}

export function useTourParam() {
  const tour = useTourParamSafe();
  if (!tour) throw new Error('Tour no encontrado');
  return tour;
}
