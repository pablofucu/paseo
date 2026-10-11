import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Tour } from '@/data/types';
import { cumulative, formatDistance } from '@/lib/geo';
import { tintaDeRuta } from '@/lib/ink';
import { POSTCARD, postcardBlankXml, postcardFaceXml } from '@/lib/postcard';
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
 * Postal de una ruta. Ganada: la ilustración de los sitios con el marco, los
 * textos y el matasellos con la fecha en que se completó. Sin ganar: en
 * blanco, con el progreso.
 */
export function Postcard({ tour, route, width, back }: Props) {
  const id = useMemo(() => `pc${uid++}_`, []);
  const k = width / VB.w;
  const height = postcardHeight(width);
  const accent = tintaDeRuta(tour.accent);
  const date = route?.postcardUnlockedAt;
  const face = useMemo(
    () => (date ? postcardFaceXml({ id, title: tour.title, subtitle: tour.postcard.subtitle, value: tour.postcard.value, accent, city: tour.city, date }) : postcardBlankXml({ title: tour.title, accent })),
    [id, date, tour, accent],
  );
  const art = { left: (POSTCARD.art.x - VB.x) * k, top: (POSTCARD.art.y - VB.y) * k, width: POSTCARD.art.w * k, height: POSTCARD.art.h * k };

  if (back) return <PostcardBack tour={tour} route={route} width={width} accent={accent} />;

  const prog = routeProgress(tour.id, route);
  return (
    <View style={{ width, height }}>
      <Paper width={width} height={height} />
      {date ? (
        <Image source={tour.postcard.art} style={[s.abs, art]} contentFit="cover" accessibilityLabel={`Ilustración de la postal ${tour.title}`} />
      ) : (
        <View style={[s.abs, art, s.blank]}>
          <Text style={[s.blankOver, { fontSize: Math.max(10, 15 * k * 1.6) }]}>
            {prog.started ? `${prog.done} de ${prog.total} paradas` : 'Sin empezar'}
          </Text>
          <View style={s.dots}>
            {tour.stops.map(st => {
              const on = route?.stamps.some(x => x.stopId === st.id);
              return <View key={st.id} style={[s.dot, { borderColor: accent, backgroundColor: on ? accent : 'transparent' }]} />;
            })}
          </View>
          <Text style={[s.blankText, { fontSize: Math.max(11, 13 * k * 1.6) }]}>
            Completa la ruta para revelar la postal
          </Text>
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
  const date = route?.postcardUnlockedAt ?? new Date().toISOString();
  const meters = tour.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
  const when = new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const mark = useMemo(() => postmarkXml({ city: tour.city, date }), [tour.city, date]);
  const fs = (n: number) => Math.max(9, n * k);
  // Sello de carta: un trozo de la ilustración con su borde perforado
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
          <Image source={tour.postcard.art} style={{ position: 'absolute', height: '100%', aspectRatio: 832 / 444, left: -stampW * 0.6 }} contentFit="cover" />
        </View>
      </View>
      <View style={[s.abs, { right: 120 * k, top: 120 * k }]} pointerEvents="none">
        <SvgXml xml={mark} width={170 * 1.35 * k} height={90 * 1.35 * k} />
      </View>
      {[300, 370, 440].map(y => <View key={y} style={[s.abs, { left: 560 * k, right: 60 * k, top: y * k, height: 1.5, backgroundColor: 'rgba(90,67,32,0.3)' }]} />)}
    </View>
  );
}

const s = StyleSheet.create({
  abs: { position: 'absolute' },
  blank: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  blankOver: { fontFamily: font.black, letterSpacing: 1.5, textTransform: 'uppercase', color: '#7d705a' },
  blankText: { fontFamily: font.bold, color: '#9a8c6e', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  msg: { fontFamily: font.serifBold, color: '#3a3226' },
  msgSmall: { fontFamily: font.bold, color: '#6f6450' },
});
