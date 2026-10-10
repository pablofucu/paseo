import type { LngLat, Tour } from '../types';
import type { RouteStep } from '@/lib/routing';
import geo from './tomares.geo.json';

/** Ubicaciones y ruta fija: src/data/tours/tomares.geo.json (la ruta la genera el workflow «Contenido») */
const coord = (id: string) => geo.stops.find(s => s.id === id)!.coord as LngLat;

// Pictogramas de los sellos (caja 60 × 40, centrados en ella, solo currentColor)
const PICTOGRAMS = {
  ayuntamiento: "<g transform=\"translate(0.6 1.1)\"><path d=\"M2 37 H58\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M14 37 V20 H56 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M12.5 19 H57.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M28 19 V9 H42 V19\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M26 9 H44 L40 3.5 H30 Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M35 3.5 V0.8 M33.5 1.8 H36.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M31 15 V12.5 a1.8 1.8 0 0 1 3.6 0 V15 M36 15 V12.5 a1.8 1.8 0 0 1 3.6 0 V15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M31 15 H39.6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M31.5 25 H38.5 M33 25 V23.5 M35 25 V23.5 M37 25 V23.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M31.5 37 V31 a3.5 3.5 0 0 1 7 0 V37 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"18\" y=\"25\" width=\"5\" height=\"7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linejoin=\"round\"/><rect x=\"47\" y=\"25\" width=\"5\" height=\"7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linejoin=\"round\"/><path d=\"M6 37 V16 M6 16 Q2.5 13.5 0.8 17 M6 16 Q9.5 13 12 17 M6 16 Q6 12 6 11\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M6 16 Q3 17 2 21 M6 16 Q9 17 10.5 21\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g>",
  rotonda: "<g transform=\"translate(0 -2.5)\"><path d=\"M3 8 H9 M6 8 V17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M19 17 V8 L22 12.5 L25 8 V17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M27 17 L30 8 L33 17 M28.3 14 H31.7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M35 17 V8 H38.3 a2.6 2.6 0 0 1 0 5.2 H35 M38 13.2 L41 17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M49 8 H43 V17 H49 M43 12.5 H48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M57 8.5 H53 Q51 8.5 51 10.2 Q51 12.5 54 12.5 Q57 12.5 57 14.8 Q57 17 55 17 H50.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"11\" y=\"8\" width=\"6\" height=\"9\" rx=\"3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M2 21 H58\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"2\" y=\"24\" width=\"56\" height=\"13\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><path d=\"M2 30.5 H58 M10 24 V30.5 M18 24 V30.5 M26 24 V30.5 M34 24 V30.5 M42 24 V30.5 M50 24 V30.5 M6 30.5 V37 M14 30.5 V37 M22 30.5 V37 M30 30.5 V37 M38 30.5 V37 M46 30.5 V37 M54 30.5 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g>",
  iglesia: "<g transform=\"translate(0 0.5)\"><path d=\"M2 37 H58\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M4 37 V18 H42 M54 18 H56 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M2.5 18 H42 M54 18 H57.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M11 37 V22.5 M29 37 V22.5 M13.5 37 V24 M26.5 37 V24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M10 22.5 H30\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M15 37 V29 a5 5 0 0 1 10 0 V37 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M20 9.5 V17 M17.5 12.5 H22.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M30.5 18 V8 L34 4.5 L37.5 8 V18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M32 18 V15 a1.2 1.2 0 0 1 2.4 0 V18 Z M34.6 18 V15 a1.2 1.2 0 0 1 2.4 0 V18\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"28.3\" cy=\"12\" r=\"1.3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1\"/><path d=\"M34 4.5 V2 M33 3 H35\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M42 18 V9 L48 3.5 L54 9 V18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"48\" cy=\"13.5\" r=\"3.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\"/><path d=\"M48 11.5 V13.5 L49.8 14.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g>",
  kebab: "<path d=\"M2 37 H58\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"2\" y=\"3\" width=\"56\" height=\"7\" rx=\"1\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><path d=\"M6 6.5 H22 M26 6.5 H38 M42 6.5 H54\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M3.5 10 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M6 33 V24 a5 5 0 1 1 9 0 V33 Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M10.5 20 V33\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M19 37 V17 H27 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M20 37 V18 H26 V37 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M34 12 V14 M30 14 H38 M30 14 C30 19 31.5 22 31.5 28 H36.5 C36.5 22 38 19 38 14 M31 19 H37 M31.5 23.5 H36.5 M29.5 30 H38.5 M34 30 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M31 14 C31 18 32 20 32 22 M34 14 V28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M44 27.5 H54 M49 27.5 V37 M46 37 H52\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M42 24 V37 M42 32 H45.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M56 24 V37 M56 32 H52.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
};

/*
 * Ubicaciones (buscadas en octubre de 2026):
 * - Ayuntamiento (Hacienda de Santa Ana, C/ de la Fuente 10): coordenadas de
 *   es.wikipedia.org/wiki/Casa_consistorial_de_Tomares.
 * - Parroquia de N.ª S.ª de Belén (C/ Navarro Caro 27): coordenadas publicadas
 *   en directorios de parroquias (37,3750253, −6,0469047).
 * - Royal King Kebab (C/ Navarro Caro 83): punto de la calle según Waze.
 *   APROXIMADO: comprobar el portal exacto.
 * - Letras TOMARES: talud de la Avda. de la Arboleda frente a la Urb. El Carmen
 *   (tomares.es). APROXIMADO: no hay coordenadas publicadas del letrero.
 *
 * La ruta a pie por calles está fijada en tomares.geo.json. Se genera con
 * OSRM (perfil peatón, datos de OpenStreetMap) desde el workflow «Contenido»:
 * cambia allí las coordenadas y vuelve a lanzarlo.
 */
