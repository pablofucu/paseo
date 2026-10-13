// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    // Un efecto con dependencias que faltan deja datos viejos: que rompa la CI
    rules: { "react-hooks/exhaustive-deps": "error" },
  },
]);
