import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/*
 * Sonido y vibración del estampado y del paso de hoja (guía de sellos, § 07).
 * Los sonidos están sintetizados con los parámetros de la guía
 * (scripts/make-sounds.py). Se crean al primer uso y se reutilizan.
 */

const SOURCES = {
  stamp: require('../../assets/sounds/stamp.wav'),
  page: require('../../assets/sounds/page.wav'),
};
const players: Partial<Record<keyof typeof SOURCES, AudioPlayer>> = {};

/**
 * Los sonidos son efectos: respetan el interruptor de silencio y se mezclan con
 * la música del usuario en vez de pararla. Se configura una sola vez.
 */
let modeSet = false;
function configureAudio() {
  if (modeSet) return;
  modeSet = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => { modeSet = false; });
}

function play(name: keyof typeof SOURCES, volume = 1) {
  try {
    configureAudio();
    const p = (players[name] ??= createAudioPlayer(SOURCES[name]));
    p.volume = volume;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Sin audio (web sin interacción, simulador…): el estampado sigue igual
  }
}

/** Golpe del sello: «clac» + «pum» y vibración (40 ms en Android, impacto medio en iOS) */
export function stampHit(heavy = false) {
  play('stamp', heavy ? 1 : 0.9);
  if (Platform.OS === 'android') Vibration.vibrate(heavy ? 55 : 40);
  else Haptics.impactAsync(heavy ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Roce de papel al pasar una hoja (volumen bajo) */
export function pageTurn() {
  play('page', 0.5);
}
