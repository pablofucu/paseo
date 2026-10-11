import { StyleSheet, Text, View } from 'react-native';
import type { Tour } from '@/data/types';
import type { UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';

/** En la web no hay mapa nativo (MapLibre): se explica dónde verlo */
export function PostcardMap(_: { tours: Tour[]; routes: Record<string, UserRoute>; onOpen: (t: Tour) => void }) {
  return (
    <View style={s.box}>
      <Text style={s.text}>El mapa de postales está en la app de iOS y Android.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { height: 220, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: neutral.bg2 },
  text: { fontFamily: font.bold, fontSize: 14, color: neutral.ink3, textAlign: 'center' },
});
