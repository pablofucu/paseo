import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { BANNER_POSITION, TourBanner } from '@/components/TourBanner';
import { euros } from '@/components/LockedTour';
import { PressableScale } from '@/components/motion';
import { RouteStamp } from '@/components/RouteStamp';
import { stopInk } from '@/components/RubberStamp';
import type { LockedTour, Tour } from '@/data/types';
import { formatDuration } from '@/lib/duration';
import { formatDistance, routeMeters } from '@/lib/geo';
import { NEARBY_MAX_M, startLabel } from '@/lib/nearby';
import { routeProgress, type UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { brand, functional, neutral, radius, shadow, type TourPalette } from '@/theme/tokens';

/*
 * Piezas para elegir ciudad y tour: cada tour enseña su ilustración de
 * portada, limpia, con el sello de la ruta en la esquina.
 */

export const HERO = 112;

/* ── Iconos (24 × 24, como en el diseño) ─────────────────────────── */

const I = {
  ticket: (c: string) => <Path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" fill="none" stroke={c} strokeWidth={2.4} strokeLinejoin="round" />,
  lock: (c: string) => (
    <>
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} fill={c} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
};

export function Icon({ name, color, size = 16 }: { name: keyof typeof I; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">{I[name](color)}</Svg>;
}

/** Un dato con icono: «2 h», «2,4 km», «8 paradas» */
export function Stat({ icon, color, children }: { icon: keyof typeof I; color: string; children: ReactNode }) {
  return (
    <View style={s.stat}>
      <Icon name={icon} color={color} />
      <Text maxFontSizeMultiplier={1.3} style={s.statText}>{children}</Text>
    </View>
  );
}

/** Tintas de las paradas de un tour en orden: la de la parada si está sellada, null si no */
export function stopInks(tour: Tour, route: UserRoute | undefined) {
  const stamped = new Set(route?.stamps.map(st => st.stopId));
  return tour.stops.map(st => (stamped.has(st.id) ? stopInk(tour, st.id) : null));
}

export const durationLabel = formatDuration;

/* ── Trayecto ─────────────────────────────────────────────────────── */

const J_H = 74, J_Y = 34, J_PAD = 14;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * El paseo como una línea: tú (punto azul), lo que falta hasta el inicio
 * (punteado) y la ruta en su color, con los km y el tiempo encima.
 * Sin posición (o lejos, o sin longitud: tour bloqueado) arranca en «INICIO».
 */
export function Journey({ color, minutes, meters, stops, startMeters }: {
  color: string;
  minutes: number;
  /** Longitud de la ruta en metros, si se conoce */
  meters?: number | null;
  /** Nº de paradas: se dice cuando no hay posición con la que situarte */
  stops: number;
  startMeters?: number | null;
}) {
  const [w, setW] = useState(0);
  const here = startMeters != null && startMeters <= NEARBY_MAX_M;
  const atStart = here && startMeters < 8;
  const showMe = here && !atStart;
  const W = Math.max(w, 1);
  const x0 = J_PAD, x1 = W - J_PAD;
  // El inicio se sitúa en proporción, sin que el tramo azul quede ridículo ni se coma la ruta
  const xs = showMe ? x0 + clamp(startMeters / (startMeters + (meters ?? 0) || 1), 0.15, 0.45) * (x1 - x0) : x0;
  const data = [meters ? formatDistance(meters) : null, durationLabel(minutes), showMe || atStart ? null : `${stops} paradas`].filter(Boolean).join(' · ');
  const label = (x: number, text: string, align: 'center' | 'left' = 'center') => (
    <Text maxFontSizeMultiplier={1.3} style={[s.jLbl, { left: align === 'left' ? 0 : clamp(x - 24, 0, W - 48), textAlign: align }]}>{text}</Text>
  );
  const val = (x: number, text: string, c: string, size = 14) => (
    <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.jVal, { left: clamp(x - 90, 0, Math.max(0, W - 180)), color: c, fontSize: size }]}>{text}</Text>
  );

  return (
    <View
      style={s.journey}
      onLayout={e => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`${durationLabel(minutes)}${meters ? `, ${formatDistance(meters)}` : ''}${showMe ? `, a ${formatDistance(startMeters)} del inicio` : atStart ? ', estás en el inicio' : `, ${stops} paradas`}`}
    >
      {w > 0 && (
        <>
          <Svg width={w} height={J_H} style={StyleSheet.absoluteFill}>
            {showMe && <Line x1={x0 + 8} y1={J_Y} x2={xs - 9} y2={J_Y} stroke={functional.me} strokeWidth={3.5} strokeLinecap="round" strokeDasharray="0.1 7" />}
            <Line x1={xs} y1={J_Y} x2={x1} y2={J_Y} stroke={color} strokeWidth={7} strokeLinecap="round" />
            {showMe && (
              <>
                <Circle cx={x0} cy={J_Y} r={11} fill={functional.me} opacity={0.22} />
                <Circle cx={x0} cy={J_Y} r={6.5} fill={functional.me} stroke={neutral.white} strokeWidth={2.5} />
              </>
            )}
            <Circle cx={xs} cy={J_Y} r={9} fill={neutral.white} stroke={color} strokeWidth={4} />
            <Circle cx={x1} cy={J_Y} r={9} fill={color} />
            <Path d={`M${x1 - 3} ${J_Y - 5}v10M${x1 - 3} ${J_Y - 5}h6.5l-1.5 2.5 1.5 2.5h-6.5`} fill={neutral.white} stroke={neutral.white} strokeWidth={1.6} strokeLinejoin="round" />
          </Svg>
          {showMe && val((x0 + xs) / 2, formatDistance(startMeters), functional.me)}
          {atStart && <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.jVal, { left: 0, textAlign: 'left', color: functional.me }]}>Estás en el inicio</Text>}
          {val(atStart ? (xs + x1) / 2 + 40 : (xs + x1) / 2, data, color, 15)}
          {showMe && label(x0, 'TÚ')}
          {label(xs, 'INICIO', showMe ? 'center' : 'left')}
          {label(x1, 'FIN')}
        </>
      )}
    </View>
  );
}

