// Tokens de Paseo. Fuera de los tours la app usa la paleta de marca;
// dentro de un tour, todo lee la paleta de ese tour (TourPalette).

export const brand = {
  coral: '#F25C3B',
  coralDark: '#C9401F',
  sun: '#FFC53D',
  sky: '#3D8BFD',
  navy: '#1D2B4F',
  rose: '#F7A7B8',
} as const;

export const neutral = {
  ink: '#1C1A17',
  ink2: '#5A544C',
  ink3: '#7A7369',
  line: '#E8E2D8',
  surface: '#FFFFFF',
  /** Blanco para texto y trazos sobre fotos o fondos oscuros */
  white: '#FFFFFF',
  /** Fondo de la postal (pantalla oscura) */
  night: '#1D1A15',
  bg: '#FAF6F0',
  bg2: '#F2EDE4',
  paper: '#FBF6EC',
} as const;

export const functional = {
  me: '#2D7FF9',
  premium: '#1D2B4F',
  gold: '#F5B731',
  warn: '#E39B0B',
  warnSoft: '#FFF3D6',
  /** Texto sobre warnSoft */
  warnInk: '#6B4700',
} as const;

export interface TourPalette {
  /** Principal: botones, ruta, paradas visitadas, tinta de los sellos */
  t: string;
  /** Complementario: parada actual, flecha de giro, «¿Sabías que?» */
  t2: string;
  /** Fondos suaves: chips, «Fíjate en», mini reproductor */
  soft: string;
  /** Oscuro: tarjeta de indicación, reproductor, pantalla de llegada */
  deep: string;
  /** Texto encima de `t` */
  on: string;
  /** Mapa oscuro (tours nocturnos) */
  darkMap?: boolean;
}

export const brandPalette: TourPalette = {
  t: brand.coral,
  t2: brand.sun,
  soft: '#FDE8E1',
  deep: '#5C1E0E',
  on: '#FFFFFF',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const shadow = {
  1: { shadowColor: '#1C1A17', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  2: { shadowColor: '#1C1A17', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  3: { shadowColor: '#1C1A17', shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
} as const;
