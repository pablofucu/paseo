import type { RubberShape } from '@/data/types';
import type { Box, Sheet } from '@/lib/placement';
import { RUBBER_BOX, SEAL_BOX } from '@/lib/rubber';

/** Proporción de las hojas del pasaporte (ancho / alto), la de una libreta de pasaporte */
export const SHEET_RATIO = 0.7;
/** Escala de los sellos de goma: el círculo (300 u.) ocupa el 37 % del ancho de la hoja */
const STAMP_K = 0.37 / 300;
/** El sello de ruta completada ocupa el 55 % del ancho */
const SEAL_K = 0.55 / SEAL_BOX.w;

/** Medida de la tinta de cada forma, sin el margen de su caja (para los choques) */
const INKED: Record<RubberShape, [number, number]> = {
  circle: [280, 280],
  oval: [300, 204],
  rect: [296, 216],
  octagon: [282, 282],
};

export function sheetFor(width: number): Sheet {
  return { w: width, h: width / SHEET_RATIO, top: Math.round(width * 0.17), bottom: Math.round(width * 0.12), margin: 16 };
}

/** Tamaño en pantalla de la caja del sello (para pintarlo) */
export function stampBox(shape: RubberShape, sheetW: number) {
  const b = RUBBER_BOX[shape];
  return { w: b.w * STAMP_K * sheetW, h: b.h * STAMP_K * sheetW };
}

/** Tamaño de lo entintado (para colocar y evitar choques) */
export function stampInk(shape: RubberShape, sheetW: number) {
  const [w, h] = INKED[shape];
  return { w: w * STAMP_K * sheetW, h: h * STAMP_K * sheetW };
}

export function sealBox(sheetW: number) {
  return { w: SEAL_BOX.w * SEAL_K * sheetW, h: SEAL_BOX.h * SEAL_K * sheetW };
}

/** Sellos ya puestos como cajas en píxeles de una hoja de ancho `sheetW` */
export function placedBoxes(items: { shape: RubberShape; x: number; y: number }[], sheet: Sheet): Box[] {
  return items.map(it => ({ x: it.x * sheet.w, y: it.y * sheet.h, ...stampInk(it.shape, sheet.w) }));
}
