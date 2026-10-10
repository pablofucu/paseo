import type { LngLat, Tour } from '../types';
import type { RouteStep } from '@/lib/routing';
import credits from './sevilla.credits.json';
import geo from './sevilla.geo.json';

/** Ubicaciones y ruta fija: src/data/tours/sevilla.geo.json (la ruta y las fotos las genera el workflow «Contenido») */
const coord = (id: string) => geo.stops.find(s => s.id === id)!.coord as LngLat;
const credit = (id: keyof typeof credits) => ({ author: credits[id].author, license: credits[id].license });

// Pictogramas de los sellos (caja 60 × 40, centrados en ella, solo currentColor)
const PICTOGRAMS = {
  "torre-oro": "<g transform=\"translate(1 0.3)\"><path d=\"M3 37.5 H57\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M2 36 q3 -1.6 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\" stroke-linecap=\"round\" transform=\"translate(0 2)\"/><path d=\"M21 35 V17 H39 V35 Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M20 17 V14 H22.5 V15.5 H25 V14 H27.5 V15.5 H30 V14 H32.5 V15.5 H35 V14 H37.5 V15.5 H40 V17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M25 14 V7 H35 V14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M24.5 7 H35.5\" stroke=\"currentColor\" stroke-width=\"1.3\"/><path d=\"M27.5 7 V4.5 a2.5 2.5 0 0 1 5 0 V7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\"/><path d=\"M30 2 V0.6\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M28 35 V29 a2 2 0 0 1 4 0 V35 Z\" fill=\"currentColor\"/><path d=\"M24.5 23 V20.5 M30 23 V20.5 M35.5 23 V20.5 M28.5 11.5 V9.5 M31.5 11.5 V9.5\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M8 35 C9 30 8 26 6.5 22 M6.5 22 C4 20.5 2 21.5 1 23.5 M6.5 22 C9 20 11 21 12 23 M6.5 22 C6 19 4.5 17.5 3 17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/></g>",
  "archivo": "<g transform=\"translate(0 -0.55)\"><path d=\"M2 37 H58\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><rect x=\"6\" y=\"14\" width=\"48\" height=\"23\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M5 14 H55 M6 25.5 H54\" stroke=\"currentColor\" stroke-width=\"1.3\"/><path d=\"M6 10.5 H54\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M8 10.5 V14 M12 10.5 V14 M16 10.5 V14 M20 10.5 V14 M24 10.5 V14 M28 10.5 V14 M32 10.5 V14 M36 10.5 V14 M40 10.5 V14 M44 10.5 V14 M48 10.5 V14 M52 10.5 V14\" stroke=\"currentColor\" stroke-width=\"0.9\"/><path d=\"M6 10.5 V7.5 M18 10.5 V7.5 M30 10.5 V6.5 M42 10.5 V7.5 M54 10.5 V7.5\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"6\" cy=\"6.6\" r=\"1.1\" fill=\"currentColor\"/><circle cx=\"18\" cy=\"6.6\" r=\"1.1\" fill=\"currentColor\"/><circle cx=\"30\" cy=\"5.4\" r=\"1.3\" fill=\"currentColor\"/><circle cx=\"42\" cy=\"6.6\" r=\"1.1\" fill=\"currentColor\"/><circle cx=\"54\" cy=\"6.6\" r=\"1.1\" fill=\"currentColor\"/><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\"><rect x=\"9.5\" y=\"17\" width=\"4\" height=\"5.5\"/><rect x=\"17.5\" y=\"17\" width=\"4\" height=\"5.5\"/><rect x=\"38.5\" y=\"17\" width=\"4\" height=\"5.5\"/><rect x=\"46.5\" y=\"17\" width=\"4\" height=\"5.5\"/><rect x=\"9.5\" y=\"28.5\" width=\"4\" height=\"5.5\"/><rect x=\"17.5\" y=\"28.5\" width=\"4\" height=\"5.5\"/><rect x=\"38.5\" y=\"28.5\" width=\"4\" height=\"5.5\"/><rect x=\"46.5\" y=\"28.5\" width=\"4\" height=\"5.5\"/></g><path d=\"M26.5 37 V30 a3.5 3.5 0 0 1 7 0 V37 Z\" fill=\"currentColor\"/><rect x=\"27\" y=\"17\" width=\"6\" height=\"5.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\"/></g>",
  "giralda": "<g transform=\"translate(0 0.6)\"><path d=\"M2 38 H58\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M23 38 V17 H37 V38\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M23 22 L30 18.5 L37 22 M23 27 L30 23.5 L37 27 M23 32 L30 28.5 L37 32\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"0.9\"/><path d=\"M28.5 37.5 V34 a1.5 1.5 0 0 1 3 0 V37.5\" fill=\"currentColor\"/><path d=\"M22 17 H38\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M24.5 17 V10 H35.5 V17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M27 16 V13 a1.5 1.5 0 0 1 3 0 V16 M30 16 V13 a1.5 1.5 0 0 1 3 0 V16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M24 10 H36\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M26.5 10 V6.5 H33.5 V10\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M27.5 6.5 L30 3.5 L32.5 6.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M30 3.5 V0.8 M28.6 1.6 L31.4 1.6\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M38 38 V26 L42 21 L46 26 V38 M46 38 V29 L50 25 L54 29 V38\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M42 21 V17.5 M50 25 V21.5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/><path d=\"M40.5 38 V32 a1.5 1.5 0 0 1 3 0 V38 M48.5 38 V33 a1.5 1.5 0 0 1 3 0 V38\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1\"/></g>",
  "alcazar": "<g transform=\"translate(0 -4)\"><path d=\"M2 37 H58\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M5 37 V15 H55 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M5 15 V11 H8 V13 H11 V11 H14 V13 H17 V11 H20 V13 H23 V11 H26 V13 H29 V11 H31 V13 H34 V11 H37 V13 H40 V11 H43 V13 H46 V11 H49 V13 H52 V11 H55 V15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M23.5 37 V29.5 a6.5 6.5 0 0 1 13 0 V37 Z\" fill=\"currentColor\"/><rect x=\"24.5\" y=\"16.3\" width=\"11\" height=\"5.7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M26.8 20.9 C27.6 18.6 29.4 18.2 30.3 19.1 C31.2 18 33.2 18.4 33.2 20 M28.2 20.9 V19.8 M32.2 20.9 V19.8\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"0.9\" stroke-linecap=\"round\"/><path d=\"M13 24 V21 a1.5 1.5 0 0 1 3 0 V24 Z M44 24 V21 a1.5 1.5 0 0 1 3 0 V24 Z\" fill=\"currentColor\"/><path d=\"M9 37 V31 M51 37 V31\" stroke=\"currentColor\" stroke-width=\"1.1\"/></g>",
  "elvira": "<g transform=\"translate(0 -1.5)\"><path d=\"M2 37 H58\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M4 37 V9 H22 V37 M38 37 V6 H56 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M7.5 17 V13 H11.5 V17 M14.5 17 V13 H18.5 V17 M41.5 14 V10 H45.5 V14 M48.5 14 V10 H52.5 V14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.1\"/><path d=\"M6.5 17 H19.5 M40.5 14 H53.5\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M7 19.5 V17.5 M9 19.5 V17.5 M11 19.5 V17.5 M13 19.5 V17.5 M15 19.5 V17.5 M17 19.5 V17.5 M19 19.5 V17.5\" stroke=\"currentColor\" stroke-width=\"0.8\"/><circle cx=\"30\" cy=\"17\" r=\"8\" fill=\"currentColor\"/><circle cx=\"26.5\" cy=\"15.5\" r=\"1.1\" fill=\"#FBF6EC\"/><circle cx=\"32\" cy=\"13.5\" r=\"1.1\" fill=\"#FBF6EC\"/><circle cx=\"33.5\" cy=\"19\" r=\"1.1\" fill=\"#FBF6EC\"/><path d=\"M30 25 V33\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M24 37 V34.5 H36 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M8 37 V32.5 H18 V37 M42 37 V32.5 H52 V37\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\"/><path d=\"M8 34.6 H18 M42 34.6 H52\" stroke=\"currentColor\" stroke-width=\"0.8\" stroke-dasharray=\"1.6 1.2\"/></g>",
};

