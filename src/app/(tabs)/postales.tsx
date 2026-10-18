import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rise, SPRING } from '@/components/motion';
import { PackCard } from '@/components/PackCard';
import { PostcardMap } from '@/components/PostcardMap';
import { PACKS, type Pack } from '@/data/packs';
import { getCity, TOURS } from '@/data/tours';
import { collectionTotals } from '@/lib/packs';
import { usePassport } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { type } from '@/theme/type';

/**
 * Colección («A · Álbum por packs»): una tarjeta por pack, agrupadas por
 * ciudad. Arriba la postal del pack (difuminada con candado hasta tener todos
 * sus sellos de carta) y debajo la fila de sellos: en color los ganados, en
 * gris con candado los que faltan. «Mapa» es la vista secundaria.
 */
export default function Coleccion() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const routes = usePassport(s => s.routes);
  const testMode = useSettings(s => s.testMode);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [tabs, setTabs] = useState<Record<string, { x: number; width: number }>>({});
  const on = tabs[view];
  // El muelle se lanza desde JS: dentro de un worklet no se pueden usar valores importados de otros módulos
  // (en el móvil arrastran el módulo entero al hilo de UI y la pantalla falla)
  const px = useSharedValue(0), pw = useSharedValue(0), shown = useSharedValue(0);
  useEffect(() => {
    if (!on) return;
    const first = shown.value === 0;
    px.set(first ? on.x : withSpring(on.x, SPRING));
    pw.set(first ? on.width : withSpring(on.width, SPRING));
    shown.set(1);
  }, [on, px, pw, shown]);
  const pill = useAnimatedStyle(() => ({ opacity: shown.value, width: pw.value, transform: [{ translateX: px.value }] }));


  const openTour = (id: string) => router.push({ pathname: '/tour/[id]', params: { id } });
  const openPostcard = (pack: Pack) => router.push({ pathname: '/postal/[id]', params: { id: pack.id } });

  const cities = [...new Set(PACKS.map(p => p.city))];
  const totals = collectionTotals(routes, { testMode });
  const cardW = Math.min(width - 32, 560);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 32, paddingHorizontal: 16, gap: 14 }}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={type.overline}>Colección</Text>
          <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{view === 'list' ? 'Sellos y postales' : 'Mapa'}</Text>
          <Text style={type.caption}>{totals.stamps} de {totals.totalStamps} sellos · {totals.postcards} de {totals.totalPostcards} postales</Text>
        </View>
        <View style={s.toggle} accessibilityRole="tablist">
          {/* La píldora oscura se desliza de una opción a la otra */}
          <Animated.View style={[s.tOn, pill]} />
          {(['list', 'map'] as const).map(v => (
            <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: view === v }} onPress={() => setView(v)} hitSlop={{ top: 6, bottom: 6 }} onLayout={e => { const { x, width } = e.nativeEvent.layout; setTabs(t => ({ ...t, [v]: { x, width } })); }} style={s.tBtn}>
              <Text style={[s.tText, view === v && { color: '#fff' }]}>{v === 'list' ? 'Álbum' : 'Mapa'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {view === 'map' ? (
        <Animated.View key="map" entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)}>
          <PostcardMap tours={TOURS} routes={routes} onOpen={t => openTour(t.id)} />
        </Animated.View>
      ) : (
        cities.map((city, ci) => (
          <Animated.View key={city} entering={rise(ci * 2)} style={{ gap: 12, alignItems: 'center' }}>
            <Text style={s.city}>{(getCity(city)?.name ?? city).toUpperCase()}</Text>
            {PACKS.filter(p => p.city === city).map((pack, pi) => (
              <Animated.View key={pack.id} entering={rise(ci * 2 + pi + 1)}>
                <PackCard pack={pack} routes={routes} width={cardW} onOpenTour={openTour} onOpenPostcard={openPostcard} />
              </Animated.View>
            ))}
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  title: { fontFamily: font.serif, fontSize: 30, color: neutral.ink, letterSpacing: -0.5 },
  toggle: { flexDirection: 'row', backgroundColor: neutral.bg2, borderRadius: 999, padding: 3 },
  tBtn: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 999 },
  tOn: { position: 'absolute', left: 0, top: 3, height: 32, backgroundColor: neutral.ink, borderRadius: 999 },
  tText: { fontFamily: font.black, fontSize: 12.5, color: neutral.ink2 },
  city: { alignSelf: 'stretch', fontFamily: font.black, fontSize: 12, letterSpacing: 2.4, color: neutral.ink3, marginTop: 6 },
});
