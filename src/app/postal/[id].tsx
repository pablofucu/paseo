import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appear, rise } from '@/components/motion';
import { FONDO_POSTAL } from '@/components/PostcardUnlock';
import { ShareMat } from '@/components/ShareMat';
import { IconButton } from '@/components/ui';
import { getPack, packOf, type Pack } from '@/data/packs';
import { getCity } from '@/data/tours';
import { PackPostcard, postcardHeight } from '@/components/Postcard';
import { postcardUnlocked } from '@/lib/packs';
import { sharePackPostcard } from '@/lib/share';
import { usePassport } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';

/**
 * Postal de un pack a pantalla completa: se le da la vuelta tocándola y se comparte.
 * El id es el del pack; con el de una ruta se abre la postal de su pack.
 */
export default function PostalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pack = getPack(id) ?? packOf(id);
  return pack ? <Postal pack={pack} /> : <Aviso title="Esta postal no existe" text="Quizá el pack ya no está en la app." />;
}

/** Pantalla de aviso: postal desconocida o todavía sin ganar */
function Aviso({ title, text, action }: { title: string; text: string; action?: { label: string; onPress: () => void } }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar style="light" />
      <IconButton label="Cerrar" icon="close" onPress={() => router.back()} style={{ marginLeft: 14 }} />
      <View style={s.center}>
        <Text accessibilityRole="header" style={s.title}>{title}</Text>
        <Text style={[s.hint, { textAlign: 'center', paddingHorizontal: 32 }]}>{text}</Text>
      </View>
      {action && (
        <View style={s.row}>
          <Pressable accessibilityRole="button" onPress={action.onPress} style={[s.btn, { backgroundColor: '#fff' }]}>
            <Text style={s.btnText}>{action.label}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Postal({ pack }: { pack: Pack }) {
  const routes = usePassport(s => s.routes);
  const testMode = useSettings(s => s.testMode);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [back, setBack] = useState(false);
  /** Mientras la postal gira no se comparte: la captura saldría a medio giro */
  const [flipping, setFlipping] = useState(false);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flipTimer.current), []);
  const turn = useSharedValue(0);
  const card = useRef<View>(null);
  const earned = postcardUnlocked(pack, routes, { testMode });
  const city = getCity(pack.city)?.name ?? '';

  // Cabe a lo ancho, o a lo alto en horizontal
  const w = Math.min(width - 24, ((height - insets.top - insets.bottom - 200) * 928) / 628, 900);
  const flip = () => {
    const to = back ? 0 : 1;
    turn.value = withTiming(to, { duration: reduced ? 0 : 640, easing: Easing.inOut(Easing.cubic) });
    setBack(!back);
    if (!reduced) {
      setFlipping(true);
      clearTimeout(flipTimer.current);
      flipTimer.current = setTimeout(() => setFlipping(false), 700);
    }
  };
  const style = useAnimatedStyle(() => {
    const d = turn.value * 180;
    // La cara de atrás se dibuja girada para que no salga en espejo
    // A mitad de giro la postal se acerca un poco, como cuando se le da la vuelta en la mano
    const lift = Math.sin(turn.value * Math.PI);
    return { transform: [{ perspective: 1400 }, { scale: 1 + lift * 0.06 }, { rotateY: `${d > 90 ? d - 180 : d}deg` }, { rotateZ: `${lift * -2}deg` }] };
  });
  // Las dos caras están siempre montadas y se cambian en el hilo de UI justo en el canto (90°):
  // si se esperase al render de React, durante un instante saldría la cara equivocada
  const frontFace = useAnimatedStyle(() => ({ opacity: turn.value <= 0.5 ? 1 : 0 }));
  const backFace = useAnimatedStyle(() => ({ opacity: turn.value > 0.5 ? 1 : 0 }));

  // Una postal sin ganar no se enseña ni se comparte
  if (!earned) {
    return (
      <Aviso
        title="Aún no es tuya"
        text={pack.postcard ? `Junta los sellos de «${pack.name}» para ganar su postal.` : 'Esta postal todavía está por dibujar.'}
        action={{ label: 'Ver mi colección', onPress: () => { router.dismissTo('/'); router.navigate('/postales'); } }}
      />
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar style="light" />
      <IconButton label="Cerrar" icon="close" onPress={() => router.back()} style={{ marginLeft: 14 }} />
      <View style={s.center}>
        <Animated.Text entering={appear(120)} style={s.over}>{city}</Animated.Text>
        <Animated.Text entering={appear(180)} accessibilityRole="header" style={s.title}>{pack.name}</Animated.Text>
        <Animated.View entering={rise(2)}>
        <Pressable accessibilityRole="button" accessibilityLabel={back ? 'Ver el anverso' : 'Dar la vuelta a la postal'} onPress={flip} style={{ marginTop: 18 }}>
          <ShareMat ref={card} pack={pack}>
          <Animated.View style={[{ width: w, height: postcardHeight(w) }, style]}>
            {/* Cada cara se pinta una vez como textura: al girar solo se mueve la imagen, sin volver a dibujar el SVG y los textos */}
            <Animated.View style={[StyleSheet.absoluteFill, frontFace]} renderToHardwareTextureAndroid shouldRasterizeIOS>
              <PackPostcard pack={pack} unlocked={earned} width={w} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, backFace]} renderToHardwareTextureAndroid shouldRasterizeIOS>
              <PackPostcard pack={pack} unlocked={earned} width={w} back />
            </Animated.View>
          </Animated.View>
          </ShareMat>
        </Pressable>
        </Animated.View>
        <Text style={s.hint}>Toca la postal para darle la vuelta</Text>
      </View>
      <View style={s.row}>
        <Pressable accessibilityRole="button" onPress={flip} style={[s.btn, s.ghost]}>
          <Text style={[s.btnText, { color: '#fff' }]}>{back ? 'Ver el anverso' : 'Dar la vuelta'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: flipping }} disabled={flipping} onPress={() => sharePackPostcard(card, pack.name)} style={[s.btn, { backgroundColor: '#fff' }, flipping && { opacity: 0.5 }]}>
          <Text style={s.btnText}>Compartir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: FONDO_POSTAL },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  title: { fontFamily: font.serif, fontSize: 26, color: '#fff', textAlign: 'center', paddingHorizontal: 20 },
  hint: { fontFamily: font.bold, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 16 },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 18 },
  btn: { flex: 1, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ghost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  btnText: { fontFamily: font.black, fontSize: 15.5, color: '#1c1a17' },
});
