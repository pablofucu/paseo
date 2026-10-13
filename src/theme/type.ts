import { useMemo } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { useSettings } from '@/store/settings';
import { font } from './fonts';
import { neutral } from './tokens';

/*
 * Los títulos grandes van en Fraunces 700 (serifBold): el 800 pesa demasiado a
 * 40 px o más y se reserva para los nombres de ciudad (font.serif).
 */
const base = {
  hero: { fontFamily: font.serifBold, fontSize: 44, lineHeight: 46, letterSpacing: -1, color: neutral.ink },
  title: { fontFamily: font.serifBold, fontSize: 28, lineHeight: 31, letterSpacing: -0.3, color: neutral.ink },
  headline: { fontFamily: font.black, fontSize: 19, lineHeight: 24, color: neutral.ink },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 25, color: neutral.ink2 },
  caption: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: neutral.ink3 },
  overline: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: neutral.ink3 },
  display: { fontFamily: font.black, fontSize: 34, lineHeight: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const type = StyleSheet.create(base);

/** Cuánto crece el texto con «Texto grande» */
export const LARGE_TEXT_SCALE = 1.2;

/** Copia de los estilos con tamaño e interlineado multiplicados */
export function scaleType(k: number): typeof type {
  if (k === 1) return type;
  const out: Record<string, TextStyle> = {};
  for (const [name, st] of Object.entries(base) as [string, TextStyle][]) {
    out[name] = { ...st, fontSize: Math.round((st.fontSize ?? 14) * k * 2) / 2, lineHeight: st.lineHeight ? Math.round(st.lineHeight * k) : undefined };
  }
  return StyleSheet.create(out) as typeof type;
}

const large = scaleType(LARGE_TEXT_SCALE);

/** Estilos de texto según «Texto grande» de Ajustes; úsalo en lugar de `type` en las pantallas que deban escalar */
export function useType(): typeof type {
  const on = useSettings(s => s.largeText);
  return useMemo(() => (on ? large : type), [on]);
}

/** Multiplicador de «Texto grande» para tamaños propios de una pantalla */
export function useFontScale() {
  return useSettings(s => (s.largeText ? LARGE_TEXT_SCALE : 1));
}
