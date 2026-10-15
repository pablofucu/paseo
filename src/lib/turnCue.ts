import type { Guidance } from './guidance';

/** Se avisa del giro cuando faltan estos metros o menos */
export const TURN_CUE_M = 25;

export type TurnCue = 'left' | 'right' | 'uturn' | 'off';
export type HapticKind = 'light' | 'medium' | 'heavy' | 'warning';
/** Un toque del patrón: qué fuerza y cuántos ms después de empezar */
export interface HapticStep { kind: HapticKind; at: number }

/** Patrones para no mirar el móvil: izquierda = 2 toques, derecha = 3, vuelta = 2 fuertes, te has salido = aviso */
export const TURN_PATTERNS: Record<TurnCue, HapticStep[]> = {
  left: [{ kind: 'medium', at: 0 }, { kind: 'medium', at: 160 }],
  right: [{ kind: 'medium', at: 0 }, { kind: 'medium', at: 160 }, { kind: 'medium', at: 320 }],
  uturn: [{ kind: 'heavy', at: 0 }, { kind: 'heavy', at: 220 }],
  off: [{ kind: 'warning', at: 0 }],
};

/**
 * ¿Hay que vibrar ahora? Una vez por giro (a unos 25 m) y una vez al salirte de la ruta.
 * `fired` es la clave del último aviso dado; se devuelve la nueva (se olvida «te has salido»
 * al volver a la ruta). Los giros suaves («sigue ligeramente…») no vibran.
 */
export function turnCue(g: Guidance | null, fired: string | null): { cue: TurnCue | null; fired: string | null } {
  if (!g) return { cue: null, fired };
  if (g.offRoute) return fired === 'off' ? { cue: null, fired } : { cue: 'off', fired: 'off' };
  const base = fired === 'off' ? null : fired;
  if (g.arrived || g.near || !g.next || g.distToNext > TURN_CUE_M) return { cue: null, fired: base };
  const d = g.next.direction;
  const cue: TurnCue | null = d === 'left' || d === 'right' || d === 'uturn' ? d : null;
  const key = `t${Math.round(g.next.at)}`;
  if (!cue || key === base) return { cue: null, fired: base };
  return { cue, fired: key };
}
