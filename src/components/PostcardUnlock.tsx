import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUR, EASE_OUT } from '@/components/motion';
import { PackPostcard, postcardHeight } from '@/components/Postcard';
import { ShareMat } from '@/components/ShareMat';
import type { Pack } from '@/data/packs';
import { getCity } from '@/data/tours';
import { sharePackPostcard } from '@/lib/share';
import { font } from '@/theme/fonts';

/** Fondo de la postal: el mismo en esta lámina y en la pantalla de la postal (postal/[id]) */
export const FONDO_POSTAL = '#1d1a15';

/** Giro de la postal: empieza a los 180 ms y dura 760 ms; el brillo y la vibración llegan cuando termina */
const SPIN_DELAY = 180;
const SPIN_MS = 760;

/**
 * «Postal desbloqueada» (la de un pack completo): se oscurece el fondo y la lámina sube suave;
 * la postal llega un poco después, girando sin pasarse hasta quedarse a −3°,
 * y al asentarse vibra y la cruza un brillo. Con «Ver la postal», «Compartir» y
 * «Seguir»; tocar fuera de la lámina también la cierra.
 */
export function PostcardUnlock({ pack, onClose }: { pack: Pack; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const y = useSharedValue(reduced ? 0 : height);
  const spin = useSharedValue(reduced ? 1 : 0);
  const sheen = useSharedValue(0);
  const card = useRef<View>(null);
  const w = Math.min(width - 48 - 24, 520);
  const ch = postcardHeight(w);
  const city = getCity(pack.city)?.name;

  useEffect(() => {
    y.set(withTiming(0, { duration: DUR.slow + 80, easing: EASE_OUT }));
    spin.set(withDelay(SPIN_DELAY, withTiming(1, { duration: SPIN_MS, easing: EASE_OUT })));
    // Al asentarse la postal: vibración de éxito y un brillo que la cruza (sin movimiento, solo la vibración)
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (!reduced) sheen.set(withTiming(1, { duration: 750 }));
    }, reduced ? 400 : SPIN_DELAY + SPIN_MS);
    return () => clearTimeout(t);
  }, [y, spin, sheen, reduced]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, spin.value * 1.6),
    transform: [{ translateY: (1 - spin.value) * 60 }, { scale: 0.8 + spin.value * 0.2 }, { rotate: `${-3 - (1 - spin.value) * 14}deg` }],
  }));
  // Banda de luz en diagonal que cruza la postal de izquierda a derecha una vez
  const band = useAnimatedStyle(() => ({
    opacity: sheen.value > 0 && sheen.value < 1 ? 1 : 0,
    transform: [{ translateX: -w * 0.4 + sheen.value * (w * 1.4) }, { rotate: '18deg' }],
  }));

  const close = () => {
    if (reduced) return onClose();
    y.set(withTiming(height, { duration: 220 }));
    setTimeout(onClose, 230);
  };

  return (
    <>
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,5,0.55)' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 18 }, style]}>
        <Text style={s.over}>Postal desbloqueada</Text>
        <Text style={s.title}>{pack.name}</Text>
        {city ? <Text style={s.sub}>{city}</Text> : null}
        <Animated.View style={[{ marginVertical: 8 }, cardStyle]}>
          <ShareMat ref={card} pack={pack}>
            <PackPostcard pack={pack} unlocked width={w} />
          </ShareMat>
          <View pointerEvents="none" style={[s.sheenClip, { left: 12, top: 12, width: w, height: ch }]}>
            <Animated.View style={[s.band, { height: ch * 1.8, top: -ch * 0.4 }, band]} />
          </View>
        </Animated.View>
        <View style={s.row}>
          <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push({ pathname: '/postal/[id]', params: { id: pack.id } }); }} style={[s.btn, s.primary]}>
            <Text style={[s.btnText, { color: '#1c1a17' }]}>Ver la postal</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => sharePackPostcard(card, pack.name)} style={[s.btn, s.secondary]}>
            <Text style={[s.btnText, { color: '#fff' }]}>Compartir</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={8} style={s.follow}>
          <Text style={s.followText}>Seguir</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 22, paddingHorizontal: 18, backgroundColor: FONDO_POSTAL, borderTopLeftRadius: 26, borderTopRightRadius: 26, boxShadow: '0px -10px 40px rgba(0,0,0,0.4)' },
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  title: { fontFamily: font.serif, fontSize: 24, color: '#fff', marginTop: 2, textAlign: 'center' },
  sub: { fontFamily: font.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 10 },
  btn: { flex: 1, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#fff' },
  secondary: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  btnText: { fontFamily: font.black, fontSize: 15.5 },
  follow: { height: 44, paddingHorizontal: 24, justifyContent: 'center', marginTop: 4 },
  followText: { fontFamily: font.black, fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  sheenClip: { position: 'absolute', overflow: 'hidden' },
  band: { position: 'absolute', left: 0, width: 70, experimental_backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.5), rgba(255,255,255,0))' },
});
