import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, rise } from '@/components/motion';
import { PackStampRow } from '@/components/PackStampRow';
import { RouteSheet } from '@/components/passport/RouteSheet';
import { PostcardUnlock } from '@/components/PostcardUnlock';
import { RouteStamp } from '@/components/RouteStamp';
import { ShareMat } from '@/components/ShareMat';
import { SunRays } from '@/components/SunRays';
import { GhostButton, IconButton } from '@/components/ui';
import { packOf } from '@/data/packs';
import { formatDuration } from '@/lib/duration';
import { cumulative, formatDistance, walkedMeters } from '@/lib/geo';
import { packProgress } from '@/lib/packs';
import { shareStampSheet } from '@/lib/share';
import { SHEET_RATIO } from '@/lib/sheet';
import { useDebouncedSave } from '@/lib/useDebouncedSave';
import { useTourParam } from '@/lib/useTour';
import { useTourRoute } from '@/lib/useTourRoute';
import { NOTE_MAX, routeProgress, usePassport, usePassportHydrated, useRoute } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';

/** Ancho del sello grande y alto del bloque de rayos de detrás */
const STAMP_W = 150;
const STAMP_H = Math.round(STAMP_W / 0.82);
const HERO_H = STAMP_H + 84;

/**
 * Fin de la ruta. Completada: el sello de carta de la ruta cae grande sobre unos
 * rayos de sol, con el pack al que pertenece y lo que falta para su postal; la
 * hoja de sellos de goma queda tras un botón. Si este sello cierra el pack por
 * primera vez, sale «¡Pack completo!» y sube la tarjeta de la postal del pack.
 * A medias: la hoja con los sellos y el resumen.
 */
