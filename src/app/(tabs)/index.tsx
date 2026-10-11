import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { PressableScale, rise } from '@/components/motion';
import { Scrim } from '@/components/Scrim';
import { TOURS } from '@/data/tours';
import { cumulative, formatDistance } from '@/lib/geo';
import { tintaDeRuta } from '@/lib/ink';
import { routeProgress, usePassport } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, radius, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

export default function Home() {
  const insets = useSafeAreaInsets();
  const routes = usePassport(s => s.routes);
  const reset = usePassport(s => s.reset);
  const { testMode, setTestMode } = useSettings();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 18, gap: 14 }}>
      <Animated.Text entering={rise(0)} style={[type.overline, { color: brand.coral }]}>Paseo</Animated.Text>
      <Animated.Text entering={rise(1)} style={[type.hero, { fontSize: 38, lineHeight: 42 }]}>¿Dónde paseamos hoy?</Animated.Text>

      {TOURS.map((t, i) => {
        const meters = t.legs.reduce((a, l) => a + cumulative(l).at(-1)!, 0);
        const prog = routeProgress(t.id, routes[t.id]);
        return (
          <Animated.View key={t.id} entering={rise(i + 2)}>
          <PressableScale accessibilityRole="button" accessibilityLabel={`Abrir ${t.title}`} scaleTo={0.975} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })} style={s.card}>
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
              <View style={[s.swatch, { backgroundColor: tintaDeRuta(t.accent) }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.cat, { color: t.palette.t }]} numberOfLines={1}>{t.category}</Text>
                <Text style={s.cardTitle}>{t.title}</Text>
                <Text style={type.caption}>{t.durationMin} min · {formatDistance(meters)} · {prog.completed ? 'Postal ganada' : prog.started ? `${prog.done} de ${prog.total} sellos` : `${t.stops.length} paradas`}</Text>
              </View>
            </View>
          </PressableScale>
          </Animated.View>
        );
      })}

      <Animated.View entering={rise(TOURS.length + 2)} style={s.test}>
        <View style={{ flex: 1 }}>
          <Text style={s.testTitle}>Modo prueba</Text>
          <Text style={type.caption}>Recorre los tours sin moverte: paseo simulado, velocidad, llegar a la parada o tocar el mapa para moverte.</Text>
        </View>
        <Switch accessibilityLabel="Modo prueba" value={testMode} onValueChange={setTestMode} trackColor={{ true: brand.coral, false: neutral.line }} thumbColor="#fff" />
      </Animated.View>
      {testMode && (
        <Pressable accessibilityRole="button" onPress={reset} style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={[type.caption, { textDecorationLine: 'underline' }]}>Borrar el pasaporte (sellos y postales)</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
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
