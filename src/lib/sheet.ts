import type { RubberShape } from '@/data/types';
import type { Box, Sheet } from '@/lib/placement';
import { RUBBER_BOX } from '@/lib/rubber';

/** Proporción de las hojas del pasaporte (ancho / alto), la de una libreta de pasaporte */
export const SHEET_RATIO = 0.7;
/** Escala de los sellos de goma: el círculo (300 u.) ocupa el 32,5 % del ancho de la hoja */
export const STAMP_K = 0.325 / 300;

/** Medida de la tinta de cada forma, sin el margen de su caja (para los choques) */
const INKED: Record<RubberShape, [number, number]> = {
  circle: [280, 280],
  oval: [300, 204],
  rect: [296, 216],
  octagon: [282, 282],
};

/**
 * Escala de los sellos según las paradas de la ruta. Como nunca se pisan, una
 * hoja con muchas paradas los hace algo más pequeños para que quepan todos
 * aunque se suelten mal (calibrado en sheet.test: caben 7 al 80 %, 8 al 75 %).
 * Hasta 4 paradas, tamaño completo.
 */
export const stampScale = (stops: number) => Math.min(1, Math.max(0.5, 1 - 0.07 * (stops - 4)));

export function sheetFor(width: number): Sheet {
  return { w: width, h: width / SHEET_RATIO, top: Math.round(width * 0.15), bottom: Math.round(width * 0.07), margin: 16, gap: Math.round(width * 0.012) };
}

/** Tamaño en pantalla de la caja del sello (para pintarlo); `stops` son las paradas de la ruta */
export function stampBox(shape: RubberShape, sheetW: number, stops = 0) {
  const b = RUBBER_BOX[shape], k = STAMP_K * sheetW * stampScale(stops);
  return { w: b.w * k, h: b.h * k };
}

/** Tamaño de lo entintado (para colocar y evitar choques) */
export function stampInk(shape: RubberShape, sheetW: number, stops = 0) {
  const [w, h] = INKED[shape], k = STAMP_K * sheetW * stampScale(stops);
  return { w: w * k, h: h * k };
}

/** Sellos ya puestos como cajas en píxeles de una hoja de ancho `sheetW` */
export function placedBoxes(items: { shape: RubberShape; x: number; y: number }[], sheet: Sheet, stops = 0): Box[] {
  return items.map(it => ({ x: it.x * sheet.w, y: it.y * sheet.h, ...stampInk(it.shape, sheet.w, stops) }));
}
