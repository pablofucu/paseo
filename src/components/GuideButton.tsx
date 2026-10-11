import { StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { DuotoneImage } from '@/components/DuotoneImage';
import { PressableScale } from '@/components/motion';
import { font } from '@/theme/fonts';
import { neutral, shadow, type TourPalette } from '@/theme/tokens';

interface Props {
  /** «guide»: en el mapa, abre la guía de la parada; «map»: en la guía, vuelve al mapa */
  to: 'guide' | 'map';
  photo: ImageSourcePropType;
  palette: TourPalette;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Botón flotante de la esquina inferior derecha para entrar y salir de la
 * guía de la parada visitada. Está en el mismo sitio en el mapa y en la guía.
 */
export function GuideButton({ to, photo, palette: p, onPress, style }: Props) {
  const guide = to === 'guide';
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={[s.wrap, style]}>
      <PressableScale accessibilityRole="button" accessibilityLabel={guide ? 'Abrir la guía de la parada' : 'Volver al mapa'} onPress={onPress} scaleTo={0.94} style={[s.btn, { backgroundColor: guide ? p.deep : neutral.surface }]}>
        {guide ? (
          <DuotoneImage source={photo} palette={p} style={s.pic} />
        ) : (
          <View style={[s.pic, s.icon, { backgroundColor: p.soft }]}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11v13.5" fill="none" stroke={p.deep} strokeWidth={2} strokeLinejoin="round" />
            </Svg>
          </View>
        )}
        <Text style={[s.text, { color: guide ? '#fff' : neutral.ink }]}>{guide ? 'Guía' : 'Mapa'}</Text>
      </PressableScale>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', right: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingLeft: 5, paddingRight: 16, borderRadius: 999, ...shadow[3] },
  pic: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  icon: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: font.black, fontSize: 15 },
});
