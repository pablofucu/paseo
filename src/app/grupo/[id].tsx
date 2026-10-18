import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { availLines, GroupQR, MemberList } from '@/components/group/GroupParts';
import { rise } from '@/components/motion';
import { GhostButton, IconButton, PrimaryButton } from '@/components/ui';
import type { Tour } from '@/data/types';
import { tourPrice, useCanHost } from '@/lib/entitlements';
import { goBack } from '@/lib/nav';
import { useTourParamSafe } from '@/lib/useTour';
import { hostJoinLink, useGroup } from '@/store/group';
import { routeProgress, usePassport, useRoute } from '@/store/passport';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, functional, neutral, radius } from '@/theme/tokens';
import { TourThemeProvider } from '@/theme/TourTheme';
import { type } from '@/theme/type';

/**
 * Anfitrión, antes de salir: abre el grupo del tour (internet y Bluetooth a la
 * vez) y enseña el QR sobre papel, el código, por dónde se puede unir la gente
 * y quién se ha unido. «Empezar el paseo» va al mapa con el grupo abierto.
 */
export default function HostLobby() {
  const tour = useTourParamSafe();
  if (!tour) return <Redirect href="/" />;
  return <Lobby tour={tour} />;
}

function Lobby({ tour }: { tour: Tour }) {
  const insets = useSafeAreaInsets();
  const canHost = useCanHost(tour.id);
  const testMode = useSettings(s => s.testMode);
  const role = useGroup(s => s.role);
  const code = useGroup(s => s.code);
  const groupTour = useGroup(s => s.tourId);
  const host = useGroup(s => s.host);
  const members = useGroup(s => s.members);
  const transports = useGroup(s => s.transports);
  const avail = useGroup(s => s.avail);
  const hostGroup = useGroup(s => s.hostGroup);
  const endGroup = useGroup(s => s.endGroup);
  const simulateGuest = useGroup(s => s.simulateGuest);
  const startWalk = usePassport(s => s.startWalk);
  const saved = useRoute(tour.id);
  const [failed, setFailed] = useState(false);
  const setOwner = usePassport(s => s.setOwner);
  // El grupo ve al anfitrión por el titular del pasaporte: si aún no tiene, se pregunta antes de abrir
  const [needName, setNeedName] = useState(() => !usePassport.getState().passport.owner.trim() && !(useGroup.getState().role === 'host' && useGroup.getState().tourId === tour.id));
  const [name, setName] = useState('');
  const [simFull, setSimFull] = useState(false);
  const mine = role === 'host' && groupTour === tour.id;

  // Abre el grupo al entrar; si ya hay uno abierto de este tour, se sigue con él
  useEffect(() => {
    if (!canHost || needName) return;
    const g = useGroup.getState();
    if (g.role === 'host' && g.tourId === tour.id) return;
    hostGroup(tour.id).then(ok => { if (!ok) setFailed(true); });
  }, [canHost, needName, tour.id, hostGroup]);
  const saveName = () => {
    if (!name.trim()) return;
    setOwner(name.trim());
    setNeedName(false);
  };

  const link = mine ? hostJoinLink({ role, code, tourId: groupTour, host, transports }) : null;
  const lines = availLines(mine ? avail : null);
  const starting = !!avail && (avail.net === 'starting' || avail.ble === 'starting');
  const none = !!avail && !starting && !lines.some(l => l.ok);
  const paid = tourPrice(tour.id) != null;

  const start = () => {
    const prog = routeProgress(tour.id, saved);
    // Como en la portada: a medias, se sigue por la primera parada sin sellar
    const next = prog.started && !prog.allStamped ? tour.stops.findIndex(st => !saved?.stamps.some(x => x.stopId === st.id)) : 0;
    const target = Math.max(0, next);
    startWalk(tour.id, target);
    router.replace({ pathname: '/tour/[id]/walk', params: { id: tour.id, target: String(target) } });
  };
  const close = () => Alert.alert('¿Cerrar el grupo?', 'Quien se haya unido seguirá el paseo por su cuenta, con sus sellos.', [
    { text: 'Seguir con el grupo', style: 'cancel' },
    { text: 'Cerrar el grupo', style: 'destructive', onPress: () => { endGroup().finally(goBack); } },
  ]);
  const simulate = async () => { if (!(await simulateGuest())) setSimFull(true); };

  return (
    <TourThemeProvider palette={tour.palette}>
      <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 150, paddingHorizontal: 20, gap: 12 }}>
        <IconButton label="Volver" icon="back" onPress={goBack} style={{ marginLeft: -4 }} />
        <Animated.Text entering={rise(1)} style={[type.overline, { color: tour.palette.t }]}>Pasear en grupo · {tour.city}</Animated.Text>
        <Animated.Text entering={rise(1)} accessibilityRole="header" style={type.title}>{tour.title}</Animated.Text>
        <Animated.Text entering={rise(2)} style={type.body}>Cada uno escucha la guía en su móvil, al ritmo del tuyo, y gana sus propios sellos.</Animated.Text>

        {canHost && needName ? (
          <>
            <Text style={type.body}>¿Cómo te llamas? Así te verá el grupo (y será el titular de tu pasaporte).</Text>
            <TextInput accessibilityLabel="Tu nombre" value={name} onChangeText={setName} autoFocus maxLength={24} placeholder="Tu nombre" placeholderTextColor={neutral.ink3} returnKeyType="go" onSubmitEditing={saveName} style={s.name} />
            <PrimaryButton label="Abrir el grupo" disabled={!name.trim()} onPress={saveName} style={!name.trim() ? { opacity: 0.45 } : undefined} />
          </>
        ) : !canHost || failed ? (
          <Text style={s.warn}>{canHost ? 'No se ha podido abrir el grupo. Vuelve a intentarlo.' : 'Para abrir un grupo de este tour primero tienes que tenerlo.'}</Text>
        ) : !link || !code ? (
          <View style={s.wait}><ActivityIndicator color={tour.palette.t} /><Text style={type.caption}>Abriendo el grupo…</Text></View>
        ) : (
          <>
            <Animated.View entering={rise(3)} style={{ marginTop: 6 }}>
              <GroupQR link={link} code={code} />
            </Animated.View>
            <View style={s.avail} accessibilityLiveRegion="polite">
              {lines.map(l => (
                <Text key={l.label} style={[s.availText, { color: l.ok ? tour.palette.deep : neutral.ink3 }]}>{l.label}</Text>
              ))}
            </View>
            {none && <Text style={s.warn}>Así nadie podrá unirse: enciende el Bluetooth o conéctate a internet y vuelve a abrir el grupo.</Text>}
            {paid && <Text style={[s.note, { backgroundColor: tour.palette.soft, color: tour.palette.deep }]}>Tus invitados lo hacen gratis contigo.</Text>}
            <Text accessibilityRole="header" style={[type.headline, { marginTop: 10 }]}>Quién viene</Text>
            <MemberList host={host} members={members} />
            {testMode && (
              <Pressable accessibilityRole="button" onPress={simulate} style={s.test}>
                <Text style={s.testTitle}>Modo prueba</Text>
                <Text style={s.testText}>{simFull ? 'El grupo está lleno (8)' : '＋ Simular invitado'}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {mine && (
        <View style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
          <PrimaryButton label="Empezar el paseo" onPress={start} />
          <GhostButton label="Cerrar el grupo" onPress={close} />
        </View>
      )}
    </TourThemeProvider>
  );
}

const s = StyleSheet.create({
  name: { height: 56, borderRadius: radius.md, backgroundColor: neutral.surface, borderWidth: 1, borderColor: neutral.line, paddingHorizontal: 16, fontFamily: font.heavy, fontSize: 18, color: neutral.ink },
  wait: { alignItems: 'center', gap: 8, paddingVertical: 60 },
  avail: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 16, rowGap: 4, marginTop: 4 },
  availText: { fontFamily: font.black, fontSize: 14 },
  warn: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: functional.warnInk, backgroundColor: functional.warnSoft, padding: 12, borderRadius: radius.md, overflow: 'hidden' },
  note: { fontFamily: font.heavy, fontSize: 14, textAlign: 'center', padding: 10, borderRadius: radius.md, overflow: 'hidden' },
  test: { marginTop: 8, backgroundColor: 'rgba(28,26,23,0.86)', borderRadius: 18, padding: 12, gap: 4 },
  testTitle: { fontFamily: font.black, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: brand.sun },
  testText: { fontFamily: font.black, fontSize: 15, color: '#fff' },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, gap: 8, backgroundColor: neutral.bg, borderTopWidth: 1, borderTopColor: neutral.line },
});
