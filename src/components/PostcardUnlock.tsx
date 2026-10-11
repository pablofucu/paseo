import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Postcard } from '@/components/Postcard';
import type { Tour } from '@/data/types';
import { sharePostcard } from '@/lib/share';
import type { UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

/**
 * «Postal desbloqueada»: se oscurece el fondo y la lámina sube con un muelle;
 * la postal llega un poco después, girando hasta quedarse a −3°. Con «Ver en
 * Postales» y «Compartir».
 */
export function PostcardUnlock({ tour, route }: { tour: Tour; route: UserRoute | undefined }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const y = useSharedValue(reduced ? 0 : height);
  const spin = useSharedValue(reduced ? 1 : 0);
  const card = useRef<View>(null);
  useEffect(() => {
    y.set(withSpring(0, { damping: 20, stiffness: 140, mass: 0.9 }));
    spin.set(withDelay(180, withSpring(1, { damping: 11, stiffness: 120 })));
  }, [y, spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, spin.value * 1.6),
    transform: [{ translateY: (1 - spin.value) * 60 }, { scale: 0.8 + spin.value * 0.2 }, { rotate: `${-3 - (1 - spin.value) * 14}deg` }],
  }));
  const w = Math.min(width - 48, 520);

  return (
    <>
    <Animated.View entering={FadeIn.duration(300)} pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,5,0.45)' }]} />
    <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 18 }, style]}>
      <Text style={s.over}>Postal desbloqueada</Text>
      <Text style={s.title}>{tour.title}</Text>
      <Animated.View style={[{ marginVertical: 8 }, cardStyle]}>
        <View ref={card} collapsable={false}>
          <Postcard tour={tour} route={route} width={w} />
        </View>
      </Animated.View>
      <View style={s.row}>
        <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/postales', params: { open: tour.id } })} style={[s.btn, s.primary]}>
          <Text style={[s.btnText, { color: '#fff' }]}>Ver en Postales</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => sharePostcard(card, tour.title)} style={[s.btn, s.secondary]}>
          <Text style={s.btnText}>Compartir</Text>
        </Pressable>
      </View>
    </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 22, paddingHorizontal: 18, backgroundColor: '#fbf7ee', borderTopLeftRadius: 26, borderTopRightRadius: 26, boxShadow: '0px -10px 40px rgba(0,0,0,0.28)' },
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: '#7d705a' },
  title: { fontFamily: font.serif, fontSize: 24, color: '#1c1a17', marginTop: 2, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 10 },
  btn: { flex: 1, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#1c1a17' },
  secondary: { borderWidth: 1.5, borderColor: 'rgba(28,26,23,0.25)' },
  btnText: { fontFamily: font.black, fontSize: 15.5, color: '#1c1a17' },
});
