import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Tour } from '@/data/types';
import { completedPhrase } from '@/lib/dates';
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
  const k = width / VB.w;
  const height = postcardHeight(width);
  const accent = tintaDeRuta(tour.accent);
  // Solo se ve la ilustración si la ruta está completa de verdad (si el tour gana una parada, vuelve a quedar a medias)
  const prog = routeProgress(tour.id, route);
  const date = prog.completedAt;
  // El reverso no lleva la cara: no se genera
  const face = useMemo(
    () => (back ? '' : date ? postcardFaceXml({ title: tour.title, subtitle: tour.postcard.subtitle, value: tour.postcard.value, accent }) : postcardBlankXml({ title: tour.title, accent })),
    [date, tour, accent, back],
  );
  const art = { left: (POSTCARD.art.x - VB.x) * k, top: (POSTCARD.art.y - VB.y) * k, width: POSTCARD.art.w * k, height: POSTCARD.art.h * k };

  if (back) return <PostcardBack tour={tour} route={route} width={width} accent={accent} />;

  // Lo que se pinta pequeño (pin, ventana del mapa) usa la miniatura; la lista, la de 832 px;
  // solo la postal grande decodifica la ilustración entera (1664 px, ~6 MB en memoria cada una)
  const artSource = (width < 200 ? POSTCARD_THUMB[tour.id] : width < 480 ? POSTCARD_MID[tour.id] : undefined) ?? tour.postcard.art;
  const reveal = prog.total ? prog.done / prog.total : 0;
  return (
    <View style={{ width, height }}>
      <Paper width={width} height={height} />
      {date ? (
        <Image source={artSource} style={[s.abs, art]} contentFit="cover" accessibilityLabel={`Ilustración de la postal ${tour.title}`} />
      ) : (
        // Sin ganar: la escena asoma difuminada y se va aclarando con cada sello
        <View
          accessible
          accessibilityLabel={`Postal ${tour.title} sin ganar: ${prog.started ? `${prog.done} de ${prog.total} paradas` : 'sin empezar'}`}
          style={[s.abs, art, s.blank]}
        >
          <Image source={POSTCARD_BLUR[tour.id] ?? POSTCARD_THUMB[tour.id] ?? tour.postcard.art} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: PAPEL_POSTAL, opacity: 0.94 - reveal * 0.72 }]} />
        </View>
      )}
      <SvgXml xml={face} width={width} height={height} style={StyleSheet.absoluteFill} />
    </View>
  );
});

function PostcardBack({ tour, route, width, accent }: { tour: Tour; route: UserRoute | undefined; width: number; accent: string }) {
  const k = width / VB.w;
  const height = postcardHeight(width);
  const owner = usePassport(s => s.passport.owner);
  const [today] = useState(() => new Date().toISOString());
  const date = routeProgress(tour.id, route).completedAt ?? today;
  const note = route?.note?.trim();
  const meters = tour.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
  const when = new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const fs = (n: number) => Math.max(9, n * k);
  // Sello de carta: el sello exclusivo de la ruta, no un trozo de la postal
  const stampW = 150 * k, stampH = 190 * k;
  return (
    <View style={{ width, height }}>
      <Paper width={width} height={height} />
      <View style={[s.abs, { left: 60 * k, top: 60 * k, width: 420 * k, bottom: 60 * k }]}>
        <Text style={[s.msg, { fontSize: fs(25), lineHeight: fs(38) }]}>
          ¡Hola! {completedPhrase(date)} «{tour.title}»: {tour.stops.length} paradas y {formatDistance(meters)} a pie por {tour.city}.
        </Text>
        <Text style={[s.msgSmall, { fontSize: fs(19), lineHeight: fs(28), marginTop: 14 * k }]}>{tour.stops.map(st => st.name).join(' · ')}</Text>
        <Text style={[s.msg, { fontSize: fs(23), marginTop: 'auto' }]}>{tour.city}, {when}{owner ? `\n— ${owner}` : ''}</Text>
      </View>
      <View style={[s.abs, { left: 520 * k, top: 60 * k, width: 2, height: 480 * k, backgroundColor: 'rgba(90,67,32,0.25)' }]} />
      <View style={[s.abs, { right: 70 * k, top: 52 * k, width: stampW, height: stampH, padding: 6 * k, backgroundColor: '#fbf7ec', borderWidth: 1, borderColor: '#d9ccab', borderStyle: 'dashed', transform: [{ rotate: '2deg' }] }]}>
        <View style={{ flex: 1, overflow: 'hidden', borderWidth: 2, borderColor: accent }}>
          <Image source={tour.stamp.art} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
      </View>
      {note ? (
        <Text style={[s.abs, s.hand, { left: 560 * k, right: 60 * k, top: 248 * k, fontSize: fs(38), lineHeight: 70 * k }]} numberOfLines={3}>{note}</Text>
      ) : null}
      {[300, 370, 440].map(y => <View key={y} style={[s.abs, { left: 560 * k, right: 60 * k, top: y * k, height: 1.5, backgroundColor: 'rgba(90,67,32,0.3)' }]} />)}
    </View>
  );
}

const s = StyleSheet.create({
  abs: { position: 'absolute' },
  blank: { overflow: 'hidden', backgroundColor: PAPEL_POSTAL },
  msg: { fontFamily: font.serifBold, color: '#3a3226' },
  hand: { fontFamily: font.hand, color: '#2f3f6b', transform: [{ rotate: '-2deg' }] },
  msgSmall: { fontFamily: font.bold, color: '#6f6450' },
});
