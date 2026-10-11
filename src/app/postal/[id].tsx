import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appear, rise } from '@/components/motion';
import { Postcard, postcardHeight } from '@/components/Postcard';
import { IconButton } from '@/components/ui';
import { getTour } from '@/data/tours';
import { sharePostcard } from '@/lib/share';
import { useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';

/** Postal a pantalla completa: se le da la vuelta tocándola y se comparte */
export default function PostalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tour = getTour(id)!;
  const route = useRoute(id);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [back, setBack] = useState(false);
  const turn = useSharedValue(0);
  const card = useRef<View>(null);

  // Cabe a lo ancho, o a lo alto en horizontal
  const w = Math.min(width - 24, ((height - insets.top - insets.bottom - 200) * 928) / 628, 900);
  const flip = () => {
    const to = back ? 0 : 1;
    const ms = reduced ? 0 : 640;
    turn.value = withTiming(to, { duration: ms, easing: Easing.inOut(Easing.cubic) });
    setTimeout(() => setBack(!back), ms / 2);
  };
  const style = useAnimatedStyle(() => {
    const d = turn.value * 180;
    // La cara de atrás se dibuja girada para que no salga en espejo
    // A mitad de giro la postal se acerca un poco, como cuando se le da la vuelta en la mano
    const lift = Math.sin(turn.value * Math.PI);
    return { transform: [{ perspective: 1400 }, { scale: 1 + lift * 0.06 }, { rotateY: `${d > 90 ? d - 180 : d}deg` }, { rotateZ: `${lift * -2}deg` }] };
  });

  return (
    <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
      <IconButton label="Cerrar" icon="close" onPress={() => router.back()} style={{ marginLeft: 14 }} />
      <View style={s.center}>
        <Animated.Text entering={appear(120)} style={s.over}>{tour.city}</Animated.Text>
        <Animated.Text entering={appear(180)} style={s.title}>{tour.title}</Animated.Text>
        <Animated.View entering={rise(2)}>
        <Pressable accessibilityRole="button" accessibilityLabel={back ? 'Ver el anverso' : 'Dar la vuelta a la postal'} onPress={flip} style={{ marginTop: 18 }}>
          <Animated.View ref={card} collapsable={false} style={[{ width: w, height: postcardHeight(w) }, style]}>
            <Postcard tour={tour} route={route} width={w} back={back} />
          </Animated.View>
        </Pressable>
        </Animated.View>
        <Text style={s.hint}>Toca la postal para darle la vuelta</Text>
      </View>
      <View style={s.row}>
        <Pressable accessibilityRole="button" onPress={flip} style={[s.btn, s.ghost]}>
          <Text style={[s.btnText, { color: '#fff' }]}>{back ? 'Ver el anverso' : 'Dar la vuelta'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => sharePostcard(card, tour.title)} style={[s.btn, { backgroundColor: '#fff' }]}>
          <Text style={s.btnText}>Compartir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1d1a15' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  title: { fontFamily: font.serif, fontSize: 26, color: '#fff', textAlign: 'center', paddingHorizontal: 20 },
  hint: { fontFamily: font.bold, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 16 },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 18 },
  btn: { flex: 1, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ghost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  btnText: { fontFamily: font.black, fontSize: 15.5, color: '#1c1a17' },
});
