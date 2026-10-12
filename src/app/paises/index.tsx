import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { IconButton } from '@/components/ui';
import { appear, PressableScale, rise } from '@/components/motion';
import { Scrim } from '@/components/Scrim';
import { COUNTRIES, getTour, toursInCountry } from '@/data/tours';
import { font } from '@/theme/fonts';
import { neutral, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

const SEVILLA = getTour('sevilla-centro')!;

/** Elección de país: el primer paso para encontrar un tour fuera de la ciudad de Inicio */
export default function Paises() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 18, gap: 12 }}>
      <IconButton label="Volver" icon="back" onPress={() => router.back()} />
      <Animated.Text entering={rise(1)} style={[type.overline, { marginTop: 8 }]}>Explorar</Animated.Text>
      <Animated.Text entering={rise(2)} style={[type.hero, { fontSize: 38, lineHeight: 42 }]}>¿A qué país vamos?</Animated.Text>
      <Animated.Text entering={appear(250)} style={[type.caption, { marginBottom: 6 }]}>Elige un país para ver sus tours, ciudad por ciudad.</Animated.Text>

      {COUNTRIES.map((c, i) => {
        const groups = toursInCountry(c.id);
        const open = groups.reduce((a, g) => a + g.open.length, 0);
        const locked = groups.reduce((a, g) => a + g.locked.length, 0);
        const soon = open + locked === 0;
        return (
          <Animated.View key={c.id} entering={rise(4 + i * 2)}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={soon ? `${c.name}, próximamente` : `${c.name}, ${open + locked} tours`}
              accessibilityState={{ disabled: soon }}
              disabled={soon}
              onPress={() => router.push({ pathname: '/paises/[pais]', params: { pais: c.id } })}
              scaleTo={0.97}
              style={[s.card, soon && s.cardSoon]}
            >
              {c.id === 'es' && (
                <>
                  <DuotoneImage source={SEVILLA.stops[SEVILLA.emblemStop].photo} palette={SEVILLA.palette} style={StyleSheet.absoluteFill} />
                  <Scrim opacity={0.65} />
                </>
              )}
              <View style={s.cardText}>
                <Text style={s.flag}>{c.flag}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.name, soon && { color: neutral.ink }]}>{c.name}</Text>
                  <View style={s.badges}>
                    {soon && <Text style={[s.badge, s.badgeSoon]}>Próximamente</Text>}
                    {open > 0 && <Text style={[s.badge, s.badgeOpen]}>{open} {open === 1 ? 'tour' : 'tours'}</Text>}
                    {locked > 0 && <Text style={[s.badge, s.badgeLocked]}>🔒 {locked} de pago</Text>}
                  </View>
                </View>
              </View>
            </PressableScale>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { height: 180, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: neutral.ink, ...shadow[2] },
  cardSoon: { height: 92, backgroundColor: neutral.bg2, shadowOpacity: 0, elevation: 0 },
  cardText: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  flag: { fontSize: 38, lineHeight: 46 },
  name: { fontFamily: font.serif, fontSize: 34, lineHeight: 38, color: '#fff' },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { fontFamily: font.black, fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  badgeOpen: { backgroundColor: '#FFC53D', color: neutral.ink },
  badgeLocked: { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' },
  badgeSoon: { backgroundColor: neutral.line, color: neutral.ink2 },
});
