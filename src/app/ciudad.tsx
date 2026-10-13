import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityArt } from '@/components/CityArt';
import { TourBanner } from '@/components/TourBanner';
import { IconButton } from '@/components/ui';
import { appear, lightTap, PressableScale, rise } from '@/components/motion';
import { Icon } from '@/components/RouteCard';
import { Scrim } from '@/components/Scrim';
import { CITIES, getTour, toursIn } from '@/data/tours';
import { goBack } from '@/lib/nav';
import { HAS_LANGUAGE_STEP, useSettings, type CityId } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, shadow } from '@/theme/tokens';
import { useType } from '@/theme/type';

/** Elección de ciudad: los tours de Inicio son los de la ciudad elegida */
export default function Ciudad() {
  const insets = useSafeAreaInsets();
  const type = useType();
  const { change } = useLocalSearchParams<{ change?: string }>();
  const current = useSettings(s => s.city);
  const setCity = useSettings(s => s.setCity);

  const choose = (c: CityId) => {
    lightTap();
    setCity(c);
    if (change) goBack();
    else router.replace('/');
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 14 }]}>
      {change ? <IconButton label="Volver" icon="back" onPress={goBack} /> : <View style={{ height: 44 }} />}
      {/* «Paso 2 de 2» solo en el primer arranque y mientras exista el paso del idioma */}
      {!change && HAS_LANGUAGE_STEP && <Animated.Text entering={rise(1)} style={[type.overline, { marginTop: 8 }]}>Paso 2 de 2</Animated.Text>}
      <Animated.Text entering={rise(2)} style={[type.hero, { fontSize: 38, lineHeight: 42, marginTop: change || !HAS_LANGUAGE_STEP ? 8 : 0 }]}>¿Dónde paseamos?</Animated.Text>
      <Animated.Text entering={appear(250)} style={[type.caption, { marginBottom: 6 }]}>Puedes cambiar de ciudad cuando quieras desde Ajustes.</Animated.Text>

      {/* En una lista que se desplaza: con tres ciudades o más (o letra grande) las tarjetas no se aplastan */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        {CITIES.map((c, i) => {
          const { open, locked } = toursIn(c.id);
          const cover = c.coverTour ? getTour(c.coverTour) : undefined;
          return (
            <Animated.View key={c.id} entering={rise(6 + i * 3)}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${c.region}`}
                accessibilityState={{ selected: current === c.id }}
                onPress={() => choose(c.id)}
                scaleTo={0.97}
                style={[s.card, current === c.id && s.cardOn]}
              >
                {c.art ? <Image source={c.art} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: '6%' }} /> : cover ? <TourBanner tour={cover} /> : <CityArt id={c.id} palette={c.palette} />}
                <Scrim opacity={0.65} />
                <View style={s.cardText}>
                  <Text style={s.region}>{c.region}</Text>
                  <Text style={s.city}>{c.name}</Text>
                  <View style={s.badges}>
                    {open.length > 0 && <Text maxFontSizeMultiplier={1.3} style={[s.badge, s.badgeOpen]}>{open.length} {open.length === 1 ? 'tour' : 'tours'}</Text>}
                    {locked.length > 0 && (
                      <View style={[s.badge, s.badgeLocked, s.badgeRow]}>
                        <Icon name="lock" color={neutral.white} size={12} />
                        <Text maxFontSizeMultiplier={1.3} style={s.badgeLockedText}>{locked.length} de pago</Text>
                      </View>
                    )}
                    {open.length === 0 && <Text maxFontSizeMultiplier={1.3} style={[s.badge, s.badgeLocked]}>Próximamente</Text>}
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.bg, paddingHorizontal: 18, gap: 12 },
  card: { height: 210, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', ...shadow[2] },
  cardOn: { borderWidth: 3, borderColor: neutral.ink },
  cardText: { padding: 18, gap: 2 },
  region: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  city: { fontFamily: font.serif, fontSize: 40, lineHeight: 44, color: neutral.white },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { fontFamily: font.black, fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeOpen: { backgroundColor: brand.sun, color: neutral.ink },
  badgeLocked: { backgroundColor: 'rgba(255,255,255,0.2)', color: neutral.white },
  badgeLockedText: { fontFamily: font.black, fontSize: 12, color: neutral.white },
});
