import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rise } from '@/components/motion';
import { RouteSheet } from '@/components/passport/RouteSheet';
import { PostcardUnlock } from '@/components/PostcardUnlock';
import { GhostButton } from '@/components/ui';
import { cumulative, formatDistance } from '@/lib/geo';
import { SHEET_RATIO } from '@/lib/sheet';
import { useTourParam } from '@/lib/useTour';
import { useTourRoute } from '@/lib/useTourRoute';
import { routeProgress, usePassport, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { TourThemeProvider } from '@/theme/TourTheme';

/**
 * Fin de la ruta: la hoja con los sellos y el resumen. Si es la primera vez
 * que se completa, sube la tarjeta de «Postal desbloqueada».
 */
export default function Done() {
  const tour = useTourParam();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const p = tour.palette;
  const saved = useRoute(tour.id);
  const endWalk = usePassport(s => s.endWalk);
  const markPostcardSeen = usePassport(s => s.markPostcardSeen);
  const pageNumber = usePassport(s => s.passport.pageOrder.indexOf(tour.id)) + 2;
  const prog = routeProgress(tour.id, saved);
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => { endWalk(); }, [endWalk]);
  // La tarjeta de la postal sube una sola vez, cuando la hoja ya se ha visto
  const pending = prog.completed && !saved?.postcardSeen;
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => { setUnlocked(true); markPostcardSeen(tour.id); }, 1100);
    return () => clearTimeout(t);
  }, [pending, markPostcardSeen, tour.id]);

  const route = useTourRoute(tour);
  const meters = route.legs.reduce((a, l) => a + cumulative(l.line).at(-1)!, 0);
  const dates = (saved?.stamps ?? []).map(s => +new Date(s.date));
  const minutes = dates.length > 1 ? Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / 60000)) : null;
  const stats = [[`${prog.done}/${prog.total}`, 'sellos'], [formatDistance(meters), 'recorridos'], [minutes ? (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`) : '—', 'tiempo']];
  const sheetW = Math.floor(Math.min(width - 32, (height - insets.top - 260) * SHEET_RATIO, 480));

  return (
    <TourThemeProvider palette={p}>
      <ScrollView style={{ flex: 1, backgroundColor: p.deep }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 16, gap: 16, alignItems: 'center' }}>
        <Animated.View entering={rise(0)} style={{ alignItems: 'center' }}>
          <Text style={[s.over, { color: p.t2 }]}>{prog.allStamped ? 'Todas las paradas selladas' : `${prog.done} de ${prog.total} paradas`}</Text>
          <Text style={s.title}>{prog.allStamped ? '¡Ruta completada!' : 'Ruta a medias'}</Text>
          <Text style={s.sub}>{tour.title}</Text>
        </Animated.View>
        <Animated.View entering={rise(2)} style={s.stats}>
          {stats.map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={s.statV}>{v}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={rise(4)}>
          <RouteSheet tour={tour} route={saved} width={sheetW} pageNumber={pageNumber} />
        </Animated.View>
        {prog.completed && !unlocked && (
          <Animated.View entering={rise(8)} style={{ alignSelf: 'stretch' }}>
            <GhostButton label="Ver la postal" onPress={() => router.push({ pathname: '/postal/[id]', params: { id: tour.id } })} />
          </Animated.View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}><GhostButton light label="Inicio" onPress={() => router.dismissTo('/')} /></View>
          <View style={{ flex: 1 }}><GhostButton label="Mi pasaporte" onPress={() => { router.dismissTo('/'); router.navigate('/pasaporte'); }} /></View>
        </View>
      </ScrollView>
      {unlocked && <PostcardUnlock tour={tour} route={saved} />}
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: font.serif, fontSize: 34, color: '#fff', marginTop: 4 },
  sub: { fontFamily: font.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  stats: { flexDirection: 'row', alignSelf: 'stretch' },
  statV: { fontFamily: font.black, fontSize: 24, color: '#fff', fontVariant: ['tabular-nums'] },
  statL: { fontFamily: font.bold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
});
