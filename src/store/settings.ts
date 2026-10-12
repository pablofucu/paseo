import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SimSpeed = 1 | 4 | 16;
/** Idiomas de la interfaz. De momento solo hay versión en español. */
export type Language = 'es' | 'en';
export type CityId = 'sevilla' | 'madrid';

/** Idiomas que se ofrecen en la bienvenida y en Ajustes; el inglés aún no está hecho */
export const LANGUAGES: { id: Language; name: string; note: string; ready: boolean }[] = [
  { id: 'es', name: 'Español', note: 'Audios y textos en español', ready: true },
  { id: 'en', name: 'English', note: 'Coming soon · Próximamente', ready: false },
];

interface SettingsState {
  /** Modo prueba: simula el paseo sin moverte y muestra controles para probar la app */
  testMode: boolean;
  simSpeed: SimSpeed;
  /** Elegido en la bienvenida (null la primera vez) */
  language: Language | null;
  /** Ciudad cuyos tours se ven en Inicio (null la primera vez) */
  city: CityId | null;
  setTestMode: (on: boolean) => void;
  setSimSpeed: (s: SimSpeed) => void;
  setLanguage: (l: Language) => void;
  setCity: (c: CityId) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    set => ({
      testMode: false,
      simSpeed: 4,
      setTestMode: testMode => set({ testMode }),
      setSimSpeed: simSpeed => set({ simSpeed }),
      language: null,
      city: null,
      setLanguage: language => set({ language }),
      setCity: city => set({ city }),
    }),
    { name: 'paseo-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** true cuando los ajustes guardados ya se han leído (para no mandar a la bienvenida a quien ya pasó por ella) */
export function useSettingsHydrated() {
  return useSyncExternalStore(useSettings.persist.onFinishHydration, useSettings.persist.hasHydrated, () => false);
}
