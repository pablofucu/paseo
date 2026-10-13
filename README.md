# Paseo

App de tours a pie para iOS y Android. Cada tour tiene su paleta de color, un mapa teñido con ella, guiado paso a paso y un sello por parada que se guarda en el pasaporte.

Tours incluidos:

- **Sevilla · Del río a la judería** (5 paradas, azulejo y albero): Torre del Oro, Archivo de Indias, Catedral y Giralda, Real Alcázar y Barrio de Santa Cruz. Fotos libres de Wikimedia Commons con su autoría en la app.
- **Sevilla · Del Arenal a la Plaza de España** (6 paradas, ladrillo y azulejo): Real Maestranza, Hospital de la Caridad, Palacio de San Telmo, Real Fábrica de Tabacos, Plaza de España y Parque de María Luisa.
- **Tomares en 4 paradas** (almagra y albero): letras de la Arboleda, Ayuntamiento, Parroquia de Belén y Royal King Kebab.

## Filosofía: lo que se gana en cada ruta

Cada ruta deja tres recuerdos distintos, y cada uno tiene un papel propio:

1. **Sello de goma, uno por parada.** Dibujo en línea del sitio concreto, estampado con la tinta de la parada y la fecha real. Es el registro de «estuve aquí».
2. **Postal de la ruta.** Una ilustración en color con **una escena propia**: una vista o un momento del paseo, como una postal de verdad. No es un catálogo de todas las paradas ni tiene por qué juntarlas en una fila; basta con que cuente cómo se siente la ruta (en la del Arenal, la Plaza de España vista desde el canal, con una barca y un puente de azulejo).
3. **Sello de correos de la ruta.** Un dibujo **exclusivo** que **simboliza la ruta entera** con un emblema: el Giraldillo y el NO8DO en el centro de Sevilla, una rama de olivo del Aljarafe en Tomares, una carabela sobre un azulejo de 1929 en el Arenal. **Nunca es un recorte de la postal ni de una parada.** Se ve en Inicio, en la lista de rutas (en blanco y negro mientras no se consigue, también con candado si la ruta es de pago y aún no se ha comprado; a todo color y matasellado al completarla) y pegado en el reverso de la postal. Cada ruta guarda en sus datos qué representa su sello (`stamp.symbol`).

Al diseñar una ruta nueva hacen falta las tres piezas, y ninguna se saca de otra.

Sellos, pasaporte y postales siguen la **Guía de sellos, pasaporte y postales** (v2):

- **Tintas de la ruta.** Cada parada sella con su propia tinta, de una familia de colores de la ruta (`inks` en los datos del tour: Tomares en ladrillo, ocre, vino y verde; Sevilla en oro, azul, terracota, verde y añil). `tintaDeRuta()` oscurece cualquier tinta que no llegue a 4,5:1 sobre el papel de su hoja. El acento de la ruta enmarca su postal.
- **Sellos de goma** dibujados en línea, uno por parada, en cuatro formas (rectángulo, círculo, óvalo y octógono), con el sitio, la ciudad y la fecha real. Cada parada se sella una sola vez; las repeticiones quedan en el historial.
- **Inicio:** la primera vez, bienvenida con el idioma (solo hay versión en español; el inglés sale como «próximamente») e Inicio, donde se elige ciudad (Sevilla, con Tomares, o Madrid) con su ilustración entera; al tocar una se ven sus rutas dibujadas sobre la foto de cada tour (paradas selladas rellenas, la siguiente destacada) y, bloqueados, los de pago (solo interfaz: no hay pagos todavía).
- **El paseo.** Las paradas van en orden. El mapa es la pantalla central del tour: al llegar, la parada se abre encima y al cerrarla se vuelve al mapa; tocando cualquier pin sale su ventana con «Entrar». La guía nunca se abre sola: al llegar (GPS fiable) sale la tarjeta «Estás en…» con «Escuchar» o «Luego», y con la app en segundo plano o la pantalla apagada llega un aviso (ubicación en segundo plano, permiso pedido una sola vez). Un botón fijo en la hoja inferior deja escuchar siempre: tras llegar («Escuchar ahora»), cuando el GPS no es fiable o estás a menos de 150 m («¿Ya estás en…?», que registra la llegada) o de lejos («Escuchar…», sin sello). La lista «Paradas» (que se abre sola sin GPS) y «Estoy aquí: poner el sello» en la parada son el respaldo. Al escuchar, el audio empieza solo y el sello se pone al final, con «Poner el sello»: solo se puede sellar la parada a la que has llegado (GPS, confirmación a mano o «Llegar» en modo prueba).
- **Tú eliges dónde va el sello.** Al pulsar «Poner el sello» se abre la hoja de la ruta con el sello «en la mano» (vista previa al 35 % que sigue al dedo). Al soltar, cae con la animación de la guía (550 ms, impacto a los 300 ms con «clac + pum», vibración y golpe de hoja). Márgenes de 16 px, sin pisar cabecera ni pie y como mucho un 35 % encima de otro sello; «Colócalo tú» busca un hueco libre. Cada sello sale girado entre 4° y 12° a un lado o al otro, nunca recto.
- **Ruta completada.** Con el último sello la ruta queda completada y, al terminar, sube la tarjeta de **postal desbloqueada** y el sello de la ruta pasa a todo color con su matasellos. No se estampa ningún sello de goma extra por completarla.
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

