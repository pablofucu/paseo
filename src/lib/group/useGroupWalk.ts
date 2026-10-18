import { useEffect, useRef } from 'react';
import { getTour } from '@/data/tours';
import { useGroup } from '@/store/group';
import { usePassport } from '@/store/passport';
import type { StateMsg } from './protocol';

/** Lo último del anfitrión que ya se aplicó al paseo del invitado */
export interface GuestWalkMark {
  tourId: string;
  target: number;
  arrived: string | null;
}

/** Una llegada del grupo aplicada al invitado: índice de la parada y si ya la tenía sellada */
export interface GroupArrival {
  idx: number;
  repeat: boolean;
}

/**
 * Lleva el paseo del invitado (usePassport.walk) al estado del anfitrión. Solo
 * aplica lo que cambia respecto a `prev`, para que el invitado pueda moverse
 * por su cuenta entre un cambio y otro:
 * - Sin paseo de ese tour: lo empieza en la parada del grupo y marca la ruta `via: 'grupo'` (si aún no tiene sellos).
 * - Cambia `target`: `goTo(target)`.
 * - Cambia `arrived`: el invitado llega a esa parada (`arrive`), aunque su GPS no lo diga; desde ahí puede sellarla.
 * Devuelve la marca nueva y la llegada aplicada (si hubo).
 */
export function applyGuestState(st: StateMsg, prev: GuestWalkMark | null): { mark: GuestWalkMark; arrival: GroupArrival | null } {
  const tour = getTour(st.tourId);
  const mark = { tourId: st.tourId, target: st.target, arrived: st.arrived };
  if (!tour) return { mark, arrival: null };
  const target = Math.min(st.target, tour.stops.length);
  const same = prev?.tourId === st.tourId;
  const ps = usePassport.getState();
  if (ps.walk?.tourId !== st.tourId) {
    ps.markGroupRoute(st.tourId);
    ps.startWalk(st.tourId, target);
  } else if (!same || prev!.target !== st.target) {
    if (ps.walk.target !== target) ps.goTo(target);
  }
  let arrival: GroupArrival | null = null;
  if (st.arrived && (!same || prev!.arrived !== st.arrived)) {
    const idx = tour.stops.findIndex(s => s.id === st.arrived);
    const walk = usePassport.getState().walk;
    if (idx >= 0 && walk?.tourId === st.tourId && walk.arrived !== st.arrived) {
      if (walk.target !== idx) usePassport.getState().goTo(idx);
      arrival = { idx, repeat: usePassport.getState().arrive(st.tourId, st.arrived) };
    }
  }
  return { mark, arrival };
}

/**
 * Invitado: mantiene su paseo al paso del anfitrión (ver `applyGuestState`).
 * Se monta una vez mientras dure el grupo (p. ej. en el paseo). `onArrive`
 * avisa de cada llegada del grupo, para enseñar «Has llegado» + «▶ Escuchar».
 */
export function useGuestWalkSync(onArrive?: (a: GroupArrival) => void) {
  const role = useGroup(s => s.role);
  const state = useGroup(s => (s.role === 'guest' ? s.state : null));
  const mark = useRef<GuestWalkMark | null>(null);
  const cb = useRef(onArrive);
  useEffect(() => { cb.current = onArrive; });
  useEffect(() => {
    if (role !== 'guest') { mark.current = null; return; }
    if (!state || state.ended) return;
    const r = applyGuestState(state, mark.current);
    mark.current = r.mark;
    if (r.arrival) cb.current?.(r.arrival);
  }, [role, state]);
}

/**
 * Anfitrión: publica la parada a la que va y a la que ha llegado (walk.target /
 * walk.arrived) cada vez que cambian en su paseo del tour del grupo.
 */
export function useHostWalkPublish() {
  const role = useGroup(s => s.role);
  const tourId = useGroup(s => s.tourId);
  const publish = useGroup(s => s.publish);
  const target = usePassport(s => (s.walk && s.walk.tourId === tourId ? s.walk.target : null));
  const arrived = usePassport(s => (s.walk && s.walk.tourId === tourId ? s.walk.arrived : null));
  useEffect(() => {
    if (role !== 'host' || target == null) return;
    publish({ target, arrived });
  }, [role, target, arrived, publish]);
}
