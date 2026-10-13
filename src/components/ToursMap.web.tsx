import { StyleSheet, Text, View } from 'react-native';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import type { ToursMapProps } from './ToursMap';

/** En la web no hay mapa nativo (MapLibre): se explica dónde verlo */
export function ToursMap(_: ToursMapProps) {
  return (
    <View style={[StyleSheet.absoluteFill, s.box]}>
      <Text style={s.text}>El mapa de rutas está en la app de iOS y Android.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: neutral.bg2 },
  text: { fontFamily: font.bold, fontSize: 14, color: neutral.ink3, textAlign: 'center' },
});
