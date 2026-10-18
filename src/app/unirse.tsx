import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacedCode } from '@/components/group/GroupParts';
import { appear, rise } from '@/components/motion';
import { GhostButton, IconButton, PrimaryButton } from '@/components/ui';
import { getTour } from '@/data/tours';
import { bleSupported } from '@/lib/group/ble';
import { CODE_LENGTH, isCode, normalizeCode, parseJoinLink, type JoinLink } from '@/lib/group/protocol';
import { netConfigured } from '@/lib/group/supabase';
import { goBack } from '@/lib/nav';
import { useGroup } from '@/store/group';
import { usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';
import { brand, functional, neutral, radius } from '@/theme/tokens';
import { type } from '@/theme/type';

type Phase = 'scan' | 'name' | 'searching' | 'full' | 'notFound';

/** Los parámetros del enlace del QR (`paseo://unirse?c=…&t=…&h=…&m=…`) como enlace, para leerlo con `parseJoinLink` */
function linkFromParams(p: Record<string, string | string[] | undefined>): JoinLink | null {
  const q = (['c', 't', 'h', 'm'] as const)
    .map(k => { const v = p[k]; const s = Array.isArray(v) ? v[0] : v; return s ? `${k}=${encodeURIComponent(s)}` : null; })
    .filter(Boolean);
  return q.length ? parseJoinLink(`paseo://unirse?${q.join('&')}`) : null;
}

/** Por dónde se busca: lo que abrió el anfitrión (si se sabe) y lo que este móvil tiene */
function searchVia(link: JoinLink | null) {
  const net = (link?.modes?.net ?? true) && netConfigured();
  const ble = (link?.modes?.ble ?? true) && bleSupported();
  return net && ble ? 'por internet y Bluetooth' : net ? 'por internet' : ble ? 'por Bluetooth' : null;
}

/**
 * Unirse a un grupo: el enlace del QR (también desde la cámara del sistema)
 * se une directamente; si no, cámara para escanear el QR y campo para
 * teclear el código. Si el pasaporte aún no tiene titular, pide el nombre.
 * Al unirse va al paseo del tour del anfitrión.
 */
export default function Join() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ c?: string; t?: string; h?: string; m?: string }>();
  const setOwner = usePassport(s => s.setOwner);
  const joinGroup = useGroup(s => s.joinGroup);
  // Desde el enlace del QR se une directamente (o pide antes el nombre), sin escanear
  const [initial] = useState(() => linkFromParams(params));
  const [phase, setPhase] = useState<Phase>(() => (!initial ? 'scan' : usePassport.getState().passport.owner.trim() ? 'searching' : 'name'));
  const [link, setLink] = useState<JoinLink | null>(initial);
  const [typed, setTyped] = useState('');
  const [name, setName] = useState('');
  const [badScan, setBadScan] = useState(false);
  const busy = useRef(false);

  /** Busca el grupo y, si lo encuentra, va al paseo (el estado solo cambia al acabar) */
  const run = useCallback(async (l: JoinLink, who?: string) => {
    if (busy.current) return;
    busy.current = true;
    const r = await joinGroup({ code: l.code, tourId: l.tourId, modes: l.modes, name: who });
    busy.current = false;
    if (r !== 'ok') { setPhase(r); return; }
    const g = useGroup.getState();
    const tourId = g.tourId ?? l.tourId;
    const tour = tourId ? getTour(tourId) : undefined;
    if (!tour) { await g.leaveGroup(); setPhase('notFound'); return; }
    // El paseo empieza ya en la parada del grupo y la ruta queda como hecha en grupo
    const target = Math.min(g.state?.target ?? 0, tour.stops.length - 1);
    const ps = usePassport.getState();
    ps.markGroupRoute(tour.id);
    if (ps.walk?.tourId !== tour.id) ps.startWalk(tour.id, target);
    router.replace({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(target) } });
  }, [joinGroup]);
  const join = useCallback((l: JoinLink, who?: string) => {
    if (busy.current) return;
    setLink(l);
    setPhase('searching');
    run(l, who);
  }, [run]);

  /** Con un código o enlace válido: pide el nombre si falta, o se une */
  const go = useCallback((l: JoinLink) => {
    if (!usePassport.getState().passport.owner.trim()) { setLink(l); setPhase('name'); return; }
    join(l);
  }, [join]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current || !initial || phase !== 'searching') return;
    started.current = true;
    run(initial);
  }, [initial, phase, run]);

  const onScan = useCallback((r: BarcodeScanningResult) => {
    if (busy.current || phase !== 'scan') return;
    const l = parseJoinLink(r.data);
    if (!l) { setBadScan(true); return; }
    go(l);
  }, [go, phase]);

  const saveName = () => {
    const n = name.trim();
    if (!n || !link) return;
    setOwner(n);
    join(link, n);
  };

  const hostName = link?.hostName;
  const via = searchVia(link);
  const tourTitle = link?.tourId ? getTour(link.tourId)?.title : undefined;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 12 }}>
      <IconButton label="Volver" icon="back" onPress={goBack} style={{ marginLeft: -4 }} />
      <Animated.Text entering={rise(1)} style={[type.overline, { color: brand.primary }]}>Visita en grupo</Animated.Text>
      <Animated.Text entering={rise(1)} accessibilityRole="header" style={type.title}>{hostName ? `Unirse al grupo de ${hostName}` : 'Unirse a un grupo'}</Animated.Text>

      {phase === 'scan' && (
        <>
          <Animated.Text entering={rise(2)} style={type.body}>Escanea el QR del móvil de quien guía el paseo, o teclea su código.</Animated.Text>
          <Animated.View entering={rise(3)}><Scanner onScan={onScan} /></Animated.View>
          {badScan && <Animated.Text entering={appear()} style={s.warn}>Ese QR no es de un grupo de Paseo.</Animated.Text>}
          <Text accessibilityRole="header" style={[type.headline, { marginTop: 8 }]}>O teclea el código</Text>
          <TextInput
            accessibilityLabel="Código del grupo, 6 letras y números"
            value={typed.length > 3 ? spacedCode(typed) : typed}
            onChangeText={v => setTyped(normalizeCode(v))}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={CODE_LENGTH + 1}
            placeholder="ABC 234"
            placeholderTextColor={neutral.line}
            returnKeyType="go"
            onSubmitEditing={() => { if (isCode(typed)) go({ code: typed }); }}
            style={s.code}
          />
          <PrimaryButton label="Unirse" disabled={!isCode(typed)} onPress={() => go({ code: typed })} style={!isCode(typed) ? { opacity: 0.45 } : undefined} />
        </>
      )}

      {phase === 'name' && (
        <>
          <Text style={type.body}>¿Cómo te llamas? Es el nombre que verá el grupo (y el titular de tu pasaporte).</Text>
          <TextInput
            accessibilityLabel="Tu nombre"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={24}
            placeholder="Tu nombre"
            placeholderTextColor={neutral.ink3}
            returnKeyType="go"
            onSubmitEditing={saveName}
            style={s.name}
          />
          <PrimaryButton label="Unirse" disabled={!name.trim()} onPress={saveName} style={!name.trim() ? { opacity: 0.45 } : undefined} />
          <GhostButton label="Ahora no" onPress={() => { setPhase('scan'); }} />
        </>
      )}

      {phase === 'searching' && (
        <View style={s.center} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={s.big}>Buscando {hostName ? `a ${hostName}` : 'el grupo'}…</Text>
          <Text style={type.caption}>{via ? `${tourTitle ? `${tourTitle} · ` : ''}${via}` : 'Este móvil no tiene ni internet configurado ni Bluetooth'}</Text>
        </View>
      )}

      {(phase === 'full' || phase === 'notFound') && link && (
        <View style={s.center} accessibilityLiveRegion="polite">
          <Text style={s.big}>{phase === 'full' ? 'El grupo está lleno' : 'No encontramos el grupo'}</Text>
          <Text style={[type.body, { textAlign: 'center' }]}>
            {phase === 'full'
              ? 'Ya hay 8 personas en este grupo, que es lo máximo.'
              : `Comprueba el código (${spacedCode(link.code)}) y que estés cerca de ${hostName ?? 'quien guía'}, con internet o con el Bluetooth encendido.`}
          </Text>
          {phase === 'notFound' && <PrimaryButton label="Volver a intentarlo" onPress={() => join(link)} style={{ alignSelf: 'stretch' }} />}
          <GhostButton label="Escanear otro código" onPress={() => { setBadScan(false); setPhase('scan'); }} />
        </View>
      )}
    </ScrollView>
  );
}

