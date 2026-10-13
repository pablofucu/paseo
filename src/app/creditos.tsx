import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuotoneImage } from '@/components/DuotoneImage';
import { rise } from '@/components/motion';
import { thenYear } from '@/components/ThenNow';
import { IconButton } from '@/components/ui';
import { TOURS } from '@/data/tours';
import { creditPending } from '@/data/types';
import { font } from '@/theme/fonts';
import { neutral, shadow } from '@/theme/tokens';
import { type } from '@/theme/type';

/** Créditos de las fotos: autoría, licencia y enlace a la fuente de cada una, por ruta */
export default function Creditos() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 22 }}>
      <View style={{ gap: 10 }}>
        <IconButton label="Volver" icon="back" onPress={() => router.back()} />
        <Animated.Text entering={rise(0)} style={type.title}>Créditos de las fotos</Animated.Text>
        <Animated.Text entering={rise(1)} style={type.body}>Las fotos de las paradas son libres y vienen de Wikimedia Commons. Toca una para abrir su página de origen. Donde pone «pendiente» aún falta comprobar la autoría.</Animated.Text>
      </View>

      {TOURS.map((tour, t) => (
        <Animated.View key={tour.id} entering={rise(t + 2)} style={{ gap: 8 }}>
          <Text style={[type.overline, { marginLeft: 4 }]}>{tour.title}</Text>
          <View style={s.group}>
            {tour.stops.flatMap(st => [
              { key: st.id, name: st.name, thumb: st.thumb, c: st.photoCredit },
              // La foto antigua de «Así era», debajo de la de hoy
              ...(st.then ? [{ key: `${st.id}@antes`, name: `${st.name} · ${thenYear(st.then)}`, thumb: st.then.photo, c: st.then.credit }] : []),
            ]).map((st, i) => {
              const c = st.c;
              const pending = creditPending(c);
              return (
                <Pressable
                  key={st.key}
                  accessibilityRole={pending ? undefined : 'link'}
                  accessibilityLabel={pending ? `${st.name}: foto pendiente de crédito` : `${st.name}: foto de ${c.author}, licencia ${c.license}. Abre la fuente`}
                  disabled={pending}
                  onPress={() => Linking.openURL(c.source).catch(() => {})}
                  style={({ pressed }) => [s.row, i > 0 && s.divider, pressed && { opacity: 0.6 }]}
                >
                  <DuotoneImage source={st.thumb} palette={tour.palette} duotone={false} style={s.thumb} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={s.name}>{st.name}</Text>
                    {pending ? (
                      <Text style={type.caption}>Foto: pendiente de crédito</Text>
                    ) : (
                      <>
                        <Text style={type.caption}>{c.author} · {c.license}</Text>
                        <Text style={s.link} numberOfLines={1}>{c.source.replace(/^https?:\/\//, '')}</Text>
                      </>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  group: { backgroundColor: neutral.surface, borderRadius: 20, overflow: 'hidden', ...shadow[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 64 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral.line },
  thumb: { width: 44, height: 44, borderRadius: 11 },
  name: { fontFamily: font.black, fontSize: 15, color: neutral.ink },
  link: { fontFamily: font.bold, fontSize: 12, color: neutral.ink3, textDecorationLine: 'underline' },
});
