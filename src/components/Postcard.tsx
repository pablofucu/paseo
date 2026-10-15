import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Pack } from '@/data/packs';
import { getCity, getTour } from '@/data/tours';
import type { Tour } from '@/data/types';
import { completedPhrase } from '@/lib/dates';
import { packCompletedAt, packStampArt } from '@/lib/packs';
import { cumulative, formatDistance } from '@/lib/geo';
import { PAPEL_POSTAL, tintaDeRuta } from '@/lib/ink';
import { POSTCARD, POSTCARD_BLUR, POSTCARD_MID, POSTCARD_THUMB, postcardBlankXml, postcardFaceXml } from '@/lib/postcard';
import { routeProgress, usePassport, type UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

/** Caja de dibujo de la postal, con margen para la sombra */
const VB = { x: -14, y: -10, w: 928, h: 628 };
export const postcardHeight = (width: number) => (width * VB.h) / VB.w;


/** Papel perforado con grano y sombra, horneado (scripts/build-postcard-paper.mjs): sin máscaras SVG */
const PAPER = require('../../assets/postcards/paper.png');
const Paper = ({ width, height }: { width: number; height: number }) => (
  <Image source={PAPER} style={{ position: 'absolute', left: 0, top: 0, width, height }} contentFit="fill" cachePolicy="memory" transition={0} />
);

/** Lo que hace falta para dibujar una postal, sea de una ruta o de un pack */
export interface PostcardData {
  title: string;
  subtitle: string;
  value: string;
  accent: string;
  /** Ilustración a tamaño completo; sin ella (pack aún por dibujar) sale un hueco rayado */
  art?: ImageSourcePropType;
  /** Variantes pequeñas de la ilustración */
  thumb?: ImageSourcePropType;
  mid?: ImageSourcePropType;
  /** Silueta ya difuminada, para la postal sin ganar */
  blur?: ImageSourcePropType;
}

/** Datos de la postal de una ruta */
export const tourPostcardData = (tour: Tour): PostcardData => ({
  title: tour.title,
  subtitle: tour.postcard.subtitle,
  value: tour.postcard.value,
  accent: tintaDeRuta(tour.accent),
  art: tour.postcard.art,
  thumb: POSTCARD_THUMB[tour.id],
  mid: POSTCARD_MID[tour.id],
  blur: POSTCARD_BLUR[tour.id] ?? POSTCARD_THUMB[tour.id],
});

/** Datos de la postal de un pack */
export const packPostcardData = (pack: Pack): PostcardData => ({
  title: pack.name,
  subtitle: pack.postcard?.subtitle ?? '',
  value: pack.postcard?.value ?? '',
  accent: tintaDeRuta(pack.accent),
  art: pack.postcard?.art,
  thumb: pack.postcard?.thumb,
  mid: pack.postcard?.mid,
  blur: pack.postcard?.blur ?? pack.postcard?.thumb,
});

interface FrontProps {
  data: PostcardData;
  /** Ganada: con la ilustración y los textos; si no, en blanco */
  unlocked: boolean;
  /** Cuánto se ha aclarado la silueta sin ganar (0–1), según el progreso */
  reveal?: number;
  /** Texto de accesibilidad de la postal sin ganar */
  blankLabel?: string;
  width: number;
}

/**
 * Cara de una postal (de ruta o de pack). Ganada: su ilustración con el marco
 * y los textos, sin matasellos encima. Sin ganar: en blanco, con la silueta
 * difuminada que se aclara con `reveal`.
 */
export const PostcardFront = memo(function PostcardFront({ data, unlocked, reveal = 0, blankLabel, width }: FrontProps) {
  const k = width / VB.w;
  const height = postcardHeight(width);
  const { title, subtitle, value, accent } = data;
  const face = useMemo(
    () => (unlocked ? postcardFaceXml({ title, subtitle, value, accent }) : postcardBlankXml({ title, accent })),
    [unlocked, title, subtitle, value, accent],
  );
  const art = { left: (POSTCARD.art.x - VB.x) * k, top: (POSTCARD.art.y - VB.y) * k, width: POSTCARD.art.w * k, height: POSTCARD.art.h * k };

  // Lo que se pinta pequeño (pin, ventana del mapa) usa la miniatura; la lista, la de 832 px;
  // solo la postal grande decodifica la ilustración entera (1664 px, ~6 MB en memoria cada una)
  const artSource = (width < 200 ? data.thumb : width < 480 ? data.mid : undefined) ?? data.art;
  return (
    <View style={{ width, height }}>
      <Paper width={width} height={height} />
      {unlocked && artSource ? (
        <Image source={artSource} style={[s.abs, art]} contentFit="cover" accessibilityLabel={`Ilustración de la postal ${title}`} />
      ) : (
        // Sin ganar: la escena asoma difuminada y se va aclarando con cada sello
        <View accessible accessibilityLabel={blankLabel ?? `Postal ${title} sin ganar`} style={[s.abs, art, s.blank]}>
          {data.blur && <Image source={data.blur} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: PAPEL_POSTAL, opacity: data.blur ? 0.94 - reveal * 0.72 : 1 }]} />
        </View>
      )}
      <SvgXml xml={face} width={width} height={height} style={StyleSheet.absoluteFill} />
    </View>
  );
});

