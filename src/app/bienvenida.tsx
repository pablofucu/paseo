import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { PressableScale } from '@/components/motion';
import { useSettings, type Language } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand } from '@/theme/tokens';

const LANGS: { id: Language; name: string; note: string; ready: boolean }[] = [
  { id: 'es', name: 'Español', note: 'Audios y textos en español', ready: true },
  { id: 'en', name: 'English', note: 'Coming soon · Próximamente', ready: false },
];

/** Emblema: una brújula que gira hasta su sitio sobre un camino de paradas */
function Emblem() {
  const reduced = useReducedMotion();
  const spin = useSharedValue(reduced ? 1 : 0);
  const float = useSharedValue(0);
  useEffect(() => {
    spin.set(withDelay(150, withSpring(1, { damping: 10, stiffness: 70 })));
    if (!reduced) float.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [spin, float, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, spin.value * 1.5),
    transform: [{ translateY: float.value * -6 }, { rotate: `${(1 - spin.value) * -140}deg` }, { scale: 0.6 + spin.value * 0.4 }],
  }));
  return (
    <Animated.View style={style}>
      <Svg width={112} height={112} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill="none" stroke={brand.sun} strokeWidth={3} />
        <Circle cx={50} cy={50} r={39} fill="none" stroke={brand.sun} strokeWidth={1.2} strokeDasharray="2 4" />
        <Path d="M50 16 L57 50 L50 84 L43 50 Z" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinejoin="round" />
        <Path d="M50 16 L57 50 L43 50 Z" fill={brand.coral} />
        <Path d="M16 50 L50 44 L84 50 L50 56 Z" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Pantalla principal de bienvenida: la marca y la elección de idioma. Solo
 * está hecha la versión en español; el inglés sale como «próximamente».
 */
export default function Bienvenida() {
  const insets = useSafeAreaInsets();
  const { change } = useLocalSearchParams<{ change?: string }>();
  const language = useSettings(s => s.language);
  const city = useSettings(s => s.city);
  const setLanguage = useSettings(s => s.setLanguage);

  const choose = (l: Language) => {
    setLanguage(l);
    if (change) router.back();
    else router.replace(city ? '/' : '/ciudad');
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
      <View style={s.brand}>
        <Emblem />
        <View style={s.word}>
          {'Paseo'.split('').map((ch, i) => (
            <Animated.Text key={i} entering={FadeInDown.delay(350 + i * 70).springify().damping(12)} style={s.wordText}>{ch}</Animated.Text>
          ))}
        </View>
        <Animated.Text entering={FadeIn.delay(800).duration(500)} style={s.tag}>Rutas a pie con audio, sellos y postales</Animated.Text>
      </View>

      <View style={{ gap: 12 }}>
        <Animated.Text entering={FadeInDown.delay(950)} style={s.ask}>Elige tu idioma · Choose your language</Animated.Text>
        {LANGS.map((l, i) => {
          const on = language === l.id;
          return (
            <Animated.View key={l.id} entering={FadeInDown.delay(1050 + i * 110).springify().damping(16)}>
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ disabled: !l.ready, selected: on }}
                accessibilityLabel={l.ready ? l.name : `${l.name}, próximamente`}
                disabled={!l.ready}
                onPress={() => choose(l.id)}
                style={[s.lang, !l.ready && s.langOff, on && s.langOn]}
              >
                <View style={[s.code, !l.ready && { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={[s.codeText, !l.ready && { color: 'rgba(255,255,255,0.6)' }]}>{l.id.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.langName, !l.ready && { color: 'rgba(255,255,255,0.65)' }]}>{l.name}</Text>
                  <Text style={[s.langNote, !l.ready && { color: 'rgba(255,255,255,0.5)' }]}>{l.note}</Text>
                </View>
                <Text style={[s.go, !l.ready && { opacity: 0 }]}>›</Text>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.navy, paddingHorizontal: 22, justifyContent: 'space-between' },
  brand: { alignItems: 'center', marginTop: 30, gap: 14 },
  word: { flexDirection: 'row' },
  wordText: { fontFamily: font.serif, fontSize: 64, lineHeight: 70, color: '#fff', letterSpacing: -1.5 },
  tag: { fontFamily: font.bold, fontSize: 16, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  ask: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: brand.sun, textAlign: 'center', marginBottom: 2 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: '#fff' },
  langOn: { borderWidth: 2, borderColor: brand.sun },
  langOff: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'dashed' },
  code: { width: 48, height: 48, borderRadius: 14, backgroundColor: brand.coral, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontFamily: font.black, fontSize: 16, color: '#fff', letterSpacing: 1 },
  langName: { fontFamily: font.serif, fontSize: 22, color: brand.navy },
  langNote: { fontFamily: font.bold, fontSize: 13, color: '#6b6457', marginTop: 1 },
  go: { fontFamily: font.black, fontSize: 28, color: brand.coral, marginRight: 4 },
});
