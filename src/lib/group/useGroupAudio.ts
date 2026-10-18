import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NarrationPlayer } from '@/lib/useNarrationPlayer';
import { groupHostNow, useGroup, type GroupRole } from '@/store/group';
import { DRIFT_S, expectedPosition } from './clock';
import type { AudioState } from './protocol';

/** El anfitrión junta los cambios de su reproductor antes de publicarlos */
const PUBLISH_DEBOUNCE_MS = 250;

/** Clave de pista del protocolo para la narración de una parada */
export const stopAudioKey = (stopId: string) => `stop:${stopId}`;
/** Clave de pista para lo que se cuenta en un tramo (`afterStop`, índice en `onTheWay`) */
export const wayAudioKey = (afterStop: number, index: number) => `way:${afterStop}:${index}`;

export interface GroupAudio {
  /** Rol en el grupo, o null sin grupo (entonces el hook no hace nada) */
  role: GroupRole | null;
  /** Invitado: tocó su reproductor y va a su aire (enseñar «Volver al ritmo del grupo») */
  adrift: boolean;
  /** Invitado: vuelve al ritmo del grupo */
  rejoin: () => void;
  /** Lo que suena ahora en el grupo (puede no ser esta pista) */
  groupKey: string | null;
  /** Invitado: esta pista es la del grupo y la sigue (no está a su aire) */
  following: boolean;
  /**
   * El reproductor para la interfaz: igual que el de entrada, pero si un
   * invitado lo toca queda a su aire (en el anfitrión es el mismo).
   */
  player: NarrationPlayer;
}

/**
 * Une un NarrationPlayer con el grupo. En el anfitrión publica play/pausa,
 * posición, velocidad y pista (`key`). En el invitado, si su pista es la del
 * grupo, la sigue: suena y se para con el anfitrión, con su velocidad, y salta
 * si se desvía más de 2 s. Si el invitado toca los controles de `player`
 * (el devuelto), queda «a su aire» hasta `rejoin()` o hasta que el grupo cambie de pista.
 * Con `enabled: false` (p. ej. una guía abierta que no es la del grupo) no publica.
 */
export function useGroupAudio(player: NarrationPlayer, key: string, opts: { enabled?: boolean } = {}): GroupAudio {
  const enabled = opts.enabled ?? true;
  const role = useGroup(s => s.role);
  const adrift = useGroup(s => s.adrift);
  const setAdrift = useGroup(s => s.setAdrift);
  const publish = useGroup(s => s.publish);
  const audio = useGroup(s => (s.role === 'guest' ? s.state?.audio ?? null : null));
  const groupKey = useGroup(s => s.state?.audio?.key ?? null);
  const latest = useRef(player);
  useEffect(() => { latest.current = player; });

  // ---- Anfitrión: publicar ----
  const isHost = role === 'host' && enabled && !!key && player.sentences.length > 0;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshot = useCallback((): AudioState => {
    const p = latest.current;
    return { key, playing: p.playing, position: Math.round(p.position * 100) / 100, rate: p.rate, at: Date.now() };
  }, [key]);
  const publishSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; publish({ audio: snapshot() }); }, PUBLISH_DEBOUNCE_MS);
  }, [publish, snapshot]);
  // Cada cambio de pista, play/pausa, velocidad o frase (incluido un salto) se publica
  useEffect(() => {
    if (!isHost) return;
    publishSoon();
  }, [isHost, publishSoon, player.playing, player.rate, player.index]);
  // Al cerrar la guía (o cambiar de pista) la voz se calla: el grupo también
  useEffect(() => {
    if (!isHost) return;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const cur = useGroup.getState().state?.audio;
      if (cur?.key === key && cur.playing) publish({ audio: { ...snapshot(), playing: false } });
    };
  }, [isHost, key, publish, snapshot]);

  // ---- Invitado: seguir ----
  const prevGroupKey = useRef(groupKey);
  useEffect(() => {
    // El grupo pasa a otra pista: se vuelve a su ritmo
    if (role === 'guest' && groupKey !== prevGroupKey.current && adrift) setAdrift(false);
    prevGroupKey.current = groupKey;
  }, [role, groupKey, adrift, setAdrift]);
  const following = role === 'guest' && enabled && !adrift && !!audio && audio.key === key && player.sentences.length > 0;
  useEffect(() => {
    if (!following || !audio) return;
    const p = player;
    if (p.rate !== audio.rate) { p.setRate(audio.rate); return; }
    const exp = expectedPosition(audio, groupHostNow());
    const last = p.sentences.length - 1;
    let want = 0;
    p.starts.forEach((st, i) => { if (st <= exp) want = i; });
    const off = Math.abs(p.position - exp) > DRIFT_S && want !== p.index;
    if (audio.playing) {
      // Ya terminó (su voz fue más rápida) o el anfitrión ya pasó del final: no se repite la última frase
      if (exp >= p.duration || (p.ended && want >= last)) return;
      if (!p.playing || off) p.playAt(exp);
    } else if (p.playing) {
      p.pause();
    } else if (off) {
      p.seek(exp);
    }
  }, [following, audio, player]);

  const rejoin = useCallback(() => setAdrift(false), [setAdrift]);

  const wrapped = useMemo<NarrationPlayer>(() => {
    if (role === 'guest' && enabled) {
      const loose = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => { setAdrift(true); fn(...a); };
      return { ...player, play: loose(player.play), pause: loose(player.pause), toggle: loose(player.toggle), seek: loose(player.seek), playAt: loose(player.playAt), skip: loose(player.skip), setRate: loose(player.setRate) };
    }
    return player;
  }, [role, enabled, player, setAdrift]);

  return { role, adrift: role === 'guest' && adrift, rejoin, groupKey, following, player: wrapped };
}
