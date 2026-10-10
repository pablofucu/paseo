import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Caracteres por segundo de la voz del sistema en español a velocidad 1 */
const CPS = 14.5;

/** Parte el guion en frases (la voz se lanza frase a frase para poder pausar y saltar). */
export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?…]+[.!?…]*["»”)]?\s*/g) ?? [text]).map(s => s.trim()).filter(Boolean);
}

export interface NarrationPlayer {
  sentences: string[];
  index: number;
  playing: boolean;
  rate: number;
  position: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  setRate: (r: number) => void;
}

/**
 * Reproductor de la narración. Mientras no haya audios grabados usa la voz del
 * sistema (expo-speech); el tiempo de cada frase se estima por su longitud.
 */
export function useNarrationPlayer(text: string): NarrationPlayer {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [rate, setRateState] = useState(1);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const token = useRef(0);
  /** La siguiente frase se lanza desde aquí al terminar la anterior */
  const nextRef = useRef<(i: number, r: number) => void>(() => {});

  const durs = useMemo(() => sentences.map(s => Math.max(1.2, s.length / CPS / rate)), [sentences, rate]);
  const starts = useMemo(() => durs.reduce<number[]>((a, d, i) => [...a, i ? a[i - 1] + durs[i - 1] : 0], []), [durs]);
  const duration = durs.reduce((a, d) => a + d, 0);

  const speakFrom = useCallback((i: number, r: number) => {
    const my = ++token.current;
    Speech.stop();
    if (i >= sentences.length) { setPlaying(false); setIndex(sentences.length - 1); setElapsed(durs.at(-1) ?? 0); return; }
    setIndex(i); setElapsed(0); setPlaying(true);
    Speech.speak(sentences[i], {
      language: 'es-ES',
      rate: r,
      onDone: () => { if (token.current === my) nextRef.current(i + 1, r); },
      onError: () => { if (token.current === my) setPlaying(false); },
    });
  }, [sentences, durs]);

  useEffect(() => { nextRef.current = speakFrom; }, [speakFrom]);

  // El reloj avanza mientras suena la frase, sin pasar de su duración estimada
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed(e => Math.min(e + 0.25, Math.max(0, durs[index] - 0.1))), 250);
    return () => clearInterval(id);
  }, [playing, index, durs]);

  useEffect(() => () => { token.current++; Speech.stop(); }, []);

  const pause = useCallback(() => { token.current++; Speech.stop(); setPlaying(false); }, []);
  const play = useCallback(() => speakFrom(index >= sentences.length - 1 && elapsed >= (durs.at(-1) ?? 0) - 0.2 ? 0 : index, rate), [speakFrom, index, sentences.length, elapsed, durs, rate]);
  const seek = useCallback((t: number) => {
    const clamped = Math.max(0, Math.min(duration - 0.01, t));
    let i = starts.findIndex((st, k) => clamped >= st && clamped < st + durs[k]);
    if (i < 0) i = sentences.length - 1;
    if (playing) speakFrom(i, rate);
    else { setIndex(i); setElapsed(0); }
  }, [duration, starts, durs, sentences.length, playing, speakFrom, rate]);
  const position = (starts[index] ?? 0) + elapsed;
  const skip = useCallback((d: number) => seek(position + d), [seek, position]);
  const setRate = useCallback((r: number) => { setRateState(r); if (playing) speakFrom(index, r); }, [playing, speakFrom, index]);

  return { sentences, index, playing, rate, position, duration, play, pause, toggle: playing ? pause : play, seek, skip, setRate };
}