/*
 * Coordenadas: Archivo de Indias y Giralda según latlong.net; Torre del Oro,
 * Puerta del León (Plaza del Triunfo) y Plaza de Doña Elvira, comprobadas a
 * partir de varias fuentes. Fotos: imagen principal de cada artículo de
 * Wikipedia (Wikimedia Commons), con su autoría en sevilla.credits.json.
 */
export const sevilla: Tour = {
  id: 'sevilla-centro',
  city: 'Sevilla',
  region: 'Andalucía · Casco antiguo',
  title: 'Del río a la judería',
  category: 'Historia y monumentos',
  intro: 'Cinco paradas por el corazón de Sevilla: del Guadalquivir a la Giralda y al laberinto de calles de Santa Cruz.',
  // Azul de azulejo y albero, los colores de la Sevilla monumental
  palette: { t: '#1F4FA8', t2: '#E5A823', soft: '#E4EAF7', deep: '#0F2650', on: '#FFFFFF' },
  // Azulejo, almagra, verde, albero oscuro y morado de Semana Santa
  stampInks: ['#1F4FA8', '#B5402B', '#2E7D4F', '#A8730F', '#6B3FA0'],
  emblemStop: 2,
  durationMin: 60,
  price: 'free',
  stops: [
    {
      id: "torre-oro",
      name: "Torre del Oro",
      stampLabel: "TORRE DEL ORO",
      kind: "monument",
      pictogram: PICTOGRAMS["torre-oro"],
      photo: require('../../../assets/tours/sevilla/torre-oro.jpg'),
      photoCredit: credit("torre-oro"),
      coord: coord("torre-oro"),
      arriveHint: "Mírala desde el río: tiene doce lados y tres cuerpos de distintas épocas.",
      audioTitle: "La torre que vigilaba el río",
      p1: "La levantaron los almohades hacia 1220 para vigilar el Guadalquivir y proteger el puerto. Formaba parte de la muralla que bajaba desde el Alcázar hasta el río.",
      look: "Los doce lados del primer cuerpo, el más antiguo y el único de época almohade.",
      p2: "El remate de arriba, con su pequeña cúpula, es del siglo XVIII y se hizo al reparar la torre tras el terremoto de 1755. Hoy alberga un pequeño museo naval.",
      fact: "Su nombre tiene varias explicaciones; la más aceptada es el brillo dorado que daba al reflejarse en el río.",
      captions: ["La torre junto al río", "El cuerpo almohade", "El remate del siglo XVIII", "El paseo de la orilla"],
    },
    {
      id: "archivo",
      name: "Archivo de Indias",
      stampLabel: "ARCHIVO INDIAS",
      kind: "civic",
      pictogram: PICTOGRAMS["archivo"],
      photo: require('../../../assets/tours/sevilla/archivo.jpg'),
      photoCredit: credit("archivo"),
      coord: coord("archivo"),
      arriveHint: "Busca la balaustrada del tejado, con sus pináculos de piedra.",
      audioTitle: "América, en papel",
      p1: "Este edificio fue la Casa Lonja de Mercaderes, donde se cerraban los tratos del comercio con América. Lo trazó Juan de Herrera, el arquitecto de El Escorial, a finales del siglo XVI.",
      look: "La sobriedad de la fachada: ladrillo, piedra y apenas adornos, el estilo de Herrera.",
      p2: "En 1785 Carlos III decidió reunir aquí los documentos de las Indias. Guarda millones de páginas sobre la América española, desde los primeros viajes hasta el siglo XIX.",
      fact: "Desde 1987 es Patrimonio Mundial de la UNESCO, junto con la Catedral y el Real Alcázar.",
      captions: ["La antigua Casa Lonja", "La balaustrada", "La fachada de Herrera", "La Avenida de la Constitución"],
    },
    {
      id: "giralda",
      name: "Catedral y Giralda",
      stampLabel: "LA GIRALDA",
      kind: "religious",
      pictogram: PICTOGRAMS["giralda"],
      photo: require('../../../assets/tours/sevilla/giralda.jpg'),
      photoCredit: credit("giralda"),
      coord: coord("giralda"),
      arriveHint: "Levanta la vista: arriba del todo gira el Giraldillo.",
      audioTitle: "De alminar a campanario",
      p1: "La Giralda fue el alminar de la gran mezquita almohade de Sevilla, terminado a finales del siglo XII. Cuando se levantó la catedral gótica en su lugar, la torre se conservó.",
      look: "Los paños de ladrillo con dibujos de rombos en la parte almohade de la torre.",
      p2: "En el siglo XVI Hernán Ruiz le añadió el cuerpo de campanas renacentista. La corona el Giraldillo, una veleta que representa la Fe y que da nombre a la torre.",
      fact: "Por dentro no tiene escaleras sino rampas, tan anchas que se podía subir a caballo.",
      captions: ["La Giralda", "El cuerpo de campanas", "La parte almohade", "La catedral a sus pies"],
    },
    {
      id: "alcazar",
      name: "Real Alcázar",
      stampLabel: "REAL ALCÁZAR",
      kind: "monument",
      pictogram: PICTOGRAMS["alcazar"],
      photo: require('../../../assets/tours/sevilla/alcazar.jpg'),
      photoCredit: credit("alcazar"),
      coord: coord("alcazar"),
      arriveHint: "Sobre la Puerta del León verás un león coronado en azulejo.",
      audioTitle: "Un palacio todavía en uso",
      p1: "Detrás de esta muralla está el Real Alcázar, un conjunto de palacios y jardines que se fue ampliando durante siglos. Se entra por la Puerta del León.",
      look: "El azulejo del león sobre la puerta: lleva corona y sostiene una cruz.",
      p2: "Su pieza más famosa es el palacio que mandó construir el rey Pedro I hacia 1364, en estilo mudéjar, con artesanos de Sevilla, Toledo y Granada.",
      fact: "Sus pisos altos siguen siendo residencia de la familia real cuando visita Sevilla.",
      captions: ["El palacio de Pedro I", "Las yeserías mudéjares", "La fachada del palacio", "El patio de la Montería"],
    },
    {
      id: "elvira",
      name: "Barrio de Santa Cruz",
      stampLabel: "SANTA CRUZ",
      kind: "public",
      pictogram: PICTOGRAMS["elvira"],
      photo: require('../../../assets/tours/sevilla/elvira.jpg'),
      photoCredit: credit("elvira"),
      coord: coord("elvira"),
      arriveHint: "Estás en la antigua judería: calles estrechas, naranjos y patios.",
      audioTitle: "La antigua judería",
      p1: "Santa Cruz fue la judería de Sevilla hasta finales del siglo XIV. Sus calles estrechas y quebradas guardan la sombra y el fresco en verano.",
      look: "La Plaza de Doña Elvira: naranjos, una fuente y bancos de azulejo.",
      p2: "El Callejón del Agua, junto a la muralla del Alcázar, recuerda las conducciones que llevaban el agua al palacio. Es uno de los rincones más fotografiados de la ciudad.",
      fact: "El pintor Murillo vivió en este barrio y fue enterrado en la iglesia de Santa Cruz, derribada en 1810; sus restos se perdieron.",
      captions: ["El Callejón del Agua", "La muralla del Alcázar", "Calles de la judería", "Rincones de Santa Cruz"],
    },
  ],
  legs: geo.legs as LngLat[][],
  legSteps: geo.steps as RouteStep[][],
  onTheWay: [
    { afterStop: 0, name: "Puerto de Indias", text: "De camino: el puerto de Indias", story: "Durante el siglo dieciséis, Sevilla tuvo el monopolio del comercio con América. Los barcos que iban y venían de las Indias atracaban en esta orilla del Guadalquivir." },
    { afterStop: 1, name: "La Avenida", text: "De camino: la Avenida de la Constitución", story: "Esta avenida es peatonal y por ella circula el tranvía. A tu izquierda se levanta la catedral, una de las mayores catedrales góticas del mundo." },
    { afterStop: 2, name: "Plaza del Triunfo", text: "De camino: la Plaza del Triunfo", story: "El monumento del centro recuerda que la ciudad salió casi intacta del terremoto de 1755, el mismo que destruyó Lisboa." },
    { afterStop: 3, name: "Patio de Banderas", text: "De camino: el Patio de Banderas", story: "Este patio cerrado, con naranjos, fue la plaza de armas del Alcázar. Por un arco en una de sus esquinas se pasa a la antigua judería." },
  ],
};
