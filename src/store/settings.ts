import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SimSpeed = 1 | 4 | 16;
/** Idiomas de la interfaz. De momento solo hay versión en español. */
export type Language = 'es' | 'en';
export type CityId = 'sevilla' | 'madrid';
/** Cómo se orienta el mapa del paseo: el camino que sigues hacia arriba, o el norte */
export type MapOrientation = 'route' | 'north';

/** Idiomas que se ofrecen en la bienvenida y en Ajustes; el inglés aún no está hecho */
export const LANGUAGES: { id: Language; name: string; note: string; ready: boolean }[] = [
  { id: 'es', name: 'Español', note: 'Audios y textos en español', ready: true },
  { id: 'en', name: 'English', note: 'Coming soon · Próximamente', ready: false },
];

/** Idiomas que ya se pueden usar; mientras solo haya uno, la bienvenida no pregunta el idioma */
export const READY_LANGUAGES = LANGUAGES.filter(l => l.ready);
export const HAS_LANGUAGE_STEP = READY_LANGUAGES.length > 1;

interface SettingsState {
  /** Modo prueba: simula el paseo sin moverte y muestra controles para probar la app */
  testMode: boolean;
  simSpeed: SimSpeed;
  /** Elegido en la bienvenida (null la primera vez) */
  language: Language | null;
  /** Última ciudad elegida en Inicio: sale la primera (null hasta elegir una) */
  city: CityId | null;
  /** Texto grande: escala los estilos de texto (useType) */
  largeText: boolean;
  /** Mapa del paseo «ruta arriba» (por defecto) o «norte arriba» */
  mapOrientation: MapOrientation;
  /** Vibrar en los giros del paseo (izquierda, derecha, te has salido) */
  turnHaptics: boolean;
  setTurnHaptics: (on: boolean) => void;
  setMapOrientation: (o: MapOrientation) => void;
  setLargeText: (on: boolean) => void;
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
      largeText: false,
      mapOrientation: 'route',
      turnHaptics: true,
      setTurnHaptics: turnHaptics => set({ turnHaptics }),
      setMapOrientation: mapOrientation => set({ mapOrientation }),
      setLargeText: largeText => set({ largeText }),
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
