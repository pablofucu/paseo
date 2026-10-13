import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Tour } from '@/data/types';
import { cumulative, formatDistance } from '@/lib/geo';
import { PAPEL_POSTAL, tintaDeRuta } from '@/lib/ink';
import { POSTCARD, POSTCARD_THUMB, postcardBlankXml, postcardFaceXml } from '@/lib/postcard';
import { postmarkXml } from '@/lib/rubber';
import { routeProgress, usePassport, type UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

/** Caja de dibujo de la postal, con margen para la sombra */
const VB = { x: -14, y: -10, w: 928, h: 628 };
export const postcardHeight = (width: number) => (width * VB.h) / VB.w;

let uid = 0;

/** Papel perforado con grano y sombra, horneado (scripts/build-postcard-paper.mjs): sin máscaras SVG */
const PAPER = require('../../assets/postcards/paper.png');
const Paper = ({ width, height }: { width: number; height: number }) => (
  <Image source={PAPER} style={{ position: 'absolute', left: 0, top: 0, width, height }} contentFit="fill" cachePolicy="memory" transition={0} />
);

interface Props {
  tour: Tour;
  route: UserRoute | undefined;
  width: number;
  /** Reverso: mensaje con el resumen de la ruta y sello matasellado */
  back?: boolean;
}

/**
 * Postal de una ruta. Ganada: su ilustración con el marco, los
 * textos y el matasellos con la fecha en que se completó. Sin ganar: en
 * blanco, con el progreso.
 */
export function Postcard({ tour, route, width, back }: Props) {
  const id = useMemo(() => `pc${uid++}_`, []);
  const k = width / VB.w;
  const height = postcardHeight(width);
  const accent = tintaDeRuta(tour.accent);
  // Solo se ve la ilustración si la ruta está completa de verdad (si el tour gana una parada, vuelve a quedar a medias)
  const prog = routeProgress(tour.id, route);
  const date = prog.completedAt;
  const face = useMemo(
    () => (date ? postcardFaceXml({ id, title: tour.title, subtitle: tour.postcard.subtitle, value: tour.postcard.value, accent, city: tour.city, date }) : postcardBlankXml({ title: tour.title, accent })),
    [id, date, tour, accent],
  );
  const art = { left: (POSTCARD.art.x - VB.x) * k, top: (POSTCARD.art.y - VB.y) * k, width: POSTCARD.art.w * k, height: POSTCARD.art.h * k };

  if (back) return <PostcardBack tour={tour} route={route} width={width} accent={accent} />;

  // Lo que se pinta pequeño (pin, ventana del mapa) usa la miniatura
  const artSource = width < 200 ? (POSTCARD_THUMB[tour.id] ?? tour.postcard.art) : tour.postcard.art;
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
          <Image source={POSTCARD_THUMB[tour.id] ?? tour.postcard.art} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30 - reveal * 16} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: PAPEL_POSTAL, opacity: 0.94 - reveal * 0.72 }]} />
        </View>
      )}
      <SvgXml xml={face} width={width} height={height} style={StyleSheet.absoluteFill} />
    </View>
  );
}

function PostcardBack({ tour, route, width, accent }: { tour: Tour; route: UserRoute | undefined; width: number; accent: string }) {
  const k = width / VB.w;
  const height = postcardHeight(width);
  const owner = usePassport(s => s.passport.owner);
  const [today] = useState(() => new Date().toISOString());
  const date = routeProgress(tour.id, route).completedAt ?? today;
  const note = route?.note?.trim();
  const meters = tour.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
  const when = new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const mark = useMemo(() => postmarkXml({ city: tour.city, date }), [tour.city, date]);
  const fs = (n: number) => Math.max(9, n * k);
  // Sello de carta: el sello exclusivo de la ruta, no un trozo de la postal
  const stampW = 150 * k, stampH = 190 * k;
  return (
    <View style={{ width, height }}>
      <Paper width={width} height={height} />
      <View style={[s.abs, { left: 60 * k, top: 60 * k, width: 420 * k, bottom: 60 * k }]}>
        <Text style={[s.msg, { fontSize: fs(25), lineHeight: fs(38) }]}>
          ¡Hola! Hoy he completado «{tour.title}»: {tour.stops.length} paradas y {formatDistance(meters)} a pie por {tour.city}.
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
      <View style={[s.abs, { right: 120 * k, top: 120 * k }]} pointerEvents="none">
        <SvgXml xml={mark} width={170 * 1.35 * k} height={90 * 1.35 * k} />
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
