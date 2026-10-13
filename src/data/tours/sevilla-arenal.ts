import { CREDIT_PENDING, type LngLat, type PhotoCredit, type Tour } from '../types';
import type { RouteStep } from '@/lib/routing';
import credits from './sevilla-arenal.credits.json';
import geo from './sevilla-arenal.geo.json';

/** Ubicaciones y ruta fija: src/data/tours/sevilla-arenal.geo.json (la ruta y las fotos las genera el workflow «Contenido») */
const coord = (id: string) => geo.stops.find(s => s.id === id)!.coord as LngLat;
const credit = (id: string): PhotoCredit => {
  const c = (credits as Record<string, PhotoCredit | undefined>)[id];
  return c ? { author: c.author, license: c.license, source: c.source } : { author: 'pendiente', license: 'pendiente', source: CREDIT_PENDING };
};

/*
 * Coordenadas APROXIMADAS (octubre de 2026), tomadas de la puerta o el punto
 * desde el que se mira cada sitio: Puerta del Príncipe en el Paseo de Colón,
 * jardín de Mañara frente a la Caridad, portada de San Telmo en la Avenida de
 * Roma, Fábrica de Tabacos (el punto del camino junto a su fachada, donde acaba el tramo), centro de
 * la Plaza de España y Pabellón Mudéjar en la Plaza de América. Comprobarlas
 * sobre el terreno. Fotos: imagen principal de cada artículo de Wikipedia
 * (Wikimedia Commons), con su autoría en sevilla-arenal.credits.json.
 */
