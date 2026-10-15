import { StyleSheet, View } from 'react-native';
import { RouteStamp } from '@/components/RouteStamp';
import type { PackStamp } from '@/lib/packs';
import { getTour, LOCKED_TOURS } from '@/data/tours';
import { brand } from '@/theme/tokens';

/**
 * Fila de los sellos de carta de un pack, pequeños: en color los ganados, en gris con
 * candado los que faltan. `highlight` (el sello recién ganado) lleva un resplandor amarillo sol.
 */
export function PackStampRow({ stamps, height, highlight }: { stamps: PackStamp[]; height: number; highlight?: string }) {
  const w = Math.round(height * 0.82);
  return (
    <View style={s.row}>
      {stamps.map(st => {
        const tour = getTour(st.id);
        return (
          <View key={st.id} style={[{ width: w, height }, st.id === highlight && s.glow]}>
            <RouteStamp tour={tour} locked={tour ? undefined : LOCKED_TOURS.find(l => l.id === st.id)} done={st.won ? st.total : 0} total={st.total} height={height} lockBadge />
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 },
  glow: { boxShadow: `0px 0px 14px 4px ${brand.sun}CC` },
});
