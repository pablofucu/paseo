import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StopStamp, TourSeal } from '@/components/Stamp';
import { StampPress } from '@/components/StampPress';
import type { Tour } from '@/data/types';
import { stampDate, type Visit } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';

/** Hash pequeño y estable para colocar los sellos «a mano» siempre igual */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Fondo de seguridad del papel: líneas onduladas (guilloché) en los tonos del tour */
export function Guilloche({ width, height, color }: { width: number; height: number; color: string }) {
  const paths = useMemo(() => {
    const out: string[] = [];
    for (let k = 0; k < 14; k++) {
      const y0 = (height / 14) * k + 6;
      let d = `M0 ${y0.toFixed(1)}`;
      for (let x = 0; x <= width; x += 6) {
        const y = y0 + Math.sin(x / 18 + k * 0.7) * 5 + Math.sin(x / 47 + k) * 3;
        d += ` L${x} ${y.toFixed(1)}`;
      }
      out.push(d);
    }
    return out;
  }, [width, height]);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {paths.map((d, i) => <Path key={i} d={d} stroke={color} strokeWidth={0.7} fill="none" opacity={0.16} />)}
    </Svg>
  );
}

const mrz = (tour: Tour, visit: Visit) =>
  `P<ESP${tour.city.toUpperCase().replace(/[^A-Z]/g, '')}<<${tour.title.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '<')}`.padEnd(44, '<').slice(0, 44) +
  `\n${visit.id.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(10, '<').slice(0, 10)}<${stampDate(visit.startedAt).replace(/·/g, '')}<<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44);

interface Props {
  tour: Tour;
  visit: Visit;
  pageNumber?: number;
  /** Estampa el visado con el tampón (pantalla final) */
  pressSeal?: boolean;
  sealDelay?: number;
  width?: number;
}

/** Una página del pasaporte: los sellos de una visita, colocados como a mano, y el visado del tour. */
export function PassportPage({ tour, visit, pageNumber, pressSeal, sealDelay = 600, width: w }: Props) {
  const win = useWindowDimensions();
  const width = w ?? win.width - 32;
  const n = tour.stops.length;
  const cols = 2;
  const rows = Math.ceil(n / cols);
  const cell = (width - 36) / cols;
  const stampSize = Math.min(cell * 0.86, 128);
  const gridH = rows * (stampSize + 6);
  const sealW = Math.min(width * 0.62, 230);
  const height = 54 + gridH + sealW * (120 / 170) + 60;
  const collected = tour.stops.map(st => !!visit.stamps[st.id]);
  const full = collected.every(Boolean);

  return (
    <View style={[s.page, { width, height }]}>
      <Guilloche width={width} height={height} color={tour.palette.deep} />
      <View style={s.head}>
        <Text style={s.headText}>Pasaporte Paseo · {tour.city}</Text>
        {pageNumber != null && <Text style={s.headText}>{String(pageNumber).padStart(2, '0')}</Text>}
      </View>
      {tour.stops.map((st, i) => {
        const r = hash(visit.id + st.id);
        const col = i % cols, row = Math.floor(i / cols);
        const x = 18 + col * cell + (cell - stampSize) / 2 + (r - 0.5) * 22;
        const y = 48 + row * (stampSize + 6) + (hash(st.id + visit.id) - 0.5) * 14;
        const at = visit.stamps[st.id];
        return (
          <View key={st.id} style={{ position: 'absolute', left: x, top: y }}>
            <StopStamp tour={tour} index={i} date={stampDate(at)} ghost={!at} size={stampSize} rotate={at ? (r - 0.5) * 26 : 0} />
          </View>
        );
      })}
      <View style={{ position: 'absolute', left: (width - sealW) / 2 + 10, top: 52 + gridH }}>
        {full ? (
          <StampPress width={sealW} height={sealW * (120 / 170)} ink={tour.palette.deep} delay={sealDelay} still={!pressSeal}>
            <TourSeal tour={tour} date={stampDate(visit.completedAt ?? visit.startedAt)} collected={collected} width={sealW} rotate={-5} />
          </StampPress>
        ) : (
          <TourSeal tour={tour} date="" collected={collected} width={sealW} ghost />
        )}
      </View>
      <Text style={s.mrz} numberOfLines={2}>{mrz(tour, visit)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { backgroundColor: neutral.paper, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E4D9C6' },
  head: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 },
  headText: { fontFamily: font.black, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: neutral.ink3 },
  mrz: { position: 'absolute', left: 14, right: 14, bottom: 10, fontFamily: 'monospace', fontSize: 9.5, letterSpacing: 0.6, lineHeight: 13, color: '#9C9282' },
});
