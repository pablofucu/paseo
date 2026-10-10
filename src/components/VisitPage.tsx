import { StyleSheet, Text, View } from 'react-native';
import { StopStamp, TourSeal } from '@/components/Stamp';
import type { Tour } from '@/data/types';
import { stampDate, type Visit } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';

const longDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/** Página del pasaporte de una visita: un sello por parada y, si está completa, el sello del tour. */
export function VisitPage({ tour, visit, animate = false, stampSize = 104 }: { tour: Tour; visit: Visit; animate?: boolean; stampSize?: number }) {
  const got = tour.stops.filter(st => visit.stamps[st.id]).length;
  const full = got === tour.stops.length;
  return (
    <View style={s.page}>
      <View style={s.hd}>
        <View>
          <Text style={s.over}>Visita · {longDate(visit.startedAt)}</Text>
          <Text style={s.count}>{got} / {tour.stops.length} sellos</Text>
        </View>
        <View style={[s.chip, !full && { backgroundColor: neutral.ink3 }]}><Text style={s.chipText}>{full ? 'Completa' : 'Incompleta'}</Text></View>
      </View>
      <View style={s.grid}>
        {tour.stops.map((st, i) => {
          const at = visit.stamps[st.id];
          return (
            <View key={st.id} style={s.cell}>
              <StopStamp stop={st} index={i} date={stampDate(at)} ghost={!at} color={tour.palette.t} size={stampSize} slam={animate && !!at} delay={300 + i * 160} />
              <Text style={s.name} numberOfLines={2}>{st.name}</Text>
            </View>
          );
        })}
      </View>
      {full && (
        <View style={s.seal} pointerEvents="none">
          <TourSeal tour={tour} date={stampDate(visit.completedAt ?? visit.startedAt)} size={124} slam={animate} delay={300 + tour.stops.length * 160 + 500} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { backgroundColor: neutral.paper, borderRadius: 18, padding: 14, paddingBottom: 22 },
  hd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: '#D9CFBF' },
  over: { fontFamily: font.black, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: neutral.ink3 },
  count: { fontFamily: font.serif, fontSize: 22, color: neutral.ink },
  chip: { backgroundColor: neutral.ink, borderRadius: 999, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  chipText: { fontFamily: font.black, fontSize: 12, color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  cell: { width: '50%', alignItems: 'center', gap: 4 },
  name: { fontFamily: font.heavy, fontSize: 11.5, color: neutral.ink2, textAlign: 'center', paddingHorizontal: 6 },
  seal: { position: 'absolute', right: -14, bottom: -40 },
});