interface Props {
  tour: Tour;
  route: UserRoute | undefined;
  width: number;
  /** Reverso: mensaje con el resumen de la ruta y su sello, sin matasellos */
  back?: boolean;
}

/**
 * Postal de una ruta. Ganada: su ilustración con el marco y los
 * textos, sin matasellos encima. Sin ganar: en
 * blanco, con el progreso.
 */
export const Postcard = memo(function Postcard({ tour, route, width, back }: Props) {
  // Solo se ve la ilustración si la ruta está completa de verdad (si el tour gana una parada, vuelve a quedar a medias)
  const prog = routeProgress(tour.id, route);
  const data = useMemo(() => tourPostcardData(tour), [tour]);
  if (back) return <TourPostcardBack tour={tour} route={route} width={width} accent={data.accent} />;
  return (
    <PostcardFront
      data={data}
      unlocked={!!prog.completedAt}
      reveal={prog.total ? prog.done / prog.total : 0}
      blankLabel={`Postal ${tour.title} sin ganar: ${prog.started ? `${prog.done} de ${prog.total} paradas` : 'sin empezar'}`}
      width={width}
    />
  );
});

interface PackProps {
  pack: Pack;
  /** Pack completo: la postal se ve; si no, en blanco con la silueta */
  unlocked: boolean;
  /** Sellos del pack ganados / total, para aclarar la silueta */
  progress?: number;
  width: number;
  /** Reverso: mensaje con los sellos del pack y uno de ellos pegado */
  back?: boolean;
}

/** Postal de un pack de rutas: la que se desbloquea con todos sus sellos de carta */
export const PackPostcard = memo(function PackPostcard({ pack, unlocked, progress = 0, width, back }: PackProps) {
  const data = useMemo(() => packPostcardData(pack), [pack]);
  const routes = usePassport(s => s.routes);
  if (back) return <PackPostcardBack pack={pack} routes={routes} width={width} accent={data.accent} />;
  return <PostcardFront data={data} unlocked={unlocked} reveal={progress} blankLabel={`Postal ${pack.name} sin ganar`} width={width} />;
});

interface BackProps {
  width: number;
  accent: string;
  /** Mensaje a mano, la lista de sitios, el lugar y la fecha ISO */
  message: string;
  list: string;
  place: string;
  date: string;
  /** Sello de carta pegado en la esquina */
  stamp: ImageSourcePropType | undefined;
  note?: string;
}

