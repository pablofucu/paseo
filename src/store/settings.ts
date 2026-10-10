import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SimSpeed = 1 | 4 | 16;

interface SettingsState {
  /** Modo prueba: simula el paseo sin moverte y muestra controles para probar la app */
  testMode: boolean;
  simSpeed: SimSpeed;
  setTestMode: (on: boolean) => void;
  setSimSpeed: (s: SimSpeed) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    set => ({
      testMode: false,
      simSpeed: 4,
      setTestMode: testMode => set({ testMode }),
      setSimSpeed: simSpeed => set({ simSpeed }),
    }),
    { name: 'paseo-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
