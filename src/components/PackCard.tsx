import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LockDisc, RouteStamp } from '@/components/RouteStamp';
import type { Pack } from '@/data/packs';
import { getTour, LOCKED_TOURS } from '@/data/tours';
import { PAPEL_POSTAL } from '@/lib/ink';
import { missingText, packProgress } from '@/lib/packs';
import type { UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral, shadow } from '@/theme/tokens';

/** Proporción de la ilustración de la postal (832 × 444) */
const ART_RATIO = 832 / 444;
/** Alto de los sellos de carta de la fila */
const STAMP_H = 76;

/** Rayas en diagonal del hueco de una postal todavía por dibujar: un solo trazado, sin texturas */
function Stripes({ w, h }: { w: number; h: number }) {
  let d = '';
  for (let x = -h; x < w; x += 16) d += `M${x} ${h}L${x + h} 0`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Path d={d} stroke="#D9CDB0" strokeWidth={5} />
    </Svg>
  );
}

interface Props {
  pack: Pack;
  routes: Record<string, UserRoute>;
  /** Ancho de la tarjeta */
  width: number;
  /** Tocar un sello de una ruta abierta */
  onOpenTour: (tourId: string) => void;
  /** Tocar la postal ya desbloqueada */
  onOpenPostcard: (pack: Pack) => void;
}

/**
 * Tarjeta de un pack en la Colección: arriba su postal (a todo color si está
 * ganada; difuminada con candado si falta algún sello; rayada si aún está por
 * dibujar), debajo el nombre con «n/total» y la fila de sus sellos de carta:
 * en color los ganados, en gris y con candado los que faltan.
 */
export function PackCard({ pack, routes, width, onOpenTour, onOpenPostcard }: Props) {
  const prog = packProgress(pack, routes);
  const frame = 7;
  const innerW = width - 28 - frame * 2;
  const innerH = Math.round(innerW / ART_RATIO);
  const art = pack.postcard;
  const unlocked = !!art && prog.complete;
  const missing = prog.total - prog.won;

  const postcard = (
    <View style={[s.frame, { padding: frame }]}>
      <View style={{ width: innerW, height: innerH, overflow: 'hidden', backgroundColor: '#EFE6CF' }}>
        {unlocked ? (
          <Image source={(innerW < 480 ? art.mid : undefined) ?? art.art} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Postal ${pack.name}`} />
        ) : (
          <>
            {art?.blur ? <Image source={art.blur} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} /> : <Stripes w={innerW} h={innerH} />}
            {art?.blur && <View style={[StyleSheet.absoluteFill, { backgroundColor: PAPEL_POSTAL, opacity: 0.35 }]} />}
            <View style={s.lockCenter} accessible accessibilityLabel={art ? `Postal sin ganar. ${missingText(missing)}` : 'Postal por dibujar'}>
              <LockDisc size={46} />
              {!art && <Text style={s.lockText}>Postal por dibujar</Text>}
              {!prog.complete && <Text style={s.lockText}>{missingText(missing)}</Text>}
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={[s.card, { width }]}>
      {unlocked ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Ver la postal ${pack.name}`} onPress={() => onOpenPostcard(pack)}>{postcard}</Pressable>
      ) : postcard}
      <View style={s.nameRow}>
        <Text style={s.name} numberOfLines={1}>{pack.name}</Text>
        <Text style={s.count}>{prog.won}/{prog.total}</Text>
      </View>
      <View style={s.stamps}>
        {prog.stamps.map(st => {
          const tour = getTour(st.id);
          const locked = LOCKED_TOURS.find(l => l.id === st.id);
          const label = `${st.title}: ${st.won ? 'sello ganado' : st.open ? 'sello sin ganar' : 'ruta bloqueada'}`;
          const stamp = (
            <>
              <RouteStamp tour={tour} locked={tour ? undefined : locked} done={st.won ? st.total : 0} total={st.total} height={STAMP_H} lockBadge />
              <Text style={s.label} numberOfLines={2}>{st.label}</Text>
            </>
          );
          // Las rutas de pago aún bloqueadas no se pueden abrir
          return st.open ? (
            <Pressable key={st.id} accessibilityRole="button" accessibilityLabel={label} onPress={() => onOpenTour(st.id)} style={s.stamp}>{stamp}</Pressable>
          ) : (
            <View key={st.id} accessible accessibilityLabel={label} style={s.stamp}>{stamp}</View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: neutral.surface, borderRadius: 22, padding: 14, gap: 10, ...shadow[1] },
  frame: { alignSelf: 'center', backgroundColor: PAPEL_POSTAL, borderRadius: 3, boxShadow: '0px 2px 6px rgba(28,26,23,0.18)' },
  lockCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8 },
  lockText: { fontFamily: font.black, fontSize: 14.5, color: neutral.ink, textAlign: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  name: { flex: 1, fontFamily: font.serif, fontSize: 19, color: neutral.ink },
  count: { fontFamily: font.black, fontSize: 14, color: neutral.ink3, fontVariant: ['tabular-nums'] },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 2 },
  stamp: { alignItems: 'center', gap: 6, width: Math.round(STAMP_H * 0.82) + 18 },
  label: { fontFamily: font.bold, fontSize: 12, lineHeight: 15, color: neutral.ink2, textAlign: 'center' },
});
