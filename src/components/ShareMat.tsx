import { Image } from 'expo-image';
import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Pack } from '@/data/packs';
import { getCity } from '@/data/tours';
import type { Tour } from '@/data/types';
import { packStampArt } from '@/lib/packs';
import { APP_NAME } from '@/lib/share';
import { font } from '@/theme/fonts';

/**
 * Lo que se captura al compartir: la postal (o la hoja) sobre un fondo opaco del
 * color de la ruta (o de la ciudad, en un pack), con el sello de la ruta y el nombre de la app abajo. Sin el
 * fondo, las esquinas y el borde perforado salen negros o transparentes en el PNG.
 */
export function ShareMat({ tour, pack, children, ref }: { tour?: Tour; pack?: Pack; children: ReactNode; ref?: Ref<View> }) {
  // La postal de un pack usa los colores de su ciudad y el sello de una de sus rutas
  const palette = tour?.palette ?? getCity(pack?.city ?? '')?.palette;
  const stamp = tour?.stamp.art ?? (pack ? packStampArt(pack) : undefined);
  const title = tour?.title ?? pack?.name ?? '';
  return (
    <View ref={ref} collapsable={false} style={[s.mat, { backgroundColor: palette?.deep ?? '#1d1a15' }]}>
      {children}
      <View style={s.foot}>
        {stamp && (
          <View style={[s.stamp, { borderColor: palette?.t2 }]}>
            <Image source={stamp} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        )}
        <Text style={[s.text, { color: palette?.t2 }]} numberOfLines={1}>{APP_NAME} · {title}</Text>
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
