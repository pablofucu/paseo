# Paseo

App de tours a pie para iOS y Android. Cada tour tiene su paleta de color, un mapa teñido con ella, guiado paso a paso y un sello por parada que se guarda en el pasaporte.

Tours incluidos:

- **Sevilla · Del río a la judería** (5 paradas, azulejo y albero): Torre del Oro, Archivo de Indias, Catedral y Giralda, Real Alcázar y Barrio de Santa Cruz. Fotos libres de Wikimedia Commons con su autoría en la app.
- **Tomares en 4 paradas** (almagra y albero): letras de la Arboleda, Ayuntamiento, Parroquia de Belén y Royal King Kebab.

Sellos, pasaporte y postales siguen la **Guía de sellos, pasaporte y postales** (v2):

- **Tintas de la ruta.** Cada parada sella con su propia tinta, de una familia de colores de la ruta (`inks` en los datos del tour: Tomares en ladrillo, ocre, vino y verde; Sevilla en oro, azul, terracota, verde y añil). `tintaDeRuta()` oscurece cualquier tinta que no llegue a 4,5:1 sobre el papel de su hoja. El acento de la ruta enmarca su postal.
- **Sellos de goma** dibujados en línea, uno por parada, en cuatro formas (rectángulo, círculo, óvalo y octógono), con el sitio, la ciudad y la fecha real. Cada parada se sella una sola vez; las repeticiones quedan en el historial.
- **Tú eliges dónde va el sello.** Al llegar se abre la hoja de la ruta con el sello «en la mano» (vista previa al 35 % que sigue al dedo). Al soltar, cae con la animación de la guía (550 ms, impacto a los 300 ms con «clac + pum», vibración y golpe de hoja). Márgenes de 16 px, sin pisar cabecera ni pie y como mucho un 35 % encima de otro sello; «Colócalo tú» busca un hueco libre.
- **Ruta completada.** Con el último sello la ruta queda completada y, al terminar, sube la tarjeta de **postal desbloqueada**. No hay sello de ruta completada.
- **Hoja de la ruta.** Papel con un velo suave del color de la ruta y, arriba, solo su nombre y su ciudad, discretos.
- **Pasaporte** (pestaña): portada de piel azul con dorado, hoja del titular, una hoja por ruta en el orden del primer sello y «Próxima ruta». Las hojas giran sobre el lomo arrastrando con el dedo (doble página en pantallas anchas).
- **Postales** (pestaña): tarjetero por ciudad, con las rutas a medias como postal en blanco; a pantalla completa se les da la vuelta y se comparten. Vista secundaria en mapa.

## Tecnología

- **Expo SDK 57** (React Native 0.86) con TypeScript y Expo Router
- **MapLibre** (`@maplibre/maplibre-react-native` 11) con teselas OpenMapTiles
- `expo-location` para el GPS y la brújula, `expo-haptics`, `expo-speech` (narración provisional)
- `react-native-svg` para los sellos, las postales y las fotos en duotono; `react-native-reanimated` y `react-native-gesture-handler` para estampar y pasar hojas
- `expo-audio` + `expo-haptics` para el golpe del sello; `react-native-view-shot` + `expo-sharing` para compartir postales
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

En **Inicio**, con el modo prueba activo, hay un enlace para borrar el pasaporte (sellos y postales).

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test           # lógica de navegación: distancias, giros, llegada, fuera de ruta
```

## Estructura

```
src/
  app/                       pantallas (Expo Router)
    (tabs)/index.tsx         Inicio: los tours
    (tabs)/pasaporte.tsx     el pasaporte (libreta con hojas que se pasan)
    (tabs)/postales.tsx      tarjetero de postales y mapa
    postal/[id].tsx          postal a pantalla completa (vuelta y compartir)
    tour/[id]/index.tsx      portada del tour: sellos y postal que puedes conseguir
    tour/[id]/walk.tsx       mapa, indicaciones y llegada a la parada
    tour/[id]/stop/[n].tsx   parada: colocar el sello, audio y textos
    tour/[id]/done.tsx       final: resumen, hoja de la ruta y postal desbloqueada
  components/passport/       hoja de ruta, colocar sello, caída del sello, libreta
  components/                sello de goma, papel, postal, botones
  data/stamps/images.ts      dibujos horneados de los sellos (generado, ver abajo)
  lib/rubber.ts              marcos y fecha de los sellos, matasellos
  lib/placement.ts           reglas para colocar sellos
  lib/ink.ts                 tintaDeRuta y contraste
  store/passport.ts          UserPassport y UserRoute (con migración del formato anterior)
