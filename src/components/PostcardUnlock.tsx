import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Postcard } from '@/components/Postcard';
import type { Tour } from '@/data/types';
import { sharePostcard } from '@/lib/share';
import type { UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

/**
 * «Postal desbloqueada»: sube desde abajo con la postal girada −3°
 * (700 ms, cubic-bezier(.2, 1.3, .4, 1)), con «Ver en Postales» y «Compartir».
 */
export function PostcardUnlock({ tour, route }: { tour: Tour; route: UserRoute | undefined }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const y = useSharedValue(reduced ? 0 : height);
  const card = useRef<View>(null);
  useEffect(() => {
    y.value = withTiming(0, { duration: reduced ? 0 : 700, easing: Easing.bezier(0.2, 1.3, 0.4, 1) });
  }, [y, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const w = Math.min(width - 48, 520);

  return (
    <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 18 }, style]}>
      <Text style={s.over}>Postal desbloqueada</Text>
      <Text style={s.title}>{tour.title}</Text>
      <View ref={card} collapsable={false} style={{ transform: [{ rotate: '-3deg' }], marginVertical: 8 }}>
        <Postcard tour={tour} route={route} width={w} />
      </View>
      <View style={s.row}>
        <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/postales', params: { open: tour.id } })} style={[s.btn, s.primary]}>
          <Text style={[s.btnText, { color: '#fff' }]}>Ver en Postales</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => sharePostcard(card, tour.title)} style={[s.btn, s.secondary]}>
          <Text style={s.btnText}>Compartir</Text>
        </Pressable>
      </View>
    </Animated.View>
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
