import { useEffect, useRef } from 'react';

/**
 * Guarda un borrador mientras se escribe: `ms` después del último cambio, y al
 * salir de la pantalla si quedaba algo sin guardar. `draft` es null cuando no
 * se está editando (el campo ya guardó en onBlur).
 */
export function useDebouncedSave(draft: string | null, save: (v: string) => void, ms = 500) {
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  const pending = useRef<string | null>(null);
  useEffect(() => {
    pending.current = draft;
    if (draft == null) return;
    const t = setTimeout(() => { pending.current = null; saveRef.current(draft); }, ms);
    return () => clearTimeout(t);
  }, [draft, ms]);
  useEffect(() => () => { if (pending.current != null) saveRef.current(pending.current); }, []);
}
