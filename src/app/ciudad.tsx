import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { DuotoneImage } from '@/components/DuotoneImage';
import { IconButton } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { Scrim } from '@/components/Scrim';
import { CITIES, getTour, toursIn } from '@/data/tours';
import { useSettings, type CityId } from '@/store/settings';
import { font } from '@/theme/fonts';
import { neutral, shadow, type TourPalette } from '@/theme/tokens';
import { type } from '@/theme/type';

const SEVILLA = getTour('sevilla-centro')!;
const MADRID: TourPalette = { t: '#B5462E', t2: '#F2C14E', soft: '#F7E4DD', deep: '#4A1A10', on: '#FFFFFF' };

/** Madrid aún no tiene fotos: la Puerta de Alcalá y la cúpula del Metrópolis en línea */
function MadridArt() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: MADRID.deep }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 180" preserveAspectRatio="xMidYMax slice">
        <Rect x={0} y={0} width={360} height={180} fill={MADRID.deep} />
        <Path d="M0 150 H360" stroke={MADRID.t2} strokeWidth={2} />
        {/* Puerta de Alcalá: cinco vanos, frontón y estatuas */}
        <Path d="M40 150 V92 H190 V150 M40 92 L115 70 L190 92 M58 150 V112 a9 9 0 0 1 18 0 V150 M90 150 V104 a15 15 0 0 1 30 0 V150 M134 150 V112 a9 9 0 0 1 18 0 V150 M160 150 V118 h12 V150 M46 118 h8 V150 M105 70 v-8 h20 v8 M112 62 v-6 h6 v6" fill="none" stroke="#fff" strokeOpacity={0.9} strokeWidth={2} strokeLinejoin="round" />
        {/* Metrópolis: torre redondeada con cúpula y la Victoria encima */}
        <Path d="M250 150 V78 a32 32 0 0 1 64 0 V150 M250 100 H314 M262 150 V108 M282 150 V108 M302 150 V108 M282 46 a12 14 0 0 1 0 -2 M282 46 V30 M276 34 l6 -6 l6 6" fill="none" stroke={MADRID.t2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Path d="M250 78 a32 30 0 0 1 64 0" fill={MADRID.t2} fillOpacity={0.18} />
      </Svg>
    </View>
  );
}

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
      <Animated.Text entering={FadeInDown.delay(60)} style={[type.overline, { marginTop: 8 }]}>Paso 2 de 2</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(120)} style={[type.hero, { fontSize: 38, lineHeight: 42 }]}>¿Dónde paseamos?</Animated.Text>
      <Animated.Text entering={FadeIn.delay(250)} style={[type.caption, { marginBottom: 6 }]}>Puedes cambiar de ciudad cuando quieras desde Inicio.</Animated.Text>

      {CITIES.map((c, i) => {
        const { open, locked } = toursIn(c.id);
        return (
          <Animated.View key={c.id} entering={FadeInDown.delay(300 + i * 140).springify().damping(16)} style={{ flex: 1, maxHeight: 260 }}>
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
