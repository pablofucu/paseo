import { CREDIT_PENDING, type LngLat, type PhotoCredit, type Tour } from '../types';
import type { RouteStep } from '@/lib/routing';
import geo from './tomares.geo.json';

/** Ubicaciones y ruta fija: src/data/tours/tomares.geo.json (la ruta la genera el workflow «Contenido») */
const coord = (id: string) => geo.stops.find(s => s.id === id)!.coord as LngLat;
/** Fotos propias del proyecto sin autoría ni licencia comprobadas: se enseñan solo en Ajustes › Créditos de las fotos */
const PENDIENTE: PhotoCredit = { author: 'pendiente', license: 'pendiente', source: CREDIT_PENDING };

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
  area: 'sevilla',
  city: 'Tomares',
  region: 'Sevilla · Aljarafe',
  title: 'Tomares en 4 paradas',
  category: 'Historia y barrio',
  intro: "Cuatro paradas a pie por Tomares, en el corazón del Aljarafe sevillano. Empiezas en la rotonda y terminas con un kebab.",
  palette: { t: '#B23A2E', t2: '#E8B33A', soft: '#F8E7E2', deep: '#4A1610', on: '#FFFFFF' },
  // Teja de la torre del Ayuntamiento (contraste 5,8:1 con el papel)
  accent: '#9c3a24',
  // Ladrillo, ocre tostado, vino y verde botella: tampones de la misma familia cálida
  inks: ['#9c3a24', '#7d5212', '#6e2a4a', '#2f5a48'],
  postcard: {
    art: require('../../../assets/postcards/tomares.jpg'),
    value: '4,50€',
    subtitle: 'LETRERO · AYUNTAMIENTO · PARROQUIA · ROYAL KING KEBAB',
  },
  stamp: {
    art: require('../../../assets/route-stamps/tomares-4-paradas.png'),
    symbol: 'Una rama de olivo con sus aceitunas, el árbol del Aljarafe, y el número de paradas.',
  },
  emblemStop: 1,
  durationMin: 45,
  price: 'free',
  stops: [
  {
    id: "rotonda",
    name: "Rotonda de la Arboleda",
    kind: "public",
    rubber: { shape: 'oval', title: 'BIENVENIDOS A', place: 'TOMARES' },
    photo: require('../../../assets/tours/tomares/rotonda.jpg'),
    thumb: require('../../../assets/tours/tomares/thumbs/rotonda.jpg'),
    photoCredit: PENDIENTE,
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
    kind: "civic",
    rubber: { shape: 'octagon', title: 'AYUNTAMIENTO', label: 'HACIENDA SANTA ANA' },
    photo: require('../../../assets/tours/tomares/ayuntamiento.jpg'),
    thumb: require('../../../assets/tours/tomares/thumbs/ayuntamiento.jpg'),
    photoCredit: PENDIENTE,
    coord: coord("ayuntamiento"),
    arriveHint: "Mira arriba: la torre mirador con dos arcos.",
    audioTitle: "La Hacienda de Santa Ana",
    p1: "El Ayuntamiento ocupa la antigua Hacienda de Santa Ana. Es un edificio blanco encalado con tejado de teja, como tantas haciendas del Aljarafe.",
    look: "La puerta central, en arco, y los balcones de forja.",
    p2: "El arquitecto sevillano Guillermo Vázquez Consuegra rehabilitó la hacienda para convertirla en casa consistorial. Hoy el jardín funciona como vestíbulo del edificio.",
    fact: "Una hacienda del Aljarafe solía tener una zona de trabajo, con producción de aceite, y otra de vivienda.",
    captions: ["Torre mirador", "Puerta en arco", "Balcones de forja", "Palmeras delante"],
  },
  {
    id: "iglesia",
    name: "Parroquia de Nuestra Señora de Belén",
    kind: "religious",
    rubber: { shape: 'circle', title: 'PARROQUIA DE BELÉN' },
    photo: require('../../../assets/tours/tomares/iglesia.jpg'),
    thumb: require('../../../assets/tours/tomares/thumbs/iglesia.jpg'),
    photoCredit: PENDIENTE,
    coord: coord("iglesia"),
    arriveHint: "Localiza la espadaña con campanas y la torre del reloj.",
    audioTitle: "La Virgen de Belén",
    p1: "Esta es la parroquia del pueblo. La fachada es blanca y las molduras rojo almagra la enmarcan. La portada en arco lleva el rótulo con su nombre.",
    look: "El retablo de azulejos con una Virgen, en la fachada.",
    p2: "Nuestra Señora de Belén es la patrona de Tomares. La espadaña luce remates en espiral. En la plaza, los naranjos dan sombra y aroma.",
    fact: "El nombre Belén recuerda a Betlehem, la ciudad donde la tradición cristiana sitúa el nacimiento de Jesús.",
    captions: ["Fachada almagra", "Espadaña y campanas", "Retablo de azulejos", "Naranjos en la plaza"],
  },
  {
    id: "kebab",
    name: "Royal King Kebab",
    kind: "food",
    rubber: { shape: 'rect', title: 'ROYAL KING KEBAB' },
    photo: require('../../../assets/tours/tomares/kebab.jpg'),
    thumb: require('../../../assets/tours/tomares/thumbs/kebab.jpg'),
    photoCredit: PENDIENTE,
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
    { afterStop: 0, name: "Aljarafe", text: "De camino: el Aljarafe, junto a Sevilla", story: "El Aljarafe es la comarca de colinas que se asoma a Sevilla desde el oeste. El olivar y el aceite han sido durante siglos su seña de identidad." },
    { afterStop: 1, name: "Tesoro Tomares", text: "De camino: el Tesoro de Tomares, de 2016", story: "En 2016, unas obras sacaron a la luz en Tomares un gran tesoro de monedas romanas de bronce del siglo IV, uno de los mayores hallazgos de este tipo en Europa." },
    { afterStop: 2, name: "La patrona", text: "De camino: la Virgen de Belén", story: "La parroquia que acabas de ver está dedicada a Nuestra Señora de Belén, la patrona de Tomares. Su nombre aparece en el rótulo de la portada." },
  ],
};