export const sevillaArenal: Tour = {
  id: 'sevilla-arenal',
  area: 'sevilla',
  city: 'Sevilla',
  region: 'Andalucía · Arenal y Parque',
  title: 'Del Arenal a la Plaza de España',
  category: 'Historia y monumentos',
  intro: 'Seis paradas desde la plaza de toros, junto al río, hasta la Plaza de España y el Parque de María Luisa, los escenarios de la Exposición de 1929.',
  // Ladrillo de la Plaza de España y albero
  palette: { t: '#A8432C', t2: '#E5A823', soft: '#F6E3DC', deep: '#44170D', on: '#FFFFFF' },
  accent: '#a8432c',
  // Ladrillo, azul de azulejo, oro, verde de alicatado, terracota y añil
  inks: ['#a8432c', '#1f4fa8', '#86600f', '#2c6152', '#7a3424', '#4a3a8c'],
  postcard: {
    art: require('../../../assets/postcards/sevilla-arenal.jpg'),
    value: '3,90€',
    subtitle: 'MAESTRANZA · CARIDAD · SAN TELMO · TABACOS · PLAZA DE ESPAÑA · MARÍA LUISA',
  },
  stamp: {
    art: require('../../../assets/route-stamps/sevilla-arenal.png'),
    symbol: 'Una carabela sobre un azulejo con el año 1929: el puerto de Indias del Arenal y la Exposición Iberoamericana.',
  },
  emblemStop: 4,
  durationMin: 90,
  price: 'free',
  stops: [
    {
      id: 'maestranza',
      name: 'Real Maestranza',
      kind: 'tradition',
      rubber: { shape: 'circle', title: 'REAL MAESTRANZA' },
      photo: require('../../../assets/tours/sevilla-arenal/maestranza.jpg'),
      thumb: require('../../../assets/tours/sevilla-arenal/thumbs/maestranza.jpg'),
      photoCredit: credit('maestranza'),
      coord: coord('maestranza'),
      arriveHint: 'Busca la portada de piedra con un balcón de hierro: es la Puerta del Príncipe.',
      audioTitle: 'La puerta de los triunfos',
      p1: 'Esta plaza de toros es de la Real Maestranza de Caballería, una corporación de nobles que nació para entrenarse a caballo. Se empezó en 1749 y no se terminó hasta más de un siglo después.',
      look: 'La Puerta del Príncipe, con su balcón de hierro y el escudo en lo alto.',
      p2: 'Por esta puerta salen a hombros los toreros que cortan tres orejas en una tarde, el mayor triunfo de la temporada sevillana. Dentro hay un museo con trajes de luces y carteles antiguos.',
      fact: 'El ruedo no es un círculo perfecto: es ligeramente ovalado, porque se construyó por partes a lo largo de muchos años.',
      captions: ['La plaza junto al río', 'La Puerta del Príncipe', 'El balcón de hierro', 'El Paseo de Colón'],
    },
    {
      id: 'caridad',
      name: 'Hospital de la Caridad',
      kind: 'religious',
      rubber: { shape: 'rect', title: 'HOSPITAL DE LA CARIDAD' },
      photo: require('../../../assets/tours/sevilla-arenal/caridad.jpg'),
      thumb: require('../../../assets/tours/sevilla-arenal/thumbs/caridad.jpg'),
      photoCredit: credit('caridad'),
      coord: coord('caridad'),
      arriveHint: 'Mira la fachada blanca: tiene cinco paneles de azulejo azul.',
      audioTitle: 'Murillo en azulejo',
      p1: 'La Hermandad de la Santa Caridad enterraba a los ahogados del río y a los ajusticiados. En el siglo XVII, Miguel de Mañara la convirtió en un hospital para los más pobres de la ciudad.',
      look: 'Los cinco azulejos de la fachada: la Fe, la Esperanza, la Caridad, Santiago y San Jorge, con dibujos atribuidos a Murillo.',
      p2: 'Dentro, la iglesia guarda cuadros que Mañara encargó a Murillo y a Valdés Leal. Delante, en el jardín, está su estatua con un mendigo en brazos.',
      fact: 'Una leyenda confunde a Mañara con Don Juan Tenorio, el seductor de las obras de teatro. En realidad fue un hombre de vida austera.',
      captions: ['La fachada de la Caridad', 'Los paneles de azulejo', 'La estatua de Mañara', 'La calle Temprado'],
    },
    {
      id: 'san-telmo',
      name: 'Palacio de San Telmo',
      kind: 'civic',
      rubber: { shape: 'octagon', title: 'SAN TELMO', label: 'PORTADA BARROCA' },
      photo: require('../../../assets/tours/sevilla-arenal/san-telmo.jpg'),
      thumb: require('../../../assets/tours/sevilla-arenal/thumbs/san-telmo.jpg'),
      photoCredit: credit('san-telmo'),
      coord: coord('san-telmo'),
      arriveHint: 'Delante tienes una portada de piedra de tres pisos, llena de columnas.',
      audioTitle: 'Una escuela de marinos',
      p1: 'San Telmo se empezó en 1682 como colegio para los huérfanos de los marineros, que aprendían aquí a navegar. Su nombre es el del patrón de los navegantes.',
      look: 'La portada barroca y, en lo alto, San Telmo en su hornacina.',
      p2: 'En el siglo XIX fue el palacio de los duques de Montpensier, que pusieron en la balaustrada doce estatuas de sevillanos ilustres. Hoy es la sede de la Presidencia de la Junta de Andalucía.',
      fact: 'El Parque de María Luisa fue el jardín de este palacio hasta que la infanta lo regaló a la ciudad en 1893.',
      captions: ['La portada barroca', 'San Telmo en su hornacina', 'Los sevillanos ilustres', 'La Avenida de Roma'],
    },
    {
      id: 'tabacos',
      name: 'Real Fábrica de Tabacos',
      kind: 'civic',
      rubber: { shape: 'rect', title: 'FÁBRICA DE TABACOS' },
      photo: require('../../../assets/tours/sevilla-arenal/tabacos.jpg'),
      thumb: require('../../../assets/tours/sevilla-arenal/thumbs/tabacos.jpg'),
      photoCredit: credit('tabacos'),
      coord: coord('tabacos'),
      arriveHint: 'Busca la figura alada con una trompeta en lo alto de la portada.',
      audioTitle: 'La fábrica de las cigarreras',
      p1: 'Se construyó en el siglo XVIII para fabricar tabaco, y fue uno de los mayores edificios industriales de Europa. Tenía foso y garitas, como un castillo, para vigilar un producto muy valioso.',
      look: 'La Fama sobre el frontón: un ángel que anuncia con su trompeta.',
      p2: 'Aquí trabajaban miles de cigarreras. Una de ellas inspiró a Carmen, la protagonista de la novela de Mérimée y de la ópera de Bizet. Desde mediados del siglo XX es la sede de la Universidad de Sevilla.',
      fact: 'El foso sigue ahí: rodea el edificio y se cruza por pequeños puentes.',
      captions: ['La portada principal', 'La Fama', 'El foso', 'La calle San Fernando'],
    },
    {
      id: 'plaza-espana',
      name: 'Plaza de España',
      kind: 'monument',
      rubber: { shape: 'oval', title: 'PLAZA DE ESPAÑA' },
      photo: require('../../../assets/tours/sevilla-arenal/plaza-espana.jpg'),
      thumb: require('../../../assets/tours/sevilla-arenal/thumbs/plaza-espana.jpg'),
      photoCredit: credit('plaza-espana'),
      coord: coord('plaza-espana'),
      arriveHint: 'Ponte en el centro: el edificio te rodea en un gran semicírculo.',
      audioTitle: 'Un abrazo a América',
      p1: 'La diseñó Aníbal González para la Exposición Iberoamericana de 1929. Su forma de semicírculo abierto hacia el río simboliza el abrazo de España a sus antiguos territorios de América.',
      look: 'Los bancos de azulejo al pie del edificio: cada uno es una provincia, con su mapa y una escena de su historia.',
      p2: 'El canal se cruza por cuatro puentes, por los antiguos reinos de España, y se puede recorrer en barca. Las dos torres miden unos 80 metros.',
      fact: 'Aquí se rodaron escenas de La guerra de las galaxias: Episodio II, como si fuera un palacio de otro planeta.',
      captions: ['El semicírculo', 'Los bancos de las provincias', 'Los puentes de azulejo', 'El canal'],
    },
    {
      id: 'maria-luisa',
      name: 'Parque de María Luisa',
      kind: 'public',
      rubber: { shape: 'circle', title: 'PARQUE DE MARÍA LUISA' },
      photo: require('../../../assets/tours/sevilla-arenal/maria-luisa.jpg'),
      thumb: require('../../../assets/tours/sevilla-arenal/thumbs/maria-luisa.jpg'),
      photoCredit: credit('maria-luisa'),
      coord: coord('maria-luisa'),
      arriveHint: 'Estás en la Plaza de América: busca la torre del Pabellón Mudéjar y las palomas.',
      audioTitle: 'El jardín de la Exposición',
      p1: 'La infanta María Luisa de Orleans regaló a Sevilla los jardines de San Telmo en 1893. Para la Exposición de 1929 el paisajista francés Forestier los rediseñó con glorietas, fuentes y estanques.',
      look: 'El Pabellón Mudéjar, con sus arcos de herradura y su torre de tejas verdes.',
      p2: 'Alrededor de esta plaza están tres pabellones de la Exposición: el Mudéjar, hoy Museo de Artes y Costumbres Populares, el Real y el del Renacimiento, que guarda el Museo Arqueológico.',
      fact: 'La Plaza de América es conocida como la plaza de las palomas: muchos sevillanos recuerdan haberles dado de comer de niños.',
      captions: ['El Pabellón Mudéjar', 'La Plaza de América', 'Las palomas', 'Los jardines'],
    },
  ],
  legs: geo.legs as LngLat[][],
  legSteps: geo.steps as RouteStep[][],
  onTheWay: [
    { afterStop: 0, name: 'Las Atarazanas', text: 'De camino: las Atarazanas', story: 'Esos muros de ladrillo son las Reales Atarazanas, los astilleros que mandó construir Alfonso X en el siglo XIII para fabricar galeras junto al río.' },
    { afterStop: 1, name: 'Torre del Oro', text: 'De camino: la Torre del Oro', story: 'A tu derecha, junto al río, la Torre del Oro. Por este tramo del Guadalquivir llegaban los barcos de América cuando Sevilla era el puerto de Indias.' },
    { afterStop: 2, name: 'Hotel Alfonso XIII', text: 'De camino: el Hotel Alfonso XIII', story: 'Este hotel de ladrillo y azulejo se construyó para alojar a los visitantes de la Exposición de 1929. Lo inauguró el propio rey que le da nombre.' },
    { afterStop: 3, name: 'Los Jardines', text: 'De camino: los pabellones de 1929', story: 'Por esta zona verás varios pabellones que dejaron los países de la Exposición de 1929. Muchos son hoy consulados, colegios o sedes de la universidad.' },
    { afterStop: 4, name: 'Glorieta de Bécquer', text: 'De camino: la Glorieta de Bécquer', story: 'En el parque hay un monumento al poeta Gustavo Adolfo Bécquer, con figuras que representan el amor ilusionado, el amor poseído y el amor perdido.' },
  ],
};
