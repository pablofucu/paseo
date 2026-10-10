import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TourSeal } from '@/components/Stamp';
import { IconButton } from '@/components/ui';
import { TOURS } from '@/data/tours';
import { stampDate, usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';
import { brand, neutral } from '@/theme/tokens';
import { type } from '@/theme/type';

export default function Passport() {
  const insets = useSafeAreaInsets();
  const visits = usePassport(s => s.visits);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: 18, gap: 14 }}>
      <IconButton label="Volver" glyph="‹" onPress={() => router.back()} />
      <Text style={[type.overline, { color: brand.coral }]}>Mis tours</Text>
      <Text style={[type.hero, { fontSize: 36, lineHeight: 40 }]}>Tu pasaporte</Text>
      {TOURS.map(tour => {
        const mine = visits.filter(v => v.tourId === tour.id).reverse();
        const done = mine.find(v => v.completedAt);
        return (
          <View key={tour.id} style={s.page}>
            <Text style={s.over}>Pasaporte Paseo · {tour.city}</Text>
            <View style={s.row}>
              <TourSeal tour={tour} date={stampDate(done?.completedAt)} ghost={!done} size={120} rotate={done ? -10 : 0} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.tour}>{tour.title}</Text>
                <Text style={type.caption}>{done ? 'Tour completado' : mine.length ? 'En curso' : 'Aún sin empezar'}</Text>
              </View>
            </View>
            {mine.length > 0 && <Text style={[s.over, { marginTop: 10 }]}>Tus visitas</Text>}
            {mine.map(v => {
              const got = Object.keys(v.stamps).length;
              return (
                <Pressable key={v.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/visit/[id]', params: { id: v.id } })} style={({ pressed }) => [s.visit, pressed && { opacity: 0.7 }]}>
                  <Text style={s.visitDate}>{new Date(v.startedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                  <Text style={s.visitCount}>{got} / {tour.stops.length} sellos ›</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
      {visits.length === 0 && <Text style={[type.caption, { textAlign: 'center' }]}>Haz un tour para conseguir tus primeros sellos.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { backgroundColor: neutral.paper, borderRadius: 18, padding: 16 },
  over: { fontFamily: font.black, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: neutral.ink3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  tour: { fontFamily: font.serif, fontSize: 20, color: neutral.ink },
  visit: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderColor: '#E6DDCE' },
  visitDate: { fontFamily: font.bold, fontSize: 15, color: neutral.ink },
  visitCount: { fontFamily: font.black, fontSize: 14, color: neutral.ink2 },
});
