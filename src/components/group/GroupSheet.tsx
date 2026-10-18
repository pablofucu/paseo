import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { availLines, GroupQR, guestLinkLabel, MemberList } from '@/components/group/GroupParts';
import { DUR, EASE_OUT, PressableScale } from '@/components/motion';
import { hostJoinLink, useGroup } from '@/store/group';
import { useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, radius, shadow } from '@/theme/tokens';
import { usePalette } from '@/theme/TourTheme';

/** Rojo de las acciones que no se deshacen (como «Terminar paseo») */
const DANGER = '#B3261E';

/** La pastilla del grupo en el paseo: «Grupo · N» (anfitrión) o «Con Ana · por internet» (invitado) */
export function GroupPill({ onPress }: { onPress: () => void }) {
  const p = usePalette();
  const role = useGroup(s => s.role);
  const members = useGroup(s => s.members);
  const host = useGroup(s => s.host);
  const status = useGroup(s => s.status);
  const via = useGroup(s => s.via);
  const label = role === 'host' ? `Grupo · ${members.length + 1}` : `Con ${host?.name || 'el grupo'} · ${guestLinkLabel(status, via)}`;
  const shaky = role === 'guest' && status !== 'connected';
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${label}. Abre el grupo`} onPress={onPress} scaleTo={0.95} style={[s.pill, { backgroundColor: shaky ? brand.sun : p.t2 }]}>
      <View style={[s.pillDot, { backgroundColor: shaky ? neutral.ink3 : p.deep }]} />
      <Text style={s.pillText} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

/**
 * Hoja del grupo en el paseo. Anfitrión: el QR (para que se una alguien más),
 * la lista y «Cerrar el grupo». Invitado: con quién va, cómo está conectado y
 * «Salir del grupo». Se queda con lo sellado en cualquier caso.
 */
export function GroupSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const testMode = useSettings(s => s.testMode);
  const g = useGroup();
  const [simFull, setSimFull] = useState(false);
  const host = g.role === 'host';
  const link = host ? hostJoinLink(g) : null;

  const end = () => Alert.alert(host ? '¿Cerrar el grupo?' : '¿Salir del grupo?', host ? 'Quien se haya unido seguirá el paseo por su cuenta, con sus sellos.' : 'Sigues el paseo por tu cuenta y te quedas con tus sellos.', [
    { text: 'Seguir en el grupo', style: 'cancel' },
    { text: host ? 'Cerrar el grupo' : 'Salir del grupo', style: 'destructive', onPress: () => { onClose(); (host ? g.endGroup : g.leaveGroup)(); } },
  ]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, s.backdrop]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver al mapa" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(DUR.slow).easing(EASE_OUT)} exiting={SlideOutDown.duration(220)} style={[s.sheet, { maxHeight: '88%', paddingBottom: insets.bottom + 14 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Bajar la hoja del grupo" onPress={onClose} hitSlop={{ left: 40, right: 40 }} style={s.grabHit}>
          <View style={s.grab} />
        </Pressable>
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={s.title}>{host ? 'Tu grupo' : `Con ${g.host?.name || 'el grupo'}`}</Text>
          {host ? (
            <>
              {link && g.code && <GroupQR link={link} code={g.code} size={170} />}
              <View style={s.avail}>
                {availLines(g.avail).map(l => <Text key={l.label} style={[s.availText, { color: l.ok ? p.deep : neutral.ink3 }]}>{l.label}</Text>)}
              </View>
            </>
          ) : (
            <Text style={s.sub}>
              {g.status === 'reconnecting' ? 'Reconectando con quien guía…' : `Conectado ${guestLinkLabel(g.status, g.via)}`}. Tu parada y tu audio siguen a {g.host?.name || 'quien guía'}; si tocas el reproductor vas a tu aire.
            </Text>
          )}
          <MemberList host={g.host} members={g.members} meId={host ? undefined : g.memberId} />
          {host && testMode && (
            <Pressable accessibilityRole="button" onPress={async () => { if (!(await g.simulateGuest())) setSimFull(true); }} style={s.test}>
              <Text style={s.testText}>{simFull ? 'Modo prueba · el grupo está lleno' : 'Modo prueba · ＋ Simular invitado'}</Text>
            </Pressable>
          )}
          <PressableScale accessibilityRole="button" onPress={end} scaleTo={0.97} style={s.end}>
            <Text style={s.endText}>{host ? 'Cerrar el grupo' : 'Salir del grupo'}</Text>
          </PressableScale>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 32, paddingHorizontal: 12, borderRadius: radius.pill, maxWidth: '100%', ...shadow[2] },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontFamily: font.black, fontSize: 13, color: neutral.ink, flexShrink: 1 },
  backdrop: { backgroundColor: 'rgba(10,8,5,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: neutral.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, ...shadow[3] },
  grabHit: { height: 26, alignItems: 'center', justifyContent: 'center' },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: neutral.line },
  title: { fontFamily: font.serif, fontSize: 24, lineHeight: 28, color: neutral.ink },
  sub: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: neutral.ink2 },
  avail: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 16, rowGap: 4 },
  availText: { fontFamily: font.black, fontSize: 13.5 },
  test: { backgroundColor: 'rgba(28,26,23,0.86)', borderRadius: 14, padding: 12 },
  testText: { fontFamily: font.black, fontSize: 13.5, color: '#fff' },
  end: { alignSelf: 'flex-start', height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: neutral.bg2, justifyContent: 'center' },
  endText: { fontFamily: font.heavy, fontSize: 14, color: DANGER },
});
