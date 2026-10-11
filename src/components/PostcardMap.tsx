import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { DUR, EASE_OUT, PressableScale, rise, SPRING } from '@/components/motion';
import { Postcard } from '@/components/Postcard';
import type { Tour } from '@/data/types';
import { tintaDeRuta } from '@/lib/ink';
import { buildMapStyle } from '@/lib/mapStyle';
import { fechaSello } from '@/lib/rubber';
import { routeProgress, type UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { brandPalette, neutral, shadow } from '@/theme/tokens';

const STYLE = buildMapStyle(brandPalette);

/** Pin de una postal: aparece suave al abrir el mapa y crece un poco al elegirlo */
function PostcardPin({ tour, won, index, selected, onPress }: { tour: Tour; won: boolean; index: number; selected: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const drop = useSharedValue(reduced ? 1 : 0);
  const sel = useSharedValue(0);
  useEffect(() => { drop.set(withDelay(200 + index * 140, withTiming(1, { duration: DUR.slow, easing: EASE_OUT }))); }, [drop, index]);
  useEffect(() => { sel.set(withSpring(selected ? 1 : 0, SPRING)); }, [sel, selected]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 2),
    transform: [{ translateY: (1 - drop.value) * -14 }, { scale: 1 + sel.value * 0.15 }, { rotate: `${-3 + sel.value * 3}deg` }],
  }));
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Postal ${tour.title}`} onPress={onPress} scaleTo={0.92}>
      <Animated.View style={[s.pin, { borderColor: tintaDeRuta(tour.accent) }, style]}>
        {won ? <Image source={tour.postcard.art} style={s.thumb} contentFit="cover" /> : <View style={[s.thumb, s.blank]} />}
        <Text style={s.pinText} numberOfLines={1}>{tour.city}</Text>
      </Animated.View>
    </PressableScale>
  );
}

/** Vista secundaria de Postales: cada ruta en el mapa; al tocarla, su postal sube en una ventana */
export function PostcardMap({ tours, routes, onOpen }: { tours: Tour[]; routes: Record<string, UserRoute>; onOpen: (t: Tour) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const lngs = tours.map(t => t.stops[0].coord[0]), lats = tours.map(t => t.stops[0].coord[1]);
  const center: [number, number] = [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
  const sel = tours.find(t => t.id === selected);
  const prog = sel ? routeProgress(sel.id, routes[sel.id]) : null;
  return (
    <View style={s.map}>
      <Map style={StyleSheet.absoluteFill} mapStyle={STYLE} compass={false} logo={false} attribution onPress={() => setSelected(null)}>
        <Camera center={sel ? sel.stops[0].coord : center} zoom={sel ? 13.5 : 11.5} duration={800} easing="fly" />
        {tours.map((t, i) => (
          <Marker key={t.id} id={`postal-${t.id}`} lngLat={t.stops[0].coord} anchor="bottom">
            <PostcardPin tour={t} index={i} won={routeProgress(t.id, routes[t.id]).completed} selected={selected === t.id} onPress={() => setSelected(v => (v === t.id ? null : t.id))} />
          </Marker>
        ))}
      </Map>
      {sel && prog && (
        <Animated.View key={sel.id} entering={rise(0)} exiting={FadeOut.duration(140)} style={s.popup}>
          <Postcard tour={sel} route={routes[sel.id]} width={120} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={s.popTitle} numberOfLines={2}>{sel.title}</Text>
            <Text style={s.popSub}>{prog.completed ? `Ganada · ${fechaSello(prog.completedAt!)}` : prog.started ? `${prog.done} de ${prog.total} paradas` : 'Sin empezar'}</Text>
            <PressableScale accessibilityRole="button" onPress={() => onOpen(sel)} style={s.popBtn}>
              <Text style={s.popBtnText}>{prog.completed ? 'Ver la postal' : 'Ver la ruta'}</Text>
            </PressableScale>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  map: { height: 460, borderRadius: 20, overflow: 'hidden', backgroundColor: neutral.bg2 },
  pin: { backgroundColor: '#f5eedb', padding: 4, borderWidth: 2, borderRadius: 4, alignItems: 'center' },
  thumb: { width: 84, height: 45 },
  blank: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#b9ab88' },
  pinText: { fontFamily: font.black, fontSize: 11, color: neutral.ink, marginTop: 2 },
  popup: { position: 'absolute', left: 10, right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: neutral.surface, ...shadow[3] },
  popTitle: { fontFamily: font.serif, fontSize: 17, lineHeight: 20, color: neutral.ink },
  popSub: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3 },
  popBtn: { alignSelf: 'flex-start', marginTop: 6, height: 34, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: neutral.ink },
  popBtnText: { fontFamily: font.black, fontSize: 13, color: '#fff' },
});