/** Fondo dibujado (sin foto): degradado de la paleta */
function Drawn({ palette }: { palette: TourPalette }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`g${palette.t.slice(1)}`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={palette.t2} />
          <Stop offset="0.75" stopColor={palette.t} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#g${palette.t.slice(1)})`} />
    </Svg>
  );
}

function Tag({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: ReactNode }) {
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      {icon}
      <Text maxFontSizeMultiplier={1.3} style={[s.tagText, { color }]}>{label}</Text>
    </View>
  );
}

/* ── Tarjetas de tour ────────────────────────────────────────────── */

/** Tour que se puede hacer: su ilustración, y debajo título, estado y datos */
export function TourRouteCard({ tour, route, startMeters }: { tour: Tour; route: UserRoute | undefined; /** Distancia al inicio de la ruta, si se sabe dónde estás */ startMeters?: number | null }) {
  const p = tour.palette;
  const prog = routeProgress(tour.id, route);
  const next = stopInks(tour, route).indexOf(null);
  const near = startLabel(startMeters);
  const meters = routeMeters(tour);
  // Solo el precio: si la ruta está hecha o a medias ya lo dicen el sello y la línea
  const tag = tour.price === 'free'
    ? <Tag label="Gratis" bg={brand.sun} color={neutral.ink} />
    : <Tag label={euros(tour.price.eur)} bg={functional.premium} color={neutral.white} icon={<Icon name="lock" color={functional.gold} size={12} />} />;
  const label = `${tour.title}. ${prog.completed ? 'Completada' : prog.started ? `Vas por la parada ${next + 1} de ${prog.total}` : `${prog.total} paradas`}. ${durationLabel(tour.durationMin)}, ${formatDistance(meters)}${near ? `. ${near}` : ''}`;

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} scaleTo={0.975} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: tour.id } })} style={s.card}>
      <View style={s.hero}>
        <TourBanner tour={tour} />
        <RouteStamp tour={tour} done={prog.done} total={prog.total} height={60} rotate={4} style={s.corner} />
      </View>
      <View style={s.body}>
        <View style={s.row}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.cat, { color: p.t }]} numberOfLines={1}>{tour.category}</Text>
            <Text style={s.title}>{tour.title}</Text>
          </View>
          {tag}
        </View>
        <Journey color={p.t} minutes={tour.durationMin} meters={meters} stops={tour.stops.length} startMeters={startMeters} />
      </View>
    </PressableScale>
  );
}

/** Tour de pago bloqueado: su ilustración (o su paleta, si aún no tiene) velada, con el candado y el precio */
export function LockedRouteCard({ tour, onPress }: { tour: LockedTour; onPress: () => void }) {
  const p = tour.palette;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${tour.title}, tour de pago bloqueado, ${euros(tour.eur)}`} scaleTo={0.975} onPress={onPress} style={s.card}>
      <View style={s.hero}>
        {tour.banner
          ? <Image source={tour.banner} style={[StyleSheet.absoluteFill, { backgroundColor: p.deep }]} contentFit="cover" contentPosition={BANNER_POSITION} accessibilityIgnoresInvertColors />
          : <Drawn palette={p} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(29,43,79,0.35)' }]} />
        <RouteStamp locked={tour} height={60} rotate={4} style={s.corner} />
      </View>
      <View style={s.body}>
        <View style={s.row}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.cat, { color: p.t }]} numberOfLines={1}>{tour.category}</Text>
            <Text style={s.title}>{tour.title}</Text>
          </View>
          <Tag label={euros(tour.eur)} bg={functional.premium} color={neutral.white} icon={<Icon name="lock" color={functional.gold} size={12} />} />
        </View>
        <Journey color={neutral.ink3} minutes={tour.durationMin} stops={tour.stops} />
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: neutral.surface, borderRadius: 22, overflow: 'hidden', ...shadow[2] },
  hero: { height: HERO, overflow: 'hidden' },
  corner: { position: 'absolute', right: 14, top: 12 },
  body: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cat: { fontFamily: font.black, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: font.serifBold, fontSize: 19, lineHeight: 22, color: neutral.ink, marginTop: 1 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 26, paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill },
  tagText: { fontFamily: font.black, fontSize: 12 },
  near: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink2 },
  journey: { height: J_H },
  jVal: { position: 'absolute', top: 0, width: 180, textAlign: 'center', fontFamily: font.black },
  jLbl: { position: 'absolute', top: 52, width: 48, fontFamily: font.black, fontSize: 11, letterSpacing: 0.6, color: neutral.ink3 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontFamily: font.black, fontSize: 13.5, color: neutral.ink },
});