/** Reverso de una postal: mensaje, sello exclusivo pegado y la nota del paseo */
function PostcardBack({ width, accent, message, list, place, date, stamp, note }: BackProps) {
  const k = width / VB.w;
  const height = postcardHeight(width);
  const owner = usePassport(s => s.passport.owner);
  const when = new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const fs = (n: number) => Math.max(9, n * k);
  // Sello de carta: el sello exclusivo de la ruta, no un trozo de la postal
  const stampW = 150 * k, stampH = 190 * k;
  return (
    <View style={{ width, height }}>
      <Paper width={width} height={height} />
      <View style={[s.abs, { left: 60 * k, top: 60 * k, width: 420 * k, bottom: 60 * k }]}>
        <Text style={[s.msg, { fontSize: fs(25), lineHeight: fs(38) }]}>{message}</Text>
        <Text style={[s.msgSmall, { fontSize: fs(19), lineHeight: fs(28), marginTop: 14 * k }]}>{list}</Text>
        <Text style={[s.msg, { fontSize: fs(23), marginTop: 'auto' }]}>{place}, {when}{owner ? `\n— ${owner}` : ''}</Text>
      </View>
      <View style={[s.abs, { left: 520 * k, top: 60 * k, width: 2, height: 480 * k, backgroundColor: 'rgba(90,67,32,0.25)' }]} />
      <View style={[s.abs, { right: 70 * k, top: 52 * k, width: stampW, height: stampH, padding: 6 * k, backgroundColor: '#fbf7ec', borderWidth: 1, borderColor: '#d9ccab', borderStyle: 'dashed', transform: [{ rotate: '2deg' }] }]}>
        <View style={{ flex: 1, overflow: 'hidden', borderWidth: 2, borderColor: accent }}>
          {stamp && <Image source={stamp} style={StyleSheet.absoluteFill} contentFit="cover" />}
        </View>
      </View>
      {note ? (
        <Text style={[s.abs, s.hand, { left: 560 * k, right: 60 * k, top: 248 * k, fontSize: fs(38), lineHeight: 70 * k }]} numberOfLines={3}>{note}</Text>
      ) : null}
      {[300, 370, 440].map(y => <View key={y} style={[s.abs, { left: 560 * k, right: 60 * k, top: y * k, height: 1.5, backgroundColor: 'rgba(90,67,32,0.3)' }]} />)}
    </View>
  );
}

function TourPostcardBack({ tour, route, width, accent }: { tour: Tour; route: UserRoute | undefined; width: number; accent: string }) {
  const [today] = useState(() => new Date().toISOString());
  const meters = tour.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
  const date = routeProgress(tour.id, route).completedAt ?? today;
  return (
    <PostcardBack
      width={width}
      accent={accent}
      message={`¡Hola! ${completedPhrase(date)} «${tour.title}»: ${tour.stops.length} paradas y ${formatDistance(meters)} a pie por ${tour.city}.`}
      list={tour.stops.map(st => st.name).join(' · ')}
      place={tour.city}
      date={date}
      stamp={tour.stamp.art}
      note={route?.note?.trim()}
    />
  );
}

function PackPostcardBack({ pack, routes, width, accent }: { pack: Pack; routes: Record<string, UserRoute>; width: number; accent: string }) {
  const [today] = useState(() => new Date().toISOString());
  const city = getCity(pack.city)?.name ?? '';
  const titles = pack.tours.map(t => getTour(t.id)?.title ?? t.label);
  return (
    <PostcardBack
      width={width}
      accent={accent}
      message={`¡Hola! Ya tengo los ${pack.tours.length} sellos de «${pack.name}», en ${city}.`}
      list={titles.join(' · ')}
      place={city}
      date={packCompletedAt(pack, routes) ?? today}
      stamp={packStampArt(pack, routes)}
    />
  );
}

const s = StyleSheet.create({
  abs: { position: 'absolute' },
  blank: { overflow: 'hidden', backgroundColor: PAPEL_POSTAL },
  msg: { fontFamily: font.serifBold, color: '#3a3226' },
  hand: { fontFamily: font.hand, color: '#2f3f6b', transform: [{ rotate: '-2deg' }] },
  msgSmall: { fontFamily: font.bold, color: '#6f6450' },
});
