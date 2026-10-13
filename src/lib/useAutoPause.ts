import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Pausa la narración cuando otra pantalla tapa esta (al perder el foco) y cuando
 * la app pasa a segundo plano o se bloquea el móvil. No la reanuda sola: la voz
 * del sistema no tiene «continuar», y arrancar sin que nadie lo pida sorprende.
 */
export function useAutoPause(pause: () => void) {
  const ref = useRef(pause);
  useEffect(() => { ref.current = pause; });
  useFocusEffect(useCallback(() => () => ref.current(), []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') ref.current(); });
    return () => sub.remove();
  }, []);
}
