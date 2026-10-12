import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MadridArt } from '@/components/CityArt';
import { DuotoneImage } from '@/components/DuotoneImage';
import { IconButton } from '@/components/ui';
import { appear, PressableScale, rise } from '@/components/motion';
import { Scrim } from '@/components/Scrim';
import { CITIES, getTour, toursIn } from '@/data/tours';
import { useSettings, type CityId } from '@/store/settings';
import { font } from '@/theme/fonts';
import { neutral, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

const SEVILLA = getTour('sevilla-centro')!;
/** Elección de ciudad: los tours de Inicio son los de la ciudad elegida */
export default function Ciudad() {
  const insets = useSafeAreaInsets();
  const { change } = useLocalSearchParams<{ change?: string }>();
  const current = useSettings(s => s.city);
  const setCity = useSettings(s => s.setCity);

  const choose = (c: CityId) => {
    setCity(c);
    if (change) router.back();
    else router.replace('/');
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 20 }]}>
      {change ? <IconButton label="Volver" icon="back" onPress={() => router.back()} /> : <View style={{ height: 44 }} />}
      <Animated.Text entering={rise(1)} style={[type.overline, { marginTop: 8 }]}>Paso 2 de 2</Animated.Text>
      <Animated.Text entering={rise(2)} style={[type.hero, { fontSize: 38, lineHeight: 42 }]}>¿Dónde paseamos?</Animated.Text>
      <Animated.Text entering={appear(250)} style={[type.caption, { marginBottom: 6 }]}>Puedes cambiar de ciudad cuando quieras desde Ajustes.</Animated.Text>

      {CITIES.map((c, i) => {
        const { open, locked } = toursIn(c.id);
        return (
          <Animated.View key={c.id} entering={rise(6 + i * 3)} style={{ flex: 1, maxHeight: 260 }}>
            <PressableScale accessibilityRole="button" accessibilityState={{ selected: current === c.id }} onPress={() => choose(c.id)} scaleTo={0.97} style={[s.card, current === c.id && s.cardOn]}>
              {c.id === 'sevilla' ? <DuotoneImage source={SEVILLA.stops[SEVILLA.emblemStop].photo} palette={SEVILLA.palette} style={StyleSheet.absoluteFill} /> : <MadridArt />}
              <Scrim opacity={0.65} />
              <View style={s.cardText}>
                <Text style={s.region}>{c.region}</Text>
                <Text style={s.city}>{c.name}</Text>
                <View style={s.badges}>
                  {open.length > 0 && <Text style={[s.badge, s.badgeOpen]}>{open.length} {open.length === 1 ? 'tour' : 'tours'}</Text>}
                  {locked.length > 0 && <Text style={[s.badge, s.badgeLocked]}>🔒 {locked.length} de pago</Text>}
                </View>
              </View>
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.bg, paddingHorizontal: 18, gap: 12 },
  card: { flex: 1, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', ...shadow[2] },
  cardOn: { borderWidth: 3, borderColor: neutral.ink },
  cardText: { padding: 18, gap: 2 },
  region: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  city: { fontFamily: font.serif, fontSize: 40, lineHeight: 44, color: '#fff' },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { fontFamily: font.black, fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  badgeOpen: { backgroundColor: '#FFC53D', color: neutral.ink },
  badgeLocked: { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' },
});
