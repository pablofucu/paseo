import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Guilloche, PassportPage } from '@/components/PassportPage';
import { TourSeal } from '@/components/Stamp';
import { IconButton } from '@/components/ui';
import { TOURS, getTour } from '@/data/tours';
import { stampDate, usePassport, type Visit } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { type } from '@/theme/type';

const COVER = '#5A1726';
const GOLD = '#D8B45C';

type PageItem = { key: string; kind: 'cover' } | { key: string; kind: 'holder' } | { key: string; kind: 'visit'; visit: Visit };

/** Mi pasaporte: una libreta que se hojea de lado. Portada, datos del viajero y una página por visita. */
export default function Passport() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pageW = width - 32;
  const visits = usePassport(s => s.visits);
  const reset = usePassport(s => s.reset);
  const testMode = useSettings(s => s.testMode);
  const [page, setPage] = useState(0);

  const pages = useMemo<PageItem[]>(() => [
    { key: 'cover', kind: 'cover' },
    { key: 'holder', kind: 'holder' },
    ...[...visits].reverse().filter(v => getTour(v.tourId)).map(v => ({ key: v.id, kind: 'visit' as const, visit: v })),
  ], [visits]);

  return (
    <View style={{ flex: 1, backgroundColor: neutral.bg, paddingTop: insets.top + 12 }}>
      <View style={s.top}>
        <IconButton label="Volver" icon="back" onPress={() => router.back()} />
        <Text style={[type.title, { flex: 1 }]}>Mi pasaporte</Text>
      </View>
      <FlatList
        data={pages}
        keyExtractor={p => p.key}
        horizontal
        pagingEnabled={false}
        snapToInterval={pageW + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, alignItems: 'flex-start' }}
        onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / (pageW + 12)))}
        renderItem={({ item, index }) =>
          item.kind === 'cover' ? <Cover width={pageW} />
          : item.kind === 'holder' ? <Holder width={pageW} visits={visits} />
          : <Pressable accessibilityRole="button" accessibilityLabel="Ver la visita" onPress={() => router.push({ pathname: '/visit/[id]', params: { id: item.visit.id } })}>
              <PassportPage tour={getTour(item.visit.tourId)!} visit={item.visit} pageNumber={index - 1} width={pageW} />
            </Pressable>
        }
      />
      <View style={s.dots}>
        {pages.map((p, i) => <View key={p.key} style={[s.dot, i === page && s.dotOn]} />)}
      </View>
      <Text style={[type.caption, { textAlign: 'center' }]}>{page === 0 ? 'Desliza para abrir el pasaporte' : visits.length ? 'Desliza para pasar de página' : 'Haz un tour para conseguir tus primeros sellos'}</Text>
      {testMode && visits.length > 0 && (
        <Pressable accessibilityRole="button" onPress={reset} style={[s.reset, { marginBottom: insets.bottom + 12 }]}>
          <Text style={s.resetText}>Modo prueba: borrar todos los sellos</Text>
        </Pressable>
      )}
    </View>
  );
}

function Cover({ width }: { width: number }) {
  const h = width * 1.35;
  return (
    <View style={[s.cover, { width, height: h }]}>
      <Text style={s.coverTop}>Tours a pie por ciudades</Text>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={52} stroke={GOLD} strokeWidth={2.5} fill="none" />
        <Circle cx={60} cy={60} r={44} stroke={GOLD} strokeWidth={1} fill="none" strokeDasharray="2 3" />
        <Path d="M60 14 L68 60 L60 106 L52 60 Z" fill={GOLD} />
        <Path d="M14 60 L60 52 L106 60 L60 68 Z" fill={GOLD} opacity={0.7} />
        <Circle cx={60} cy={60} r={6} fill={COVER} stroke={GOLD} strokeWidth={2} />
      </Svg>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={s.coverTitle}>PASAPORTE</Text>
        <Text style={s.coverBrand}>Paseo</Text>
      </View>
    </View>
  );
}

function Holder({ width, visits }: { width: number; visits: Visit[] }) {
  const stamps = visits.reduce((a, v) => a + Object.keys(v.stamps).length, 0);
  const done = visits.filter(v => v.completedAt);
  const cities = new Set(done.map(v => getTour(v.tourId)?.city)).size;
  const first = visits[0]?.startedAt;
  const h = width * 1.35;
  const rows: [string, string][] = [
    ['Sellos de parada', String(stamps)],
    ['Tours completados', String(done.length)],
    ['Ciudades', String(cities)],
    ['Primer paseo', first ? new Date(first).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
  ];
  return (
    <View style={[s.holder, { width, minHeight: h }]}>
      <Guilloche width={width} height={h * 1.4} color="#5A1726" />
      <Text style={s.holderOver}>Datos del viajero</Text>
      {rows.map(([k, v]) => (
        <View key={k} style={s.row}>
          <Text style={s.rowK}>{k}</Text>
          <Text style={s.rowV}>{v}</Text>
        </View>
      ))}
      <Text style={[s.holderOver, { marginTop: 18 }]}>Visados de ruta</Text>
      <View style={{ gap: 10, alignItems: 'center' }}>
        {TOURS.map(t => {
          const v = [...visits].reverse().find(x => x.tourId === t.id && x.completedAt);
          return <TourSeal key={t.id} tour={t} width={Math.min(width * 0.62, 210)} date={stampDate(v?.completedAt)} collected={t.stops.map(st => !!v?.stamps[st.id])} ghost={!v} rotate={v ? -4 : 0} />;
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 14 },
  cover: { backgroundColor: COVER, borderRadius: 16, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40, borderWidth: 3, borderColor: '#43101C' },
  coverTop: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },
  coverTitle: { fontFamily: font.black, fontSize: 26, letterSpacing: 8, color: GOLD },
  coverBrand: { fontFamily: font.serif, fontSize: 30, color: GOLD },
  holder: { backgroundColor: neutral.paper, borderRadius: 14, padding: 18, gap: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E4D9C6' },
  holderOver: { fontFamily: font.black, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: neutral.ink3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E6DDCE', paddingVertical: 8 },
  rowK: { fontFamily: font.bold, fontSize: 14, color: neutral.ink2 },
  rowV: { fontFamily: font.black, fontSize: 15, color: neutral.ink, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: neutral.line },
  dotOn: { width: 20, backgroundColor: neutral.ink },
  reset: { alignSelf: 'center', paddingHorizontal: 16, height: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: neutral.line, marginTop: 10 },
  resetText: { fontFamily: font.black, fontSize: 13, color: neutral.ink2 },
});
