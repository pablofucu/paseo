import { useLocalSearchParams } from 'expo-router';
import { getTour } from '@/data/tours';

export function useTourParam() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tour = getTour(id);
  if (!tour) throw new Error(`Tour no encontrado: ${id}`);
  return tour;
}
