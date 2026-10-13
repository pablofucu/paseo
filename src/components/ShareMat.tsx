import { Image } from 'expo-image';
import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Tour } from '@/data/types';
import { APP_NAME } from '@/lib/share';
import { font } from '@/theme/fonts';

/**
 * Lo que se captura al compartir: la postal (o la hoja) sobre un fondo opaco del
 * color de la ruta, con el sello de la ruta y el nombre de la app abajo. Sin el
 * fondo, las esquinas y el borde perforado salen negros o transparentes en el PNG.
 */
export function ShareMat({ tour, children, ref }: { tour: Tour; children: ReactNode; ref?: Ref<View> }) {
  return (
    <View ref={ref} collapsable={false} style={[s.mat, { backgroundColor: tour.palette.deep }]}>
      {children}
      <View style={s.foot}>
        <View style={[s.stamp, { borderColor: tour.palette.t2 }]}>
          <Image source={tour.stamp.art} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
        <Text style={[s.text, { color: tour.palette.t2 }]} numberOfLines={1}>{APP_NAME} · {tour.title}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  mat: { padding: 12, borderRadius: 10, alignItems: 'center', gap: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch', paddingHorizontal: 2 },
  stamp: { width: 21, height: 26, borderWidth: 1, overflow: 'hidden', backgroundColor: '#fbf7ec' },
  text: { flex: 1, fontFamily: font.black, fontSize: 12, letterSpacing: 0.4 },
});
