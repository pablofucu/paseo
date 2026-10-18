import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * Compras de tours de pago. De momento no hay pagos de verdad: `buy` aún no
 * cobra (devuelve false) y en modo prueba «Simular compra» marca el tour como
 * comprado. El contenido ya va dentro de la app: la compra solo lo desbloquea.
 */

interface PurchasesState {
  /** Tours comprados (id → fecha de compra) */
  owned: Record<string, string>;
  /** Comprar de verdad: todavía no hay pasarela de pago, así que no compra nada */
  buy: (tourId: string) => Promise<boolean>;
  /** Modo prueba: da el tour por comprado */
  simulateBuy: (tourId: string) => void;
  /** Modo prueba: deshace una compra simulada */
  forget: (tourId: string) => void;
}

export const usePurchases = create<PurchasesState>()(
  persist(
    set => ({
      owned: {},
      buy: async () => false,
      simulateBuy: tourId => set(s => (s.owned[tourId] ? s : { owned: { ...s.owned, [tourId]: new Date().toISOString() } })),
      forget: tourId => set(s => {
        const { [tourId]: _gone, ...owned } = s.owned;
        return { owned };
      }),
    }),
    { name: 'paseo-purchases', storage: createJSONStorage(() => AsyncStorage), partialize: s => ({ owned: s.owned }) },
  ),
);
