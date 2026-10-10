import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOURS } from '@/data/tours';
import { usePassport } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, radius, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

export default function Home() {
  const insets = useSafeAreaInsets();
  const done = usePassport(s => s.visits.filter(v => v.completedAt).length);
  const city = TOURS[0];
  const { testMode, setTestMode } = useSettings();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View style={s.hero}>
        <Image source={city.stops[0].photo} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={s.scrim} />
        <View style={[s.heroText, { paddingTop: insets.top + 12 }]}>
          <View style={s.topRow}>
            <Text style={[type.overline, { color: '#fff' }]}>{city.region}</Text>
            <Link href="/passport" asChild>
              <Pressable accessibilityRole="button" style={s.passBtn}>
                <Text style={s.passText}>Mi pasaporte{done ? ` · ${done}` : ''}</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={[type.hero, { color: '#fff', fontSize: 50, lineHeight: 52 }]}>{city.city}</Text>
        </View>
      </View>
      <View style={s.body}>
        <Text style={type.headline}>Tours</Text>
        {TOURS.map(t => (
          <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })} style={({ pressed }) => [s.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <Image source={t.stops[1].photo} style={s.cardPic} contentFit="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.cat, { color: t.palette.t }]} numberOfLines={1}>{t.category}</Text>
              <Text style={s.cardTitle}>{t.title}</Text>
              <Text style={type.caption}>{t.durationMin} min · {t.stops.length} paradas</Text>
            </View>
            {t.price === 'free' && <View style={s.free}><Text style={s.freeText}>Gratis</Text></View>}
          </Pressable>
        ))}
        <View style={s.test}>
          <View style={{ flex: 1 }}>
            <Text style={s.testTitle}>Modo prueba</Text>
            <Text style={type.caption}>Recorre los tours sin moverte: paseo simulado, velocidad, llegar a la parada o tocar el mapa para moverte.</Text>
          </View>
          <Switch accessibilityLabel="Modo prueba" value={testMode} onValueChange={setTestMode} trackColor={{ true: brand.coral, false: neutral.line }} thumbColor="#fff" />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { height: 300, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,26,23,0.28)' },
  heroText: { ...StyleSheet.absoluteFill, padding: 20, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passBtn: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.pill, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  passText: { fontFamily: font.black, fontSize: 13, color: neutral.ink },
  body: { padding: 18, gap: 12 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: neutral.surface, borderRadius: 20, padding: 10, alignItems: 'center', ...shadow[1] },
  cardPic: { width: 88, height: 96, borderRadius: 14 },
  cat: { fontFamily: font.black, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { fontFamily: font.serif, fontSize: 18, lineHeight: 21, color: neutral.ink, marginVertical: 3 },
  free: { position: 'absolute', right: 10, top: 10, backgroundColor: brand.sun, borderRadius: radius.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  freeText: { fontFamily: font.black, fontSize: 12, color: neutral.ink },
  test: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 14, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: neutral.line },
  testTitle: { fontFamily: font.black, fontSize: 15, color: neutral.ink, marginBottom: 2 },
});
