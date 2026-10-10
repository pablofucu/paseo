# Paseo

App de tours a pie para iOS y Android. Cada tour tiene su paleta de color, un mapa teñido con ella, guiado paso a paso y un sello por parada que se guarda en el pasaporte.

Tours incluidos:

- **Sevilla · Del río a la judería** (5 paradas, azulejo y albero): Torre del Oro, Archivo de Indias, Catedral y Giralda, Real Alcázar y Barrio de Santa Cruz. Fotos libres de Wikimedia Commons con su autoría en la app.
- **Tomares en 4 paradas** (almagra y albero): letras de la Arboleda, Ayuntamiento, Parroquia de Belén y Royal King Kebab.

Cada parada tiene su sello, con una forma según el tipo de lugar y una tinta distinta. Al completar un tour se estampa el **visado de ruta**. El pasaporte se hojea como una libreta: portada, datos del viajero y una página por visita.

## Tecnología

- **Expo SDK 57** (React Native 0.86) con TypeScript y Expo Router
- **MapLibre** (`@maplibre/maplibre-react-native` 11) con teselas OpenMapTiles
- `expo-location` para el GPS y la brújula, `expo-haptics`, `expo-speech` (narración provisional)
- `react-native-svg` para los sellos, el visado y las fotos en duotono; `react-native-reanimated` para el tampón
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

### APK para Android

- **GitHub Actions** (`.github/workflows/android-apk.yml`): en cada push a `main` comprueba el código, compila un APK y lo deja en la pestaña *Actions* → la ejecución → *Artifacts* → `paseo-apk`. Se puede lanzar a mano con *Run workflow*. Está firmado con la clave de depuración: sirve para instalarlo en un móvil, no para Google Play.
- **EAS**: `npx eas-cli@latest build --platform android --profile preview` genera también un APK instalable.

### Probar sin salir de casa: modo prueba

Actívalo con el interruptor **Modo prueba** al final de la pantalla de inicio (se guarda en el móvil). En el mapa aparece un panel para:

- **Andar / Parar** el paseo simulado sobre la ruta, a **1×, 4× o 16×** la velocidad de paseo
- **⚑ Llegar**: te pone en la parada y salta la llegada (sello, vibración y audio)
- **Tocar el mapa** para moverte a ese punto, también fuera de la ruta (para ver el aviso de «te has salido»); «Andar» sigue desde el punto de la ruta más cercano
- Cambiar entre **GPS real** y **simulado**

En **Mi pasaporte**, con el modo prueba activo, hay un botón para borrar todos los sellos.

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

- [ ] **Comprobar dos ubicaciones aproximadas**: el portal del kebab (C/ Navarro Caro 83) y el talud de las letras TOMARES (Avda. de la Arboleda). Las del Ayuntamiento y la iglesia salen de fuentes publicadas (ver `src/data/tours/tomares.ts`).
- [x] **Ruta a pie fija por calles** en `src/data/tours/tomares.geo.json` (letras → Ayuntamiento 844 m, → iglesia 260 m, → kebab 212 m), con los giros y nombres de calle. Se genera con OSRM (perfil peatón, OpenStreetMap) desde el workflow **Contenido** de GitHub Actions: cambia las coordenadas en ese archivo y lánzalo con *Run workflow*.
- [ ] **Teselas propias.** En desarrollo se usa OpenFreeMap (gratis, sin clave). Para producción: Protomaps autoalojado o MapTiler, configurado con `EXPO_PUBLIC_MAP_TILES`.
- [ ] **Tipografía Nunito en el mapa.** Hay que publicar sus glifos (`EXPO_PUBLIC_MAP_GLYPHS`); ahora las calles usan Noto Sans.
- [ ] **Audios grabados.** Ahora se narra con la voz del sistema frase a frase (`useNarrationPlayer`), con ondas, ±15 s, velocidad y transcripción; cambiar a `expo-audio` cuando existan.
- [ ] **Descarga sin conexión** del mapa del tour (`OfflineManager` de MapLibre) y de sus fotos y audios.
- [ ] Compras: tour suelto y pase de ciudad (RevenueCat).
- [ ] Revisar los textos de las paradas con alguien de Tomares.
