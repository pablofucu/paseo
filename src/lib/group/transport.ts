import type { GroupMsg } from './protocol';

/** Por dónde va el grupo: internet (Supabase), Bluetooth o en memoria (pruebas y «Simular invitado») */
export type TransportKind = 'net' | 'ble' | 'memory';

/** Lado del anfitrión: habla con todos los invitados conectados por ese transporte */
export interface HostTransport {
  kind: TransportKind;
  /** Abre el grupo; rechaza si el transporte no se puede usar (sin internet, sin permiso…) */
  start(code: string): Promise<void>;
  broadcast(msg: GroupMsg): void;
  sendTo(memberOrDeviceId: string, msg: GroupMsg): void;
  /** `from`: id de dispositivo (BLE) o de presencia (internet) del que manda */
  onMessage(cb: (msg: GroupMsg, from: string) => void): () => void;
  onPeerLeft(cb: (from: string) => void): () => void;
  stop(): Promise<void>;
}

/** Lado del invitado: un único anfitrión */
export interface GuestTransport {
  kind: TransportKind;
  /** Rechaza si no encuentra al anfitrión en `timeoutMs` */
  connect(code: string, timeoutMs: number): Promise<void>;
  send(msg: GroupMsg): void;
  onMessage(cb: (msg: GroupMsg) => void): () => void;
  /** La conexión se ha caído (el invitado vuelve a probar) */
  onLost(cb: () => void): () => void;
  disconnect(): Promise<void>;
}

/** Lista de oyentes con alta y baja (lo que devuelven los `on…` de los transportes) */
export class Listeners<A extends unknown[]> {
  private set = new Set<(...args: A) => void>();
  add(cb: (...args: A) => void) {
    this.set.add(cb);
    return () => { this.set.delete(cb); };
  }
  emit(...args: A) {
    for (const cb of [...this.set]) {
      try { cb(...args); } catch (e) { console.warn('[grupo]', e); }
    }
  }
  clear() {
    this.set.clear();
  }
}

/** Rechaza si la promesa no se cumple en `ms` (y llama a `onTimeout` para limpiar) */
export function withTimeout<T>(p: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => { onTimeout?.(); reject(new Error('timeout')); }, ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
