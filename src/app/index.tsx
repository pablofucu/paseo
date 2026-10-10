import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { Scrim } from '@/components/Scrim';
import { TOURS } from '@/data/tours';
import { cumulative, formatDistance } from '@/lib/geo';
import { usePassport } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, radius, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

export default function Home() {
  const insets = useSafeAreaInsets();
  const visits = usePassport(s => s.visits);
  const { testMode, setTestMode } = useSettings();
  const stamps = visits.reduce((a, v) => a + Object.keys(v.stamps).length, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 18, gap: 14 }}>
      <View style={s.topRow}>
        <Text style={[type.overline, { color: brand.coral }]}>Paseo</Text>
        <Link href="/passport" asChild>
          <Pressable accessibilityRole="button" style={s.passBtn}>
            <Text style={s.passText}>Mi pasaporte{stamps ? ` · ${stamps} sellos` : ''}</Text>
          </Pressable>
        </Link>
      </View>
      <Text style={[type.hero, { fontSize: 38, lineHeight: 42 }]}>¿Dónde paseamos hoy?</Text>

      {TOURS.map(t => {
        const meters = t.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
        const done = visits.some(v => v.tourId === t.id && v.completedAt);
        return (
          <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`Abrir ${t.title}`} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })} style={({ pressed }) => [s.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <View style={s.hero}>
              <DuotoneImage source={t.stops[t.emblemStop].photo} palette={t.palette} style={StyleSheet.absoluteFill} />
              <Scrim opacity={0.6} />
              <View style={s.heroText}>
                <Text style={[type.overline, { color: '#fff' }]}>{t.region}</Text>
                <Text style={s.city}>{t.city}</Text>
              </View>
              {t.price === 'free' && <View style={s.free}><Text style={s.freeText}>Gratis</Text></View>}
            </View>
            <View style={s.cardBody}>
              <View style={[s.swatch, { backgroundColor: t.palette.t }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.cat, { color: t.palette.t }]} numberOfLines={1}>{t.category}</Text>
                <Text style={s.cardTitle}>{t.title}</Text>
                <Text style={type.caption}>{t.durationMin} min · {formatDistance(meters)} · {t.stops.length} paradas{done ? ' · Completado' : ''}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      <View style={s.test}>
        <View style={{ flex: 1 }}>
          <Text style={s.testTitle}>Modo prueba</Text>
          <Text style={type.caption}>Recorre los tours sin moverte: paseo simulado, velocidad, llegar a la parada o tocar el mapa para moverte.</Text>
        </View>
        <Switch accessibilityLabel="Modo prueba" value={testMode} onValueChange={setTestMode} trackColor={{ true: brand.coral, false: neutral.line }} thumbColor="#fff" />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passBtn: { backgroundColor: neutral.surface, borderRadius: radius.pill, paddingHorizontal: 14, height: 36, justifyContent: 'center', ...shadow[1] },
  passText: { fontFamily: font.black, fontSize: 13, color: neutral.ink },
  card: { backgroundColor: neutral.surface, borderRadius: 22, overflow: 'hidden', ...shadow[2] },
  hero: { height: 170 },
  heroText: { position: 'absolute', left: 16, bottom: 12 },
  city: { fontFamily: font.serif, fontSize: 34, lineHeight: 37, color: '#fff' },
  free: { position: 'absolute', right: 12, top: 12, backgroundColor: brand.sun, borderRadius: radius.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  freeText: { fontFamily: font.black, fontSize: 12, color: neutral.ink },
  cardBody: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'center' },
  swatch: { width: 8, alignSelf: 'stretch', borderRadius: 4 },
  cat: { fontFamily: font.black, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { fontFamily: font.serif, fontSize: 19, lineHeight: 22, color: neutral.ink, marginVertical: 2 },
  test: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, padding: 14, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: neutral.line },
  testTitle: { fontFamily: font.black, fontSize: 15, color: neutral.ink, marginBottom: 2 },
});