/** La cámara para el QR, con el permiso pedido con calma (y una salida si se negó) */
function Scanner({ onScan }: { onScan: (r: BarcodeScanningResult) => void }) {
  const [perm, request] = useCameraPermissions();
  if (!perm) return <View style={[s.cam, s.camOff]}><ActivityIndicator color={neutral.white} /></View>;
  if (!perm.granted) {
    return (
      <View style={[s.cam, s.camOff]}>
        <Text style={s.camTitle}>Escanea con la cámara</Text>
        <Text style={s.camText}>{perm.canAskAgain ? 'Paseo usa la cámara solo para leer el QR del grupo.' : 'El permiso de la cámara está desactivado. Puedes activarlo en Ajustes o teclear el código.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => (perm.canAskAgain ? request() : Linking.openSettings()).catch(() => {})} style={s.camBtn}>
          <Text style={s.camBtnText}>{perm.canAskAgain ? 'Permitir la cámara' : 'Abrir ajustes'}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={s.cam}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
      <View pointerEvents="none" style={s.frame} />
      {Platform.OS === 'web' && <Text style={s.camHint}>Acerca el QR a la cámara</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  cam: { height: 300, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: neutral.night, alignItems: 'center', justifyContent: 'center' },
  camOff: { padding: 24, gap: 10 },
  camTitle: { fontFamily: font.black, fontSize: 17, color: neutral.white },
  camText: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  camBtn: { marginTop: 6, height: 44, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: brand.sun, justifyContent: 'center' },
  camBtnText: { fontFamily: font.black, fontSize: 15, color: neutral.ink },
  camHint: { position: 'absolute', bottom: 12, fontFamily: font.heavy, fontSize: 12.5, color: neutral.white },
  frame: { width: 200, height: 200, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  code: { height: 64, borderRadius: radius.md, backgroundColor: neutral.surface, borderWidth: 1, borderColor: neutral.line, textAlign: 'center', fontFamily: font.black, fontSize: 30, letterSpacing: 4, color: neutral.ink },
  name: { height: 56, borderRadius: radius.md, backgroundColor: neutral.surface, borderWidth: 1, borderColor: neutral.line, paddingHorizontal: 16, fontFamily: font.heavy, fontSize: 18, color: neutral.ink },
  warn: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: functional.warnInk, backgroundColor: functional.warnSoft, padding: 12, borderRadius: radius.md, overflow: 'hidden' },
  center: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  big: { fontFamily: font.serifBold, fontSize: 24, lineHeight: 28, color: neutral.ink, textAlign: 'center' },
});
