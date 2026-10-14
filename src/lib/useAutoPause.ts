import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Pausa la narración cuando otra pantalla tapa esta (al perder el foco). Con la
 * app en segundo plano o el móvil bloqueado NO se pausa: la voz sigue, como una
 * audioguía. No se reanuda sola: la voz del sistema no tiene «continuar», y
 * arrancar sin que nadie lo pida sorprende.
 */
export function useAutoPause(pause: () => void) {
  const ref = useRef(pause);
  useEffect(() => { ref.current = pause; });
  useFocusEffect(useCallback(() => () => ref.current(), []));
}
