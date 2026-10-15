import type { LngLat } from '@/data/types';

/*
 * Encuadre de «tú + la próxima parada» cuando queda lejos. Es un fitBounds hecho
 * a mano para tener en cuenta el giro del mapa («ruta arriba»): se mide la caja
 * que forman los dos puntos ya girada, no la caja norte-sur.
 */

/** A más de esto de la parada se encuadran los dos; al bajar de FIT_BACK_M se vuelve a seguirte de cerca (histéresis) */
export const FIT_FAR_M = 150;
export const FIT_BACK_M = 120;
/** Zoom del seguimiento de cerca, y límites del encuadre (lejos no se aleja más de esto) */
export const FOLLOW_ZOOM = 17;
export const FIT_MIN_ZOOM = 13.5;
/** Aire (px) entre los puntos y el borde de la zona libre */
export const FIT_MARGIN_PX = 48;

const M_PER_DEG = 111320;
/** Metros por píxel del mapa a zoom 0 en el ecuador (teselas de 512 px) */
const MPP_Z0 = 78271.517;

export interface FitArea {
  width: number;
  height: number;
  /** Lo que tapan la tarjeta de arriba y la hoja de abajo */
  top: number;
  bottom: number;
}

/** Centro y zoom que dejan a la vista los dos puntos dentro de la zona libre de la pantalla, con el mapa girado `bearingDeg` */
export function fitTwo(a: LngLat, b: LngLat, bearingDeg: number, area: FitArea): { center: LngLat; zoom: number } {
  const center: LngLat = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const cos = Math.cos((center[1] * Math.PI) / 180);
  const th = (bearingDeg * Math.PI) / 180;
  // Del centro a cada punto, en metros (x al este, y al norte), girados para que «arriba» sea el rumbo del mapa
  const toScreen = (p: LngLat) => {
    const x = (p[0] - center[0]) * M_PER_DEG * cos;
    const y = (p[1] - center[1]) * M_PER_DEG;
    return { x: x * Math.cos(th) - y * Math.sin(th), y: x * Math.sin(th) + y * Math.cos(th) };
  };
  const pa = toScreen(a);
  const w = 2 * Math.max(Math.abs(pa.x), 1);
  const h = 2 * Math.max(Math.abs(pa.y), 1);
  const freeW = Math.max(60, area.width - 2 * FIT_MARGIN_PX);
  const freeH = Math.max(60, area.height - area.top - area.bottom - 2 * FIT_MARGIN_PX);
  const mpp = Math.max(w / freeW, h / freeH);
  // Se redondea hacia abajo (a cuartos de zoom) para que nunca se quede nada fuera
  const raw = Math.log2((MPP_Z0 * cos) / mpp);
  const zoom = Math.min(FOLLOW_ZOOM, Math.max(FIT_MIN_ZOOM, Math.floor(raw * 4) / 4));
  return { center, zoom };
}
