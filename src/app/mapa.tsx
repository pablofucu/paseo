import type { CameraRef } from '@maplibre/maplibre-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockedTourSheet } from '@/components/LockedTour';
import { PressableScale, rise } from '@/components/motion';
import { durationLabel, Icon } from '@/components/RouteCard';
import { ToursMap, type MapView } from '@/components/ToursMap';
import { IconButton } from '@/components/ui';
import { getCity, getTour, toursIn, TOURS } from '@/data/tours';
import type { LngLat, LockedTour, Tour } from '@/data/types';
import { boundsOf } from '@/lib/geo';
import { goBack } from '@/lib/nav';
import { metersToStart, NEARBY_MAX_M, sortByDistance, startLabel } from '@/lib/nearby';
import { askNearby, useNearby } from '@/lib/useNearby';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { neutral, shadow } from '@/theme/tokens';

const SIDE = 40;
/** Alto aproximado del panel inferior hasta que se mide */
const PANEL_GUESS = 230;

/** Caja de una ruta: su trazo y sus paradas */
const tourBounds = (t: Tour) => boundsOf([...t.legs.flat(), ...t.stops.map(st => st.coord)])!;

/** Rutas visibles al abrir: las de la ciudad elegida (o todas si no hay ninguna abierta allí) */
function cityTours(city: string | null): Tour[] {
  const open = city ? TOURS.filter(t => t.area === city) : [];
  return open.length ? open : TOURS;
}

