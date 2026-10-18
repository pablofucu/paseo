import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Paseo en pausa: la ruta, la parada a la que se iba y las que se saltaron */
export interface PausedWalk {
  tourId: string;
  target: number;
  skipped: string[];
  at: string;
}

interface PausedState {
  paused: PausedWalk | null;
  pause: (w: Omit<PausedWalk, 'at'>) => void;
  clear: () => void;
  /** Borra la pausa solo si es de esta ruta (al seguirla o terminarla desde otro sitio) */
  clearFor: (tourId: string) => void;
}

/**
 * «Pausar paseo» guarda el progreso en el móvil (aparte del pasaporte) para que,
 * al volver a abrir la app, «Sigue donde lo dejaste» ofrezca retomarlo.
 */
export const usePausedWalk = create<PausedState>()(
  persist(
    set => ({
      paused: null,
      pause: w => set({ paused: { ...w, at: new Date().toISOString() } }),
      clear: () => set({ paused: null }),
      clearFor: tourId => set(st => (st.paused?.tourId === tourId ? { paused: null } : st)),
    }),
    { name: 'paseo-paused-walk', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
