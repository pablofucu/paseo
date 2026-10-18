import type { PaseoBleNativeModule } from './PaseoBleModule';

// En web no hay Bluetooth LE: isAvailable() es false y todo rechaza.
const native: PaseoBleNativeModule | null = null;

export default native;
