import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polyline, Rect, Stop } from 'react-native-svg';
import { DuotoneImage } from '@/components/DuotoneImage';
import { euros } from '@/components/LockedTour';
import { PressableScale } from '@/components/motion';
import { RouteStamp } from '@/components/RouteStamp';
import { stopInk } from '@/components/RubberStamp';
import type { LockedTour, Tour } from '@/data/types';
import { cumulative, formatDistance } from '@/lib/geo';
import { routeProgress, type UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { brand, functional, neutral, radius, shadow, type TourPalette } from '@/theme/tokens';

/*
 * Piezas del modelo G («ruta dibujada sobre foto») para elegir ciudad y tour:
 * cada tour enseña su ruta como una línea de paradas encima de su foto, con
 * las paradas selladas rellenas y el sello de la ruta (de su postal) en la esquina.
 */

export const HERO = 112;

/* ── Iconos (24 × 24, como en el diseño) ─────────────────────────── */

const I = {
  ticket: (c: string) => <Path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" fill="none" stroke={c} strokeWidth={2.4} strokeLinejoin="round" />,
  clock: (c: string) => (
    <>
      <Circle cx={12} cy={12} r={9} fill="none" stroke={c} strokeWidth={2.6} />
      <Path d="M12 7v5l3.5 2" fill="none" stroke={c} strokeWidth={2.6} strokeLinecap="round" />
    </>
  ),
  steps: (c: string) => <Path d="M7.5 3C9.4 3 10 5 10 7.3S9.2 11 7.5 11 5 9.6 5 7.3 5.6 3 7.5 3zM5.4 12.5h4.2v2.2a2.1 2.1 0 0 1-4.2 0zM16.5 8c1.9 0 2.5 2 2.5 4.3S18.2 16 16.5 16 14 14.6 14 12.3 14.6 8 16.5 8zM14.4 17.5h4.2v2.2a2.1 2.1 0 0 1-4.2 0z" fill={c} />,
  pin: (c: string) => <Path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" fill={c} />,
  audio: (c: string) => (
    <>
      <Path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
      <Rect x={3} y={14} width={5} height={7} rx={2} fill="none" stroke={c} strokeWidth={2.4} />
      <Rect x={16} y={14} width={5} height={7} rx={2} fill="none" stroke={c} strokeWidth={2.4} />
    </>
  ),
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
      <Text style={s.statText}>{children}</Text>
    </View>
  );
}

/** Tintas de las paradas de un tour en orden: la de la parada si está sellada, null si no */
export function stopInks(tour: Tour, route: UserRoute | undefined) {
  const stamped = new Set(route?.stamps.map(st => st.stopId));
  return tour.stops.map(st => (stamped.has(st.id) ? stopInk(tour, st.id) : null));
}

