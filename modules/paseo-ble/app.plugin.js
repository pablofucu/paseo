// Config plugin de paseo-ble: permisos de Bluetooth en iOS (Info.plist) y Android (manifiesto).
// Se registra en app.json → "plugins": ["./modules/paseo-ble/app.plugin.js"].
const { withAndroidManifest, withInfoPlist, createRunOncePlugin } = require('expo/config-plugins');

const DEFAULT_BLUETOOTH_TEXT = 'Paseo usa Bluetooth para las visitas en grupo sin conexión a internet.';
const BACKGROUND_MODES = ['bluetooth-peripheral', 'bluetooth-central'];

function withPaseoBleIos(config, { bluetoothPermission }) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSBluetoothAlwaysUsageDescription = bluetoothPermission;
    // Se suman a los que ya hay (audio, location)
    const modes = Array.isArray(cfg.modResults.UIBackgroundModes) ? cfg.modResults.UIBackgroundModes : [];
    cfg.modResults.UIBackgroundModes = [...new Set([...modes, ...BACKGROUND_MODES])];
    return cfg;
  });
}

/**
 * Añade (o completa) un `<uses-permission>`.
 * `force`: atributos que se ponen aunque el permiso ya estuviera; `ifNew`: solo si se crea aquí.
 */
function ensurePermission(manifest, name, force = {}, ifNew = {}) {
  const list = (manifest['uses-permission'] = manifest['uses-permission'] ?? []);
  const existing = list.find((p) => p.$?.['android:name'] === name);
  if (existing) {
    Object.assign(existing.$, force);
  } else {
    list.push({ $: { 'android:name': name, ...ifNew, ...force } });
  }
}

function withPaseoBleAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Android 12+ (API 31): permisos «de dispositivos cercanos». No usamos el escaneo para ubicar.
    ensurePermission(manifest, 'android.permission.BLUETOOTH_SCAN', {
      'android:usesPermissionFlags': 'neverForLocation',
    });
    ensurePermission(manifest, 'android.permission.BLUETOOTH_CONNECT');
    ensurePermission(manifest, 'android.permission.BLUETOOTH_ADVERTISE');

    // Android ≤ 11: los antiguos
    ensurePermission(manifest, 'android.permission.BLUETOOTH', { 'android:maxSdkVersion': '30' });
    ensurePermission(manifest, 'android.permission.BLUETOOTH_ADMIN', { 'android:maxSdkVersion': '30' });
    // Ubicación precisa: en ≤ 11 la exige el escaneo BLE. La app ya la usa en todas las versiones
    // (expo-location), así que nunca se le pone maxSdkVersion: limitarla rompería el GPS en Android 12+.
    ensurePermission(manifest, 'android.permission.ACCESS_FINE_LOCATION');

    const features = (manifest['uses-feature'] = manifest['uses-feature'] ?? []);
    const ble = features.find((f) => f.$?.['android:name'] === 'android.hardware.bluetooth_le');
    if (ble) {
      ble.$['android:required'] = 'false';
    } else {
      features.push({ $: { 'android:name': 'android.hardware.bluetooth_le', 'android:required': 'false' } });
    }
    return cfg;
  });
}

/** @param {{ bluetoothPermission?: string } | undefined} props */
const withPaseoBle = (config, props = {}) => {
  const options = { bluetoothPermission: props?.bluetoothPermission ?? DEFAULT_BLUETOOTH_TEXT };
  config = withPaseoBleIos(config, options);
  config = withPaseoBleAndroid(config);
  return config;
};

module.exports = createRunOncePlugin(withPaseoBle, 'paseo-ble', '1.0.0');
