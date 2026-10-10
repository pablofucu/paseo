import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

/**
 * Narración provisional con la voz del sistema (expo-speech) mientras no
 * haya audios grabados. Cuando existan, se cambia por expo-audio aquí.
 */
export function useNarration() {
  const [speaking, setSpeaking] = useState(false);
  const stop = useCallback(() => { Speech.stop(); setSpeaking(false); }, []);
  const speak = useCallback((text: string, rate = 1) => {
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, { language: 'es-ES', rate, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  }, []);
  useEffect(() => () => { Speech.stop(); }, []);
  return { speaking, speak, stop };
}
