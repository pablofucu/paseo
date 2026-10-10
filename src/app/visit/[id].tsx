import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PassportPage } from '@/components/PassportPage';
import { IconButton } from '@/components/ui';
import { getTour } from '@/data/tours';
import { usePassport } from '@/store/passport';
import { neutral } from '@/theme/tokens';
import { type } from '@/theme/type';

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const visit = usePassport(s => s.visits.find(v => v.id === id));
  const tour = visit && getTour(visit.tourId);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 16, gap: 12 }}>
      <IconButton label="Volver" glyph="‹" onPress={() => router.back()} />
      {tour && visit ? (
        <>
          <Text style={[type.overline, { color: tour.palette.t }]}>{tour.city} · {new Date(visit.startedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <Text style={type.title}>{tour.title}</Text>
          <PassportPage tour={tour} visit={visit} />
          {!visit.completedAt && <Text style={type.caption}>Las paradas que faltan quedan en blanco. Vuelve otro día para completar la página y conseguir el visado del tour.</Text>}
        </>
      ) : (
        <Text style={type.body}>No encontramos esta visita.</Text>
      )}
    </ScrollView>
  );
}
