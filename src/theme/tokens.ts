// Tokens de Paseo. Fuera de los tours la app usa la paleta de marca;
// dentro de un tour, todo lee la paleta de ese tour (TourPalette).

// Paleta «rueda con sol»: el color de marca es el turquesa de Sevilla y el sol,
// el amarillo que comparten todas las rutas como acento.
export const brand = {
  primary: '#086F81',
  primaryDark: '#022F37',
  sun: '#FEC84B',
  sky: '#2A80E2',
  navy: '#18274B',
  rose: '#D7506E',
} as const;

export const neutral = {
  ink: '#111A2D',
  ink2: '#384258',
  ink3: '#60697B',
  line: '#D8E3E9',
  surface: '#FFFFFF',
  /** Blanco para texto y trazos sobre fotos o fondos oscuros */
  white: '#FFFFFF',
  /** Fondo de la postal (pantalla oscura) */
  night: '#0D1528',
  bg: '#F0F9FB',
  bg2: '#E2F1F8',
  paper: '#F6FBFD',
} as const;

export const functional = {
  me: '#2A80E2',
  premium: '#18274B',
  gold: '#FEC84B',
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
  t: brand.primary,
  t2: brand.sun,
  soft: '#D9F4FB',
  deep: brand.primaryDark,
  on: '#FFFFFF',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const shadow = {
  1: { shadowColor: '#111A2D', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  2: { shadowColor: '#111A2D', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  3: { shadowColor: '#111A2D', shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
} as const;
