import { getTour } from '@/data/tours';
import { useGroup, type GroupSession } from '@/store/group';
import { usePurchases } from '@/store/purchases';

/*
 * Quién puede hacer un tour. Gratis, comprado, o (solo para hacerlo, no para
 * abrir grupo) invitado en un grupo vivo de ese tour. Los tours bloqueados de
 * LOCKED_TOURS no tienen contenido: ni se hacen ni cuentan nunca.
 */

/** Lo que hace falta para decidir (por defecto, lo de los stores) */
export interface EntitlementCtx {
  owned?: Record<string, unknown>;
  group?: Pick<GroupSession, 'role' | 'tourId' | 'status'>;
}

/** Precio del tour en euros, o null si es gratis (o no existe) */
export function tourPrice(tourId: string): number | null {
  const tour = getTour(tourId);
  return tour && tour.price !== 'free' ? tour.price.eur : null;
}

/** Gratis o comprado (nunca por estar de invitado): puede abrir grupo de este tour */
export function canHost(tourId: string, ctx: EntitlementCtx = {}): boolean {
  const tour = getTour(tourId);
  if (!tour) return false;
  if (tour.price === 'free') return true;
  const owned = ctx.owned ?? usePurchases.getState().owned;
  return !!owned[tourId];
}

/** Invitado en un grupo vivo (no perdido) de ese tour */
export function guestOf(tourId: string, group: EntitlementCtx['group']): boolean {
  return !!group && group.role === 'guest' && group.tourId === tourId && group.status !== 'lost';
}

/** Puede hacer el tour: gratis, comprado o invitado en un grupo vivo de ese tour */
export function canPlay(tourId: string, ctx: EntitlementCtx = {}): boolean {
  if (!getTour(tourId)) return false;
  return canHost(tourId, ctx) || guestOf(tourId, ctx.group ?? useGroup.getState());
}

/** `canPlay` que se actualiza al comprar o al entrar y salir de un grupo */
export function useCanPlay(tourId: string | undefined): boolean {
  const owned = usePurchases(s => s.owned);
  const role = useGroup(s => s.role);
  const groupTour = useGroup(s => s.tourId);
  const status = useGroup(s => s.status);
  return !!tourId && canPlay(tourId, { owned, group: { role, tourId: groupTour, status } });
}

/** `canHost` que se actualiza al comprar */
export function useCanHost(tourId: string | undefined): boolean {
  const owned = usePurchases(s => s.owned);
  return !!tourId && canHost(tourId, { owned });
}
