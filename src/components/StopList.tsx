import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DuotoneImage } from '@/components/DuotoneImage';
import { PressableScale } from '@/components/motion';
import type { LngLat, Tour } from '@/data/types';
import { distance, formatDistance } from '@/lib/geo';
import { font } from '@/theme/fonts';
import { neutral, radius, shadow } from '@/theme/tokens';

interface Props {
  tour: Tour;
  stamped: Set<string>;
  /** Parada a la que se va */
  target: number;
  position: LngLat | null;
  /** Texto de estado de cada parada */
  status: (i: number) => string;
  /** ▶ de una parada (en la que toca decide el modo de entrada) */
  onPlay: (i: number) => void;
  /** Dónde empieza la lista (justo encima del selector) y cuánto hueco dejar abajo (la hoja del paseo) */
  top: number;
  bottom: number;
  background: string;
}

const Play = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill={color} /></Svg>
);
const Replay = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4 4.5v4h4" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
);

/** Todas las paradas en una lista: el respaldo del mapa cuando el GPS no ayuda */
export function StopList({ tour, stamped, target, position, status, onPlay, top, bottom, background }: Props) {
  const p = tour.palette;
  return (
    <ScrollView style={[s.list, { top, backgroundColor: background }]} contentContainerStyle={[s.content, { paddingBottom: bottom }]} showsVerticalScrollIndicator={false}>
      {tour.stops.map((st, i) => {
        const done = stamped.has(st.id);
        const isTarget = i === target;
        return (
          <View key={st.id} style={[s.row, isTarget && { borderColor: p.t2 }]}>
            <DuotoneImage source={st.thumb} palette={p} style={s.pic} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.over, { color: p.t }]}>Parada {i + 1}</Text>
              <Text style={s.name} numberOfLines={2}>{st.name}</Text>
              <View style={s.statusRow}>
                <Text style={s.status} numberOfLines={1}>{done || isTarget || !position ? status(i) : `A ${formatDistance(distance(position, st.coord))}`}</Text>
                {isTarget && !done && <View style={[s.pill, { backgroundColor: p.t2 }]}><Text style={s.pillText}>Te toca</Text></View>}
              </View>
              {isTarget && !done && position && <Text style={s.status}>A {formatDistance(distance(position, st.coord))}</Text>}
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={done ? `Volver a escuchar ${st.name}` : `Escuchar ${st.name}`}
              onPress={() => onPlay(i)}
              scaleTo={0.92}
              style={[s.play, { backgroundColor: p.t }, done && { opacity: 0.7 }]}
            >
              {done ? <Replay color={p.on} /> : <Play color={p.on} />}
            </PressableScale>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  list: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  content: { paddingHorizontal: 12, gap: 8, paddingTop: 54 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: neutral.surface, borderRadius: 20, padding: 10, borderWidth: 3, borderColor: 'transparent', ...shadow[1] },
  pic: { width: 56, height: 56, borderRadius: 14 },
  over: { fontFamily: font.black, fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontFamily: font.serif, fontSize: 18, color: neutral.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3, flexShrink: 1 },
  pill: { height: 20, paddingHorizontal: 8, borderRadius: radius.pill, justifyContent: 'center' },
  pillText: { fontFamily: font.black, fontSize: 11, color: neutral.ink },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