design/stamps/*.svg          sellos de goma de cada parada (fuente)
design/postcards/*.svg       ilustración de cada postal (fuente)
```

## Sellos, postales y sonidos

- **Sellos de goma:** cada parada tiene `design/stamps/<parada>.svg`. `NODE_PATH=$(npm root -g) node scripts/build-stamps.mjs` junta la escena (desde el primer `<clipPath>`) con el marco de `src/lib/rubber.ts` y la hornea con la textura de goma de la guía en `assets/stamps/<parada>.png` (negro sobre transparente). La app la tiñe con la tinta de la parada y pinta encima la fecha real. Así cada sello son dos vistas en lugar de miles de nodos SVG, y el pasaporte abre al instante.
- **Postales:** la ilustración (832 × 444) está en `design/postcards/<tour>.svg`. `node scripts/render-postcards.cjs` (necesita Playwright) le aplica la textura de imprenta de la guía y la guarda en `assets/postcards/`. El marco, los textos y el matasellos los pinta la app.
- **Sonidos:** `python3 scripts/make-sounds.py` sintetiza `assets/sounds/stamp.wav` y `page.wav` con los parámetros de la guía.

## Añadir un tour

Un tour es un objeto `Tour` en `src/data/tours/`: paleta, **acento** (la tinta), paradas (foto, textos y su sello de goma: forma y textos), la postal (ilustración, valor y subtítulo) y la ruta a pie entre paradas (`legs`). Formas recomendadas:

| Forma | Para |
|---|---|
| Rectángulo | fachadas anchas, comercios, sitios con rótulo |
| Círculo | plazas y monumentos con torre o estatua |
| Óvalo | paisajes, miradores, letreros de bienvenida |
| Octógono | ayuntamientos, museos, edificios institucionales |

## Pendiente antes de probar en la calle

- [ ] **Comprobar dos ubicaciones aproximadas**: el portal del kebab (C/ Navarro Caro 83) y el talud de las letras TOMARES (Avda. de la Arboleda). Las del Ayuntamiento y la iglesia salen de fuentes publicadas (ver `src/data/tours/tomares.ts`).
- [x] **Ruta a pie fija por calles** en `src/data/tours/tomares.geo.json` (letras → Ayuntamiento 844 m, → iglesia 260 m, → kebab 212 m), con los giros y nombres de calle. Se genera con OSRM (perfil peatón, OpenStreetMap) desde el workflow **Contenido** de GitHub Actions: cambia las coordenadas en ese archivo y lánzalo con *Run workflow*.
- [ ] **Teselas propias.** En desarrollo se usa OpenFreeMap (gratis, sin clave). Para producción: Protomaps autoalojado o MapTiler, configurado con `EXPO_PUBLIC_MAP_TILES`.
- [ ] **Tipografía Nunito en el mapa.** Hay que publicar sus glifos (`EXPO_PUBLIC_MAP_GLYPHS`); ahora las calles usan Noto Sans.
- [ ] **Audios grabados.** Ahora se narra con la voz del sistema frase a frase (`useNarrationPlayer`), con ondas, ±15 s, velocidad y transcripción; cambiar a `expo-audio` cuando existan.
- [ ] **Descarga sin conexión** del mapa del tour (`OfflineManager` de MapLibre) y de sus fotos y audios.
- [ ] Compras: tour suelto y pase de ciudad (RevenueCat).
- [ ] Revisar los textos de las paradas con alguien de Tomares.
- [ ] **Fotos de dos paradas de Sevilla.** `alcazar.jpg` muestra el Palacio de Don Pedro (no la Puerta del León) y `elvira.jpg` un callejón (no la Plaza de Doña Elvira).
- [ ] **Sonido del sello grabado.** Ahora es sintético (guía § 07); se puede grabar un tampón real.
