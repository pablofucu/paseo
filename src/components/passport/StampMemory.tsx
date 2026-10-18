import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { paperOf, RubberStamp, stopInk } from '@/components/RubberStamp';
import { getTour } from '@/data/tours';
import { stampBox } from '@/lib/sheet';
import { returnsText, stampMemory } from '@/lib/stampMemory';
import { usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral, radius, shadow } from '@/theme/tokens';

export interface Picked { tourId: string; stopId: string }

/**
 * Recuerdo de un sello, al tocarlo en el pasaporte: la parada, cuándo se
 * selló y, si se ha vuelto, cuántas veces. «Volver a escuchar» abre la parada
 * sin más: la guía no suena hasta que se toca ▶.
 */
export function StampMemory({ picked, onClose }: { picked: Picked | null; onClose: () => void }) {
  const tour = picked ? getTour(picked.tourId) : undefined;
  const stopIndex = tour?.stops.findIndex(s => s.id === picked?.stopId) ?? -1;
  const stop = tour && stopIndex >= 0 ? tour.stops[stopIndex] : undefined;
  const memory = usePassport(s => (picked ? stampMemory(s.routes[picked.tourId], picked.stopId) : null));
  const d = memory ? new Date(memory.stamp.date) : null;
  const when = d ? `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : '';
  const title = when.charAt(0).toUpperCase() + when.slice(1);
  const returns = memory ? returnsText(memory.returns) : null;
  const box = stop ? stampBox(stop.rubber.shape, 560) : { w: 0, h: 0 };

  return (
    <Modal visible={!!(tour && stop && memory)} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={s.backdrop} onPress={onClose}>
        {tour && stop && memory && (
          <Pressable accessible={false} style={[s.card, { backgroundColor: paperOf(tour) }]}>
            <View style={{ width: box.w, height: box.h, transform: [{ rotate: `${memory.stamp.rot}deg` }] }}>
              <RubberStamp tour={tour} stop={stop} date={memory.stamp.date} width={box.w} height={box.h} />
            </View>
            <Text accessibilityRole="header" style={[s.title, { color: stopInk(tour, stop.id) }]}>{stop.name}</Text>
            <Text style={s.when}>{title}</Text>
            {returns && <Text style={s.returns}>{returns}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Abre la guía de la parada; el audio suena cuando tú le des al play"
              onPress={() => { onClose(); router.push({ pathname: '/tour/[id]/stop/[n]', params: { id: tour.id, n: String(stopIndex) } }); }}
              style={({ pressed }) => [s.listen, { backgroundColor: tour.palette.deep }, pressed && { opacity: 0.85 }]}
            >
              <Text maxFontSizeMultiplier={1.3} style={s.listenText}>Volver a escuchar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={s.close}>
              <Text maxFontSizeMultiplier={1.3} style={s.closeText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,10,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14, borderRadius: radius.lg, ...shadow[2] },
  title: { fontFamily: font.serifBold, fontSize: 21, textAlign: 'center', marginTop: 8 },
  when: { fontFamily: font.bold, fontSize: 13.5, color: neutral.ink2, textAlign: 'center' },
  returns: { fontFamily: font.bold, fontSize: 13.5, color: neutral.ink3 },
  listen: { alignSelf: 'stretch', minHeight: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  listenText: { fontFamily: font.black, fontSize: 15, color: '#fff' },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  closeText: { fontFamily: font.black, fontSize: 13.5, color: neutral.ink3 },
});
