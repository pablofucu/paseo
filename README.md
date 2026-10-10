# Paseo

App de tours a pie para iOS y Android. Cada tour tiene su paleta de color, un mapa teñido con ella, guiado paso a paso y un sello por parada que se guarda en el pasaporte.

Primera versión: el tour **Tomares en 4 paradas** de principio a fin.

## Tecnología

- **Expo SDK 57** (React Native 0.86) con TypeScript y Expo Router
- **MapLibre** (`@maplibre/maplibre-react-native` 11) con teselas OpenMapTiles
- `expo-location` para el GPS y la brújula, `expo-haptics`, `expo-speech` (narración provisional)
- `react-native-svg` para los sellos y `react-native-reanimated` para las animaciones
- `zustand` + AsyncStorage para el pasaporte (funciona sin conexión)

## Arrancar

MapLibre lleva código nativo, así que **no funciona en Expo Go**: hace falta una build de desarrollo.

```bash
npm install
npx expo run:ios        # necesita Xcode (macOS)
npx expo run:android    # necesita Android Studio
# o, sin instalar nada en local, en la nube:
npx eas-cli@latest build --profile development --platform all
```

Después, `npx expo start` y abre la build de desarrollo en el móvil.

En modo desarrollo el paseo arranca **simulado** (un punto que recorre la ruta 8× más rápido que andando). El botón «Paseo simulado / GPS real» del mapa cambia entre los dos.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test           # lógica de navegación: distancias, giros, llegada, fuera de ruta
```

## Estructura

```
src/
  app/                    pantallas (Expo Router)
    index.tsx             inicio: Tomares y sus tours
    tour/[id]/index.tsx   portada del tour, con los sellos que puedes conseguir
    tour/[id]/walk.tsx    mapa, indicaciones y llegada a la parada
    tour/[id]/stop/[n]    parada: momento de llegada, audio, textos
    tour/[id]/done.tsx    final: página de la visita y sello del tour
    passport.tsx          Mis tours / pasaporte
    visit/[id].tsx        página de sellos de una visita
  components/             Stamp, VisitPage, botones
  data/                   tipos y tours (tours/tomares.ts)
  lib/                    geo, guiado, estilo del mapa, sellos, GPS, narración
  store/passport.ts       visitas y sellos guardados
  theme/                  colores, tipografía y paleta del tour
```

## Añadir un tour

Un tour es un objeto `Tour` en `src/data/tours/`: paleta de 5 colores, paradas (foto, textos, tipo de lugar y pictograma del sello) y la ruta a pie entre paradas (`legs`). La forma del sello sale del tipo de lugar:

| Tipo | Forma |
|---|---|
| Monumento | círculo |
| Edificio civil | billete |
| Religioso | arco |
| Tradición | sello postal |
| Espacio público | óvalo |
| Gastronomía | chapa |

## Pendiente antes de probar en la calle

- [ ] **Coordenadas reales** de las 4 paradas de Tomares y **ruta a pie real** (`legs`). Ahora son aproximadas. La ruta se puede generar con OSRM o GraphHopper en modo peatón.
- [ ] **Teselas propias.** En desarrollo se usa OpenFreeMap (gratis, sin clave). Para producción: Protomaps autoalojado o MapTiler, configurado con `EXPO_PUBLIC_MAP_TILES`.
- [ ] **Tipografía Nunito en el mapa.** Hay que publicar sus glifos (`EXPO_PUBLIC_MAP_GLYPHS`); ahora las calles usan Noto Sans.
- [ ] **Audios grabados.** Ahora se narra con la voz del sistema (`useNarration`); cambiar a `expo-audio` cuando existan.
- [ ] **Descarga sin conexión** del mapa del tour (`OfflineManager` de MapLibre) y de sus fotos y audios.
- [ ] Compras: tour suelto y pase de ciudad (RevenueCat).
- [ ] Revisar los textos de las paradas con alguien de Tomares.
