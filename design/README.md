# Diseño

Prototipos HTML hechos antes de programar la app. Se abren en cualquier navegador.

- `design-system.html`: colores, paletas por tour, tipografía, componentes y pantallas (v3)
- `prototipo.html`: prototipo navegable (Madrid de los Austrias), con sellos por parada, pasaporte, mapa teñido y foto duotono
- `sellos-costa.html`: sistema de sellos (formas por tipo de lugar, estados y cómo se fabrican)
- `tour-tomares.html`: prototipo del tour de Tomares con las fotos reales
- `stamps/*.svg`: escena de cada sello de goma (una por parada)
- `postcards/*.svg`: ilustración de cada postal, con una escena propia de la ruta. Se dibujan con `scripts/draw-postcard-arenal.mjs` (Plaza de España desde el canal), `scripts/draw-postcard-sevilla-centro.mjs` (Sevilla al atardecer desde la orilla de Triana) y `scripts/draw-postcard-tomares.mjs` (calle encalada del Aljarafe con espadaña y banderines; el olivo queda al fondo porque es el emblema del sello)
- `route-stamps/*.svg`: sello de correos de cada ruta, un emblema exclusivo que la simboliza (nunca un recorte de la postal). Los dibuja `scripts/draw-route-stamps.mjs`, que incluye también los de las rutas de pago bloqueadas (`triana`, `murillo`, `austrias`, `letras`, `retiro-prado`)

`node scripts/render-postcards.cjs` (Playwright) hornea postales y sellos con la textura de imprenta en `assets/postcards/*.jpg` y `assets/route-stamps/*.png`. El orden alfabético de `route-stamps/` fija la semilla de la textura: al añadir una ruta, revisa con `git status` y restaura (`git checkout`) los PNG que cambien sin querer.

La filosofía de estas tres piezas está en el README principal, en «Filosofía: lo que se gana en cada ruta».