export default function Done() {
  const tour = useTourParam();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const p = tour.palette;
  const saved = useRoute(tour.id);
  const routes = usePassport(s => s.routes);
  const testMode = useSettings(s => s.testMode);
  const packsSeen = usePassport(s => s.packsSeen);
  const endWalk = usePassport(s => s.endWalk);
  const markPackSeen = usePassport(s => s.markPackSeen);
  const setNote = usePassport(s => s.setNote);
  // Sin ningún sello la ruta aún no tiene hoja: sería la siguiente
  const pageNumber = usePassport(s => { const i = s.passport.pageOrder.indexOf(tour.id); return (i < 0 ? s.passport.pageOrder.length : i) + 2; });
  const prog = routeProgress(tour.id, saved);
  const hydrated = usePassportHydrated();
  const pack = packOf(tour.id);
  const packProg = pack ? packProgress(pack, routes, { testMode }) : null;
  const [unlocked, setUnlocked] = useState(false);
  /** Este sello acaba de cerrar el pack: se queda así aunque luego se marque como visto */
  const [packWon, setPackWon] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const sheetRef = useRef<View>(null);
  const [today] = useState(() => Date.now());
  useEffect(() => { endWalk(); }, [endWalk]);
  // «Pack completo» sale una sola vez, cuando el pasaporte guardado ya se ha leído; luego sube la tarjeta de la postal (si ya está dibujada)
  const pending = hydrated && prog.completed && !!pack && !!packProg?.complete && !packsSeen[pack.id];
  if (pending && !packWon) setPackWon(true);
  useEffect(() => {
    if (!pending || !pack) return;
    const t = setTimeout(() => { if (pack.postcard) setUnlocked(true); markPackSeen(pack.id); }, 1100);
    return () => clearTimeout(t);
  }, [pending, pack, markPackSeen]);

  // El sello cae y se asienta; al posarse, vibración de éxito
  const drop = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!prog.completed || !hydrated) return;
    // El muelle se lanza desde JS: dentro de un worklet no se pueden usar valores importados de otros módulos
    if (!reduced) drop.set(withDelay(300, withSpring(1, { damping: 11, stiffness: 150, mass: 0.9 })));
    const t = setTimeout(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, reduced ? 200 : 650);
    return () => clearTimeout(t);
  }, [prog.completed, hydrated, reduced, drop]);
  const stampDrop = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 3),
    transform: [{ translateY: (1 - drop.value) * -80 }, { scale: 1 + (1 - drop.value) * 0.35 }, { rotate: `${-4 - (1 - drop.value) * 10}deg` }],
  }));

  const route = useTourRoute(tour);
  // Ruta a medias: la distancia andada (hasta la parada sellada más lejana), no la de la ruta entera
  const stampedIdx = tour.stops.flatMap((st, i) => (saved?.stamps.some(x => x.stopId === st.id) ? [i] : []));
  const meters = prog.allStamped ? route.legs.reduce((a, l) => a + cumulative(l.line).at(-1)!, 0) : walkedMeters(route.legs.map(l => cumulative(l.line).at(-1)!), stampedIdx);
  const dates = (saved?.stamps ?? []).map(s => +new Date(s.date));
  // Tiempo del paseo: del primer al último sello; si pasaron más de 8 h no fue un solo paseo
  const span = dates.length > 1 ? Math.max(...dates) - Math.min(...dates) : 0;
  const minutes = span > 0 && span <= 8 * 3_600_000 ? Math.max(1, Math.round(span / 60000)) : null;
  const when = new Date(prog.completedAt ?? today).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const saveNote = () => { if (draft != null) setNote(tour.id, draft); setDraft(null); };
  // La nota se guarda mientras se escribe, no solo al salir del campo
  useDebouncedSave(draft, v => setNote(tour.id, v));
  const stats = [[`${prog.done}/${prog.total}`, 'sellos'], [formatDistance(meters), 'recorridos'], [minutes ? formatDuration(minutes) : '—', 'tiempo']];
  const sheetW = Math.floor(Math.min(width - 32, (height - insets.top - 260) * SHEET_RATIO, 480));
  const done = prog.completed;
  const heroW = Math.min(width, 520);

  /** La hoja de sellos de goma con su nota y el botón de compartir (en la pantalla si la ruta va a medias; si no, tras «Hoja de sellos») */
  const sheetBlock = (
    <>
      <ShareMat ref={sheetRef} tour={tour}>
        <RouteSheet tour={tour} route={saved} width={sheetW} pageNumber={pageNumber} />
      </ShareMat>
      {prog.started && (
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          {/* Nota opcional del paseo: sale a mano en el reverso de la postal */}
          <View style={s.noteBox}>
            <TextInput
              value={draft ?? saved?.note ?? ''}
              onChangeText={setDraft}
              onEndEditing={saveNote}
              onBlur={saveNote}
              maxLength={NOTE_MAX}
              placeholder="Una nota del paseo (opcional)"
              placeholderTextColor="rgba(255,255,255,0.55)"
              accessibilityLabel="Nota del paseo, de hasta 60 caracteres"
              returnKeyType="done"
              style={s.note}
            />
            <Text style={s.noteCount}>{(draft ?? saved?.note ?? '').length}/{NOTE_MAX}</Text>
          </View>
          <GhostButton label="Compartir la hoja de sellos" onPress={() => shareStampSheet(sheetRef, tour.title)} />
        </View>
      )}
    </>
  );

  const toCollection = () => { router.dismissTo('/'); router.navigate('/postales'); };
  const faltan = packProg && packProg.missingLabels.length > 0 ? packProg.missingLabels : null;

  return (
    <TourThemeProvider palette={p}>
      <StatusBar style="light" />
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: p.deep }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 16, gap: 16, alignItems: 'center' }}>
        <Animated.View entering={rise(0)} style={{ alignItems: 'center' }}>
          <Text style={[s.over, { color: p.t2 }]}>{done ? tour.title : `${prog.done} de ${prog.total} paradas`}</Text>
          <Text accessibilityRole="header" style={s.title}>{packWon ? '¡Pack completo!' : done ? '¡Ruta completada!' : 'Ruta a medias'}</Text>
          {packWon && pack && packProg ? (
            <Text style={s.sub}>{pack.name} · {packProg.won} de {packProg.total} sellos</Text>
          ) : done ? null : (
            <Text style={s.sub}>{tour.title}</Text>
          )}
          {!packWon && <Text style={[s.date, { color: p.t2 }]}>{when}</Text>}
        </Animated.View>

        {done && (
          <View style={{ width: heroW, height: packWon ? 180 : HERO_H, alignItems: 'center', justifyContent: 'center', marginVertical: -8 }}>
            <SunRays width={heroW} height={packWon ? 180 : HERO_H} background={p.deep} />
            {packWon && packProg ? (
              <Animated.View entering={rise(2)}>
                <PackStampRow stamps={packProg.stamps} height={96} highlight={tour.id} />
              </Animated.View>
            ) : (
              <>
                <Animated.View style={stampDrop}>
                  <View style={s.stampGlow}>
                    <RouteStamp tour={tour} done={prog.total} total={prog.total} height={STAMP_H} />
                  </View>
                </Animated.View>
                <Animated.Text entering={rise(5)} style={s.newStamp}>Nuevo sello de carta</Animated.Text>
              </>
            )}
          </View>
        )}

        {!packWon && (
          <Animated.View entering={rise(2)} style={s.stats}>
            {stats.map(([v, l]) => (
              <View key={l} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={s.statV}>{v}</Text>
                <Text style={s.statL}>{l}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {done && !packWon && pack && packProg && (
          <Animated.View entering={rise(6)} style={s.packBox}>
            <View style={s.packHead}>
              <Text style={s.packName} numberOfLines={1}>{pack.name}</Text>
              <Text style={s.packCount}>{packProg.won} de {packProg.total} sellos</Text>
            </View>
            <PackStampRow stamps={packProg.stamps} height={64} highlight={tour.id} />
            <Text style={s.packNote}>
              {faltan ? (
                <>
                  {faltan.length > 1 ? 'Te faltan ' : 'Te falta '}
                  {faltan.map((l, i) => (
                    <Fragment key={l}>
                      <Text style={s.bold}>{l}</Text>
                      {i < faltan.length - 2 ? ', ' : i === faltan.length - 2 ? ' y ' : ''}
                    </Fragment>
                  ))}
                  {' para la postal'}
                </>
              ) : pack.postcard ? 'Tienes todos los sellos: la postal del pack es tuya' : 'Pack completo: su postal está por dibujar'}
            </Text>
          </Animated.View>
        )}

        {!done && <Animated.View entering={rise(4)} style={{ alignItems: 'center', gap: 16, alignSelf: 'stretch' }}>{sheetBlock}</Animated.View>}

        {done ? (
          <Animated.View entering={rise(8)} style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>
            {packWon && pack?.postcard ? (
              <PressableScale accessibilityRole="button" onPress={() => router.push({ pathname: '/postal/[id]', params: { id: pack.id } })} style={s.cta}>
                <Text style={s.ctaText}>Ver la postal</Text>
              </PressableScale>
            ) : (
              <PressableScale accessibilityRole="button" onPress={toCollection} style={s.cta}>
                <Text style={s.ctaText}>Ver mi colección</Text>
              </PressableScale>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><GhostButton light label="Hoja de sellos" onPress={() => setSheetOpen(true)} /></View>
              <View style={{ flex: 1 }}><GhostButton light label="Inicio" onPress={() => router.dismissTo('/')} /></View>
            </View>
          </Animated.View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignSelf: 'stretch' }}>
            <View style={{ flex: 1 }}><GhostButton light label="Inicio" onPress={() => router.dismissTo('/')} /></View>
            <View style={{ flex: 1 }}><GhostButton label="Mi pasaporte" onPress={() => { router.dismissTo('/'); router.navigate({ pathname: '/pasaporte', params: { ruta: tour.id } }); }} /></View>
          </View>
        )}
      </ScrollView>
      {/* La hoja de sellos de goma, con su nota y el botón de compartir, en una lámina aparte */}
      <Modal visible={sheetOpen} animationType="slide" onRequestClose={() => setSheetOpen(false)} statusBarTranslucent>
        <TourThemeProvider palette={p}>
          <View style={{ flex: 1, backgroundColor: p.deep }}>
            <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 16, gap: 16, alignItems: 'center' }}>
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconButton label="Cerrar" icon="close" onPress={() => setSheetOpen(false)} />
                <Text style={s.over2}>Hoja de sellos</Text>
                <View style={{ width: 44 }} />
              </View>
              {sheetBlock}
            </ScrollView>
          </View>
        </TourThemeProvider>
      </Modal>
      {unlocked && pack && <PostcardUnlock pack={pack} onClose={() => setUnlocked(false)} />}
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: font.serif, fontSize: 34, color: '#fff', marginTop: 4 },
  sub: { fontFamily: font.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  date: { fontFamily: font.bold, fontSize: 12.5, marginTop: 2 },
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  note: { flex: 1, height: 48, fontFamily: font.hand, fontSize: 22, color: '#fff', padding: 0 },
  noteCount: { fontFamily: font.bold, fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', alignSelf: 'stretch' },
  statV: { fontFamily: font.black, fontSize: 24, color: '#fff', fontVariant: ['tabular-nums'] },
  statL: { fontFamily: font.bold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  over2: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' },
  stampGlow: { boxShadow: '0px 8px 24px rgba(0,0,0,0.35)' },
  newStamp: { fontFamily: font.black, fontSize: 15, color: '#fff', marginTop: 14 },
  packBox: { alignSelf: 'stretch', gap: 12, padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' },
  packHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  packName: { flex: 1, fontFamily: font.serif, fontSize: 19, color: '#fff' },
  packCount: { fontFamily: font.bold, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  packNote: { fontFamily: font.bold, fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  bold: { fontFamily: font.black, color: '#fff' },
  cta: { minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.sun },
  ctaText: { fontFamily: font.black, fontSize: 17, color: neutral.ink },
});
