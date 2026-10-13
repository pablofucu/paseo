import type { LngLat, Tour } from '../types';
import type { RouteStep } from '@/lib/routing';
import credits from './sevilla.credits.json';
import geo from './sevilla.geo.json';

/** Ubicaciones y ruta fija: src/data/tours/sevilla.geo.json (la ruta y las fotos las genera el workflow «Contenido») */
const coord = (id: string) => geo.stops.find(s => s.id === id)!.coord as LngLat;
const credit = (id: keyof typeof credits) => ({ author: credits[id].author, license: credits[id].license, source: credits[id].source });

/*
 * Coordenadas: Archivo de Indias y Giralda según latlong.net; Torre del Oro,
 * Puerta del León (Plaza del Triunfo) y Plaza de Doña Elvira, comprobadas a
 * partir de varias fuentes. Fotos: imagen principal de cada artículo de
 * Wikipedia (Wikimedia Commons), con su autoría en sevilla.credits.json.
 */
export const sevilla: Tour = {
  id: 'sevilla-centro',
  area: 'sevilla',
  city: 'Sevilla',
  region: 'Andalucía · Casco antiguo',
  title: 'Del río a la judería',
  category: 'Historia y monumentos',
  intro: 'Cinco paradas por el corazón de Sevilla: del Guadalquivir a la Giralda y al laberinto de calles de Santa Cruz.',
  // Paleta «rueda con sol»: todas las rutas comparten luz e intensidad (OKLCH L 0.50, C 0.17)
  // y el amarillo sol como acento; Sevilla centro es el turquesa del río (h 214)
  palette: { t: '#086F81', t2: '#FEC84B', soft: '#D9F4FB', deep: '#022F37', on: '#FFFFFF' },
  accent: '#086f81',
  // Tintas de parada: los cinco tonos de la rueda, más oscuros (L 0.45)
  inks: ['#046070', '#0a6802', '#774a03', '#5242a3', '#912455'],
  postcard: {
    art: require('../../../assets/postcards/sevilla.jpg'),
    value: '3,20€',
    subtitle: 'ATARDECER EN EL GUADALQUIVIR',
  },
  stamp: {
    art: require('../../../assets/route-stamps/sevilla-centro.png'),
    symbol: 'El Giraldillo, la veleta que corona la Giralda, sobre el azul del azulejo y el lema NO8DO de la ciudad.',
  },
  banner: require('../../../assets/banners/sevilla.jpg'),
  durationMin: 60,
  price: 'free',
  stops: [
    {
      id: "torre-oro",
      name: "Torre del Oro",
      kind: "monument",
      rubber: { shape: 'oval', title: 'TORRE DEL ORO' },
      photo: require('../../../assets/tours/sevilla/torre-oro.jpg'),
      thumb: require('../../../assets/tours/sevilla/thumbs/torre-oro.jpg'),
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
      kind: "civic",
      rubber: { shape: 'rect', title: 'ARCHIVO DE INDIAS' },
      photo: require('../../../assets/tours/sevilla/archivo.jpg'),
      thumb: require('../../../assets/tours/sevilla/thumbs/archivo.jpg'),
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
      kind: "religious",
      rubber: { shape: 'circle', title: 'LA GIRALDA' },
      photo: require('../../../assets/tours/sevilla/giralda.jpg'),
      thumb: require('../../../assets/tours/sevilla/thumbs/giralda.jpg'),
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
      kind: "monument",
      rubber: { shape: 'octagon', title: 'REAL ALCÁZAR', label: 'PUERTA DEL LEÓN' },
      photo: require('../../../assets/tours/sevilla/alcazar.jpg'),
      thumb: require('../../../assets/tours/sevilla/thumbs/alcazar.jpg'),
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
      kind: "public",
      rubber: { shape: 'circle', title: 'BARRIO DE SANTA CRUZ' },
      photo: require('../../../assets/tours/sevilla/elvira.jpg'),
      thumb: require('../../../assets/tours/sevilla/thumbs/elvira.jpg'),
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
    { afterStop: 1, name: "La Avenida", text: "De camino: la Avenida de la Constitución", story: "Esta avenida es peatonal y por ella circula el tranvía. A tu derecha se levanta la catedral, una de las mayores catedrales góticas del mundo." },
    { afterStop: 2, name: "Plaza del Triunfo", text: "De camino: la Plaza del Triunfo", story: "El monumento del centro recuerda que la ciudad salió casi intacta del terremoto de 1755, el mismo que destruyó Lisboa." },
    { afterStop: 3, name: "Patio de Banderas", text: "De camino: el Patio de Banderas", story: "Este patio cerrado, con naranjos, fue la plaza de armas del Alcázar. Por un arco en una de sus esquinas se pasa a la antigua judería." },
  ],
};
