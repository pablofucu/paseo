import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass } from '@/components/Compass';
import { DUR, EASE_OUT, lightTap, PressableScale } from '@/components/motion';
import { goBack } from '@/lib/nav';
import { HAS_LANGUAGE_STEP, LANGUAGES, READY_LANGUAGES, useSettings, type Language } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral } from '@/theme/tokens';

/** Entrada suave: sube 14 px y aparece, sin rebote */
const up = (delay: number, duration: number = DUR.slow) =>
  FadeInDown.delay(delay).duration(duration).easing(EASE_OUT).withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] });

/** Emblema: una brújula que gira hasta su sitio sobre un camino de paradas */
function Emblem() {
  const reduced = useReducedMotion();
  const spin = useSharedValue(reduced ? 1 : 0);
  const float = useSharedValue(0);
  useEffect(() => {
    spin.set(withDelay(150, withTiming(1, { duration: 1300, easing: EASE_OUT })));
    if (!reduced) float.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [spin, float, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, spin.value * 1.5),
    transform: [{ translateY: float.value * -6 }, { rotate: `${(1 - spin.value) * -90}deg` }, { scale: 0.88 + spin.value * 0.12 }],
  }));
  return (
    <Animated.View style={style}>
      <Compass />
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
    lightTap();
    if (change) goBack();
    else router.replace(city ? '/' : '/ciudad');
  };
  // Con un solo idioma hecho no hay nada que elegir: un botón para empezar
  const start = () => choose(READY_LANGUAGES[0].id);

  return (
    <View style={[s.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
      {/* Fondo azul marino: iconos de la barra de estado claros */}
      <StatusBar style="light" />
      <View style={s.brand}>
        <Emblem />
        <View style={s.word}>
          {'Paseo'.split('').map((ch, i) => (
            <Animated.Text key={i} entering={up(350 + i * 70)} style={s.wordText}>{ch}</Animated.Text>
          ))}
        </View>
        <Animated.Text entering={FadeIn.delay(800).duration(500)} style={s.tag}>Rutas a pie con audio, sellos y postales</Animated.Text>
      </View>

      {!HAS_LANGUAGE_STEP ? (
        <Animated.View entering={up(950)}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Empezar" onPress={start} style={s.start}>
            <Text maxFontSizeMultiplier={1.3} style={s.startText}>Empezar</Text>
          </PressableScale>
        </Animated.View>
      ) : (
      <View style={{ gap: 12 }}>
        <Animated.Text entering={up(950, DUR.base)} style={s.ask}>Elige tu idioma · Choose your language</Animated.Text>
        {LANGUAGES.map((l, i) => {
          const on = language === l.id;
          return (
            <Animated.View key={l.id} entering={up(1050 + i * 110)}>
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
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.navy, paddingHorizontal: 22, justifyContent: 'space-between' },
  brand: { alignItems: 'center', marginTop: 30, gap: 14 },
  word: { flexDirection: 'row' },
  wordText: { fontFamily: font.serifBold, fontSize: 64, lineHeight: 70, color: neutral.white, letterSpacing: -1.5 },
  tag: { fontFamily: font.bold, fontSize: 16, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  ask: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: brand.sun, textAlign: 'center', marginBottom: 2 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: neutral.white },
  langOn: { borderWidth: 2, borderColor: brand.sun },
  langOff: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'dashed' },
  code: { width: 48, height: 48, borderRadius: 14, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontFamily: font.black, fontSize: 16, color: neutral.white, letterSpacing: 1 },
  langName: { fontFamily: font.serifBold, fontSize: 22, color: brand.navy },
  langNote: { fontFamily: font.bold, fontSize: 13, color: neutral.ink2, marginTop: 1 },
  start: { minHeight: 56, paddingVertical: 8, borderRadius: 999, backgroundColor: brand.sun, alignItems: 'center', justifyContent: 'center' },
  startText: { fontFamily: font.black, fontSize: 18, color: brand.navy },
  go: { fontFamily: font.black, fontSize: 28, color: brand.primary, marginRight: 4 },
});
