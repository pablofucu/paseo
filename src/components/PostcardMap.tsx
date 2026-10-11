import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tour } from '@/data/types';
import { tintaDeRuta } from '@/lib/ink';
import { buildMapStyle } from '@/lib/mapStyle';
import { routeProgress, type UserRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { brandPalette, neutral } from '@/theme/tokens';

const STYLE = buildMapStyle(brandPalette);

/** Vista secundaria de Postales: cada ruta en el mapa, con su postal (o en blanco) en la salida */
export function PostcardMap({ tours, routes, onOpen }: { tours: Tour[]; routes: Record<string, UserRoute>; onOpen: (t: Tour) => void }) {
  const lngs = tours.map(t => t.stops[0].coord[0]), lats = tours.map(t => t.stops[0].coord[1]);
  const center: [number, number] = [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
  return (
    <View style={s.map}>
      <Map style={StyleSheet.absoluteFill} mapStyle={STYLE} compass={false} logo={false} attribution>
        <Camera center={center} zoom={11.5} />
        {tours.map(t => {
          const done = routeProgress(t.id, routes[t.id]).completed;
          return (
            <Marker key={t.id} id={`postal-${t.id}`} lngLat={t.stops[0].coord} anchor="bottom">
              <Pressable accessibilityRole="button" accessibilityLabel={`Postal ${t.title}`} onPress={() => onOpen(t)} style={[s.pin, { borderColor: tintaDeRuta(t.accent) }]}>
                {done ? <Image source={t.postcard.art} style={s.thumb} contentFit="cover" /> : <View style={[s.thumb, s.blank]} />}
                <Text style={s.pinText} numberOfLines={1}>{t.city}</Text>
              </Pressable>
            </Marker>
          );
        })}
      </Map>
    </View>
  );
}

const s = StyleSheet.create({
  map: { height: 460, borderRadius: 20, overflow: 'hidden', backgroundColor: neutral.bg2 },
  pin: { backgroundColor: '#f5eedb', padding: 4, borderWidth: 2, borderRadius: 4, alignItems: 'center', transform: [{ rotate: '-3deg' }] },
  thumb: { width: 84, height: 45 },
  blank: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#b9ab88' },
  pinText: { fontFamily: font.black, fontSize: 11, color: neutral.ink, marginTop: 2 },
});
