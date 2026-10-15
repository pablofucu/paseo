import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { BANNER_POSITION, TourBanner } from '@/components/TourBanner';
import { euros } from '@/components/LockedTour';
import { PressableScale } from '@/components/motion';
import { RouteStamp } from '@/components/RouteStamp';
import { stopInk } from '@/components/RubberStamp';
import type { LockedTour, Tour } from '@/data/types';
import { formatDuration } from '@/lib/duration';
import { startLabel } from '@/lib/nearby';
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

/* ── Rastro de pasos ──────────────────────────────────────────────── */

/** Una pisada (24 × 24, punta hacia arriba) */
const FOOT = 'M12 1.5c3.6 0 5.5 3.6 5.5 7.6S15.6 15 12 15s-5.5-2-5.5-5.9S8.4 1.5 12 1.5zM8.7 16.5h6.6v2.6a3.3 3.3 0 0 1-6.6 0z';

/**
 * Duración como un rastro de pisadas hacia la derecha, una cada 5 minutos
 * (más largo cuanto más dura el paseo), y los minutos al final.
 */
export function Trail({ minutes, color }: { minutes: number; color: string }) {
  const n = Math.min(18, Math.max(3, Math.round(minutes / 5)));
  const step = 15, size = 15;
  return (
    <View style={s.trail} accessible accessibilityLabel={`${minutes} minutos a pie`}>
      <View style={{ flexShrink: 1, overflow: 'hidden' }}>
      <Svg width={n * step + 4} height={22}>
        {Array.from({ length: n }, (_, i) => {
          const up = i % 2 === 0;
          // Izquierda y derecha alternas, de más clara a más marcada
          return (
            <G key={i} opacity={0.35 + (0.65 * (i + 1)) / n} transform={`translate(${i * step} ${up ? 0 : 7}) rotate(${up ? 80 : 100} ${size / 2} ${size / 2}) scale(${size / 24})`}>
              <Path d={FOOT} fill={color} />
            </G>
          );
        })}
      </Svg>
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.trailText}>{durationLabel(minutes)}</Text>
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
  // Solo el precio: si la ruta está hecha o a medias ya lo dicen el sello y la línea
  const tag = tour.price === 'free'
    ? <Tag label="Gratis" bg={brand.sun} color={neutral.ink} />
    : <Tag label={euros(tour.price.eur)} bg={functional.premium} color={neutral.white} icon={<Icon name="lock" color={functional.gold} size={12} />} />;
  const label = `${tour.title}. ${prog.completed ? 'Completada' : prog.started ? `Vas por la parada ${next + 1} de ${prog.total}` : `${prog.total} paradas`}${near ? `. ${near}` : ''}`;

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
        <Trail minutes={tour.durationMin} color={p.t} />
        {near && <Text maxFontSizeMultiplier={1.3} style={s.near}>{near}</Text>}
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
        <Trail minutes={tour.durationMin} color={neutral.ink3} />
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
  trail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  near: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink2 },
  trailText: { flexShrink: 0, fontFamily: font.black, fontSize: 14, color: neutral.ink },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontFamily: font.black, fontSize: 13.5, color: neutral.ink },
});
