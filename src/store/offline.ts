import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Rutas con el mapa ya descargado (tourId → peso en bytes). Es solo un reflejo
 * para pintar «Lista para pasear» al instante: la verdad está en la base de
 * datos de MapLibre y el componente la contrasta al abrirse.
 */
interface OfflineState {
  packs: Record<string, number>;
  markDone: (tourId: string, bytes: number) => void;
  clear: (tourId: string) => void;
}

export const useOfflinePacks = create<OfflineState>()(
  persist(
    set => ({
      packs: {},
      markDone: (tourId, bytes) => set(s => ({ packs: { ...s.packs, [tourId]: bytes } })),
      clear: tourId => set(s => {
        const { [tourId]: _gone, ...rest } = s.packs;
        return { packs: rest };
      }),
    }),
    { name: 'paseo-offline', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
