import { OfflineManager, type OfflinePack as NativePack } from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import type { Tour } from '@/data/types';
import { buildMapStyle } from '@/lib/mapStyle';
import { boundsWithMargin, estimateBytes, formatSize, initialPackState, PACK_MAX_ZOOM, PACK_MIN_ZOOM, packReducer, routePoints, tileCount, type PackState, type PackStatus } from '@/lib/offlinePack';
import { useOfflinePacks } from '@/store/offline';
import { font } from '@/theme/fonts';
import { neutral, radius } from '@/theme/tokens';
import { usePalette } from '@/theme/TourTheme';

/** Tope de teselas del dispositivo (el de MapLibre es bajo); un paseo necesita unos cientos */
const TILE_LIMIT = 20000;

/** El paquete de esta ruta que ya hay en el móvil, si lo hay (se identifica por el tourId de sus metadatos) */
async function findPack(tourId: string): Promise<NativePack | null> {
  const packs = await OfflineManager.getPacks();
  return packs.find(p => p.metadata?.tourId === tourId) ?? null;
}

/**
 * «Descargar para pasear»: guarda en el móvil el mapa de la ruta (su cuadro +
 * 300 m, del zoom de ruta al del paseo) para pasear sin datos. Usa el mismo
 * estilo que el paseo, así que el mapa lo encuentra solo cuando no hay red.
 */
export function OfflinePack({ tour }: { tour: Tour }) {
  const p = usePalette();
  const stored = useOfflinePacks(s => s.packs[tour.id]);
  const { markDone, clear } = useOfflinePacks.getState();
  const [state, dispatch] = useReducer(packReducer, stored != null ? { phase: 'done', bytes: stored } as PackState : initialPackState);
  const packId = useRef<string | null>(null);
  const alive = useRef(true);

  const bounds = useMemo(() => boundsWithMargin(routePoints(tour.stops, tour.legs)), [tour]);
  const tiles = useMemo(() => (bounds ? tileCount(bounds) : 0), [bounds]);

  const listeners = useCallback(() => ({
    onProgress: (_pack: NativePack, status: PackStatus) => {
      if (!alive.current) return;
      dispatch({ type: 'progress', status });
      if (status.state === 'complete') markDone(tour.id, status.completedResourceSize);
    },
    onError: (_pack: NativePack, e: { message: string }) => {
      if (alive.current) dispatch({ type: 'error', message: e.message });
    },
  }), [tour.id, markDone]);

  // Al abrir la ficha se contrasta con lo que hay de verdad en el móvil (y se retoma una descarga a medias)
  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const pack = await findPack(tour.id);
        if (!alive.current) return;
        if (!pack) {
          clear(tour.id);
          dispatch({ type: 'removed' });
          return;
        }
        packId.current = pack.id;
        const status = await pack.status();
        if (!alive.current) return;
        dispatch({ type: 'hydrate', status });
        if (status.state === 'complete') markDone(tour.id, status.completedResourceSize);
        else {
          const l = listeners();
          await OfflineManager.addListener(pack.id, l.onProgress, l.onError);
          await pack.resume();
        }
      } catch {
        // Sin módulo nativo (Expo Go) o sin permisos: se queda como estaba
      }
    })();
    return () => {
      alive.current = false;
      if (packId.current) OfflineManager.removeListener(packId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.id]);

  const download = async () => {
    if (!bounds) return;
    dispatch({ type: 'start' });
    try {
      // Si quedaba un paquete a medias o roto de esta ruta, se rehace desde cero
      const old = await findPack(tour.id);
      if (old) await OfflineManager.deletePack(old.id);
      OfflineManager.setTileCountLimit(TILE_LIMIT);
      const l = listeners();
      const pack = await OfflineManager.createPack(
        { mapStyle: JSON.stringify(buildMapStyle(tour.palette)), bounds, minZoom: PACK_MIN_ZOOM, maxZoom: PACK_MAX_ZOOM, metadata: { tourId: tour.id } },
        l.onProgress,
        l.onError,
      );
      packId.current = pack.id;
    } catch (e) {
      if (alive.current) dispatch({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo descargar' });
    }
  };

  const remove = () => {
    Alert.alert('Borrar la descarga', 'El mapa de esta ruta dejará de estar en tu móvil. Podrás volver a descargarlo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            const pack = await findPack(tour.id);
            if (pack) {
              OfflineManager.removeListener(pack.id);
              await OfflineManager.deletePack(pack.id);
            }
            packId.current = null;
            clear(tour.id);
            if (alive.current) dispatch({ type: 'removed' });
          } catch {
            Alert.alert('No se pudo borrar', 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  };

  if (!bounds) return null;
  const done = state.phase === 'done';
  const busy = state.phase === 'downloading';
  const title = done ? 'Lista para pasear sin conexión' : busy ? 'Descargando el mapa…' : 'Descargar para pasear';
  const detail =
    done ? `${formatSize(state.bytes)} en tu móvil · el camino hasta la primera parada necesita datos`
    : busy ? `${Math.round(state.percentage)} %${state.bytes ? ` · ${formatSize(state.bytes)}` : ''}`
    : state.phase === 'error' ? 'No se pudo descargar. Comprueba tu conexión e inténtalo de nuevo.'
    : `Guarda el mapa de la ruta para verlo sin datos · unos ${formatSize(estimateBytes(tiles))}`;

  return (
    <View style={[s.card, { borderColor: done ? p.t : neutral.line }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.3} style={[s.title, done && { color: p.deep }]}>{title}</Text>
        <Text maxFontSizeMultiplier={1.3} style={s.detail}>{detail}</Text>
        {busy && (
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.max(2, state.percentage)}%`, backgroundColor: p.t }]} />
          </View>
        )}
      </View>
      {!busy && (
        <PressableScale accessibilityRole="button" onPress={done ? remove : download} hitSlop={6} style={[s.btn, done ? s.btnGhost : { backgroundColor: p.t }]}>
          <Text maxFontSizeMultiplier={1.3} style={[s.btnText, { color: done ? neutral.ink2 : p.on }]}>{done ? 'Borrar' : state.phase === 'error' ? 'Reintentar' : 'Descargar'}</Text>
        </PressableScale>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: radius.md, borderWidth: 1.5, backgroundColor: neutral.surface },
  title: { fontFamily: font.black, fontSize: 15.5, color: neutral.ink },
  detail: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: neutral.ink3 },
  track: { height: 5, borderRadius: 3, backgroundColor: neutral.line, overflow: 'hidden', marginTop: 6 },
  fill: { height: 5, borderRadius: 3 },
  btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: neutral.bg2 },
  btnText: { fontFamily: font.black, fontSize: 14 },
});
