// Tipos de la API JS del módulo (ver docs/visita-en-grupo.md, «Módulo nativo»).

export type BleState = 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn' | 'unknown';

export type StateChangeEvent = { state: BleState };
export type CentralEvent = { deviceId: string };
export type InboxEvent = { deviceId: string; chunk: string };
export type DeviceFoundEvent = { deviceId: string; name: string | null; rssi: number };
export type NotifyEvent = { chunk: string };
export type DisconnectedEvent = { reason?: string };

export type PaseoBleEvents = {
  onStateChange: (e: StateChangeEvent) => void;
  onCentralConnected: (e: CentralEvent) => void;
  onCentralDisconnected: (e: CentralEvent) => void;
  onInbox: (e: InboxEvent) => void;
  onDeviceFound: (e: DeviceFoundEvent) => void;
  onNotify: (e: NotifyEvent) => void;
  onDisconnected: (e: DisconnectedEvent) => void;
};

export type PaseoBleEventName = keyof PaseoBleEvents;

/** Igual que `EventSubscription` de expo-modules-core (que `expo` no reexporta). */
export interface EventSubscription {
  remove(): void;
}