/** Tarjeta de la tira inferior */
function StripCard({ tour, locked, selected, label, onPress }: { tour?: Tour; locked?: LockedTour; selected: boolean; label: string | null; onPress: () => void }) {
  const t = tour ?? locked!;
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${t.title}${locked ? ', de pago, bloqueada' : ''}${label ? `. ${label}` : ''}`} onPress={onPress} scaleTo={0.96} style={[s.stripCard, selected && { borderColor: neutral.ink }]}>
      <View style={[s.swatch, { backgroundColor: locked ? neutral.ink3 : t.palette.t }]}>{locked && <Icon name="lock" color={neutral.white} size={14} />}</View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={s.stripTitle} numberOfLines={2}>{t.title}</Text>
        <Text style={s.stripMeta} numberOfLines={1}>{durationLabel(t.durationMin)} · {tour ? tour.stops.length : locked!.stops} paradas</Text>
        {label && <Text style={s.stripNear} numberOfLines={1}>{label}</Text>}
      </View>
    </PressableScale>
  );
}

/** Mapa de rutas: todas las del catálogo con su trazo y su inicio, y debajo las más cercanas a ti */
export default function Mapa() {
  const insets = useSafeAreaInsets();
  const { tour: tourParam } = useLocalSearchParams<{ tour?: string }>();
  const city = useSettings(st => st.city);
  const cityName = city ? getCity(city)?.name : undefined;
  const nearPos = useNearby();
  const [asked, setAsked] = useState<LngLat | null>(null);
  const me = asked ?? nearPos;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const focus = tourParam ? getTour(tourParam) : undefined;
  const [selectedId, setSelectedId] = useState<string | null>(focus?.id ?? null);
  const [sheet, setSheet] = useState<LockedTour | null>(null);
  const [panelH, setPanelH] = useState(PANEL_GUESS);
  const cam = useRef<CameraRef>(null);
  // Si la persona ya movió la cámara (o eligió una ruta), la posición que llega tarde no la mueve
  const moved = useRef(!!focus);
  const pad = { top: insets.top + 70, bottom: panelH + 24, left: SIDE, right: SIDE };

  const [initialView] = useState<MapView>(() => {
    const b = boundsOf((focus ? [focus] : cityTours(city)).flatMap(t => [...t.legs.flat(), ...t.stops.map(st => st.coord)]));
    return { bounds: b!, padding: { top: insets.top + 70, bottom: PANEL_GUESS + 24, left: SIDE, right: SIDE } };
  });

  const fit = (t: Tour) => cam.current?.fitBounds(tourBounds(t), { padding: pad, duration: 900, easing: 'fly' });
  const select = (id: string | null) => {
    moved.current = true;
    setSelectedId(id);
    const t = id ? getTour(id) : undefined;
    if (t) fit(t);
  };

  const nearest = me ? Math.min(...TOURS.map(t => metersToStart(me, t))) : null;
  const inRange = nearest != null && nearest <= NEARBY_MAX_M;
  // Tu posición llega sola si ya había permiso: centra el mapa en ti, salvo que ya hayas tocado algo
  useEffect(() => {
    if (nearPos && !moved.current && TOURS.some(t => metersToStart(nearPos, t) <= NEARBY_MAX_M)) {
      moved.current = true;
      cam.current?.flyTo({ center: nearPos, zoom: 14.5, padding: pad, duration: 900, easing: 'fly' });
    }
  }, [nearPos]); // eslint-disable-line react-hooks/exhaustive-deps

  /** «Centrar en mí»: aquí sí se pide el permiso de ubicación */
  const locate = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const p = await askNearby();
    setBusy(false);
    if (!p) { setNote('No pudimos ubicarte. Revisa el permiso de ubicación en los ajustes del móvil.'); return; }
    setAsked(p);
    moved.current = true;
    if (TOURS.some(t => metersToStart(p, t) <= NEARBY_MAX_M)) cam.current?.flyTo({ center: p, zoom: 14.5, padding: pad, duration: 900, easing: 'fly' });
    else setNote('Ahora mismo no hay rutas cerca de ti.');
  };

  // Tira: con posición, las rutas a menos de NEARBY_MAX_M por cercanía; si no, las de la ciudad elegida
  const near = me ? sortByDistance(TOURS, me, t => metersToStart(me, t)).filter(t => metersToStart(me, t) <= NEARBY_MAX_M) : [];
  const nearby = near.length > 0;
  const list = nearby ? near : cityTours(city);
  const lockedList = nearby || !city ? [] : toursIn(city).locked;
  const selected = selectedId ? getTour(selectedId) : undefined;
  const meters = me && selected ? metersToStart(me, selected) : null;

  return (
    <View style={{ flex: 1, backgroundColor: neutral.bg2 }}>
      <ToursMap tours={TOURS} selectedId={selectedId} onSelect={select} me={me} cameraRef={cam} initialView={initialView} />
      <View pointerEvents="box-none" style={[s.top, { top: insets.top + 8 }]}>
        <IconButton label="Volver" icon="back" onPress={goBack} />
        <PressableScale accessibilityRole="button" accessibilityLabel="Centrar el mapa en mí" onPress={locate} scaleTo={0.94} style={s.locate}>
          <Text style={s.locateText}>{busy ? 'Buscándote…' : 'Centrar en mí'}</Text>
        </PressableScale>
      </View>
      <View pointerEvents="box-none" onLayout={e => setPanelH(e.nativeEvent.layout.height)} style={[s.panel, { paddingBottom: insets.bottom + 12 }]}>
        {selected && (
          <Animated.View key={selected.id} entering={rise(0)} exiting={FadeOut.duration(140)} style={s.popup}>
            <View style={[s.swatch, { backgroundColor: selected.palette.t }]} />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <Text style={s.popTitle} numberOfLines={2}>{selected.title}</Text>
              <Text style={s.stripMeta} numberOfLines={1}>{selected.city} · {durationLabel(selected.durationMin)} · {selected.stops.length} paradas</Text>
              {startLabel(meters) && <Text style={s.stripNear}>{startLabel(meters)}</Text>}
            </View>
            <PressableScale accessibilityRole="button" onPress={() => router.push({ pathname: '/tour/[id]', params: { id: selected.id } })} style={[s.open, { backgroundColor: selected.palette.t }]}>
              <Text style={[s.openText, { color: selected.palette.on }]}>Ver ruta</Text>
            </PressableScale>
          </Animated.View>
        )}
        <View style={s.strip}>
          <View style={s.stripHead}>
            <Text style={s.stripH}>{nearby ? 'Cerca de ti' : cityName ? `Rutas en ${cityName}` : 'Rutas'}</Text>
            {!me && (
              <PressableScale accessibilityRole="button" onPress={locate} scaleTo={0.94} style={s.chip}>
                <Text style={s.chipText}>Ver rutas cerca de mí</Text>
              </PressableScale>
            )}
          </View>
          {(note || (me && !inRange && !note)) && <Text style={s.note}>{note ?? 'Ahora mismo no hay rutas cerca de ti.'}</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stripRow}>
            {list.map(t => (
              <StripCard key={t.id} tour={t} selected={t.id === selectedId} label={me ? startLabel(metersToStart(me, t)) : null} onPress={() => select(t.id)} />
            ))}
            {lockedList.map(t => <StripCard key={t.id} locked={t} selected={false} label={null} onPress={() => setSheet(t)} />)}
          </ScrollView>
        </View>
      </View>
      {sheet && <LockedTourSheet tour={sheet} onClose={() => setSheet(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locate: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center', backgroundColor: neutral.ink, ...shadow[2] },
  locateText: { fontFamily: font.black, fontSize: 14, color: neutral.white },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10 },
  popup: { marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22, backgroundColor: neutral.surface, ...shadow[3] },
  popTitle: { fontFamily: font.serif, fontSize: 18, lineHeight: 21, color: neutral.ink },
  open: { height: 38, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center' },
  openText: { fontFamily: font.black, fontSize: 14 },
  strip: { gap: 6 },
  stripHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  stripH: { fontFamily: font.serifBold, fontSize: 20, color: neutral.ink, textShadowColor: 'rgba(255,255,255,0.9)', textShadowRadius: 6 },
  chip: { minHeight: 34, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: neutral.surface, ...shadow[1] },
  chipText: { fontFamily: font.heavy, fontSize: 13, color: neutral.ink },
  note: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink2, paddingHorizontal: 18 },
  stripRow: { gap: 10, paddingHorizontal: 12, paddingBottom: 4 },
  stripCard: { width: 230, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', backgroundColor: neutral.surface, ...shadow[2] },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stripTitle: { fontFamily: font.black, fontSize: 14.5, lineHeight: 18, color: neutral.ink },
  stripMeta: { fontFamily: font.bold, fontSize: 12.5, color: neutral.ink3 },
  stripNear: { fontFamily: font.heavy, fontSize: 12.5, color: neutral.ink2 },
});