export const tomares: Tour = {
  id: 'tomares-4-paradas',
  city: 'Tomares',
  region: 'Sevilla · Aljarafe',
  title: 'Tomares en 4 paradas',
  category: 'Historia y barrio',
  intro: "Cuatro paradas a pie por Tomares, en el corazón del Aljarafe sevillano. Empiezas en la rotonda y terminas con un kebab.",
  palette: { t: '#B23A2E', t2: '#E8B33A', soft: '#F8E7E2', deep: '#4A1610', on: '#FFFFFF' },
  durationMin: 45,
  price: 'free',
  stops: [
  {
    id: "rotonda",
    name: "Rotonda de la Arboleda",
    stampLabel: "LA ARBOLEDA",
    kind: "public",
    pictogram: PICTOGRAMS.rotonda,
    photo: require('../../../assets/tours/tomares/rotonda.jpg'),
    coord: coord("rotonda"),
    arriveHint: "Busca las letras blancas TOMARES sobre el césped.",
    audioTitle: "Bienvenido a Tomares",
    p1: "Estás en la puerta del pueblo. Las letras grandes te dan la bienvenida. Son blancas y se leen desde lejos.",
    look: "El muro de gaviones: son jaulas de malla llenas de piedra blanca.",
    p2: "Detrás, una palmera y varios pinos hacen de telón verde. Es un buen sitio para la primera foto del tour. Después, tira hacia el centro.",
    fact: "Tomares está en el Aljarafe, la comarca de colinas que se asoma a Sevilla desde el oeste.",
    captions: ["Letras TOMARES", "Muro de gaviones", "Palmera y pinos", "Entrada al pueblo"],
  },
  {
    id: "ayuntamiento",
    name: "Ayuntamiento de Tomares",
    stampLabel: "AYUNTAMIENTO",
    kind: "civic",
    pictogram: PICTOGRAMS.ayuntamiento,
    photo: require('../../../assets/tours/tomares/ayuntamiento.jpg'),
    coord: coord("ayuntamiento"),
    arriveHint: "Mira arriba: la torre mirador con dos arcos.",
    audioTitle: "La Hacienda de Santa Ana",
    p1: "El Ayuntamiento ocupa la antigua Hacienda de Santa Ana. Es un edificio blanco encalado con tejado de teja, como tantas haciendas del Aljarafe.",
    look: "La puerta central en arco y en los balcones de forja.",
    p2: "El arquitecto sevillano Guillermo Vázquez Consuegra rehabilitó la hacienda para convertirla en casa consistorial. Hoy el jardín funciona como vestíbulo del edificio.",
    fact: "Una hacienda del Aljarafe solía tener una zona de trabajo, con producción de aceite, y otra de vivienda.",
    captions: ["Torre mirador", "Puerta en arco", "Balcones de forja", "Palmeras delante"],
  },
  {
    id: "iglesia",
    name: "Parroquia de Nuestra Señora de Belén",
    stampLabel: "PARROQUIA",
    kind: "religious",
    pictogram: PICTOGRAMS.iglesia,
    photo: require('../../../assets/tours/tomares/iglesia.jpg'),
    coord: coord("iglesia"),
    arriveHint: "Localiza la espadaña con campanas y la torre del reloj.",
    audioTitle: "La Virgen de Belén",
    p1: "Esta es la parroquia del pueblo. La fachada es blanca y las molduras rojo almagra la enmarcan. La portada en arco lleva el rótulo con su nombre.",
    look: "El retablo de azulejos con una Virgen, en la fachada.",
    p2: "Nuestra Señora de Belén es la patrona de Tomares. La espadaña luce remates en espiral. En la plaza, los naranjos dan sombra y aroma.",
    fact: "Nuestra Señora de Belén es la patrona de Tomares, y el patrón es San Sebastián.",
    captions: ["Fachada almagra", "Espadaña y campanas", "Retablo de azulejos", "Naranjos en la plaza"],
  },
  {
    id: "kebab",
    name: "Royal King Kebab",
    stampLabel: "ROYAL KING",
    kind: "food",
    pictogram: PICTOGRAMS.kebab,
    photo: require('../../../assets/tours/tomares/kebab.jpg'),
    coord: coord("kebab"),
    arriveHint: "Busca la ventana con arco de herradura azul.",
    audioTitle: "Parada final: kebab",
    p1: "Final del recorrido. Toca reponer fuerzas, y aquí hay kebab. Es halal y tiene servicio a domicilio, por si el cansancio te pilla en casa.",
    look: "El letrero con fotos de comida: ayuda a decidir.",
    p2: "La fachada es blanca y la ventana, con arco de herradura azul, se ve desde lejos. Hay mesas fuera para comer al aire libre. Te lo has ganado.",
    fact: "El arco de herradura es un clásico de la arquitectura andalusí. Aquí, pintado de azul, anuncia el kebab.",
    captions: ["Fachada blanca", "Arco de herradura azul", "Letrero con fotos", "Mesas fuera"],
  },
  ],
  legs: geo.legs as LngLat[][],
  legSteps: geo.steps as RouteStep[][],
  onTheWay: [
    { afterStop: 0, name: "Aljarafe", text: "De camino: el Aljarafe, junto a Sevilla" },
    { afterStop: 1, name: "Tesoro Tomares", text: "De camino: el Tesoro de Tomares, de 2016" },
    { afterStop: 2, name: "Patrón y patrona", text: "De camino: Belén y San Sebastián" },
  ],
};
