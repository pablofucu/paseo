import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Una visita es una vez que haces un tour: cada visita tiene su página de sellos. */
export interface Visit {
  id: string;
  tourId: string;
  startedAt: string;
  /** id de parada → fecha ISO en la que se consiguió el sello */
  stamps: Record<string, string>;
  completedAt?: string;
}

interface PassportState {
  visits: Visit[];
  activeVisitId: string | null;
  startVisit: (tourId: string) => string;
  collectStamp: (stopId: string) => void;
  completeVisit: () => void;
  reset: () => void;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const usePassport = create<PassportState>()(
  persist(
    (set, get) => ({
      visits: [],
      activeVisitId: null,
      startVisit: tourId => {
        const id = newId();
        set(s => ({ visits: [...s.visits, { id, tourId, startedAt: new Date().toISOString(), stamps: {} }], activeVisitId: id }));
        return id;
      },
      collectStamp: stopId => {
        const { activeVisitId } = get();
        if (!activeVisitId) return;
        set(s => ({
          visits: s.visits.map(v => (v.id === activeVisitId && !v.stamps[stopId] ? { ...v, stamps: { ...v.stamps, [stopId]: new Date().toISOString() } } : v)),
        }));
      },
      completeVisit: () => {
        const { activeVisitId } = get();
        set(s => ({
          visits: s.visits.map(v => (v.id === activeVisitId ? { ...v, completedAt: new Date().toISOString() } : v)),
          activeVisitId: null,
        }));
      },
      reset: () => set({ visits: [], activeVisitId: null }),
    }),
    { name: 'paseo-passport', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const useActiveVisit = () => usePassport(s => s.visits.find(v => v.id === s.activeVisitId) ?? null);

/** «10·10·26» para los sellos */
export const stampDate = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}·${p(d.getMonth() + 1)}·${String(d.getFullYear()).slice(2)}`;
};
