import type { AudioState } from './protocol';

/**
 * Sincronía de reloj con el anfitrión. Cada `pong` da una muestra:
 * `offset = t1 - (t0 + rtt/2)`; se queda la de menor RTT (la más fiable).
 */
export class ClockSync {
  offset = 0;
  rtt = Infinity;
  samples = 0;

  constructor(private now: () => number = Date.now) {}

  /** Muestra de un pong: `t0` es la hora local al mandar el ping, `t1` la del anfitrión al contestar */
  addSample(t0: number, t1: number, t2: number = this.now()) {
    const rtt = t2 - t0;
    if (rtt < 0) return;
    this.samples++;
    if (rtt <= this.rtt) {
      this.rtt = rtt;
      this.offset = t1 - (t0 + rtt / 2);
    }
  }

  /** La hora del anfitrión ahora mismo (ms) */
  hostNow() {
    return this.now() + this.offset;
  }
}

/** Dónde debería ir el audio del grupo (segundos) a la hora del anfitrión `hostNow` */
export function expectedPosition(audio: AudioState, hostNow: number): number {
  return audio.playing ? Math.max(0, audio.position + ((hostNow - audio.at) / 1000) * audio.rate) : audio.position;
}

/** Desvío tolerado: la voz del sistema no dura igual en todos los móviles */
export const DRIFT_S = 2;
