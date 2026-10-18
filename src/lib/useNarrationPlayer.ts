import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Caracteres por segundo de la voz del sistema en español a velocidad 1 */
const CPS = 14.5;
/** Por encima de esta longitud, una frase se parte en comas y puntos y coma */
const LONG = 90;
/** Los trozos de una frase larga no bajan de esta longitud */
const MIN_CHUNK = 40;

/** Parte una frase larga por sus comas y puntos y coma, sin dejar trozos diminutos */
function splitLong(sentence: string): string[] {
  if (sentence.length <= LONG) return [sentence];
  const clauses = sentence.match(/[^,;]+[,;]?\s*/g)?.map(c => c.trim()).filter(Boolean) ?? [sentence];
  const out: string[] = [];
  for (const c of clauses) {
    const last = out.at(-1);
    if (last !== undefined && (last.length < MIN_CHUNK || c.length < MIN_CHUNK / 2)) out[out.length - 1] = `${last} ${c}`;
    else out.push(c);
  }
  return out;
}

/**
 * Parte el guion en frases (la voz se lanza frase a frase para poder pausar y
 * saltar). Las frases largas se parten además en comas y puntos y coma, para que
 * al reanudar tras una pausa no se repita media oración.
 */
export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?…]+[.!?…]*["»”)]?\s*/g) ?? [text]).map(s => s.trim()).filter(Boolean).flatMap(splitLong);
}

/** Minutos (redondeados, al menos 1) que dura un guion a velocidad normal */
export const narrationMinutes = (text: string) => Math.max(1, Math.round(splitSentences(text).reduce((a, s) => a + Math.max(1.2, s.length / CPS), 0) / 60));

export interface NarrationPlayer {
  sentences: string[];
  /** Segundo (estimado) en que empieza cada frase */
  starts: number[];
  index: number;
  playing: boolean;
  /** El guion ha llegado al final (no es una simple pausa) */
  ended: boolean;
  rate: number;
  position: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  /** Suena desde el segundo `seconds` (desde el principio de su frase): un `seek` y un `play` a la vez */
  playAt: (seconds: number) => void;
  skip: (delta: number) => void;
  setRate: (r: number) => void;
}

/**
 * La voz es una audioguía: suena con el móvil en silencio y sigue con la pantalla
 * bloqueada o la app en segundo plano. En iOS expo-speech usa la sesión de audio
 * de la app, así que se configura aquí (junto a UIBackgroundModes audio); en
 * Android lo mantiene vivo el servicio en primer plano del seguimiento del paseo.
 */
function configureNarrationAudio() {
  try {
    // Se carga a la hora de usarlo: sin módulo nativo (pruebas, web) no hay modo que configurar
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('expo-audio') as typeof import('expo-audio')).setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'duckOthers' }).catch(() => {});
  } catch {
    // Sin modo de audio: la voz suena con el del sistema
  }
}

/**
 * Reproductor de la narración. Mientras no haya audios grabados usa la voz del
 * sistema (expo-speech); el tiempo de cada frase se estima por su longitud.
 * Si cambia el texto, vuelve al principio; con `autoplay` empieza a sonar
 * (solo cuando el usuario ya ha pedido escucharlo).
 */
export function useNarrationPlayer(text: string, autoplay = false): NarrationPlayer {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [rate, setRateState] = useState(1);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const token = useRef(0);
  /** La siguiente frase se lanza desde aquí al terminar la anterior */
  const nextRef = useRef<(i: number, r: number) => void>(() => {});

  const durs = useMemo(() => sentences.map(s => Math.max(1.2, s.length / CPS / rate)), [sentences, rate]);
  const starts = useMemo(() => durs.reduce<number[]>((a, d, i) => [...a, i ? a[i - 1] + durs[i - 1] : 0], []), [durs]);
  const duration = durs.reduce((a, d) => a + d, 0);

  const speakFrom = useCallback((i: number, r: number) => {
    const my = ++token.current;
    Speech.stop();
    if (i >= sentences.length) { setPlaying(false); setEnded(true); setIndex(sentences.length - 1); setElapsed(durs.at(-1) ?? 0); return; }
    setIndex(i); setElapsed(0); setPlaying(true); setEnded(false);
    configureNarrationAudio();
    Speech.speak(sentences[i], {
      language: 'es-ES',
      rate: r,
      onDone: () => { if (token.current === my) nextRef.current(i + 1, r); },
      onError: () => { if (token.current === my) setPlaying(false); },
    });
  }, [sentences, durs]);

  useEffect(() => { nextRef.current = speakFrom; }, [speakFrom]);

  // Otro guion: vuelve al principio…
  const [script, setScript] = useState(sentences);
  if (script !== sentences) {
    setScript(sentences);
    setIndex(0); setElapsed(0); setPlaying(false); setEnded(false);
  }
  // …se calla lo que sonaba y, si el usuario ya ha pedido escucharlo, empieza a sonar
  const firstScript = useRef(true);
  useEffect(() => {
    if (firstScript.current) firstScript.current = false;
    else { token.current++; Speech.stop(); }
    if (!autoplay || !sentences.length) return;
    const t = setTimeout(() => nextRef.current(0, rate), 0);
    return () => clearTimeout(t);
    // Solo al cambiar de guion: `autoplay` y `rate` se leen en ese momento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentences]);

  // El reloj avanza mientras suena la frase, sin pasar de su duración estimada
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed(e => Math.min(e + 0.25, Math.max(0, durs[index] - 0.1))), 250);
    return () => clearInterval(id);
  }, [playing, index, durs]);

  useEffect(() => () => { token.current++; Speech.stop(); }, []);

  const pause = useCallback(() => { token.current++; Speech.stop(); setPlaying(false); }, []);
  const play = useCallback(() => speakFrom(index >= sentences.length - 1 && elapsed >= (durs.at(-1) ?? 0) - 0.2 ? 0 : index, rate), [speakFrom, index, sentences.length, elapsed, durs, rate]);
  /** La frase en la que cae el segundo `t` */
  const indexAt = useCallback((t: number) => {
    const clamped = Math.max(0, Math.min(duration - 0.01, t));
    const i = starts.findIndex((st, k) => clamped >= st && clamped < st + durs[k]);
    return i < 0 ? sentences.length - 1 : i;
  }, [duration, starts, durs, sentences.length]);
  const seek = useCallback((t: number) => {
    const i = indexAt(t);
    if (playing) speakFrom(i, rate);
    else { setIndex(i); setElapsed(0); setEnded(false); }
  }, [indexAt, playing, speakFrom, rate]);
  const playAt = useCallback((t: number) => { if (sentences.length) speakFrom(indexAt(t), rate); }, [indexAt, speakFrom, rate, sentences.length]);
  const position = (starts[index] ?? 0) + elapsed;
  const skip = useCallback((d: number) => seek(position + d), [seek, position]);
  const setRate = useCallback((r: number) => { setRateState(r); if (playing) speakFrom(index, r); }, [playing, speakFrom, index]);

  return { sentences, starts, index, playing, ended, rate, position, duration, play, pause, toggle: playing ? pause : play, seek, playAt, skip, setRate };
}
