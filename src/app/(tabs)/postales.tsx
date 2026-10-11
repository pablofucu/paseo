import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, rise, SPRING } from '@/components/motion';
import { Postcard } from '@/components/Postcard';
import { PostcardMap } from '@/components/PostcardMap';
import { TOURS } from '@/data/tours';
import type { Tour } from '@/data/types';
import { tintaDeRuta } from '@/lib/ink';
import { fechaSello } from '@/lib/rubber';
import { routeProgress, usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { type } from '@/theme/type';

/**
 * Postales (guía, § 09 «A · Tarjetero»): lista vertical agrupada por ciudad,
 * una postal a todo el ancho. Las rutas empezadas o sin empezar salen como
 * postal en blanco con su progreso. «Mapa» es la vista secundaria.
 */
export default function Postales() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const routes = usePassport(s => s.routes);
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


  const openTour = (t: Tour) => {
    if (routeProgress(t.id, routes[t.id]).completed) router.push({ pathname: '/postal/[id]', params: { id: t.id } });
    else router.push({ pathname: '/tour/[id]', params: { id: t.id } });
  };

  const cities = [...new Set(TOURS.map(t => t.city))];
  const won = TOURS.filter(t => routeProgress(t.id, routes[t.id]).completed).length;
  const cardW = Math.min(width - 32, 560);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 32, paddingHorizontal: 16, gap: 14 }}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={type.overline}>Postales</Text>
          <Text style={s.title}>{view === 'list' ? 'Tarjetero' : 'Mapa'}</Text>
          <Text style={type.caption}>{won} de {TOURS.length} postales ganadas</Text>
        </View>
        <View style={s.toggle} accessibilityRole="tablist">
          {/* La píldora oscura se desliza de una opción a la otra */}
          <Animated.View style={[s.tOn, pill]} />
          {(['list', 'map'] as const).map(v => (
            <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: view === v }} onPress={() => setView(v)} onLayout={e => { const { x, width } = e.nativeEvent.layout; setTabs(t => ({ ...t, [v]: { x, width } })); }} style={s.tBtn}>
              <Text style={[s.tText, view === v && { color: '#fff' }]}>{v === 'list' ? 'Tarjetero' : 'Mapa'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {view === 'map' ? (
        <Animated.View key="map" entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)}>
          <PostcardMap tours={TOURS} routes={routes} onOpen={openTour} />
        </Animated.View>
      ) : (
        cities.map((city, ci) => (
          <Animated.View key={city} entering={rise(ci * 2)} style={{ gap: 12, alignItems: 'center' }}>
            <Text style={s.city}>{city.toUpperCase()}</Text>
            {TOURS.filter(t => t.city === city).map((t, ti) => {
              const route = routes[t.id];
              const prog = routeProgress(t.id, route);
              const ink = tintaDeRuta(t.accent);
              return (
                <Animated.View key={t.id} entering={rise(ci * 2 + ti + 1)}>
                <PressableScale accessibilityRole="button" accessibilityLabel={`${t.title}: ${prog.completed ? 'postal ganada' : prog.started ? `${prog.done} de ${prog.total} paradas` : 'sin empezar'}`} onPress={() => openTour(t)} scaleTo={0.97} style={{ gap: 6 }}>
                  <Postcard tour={t} route={route} width={cardW} />
                  <View style={s.meta}>
                    <View style={[s.dot, { backgroundColor: ink }]} />
                    <Text style={s.metaTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={s.metaSub}>
                      {prog.completed ? fechaSello(prog.completedAt!) : prog.started ? `${prog.done} de ${prog.total} paradas` : 'sin empezar'}
                    </Text>
                  </View>
                  {!prog.completed && prog.started && (
                    <View style={s.bar}><View style={[s.fill, { width: `${(prog.done / prog.total) * 100}%`, backgroundColor: ink }]} /></View>
                  )}
                </PressableScale>
                </Animated.View>
              );
            })}
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaTitle: { flex: 1, fontFamily: font.black, fontSize: 14.5, color: neutral.ink },
  metaSub: { fontFamily: font.bold, fontSize: 13, color: neutral.ink3 },
  bar: { height: 4, borderRadius: 2, backgroundColor: neutral.line, marginHorizontal: 6, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
