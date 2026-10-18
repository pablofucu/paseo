import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { BleState, PaseoBleEvents } from './PaseoBle.types';

// Lo que expone el módulo nativo (Swift / Kotlin). Las cadenas viajan como UTF‑8.
export declare class PaseoBleNativeModule extends NativeModule<PaseoBleEvents> {
  getState(): Promise<BleState>;
  requestPermissions(): Promise<boolean>;
  startHost(localName: string): Promise<void>;
  stopHost(): Promise<void>;
  notify(chunk: string): Promise<void>;
  notifyTo(deviceId: string, chunk: string): Promise<void>;
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<{ mtu: number }>;
  write(chunk: string): Promise<void>;
  disconnect(): Promise<void>;
}

function load(): PaseoBleNativeModule | null {
  try {
    // null en web, Expo Go y jest (no está enlazado): nunca lanza
    return requireOptionalNativeModule<PaseoBleNativeModule>('PaseoBle');
  } catch {
    return null;
  }
}

const native: PaseoBleNativeModule | null = load();

export default native;