- **GitHub Actions** (`.github/workflows/android-apk.yml`): en cada push a `main` comprueba el código, compila un APK y lo deja en la pestaña *Actions* → la ejecución → *Artifacts* → `paseo-<número>.apk`, que se descarga directamente como .apk (sin zip). Se puede lanzar a mano con *Run workflow*. Está firmado con la clave de depuración: sirve para instalarlo en un móvil, no para Google Play.
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
    bienvenida.tsx           bienvenida y elección de idioma
    (tabs)/index.tsx         Inicio: elegir ciudad (su ilustración entera) y tu colección
    rutas/[ciudad].tsx       rutas de una ciudad: cada tour con su ruta dibujada y su sello de ruta; los de pago, bloqueados
    (tabs)/pasaporte.tsx     el pasaporte (libreta con hojas que se pasan)
    (tabs)/postales.tsx      tarjetero de postales y mapa
    postal/[id].tsx          postal a pantalla completa (vuelta y compartir)
    tour/[id]/index.tsx      portada del tour: paradas, sellos y postal
    tour/[id]/walk.tsx       mapa (pantalla central del tour), indicaciones y llegada
    tour/[id]/stop/[n].tsx   parada (encima del mapa): audio, textos y sello al final
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
design/route-stamps/*.svg    sello de correos de cada ruta (fuente)
```

## Sellos, postales y sonidos

- **Sellos de goma:** cada parada tiene `design/stamps/<parada>.svg`. `NODE_PATH=$(npm root -g) node scripts/build-stamps.mjs` junta la escena (desde el primer `<clipPath>`) con el marco de `src/lib/rubber.ts` y la hornea con la textura de goma de la guía en `assets/stamps/<parada>.png` (negro sobre transparente). La app la tiñe con la tinta de la parada y pinta encima la fecha real. Así cada sello son dos vistas en lugar de miles de nodos SVG, y el pasaporte abre al instante.
- **Dibujar sellos nuevos:** `scripts/stamp-kit.mjs` tiene las piezas del trazo de la guía (rayados, ventanas, arcos, palmeras, gente, máscaras para que lo de delante tape lo de detrás). `node scripts/draw-stamps-arenal.mjs` dibuja con ellas los sellos de la ruta del Arenal; sirve de ejemplo para otras rutas.
- **Postales:** la ilustración (832 × 444) está en `design/postcards/<tour>.svg` (la del Arenal la dibuja `node scripts/draw-postcard-arenal.mjs`). `node scripts/render-postcards.cjs` (necesita Playwright) le aplica la textura de imprenta de la guía y la guarda en `assets/postcards/`. El papel perforado se hornea con `NODE_PATH=$(npm root -g) node scripts/build-postcard-paper.mjs` en `assets/postcards/paper.png` (en el móvil, las máscaras SVG de antes cerraban la app). El marco y los textos los pinta la app; la cara de la postal no lleva matasellos (solo el reverso, sobre el sello).
- **Portadas:** cada ruta tiene una ilustración de portada teñida con su paleta (`tour.banner`, en `assets/banners/`), no una foto. `node scripts/render-banners.cjs` las hornea; la de Sevilla la dibuja `node scripts/draw-banner-sevilla.mjs`. Ver `design/README.md`.
- **Sellos de ruta:** el dibujo (164 × 200) está en `design/route-stamps/<tour>.svg` (`node scripts/draw-route-stamps.mjs` dibuja los tres actuales). `render-postcards.cjs` los hornea con la misma tinta de imprenta en `assets/route-stamps/<tour>.png`; el borde dentado y el matasellos los pone la app. `python3 scripts/shrink-assets.py` saca la versión en blanco y negro (`assets/route-stamps/gray/`) para los sellos sin conseguir o sin comprar.
- **Sonidos:** `python3 scripts/make-sounds.py` sintetiza `assets/sounds/stamp.wav` y `page.wav` con los parámetros de la guía.

## Añadir un tour

Un tour es un objeto `Tour` en `src/data/tours/`: paleta, **acento** (la tinta), paradas (foto, textos y su sello de goma: forma y textos), la postal (ilustración con escena propia, valor y subtítulo), el **sello de ruta** (dibujo exclusivo y qué simboliza; ver «Filosofía») y la ruta a pie entre paradas (`legs`). Las fotos y la ruta por calles las genera el workflow **Contenido** a partir de `<tour>.photos.json` y `<tour>.geo.json`. Formas recomendadas para los sellos de goma:

| Forma | Para |
|---|---|
| Rectángulo | fachadas anchas, comercios, sitios con rótulo |
| Círculo | plazas y monumentos con torre o estatua |
| Óvalo | paisajes, miradores, letreros de bienvenida |
| Octógono | ayuntamientos, museos, edificios institucionales |

## Pendiente antes de probar en la calle

- [ ] **Comprobar las ubicaciones de la ruta del Arenal** sobre el terreno (están tomadas de la puerta o el punto de vista de cada sitio; ver `src/data/tours/sevilla-arenal.ts`).
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
