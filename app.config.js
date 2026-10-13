// Amplía app.json: en la CI, el versionCode de Android sube con cada build
// (VERSION_CODE = número de ejecución del workflow); en local queda en 1.
module.exports = ({ config }) => {
  const code = Number.parseInt(process.env.VERSION_CODE ?? '', 10);
  return {
    ...config,
    android: { ...config.android, versionCode: Number.isFinite(code) && code > 0 ? code : 1 },
  };
};