export const durationLabel = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ''}`);

/* ── Ruta dibujada ───────────────────────────────────────────────── */

/**
 * La ruta como una línea en zigzag de parada en parada, dejando sitio a la
 * derecha para el sello. Hecho: línea continua y paradas rellenas; por hacer:
 * línea de puntos y paradas en blanco; la siguiente parada, más grande.
 */
function RouteLine({ width, palette, stamped, dim }: { width: number; palette: TourPalette; stamped: boolean[]; dim?: boolean }) {
  const n = stamped.length;
  if (!width || n < 2) return null;
  const x0 = 22, x1 = width - 90;
  const pts = stamped.map((_, i) => {
    const up = i % 2 === 1;
    const jitter = ((i * 7) % 9) - 4;
    return [x0 + (i * (x1 - x0)) / (n - 1), (up ? 45 : 68) + jitter] as const;
  });
  const next = stamped.indexOf(false);
  const started = stamped.some(Boolean);
  // Sin empezar, la salida va destacada; a medias, la parada que toca
  const current = next === -1 ? -1 : started ? next : 0;
  const solidTo = next === -1 ? n - 1 : started ? next : 0;
  const line = (from: number, to: number) => pts.slice(from, to + 1).map(p => p.join(',')).join(' ');
  return (
    <Svg width={width} height={HERO} style={StyleSheet.absoluteFill} opacity={dim ? 0.75 : 1}>
      {solidTo < n - 1 && <Polyline points={line(solidTo, n - 1)} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 8" />}
      {solidTo > 0 && <Polyline points={line(0, solidTo)} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map(([x, y], i) => {
        const end = i === 0 || i === n - 1;
        if (i === current) return <Circle key={i} cx={x} cy={y} r={started ? 9.5 : 8.5} fill={palette.t2} stroke="#fff" strokeWidth={3} />;
        if (stamped[i]) return <Circle key={i} cx={x} cy={y} r={end ? 7 : 6} fill={palette.t} stroke="#fff" strokeWidth={3} />;
        return <Circle key={i} cx={x} cy={y} r={end ? 7 : 5.5} fill="#fff" stroke={palette.t} strokeWidth={3} />;
      })}
    </Svg>
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
      <Text style={[s.tagText, { color }]}>{label}</Text>
    </View>
  );
}

/* ── Tarjetas de tour ────────────────────────────────────────────── */

/** Tour que se puede hacer: su foto en duotono con la ruta encima, y debajo título, estado y datos */
export function TourRouteCard({ tour, route }: { tour: Tour; route: UserRoute | undefined }) {
  const [w, setW] = useState(0);
  const p = tour.palette;
  const prog = routeProgress(tour.id, route);
  const stamped = stopInks(tour, route).map(Boolean);
  const meters = tour.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
  const next = stamped.indexOf(false);
  const tag = prog.completed
    ? <Tag label="¡Sello tuyo!" bg={neutral.ink} color="#fff" />
    : prog.started
      ? <Tag label={`Parada ${next + 1} de ${prog.total}`} bg={p.soft} color={p.deep} />
      : tour.price === 'free'
        ? <Tag label="Gratis" bg={brand.sun} color={neutral.ink} />
        : <Tag label={euros(tour.price.eur)} bg={functional.premium} color="#fff" icon={<Icon name="lock" color={functional.gold} size={12} />} />;
  const label = `${tour.title}. ${prog.completed ? 'Completada' : prog.started ? `Vas por la parada ${next + 1} de ${prog.total}` : `${prog.total} paradas`}`;

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} scaleTo={0.975} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: tour.id } })} style={s.card}>
      <View style={s.hero} onLayout={e => setW(e.nativeEvent.layout.width)}>
        <DuotoneImage source={tour.stops[tour.emblemStop].photo} palette={p} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
        <RouteLine width={w} palette={p} stamped={stamped} />
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
        <View style={s.stats}>
          <Stat icon="clock" color={p.t}>{durationLabel(tour.durationMin)}</Stat>
          <Stat icon="steps" color={p.t}>{formatDistance(meters)}</Stat>
          <Stat icon="pin" color={p.t}>{tour.stops.length} paradas</Stat>
          <Stat icon="audio" color={p.t}>Audio</Stat>
        </View>
      </View>
    </PressableScale>
  );
}

/** Tour de pago bloqueado: sin foto, la ruta dibujada sobre su paleta, velada, con el candado y el precio */
export function LockedRouteCard({ tour, onPress }: { tour: LockedTour; onPress: () => void }) {
  const [w, setW] = useState(0);
  const p = tour.palette;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${tour.title}, tour de pago bloqueado, ${euros(tour.eur)}`} scaleTo={0.975} onPress={onPress} style={s.card}>
      <View style={s.hero} onLayout={e => setW(e.nativeEvent.layout.width)}>
        <Drawn palette={p} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(29,43,79,0.5)' }]} />
        <RouteLine width={w} palette={p} stamped={Array(tour.stops).fill(false)} dim />
        <RouteStamp height={60} rotate={4} style={s.corner} />
      </View>
      <View style={s.body}>
        <View style={s.row}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.cat, { color: p.t }]} numberOfLines={1}>{tour.category}</Text>
            <Text style={s.title}>{tour.title}</Text>
          </View>
          <Tag label={euros(tour.eur)} bg={functional.premium} color="#fff" icon={<Icon name="lock" color={functional.gold} size={12} />} />
        </View>
        <View style={s.stats}>
          <Stat icon="clock" color={neutral.ink3}>{durationLabel(tour.durationMin)}</Stat>
          <Stat icon="pin" color={neutral.ink3}>{tour.stops} paradas</Stat>
        </View>
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
  title: { fontFamily: font.serif, fontSize: 19, lineHeight: 22, color: neutral.ink, marginTop: 1 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: radius.pill },
  tagText: { fontFamily: font.black, fontSize: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontFamily: font.black, fontSize: 13.5, color: neutral.ink },
});
