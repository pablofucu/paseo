import { createContext, useContext, type ReactNode } from 'react';
import { brandPalette, type TourPalette } from './tokens';

const TourThemeContext = createContext<TourPalette>(brandPalette);

/** Dentro de un tour, la app «se viste» con la paleta del tour. */
export function TourThemeProvider({ palette, children }: { palette: TourPalette; children: ReactNode }) {
  return <TourThemeContext.Provider value={palette}>{children}</TourThemeContext.Provider>;
}

export const usePalette = () => useContext(TourThemeContext);
