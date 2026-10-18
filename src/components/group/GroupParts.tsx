import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, Text, View } from 'react-native';
import { MAX_MEMBERS, type Member } from '@/lib/group/protocol';
import { PAPEL } from '@/lib/ink';
import type { GroupSession } from '@/store/group';
import { font } from '@/theme/fonts';
import { neutral, radius, shadow } from '@/theme/tokens';
import { usePalette } from '@/theme/TourTheme';

/*
 * Piezas de la visita en grupo (docs/visita-en-grupo.md, «Interfaz»): el QR
 * sobre papel con el código, la línea de transportes y la lista de quién va.
 */

/** «ABC DEF»: el código en dos mitades, más fácil de dictar y teclear */
export const spacedCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** Lo que se dice de cada transporte del anfitrión: «Por internet ✓», «Bluetooth apagado»… */
export function availLines(avail: GroupSession['avail']): { label: string; ok: boolean }[] {
  if (!avail) return [];
  const net = { on: 'Por internet ✓', starting: 'Abriendo por internet…', off: 'Internet no disponible', offline: 'Internet: sin conexión' }[avail.net];
  const ble = { on: 'Bluetooth ✓', starting: 'Abriendo Bluetooth…', poweredOff: 'Bluetooth apagado', unauthorized: 'Bluetooth sin permiso', unsupported: 'Bluetooth no disponible' }[avail.ble];
  return [{ label: net, ok: avail.net === 'on' }, { label: ble, ok: avail.ble === 'on' }];
}

/** Cómo está conectado el invitado: «por internet», «por Bluetooth», «reconectando…» */
export function guestLinkLabel(status: GroupSession['status'], via: GroupSession['via']): string {
  if (status === 'reconnecting') return 'reconectando…';
  if (status === 'connecting') return 'conectando…';
  if (status === 'lost') return 'sin conexión';
  return via === 'ble' ? 'por Bluetooth' : via === 'net' ? 'por internet' : 'conectado';
}

/** El QR del grupo sobre papel, con el código debajo en letras grandes */
export function GroupQR({ link, code, size = 220 }: { link: string; code: string; size?: number }) {
  const p = usePalette();
  return (
    <View style={[s.paper, { borderColor: `${p.t}33` }]} accessible accessibilityRole="image" accessibilityLabel={`Código QR del grupo. Código ${code.split('').join(' ')}`}>
      <QRCode value={link} size={size} color={neutral.ink} backgroundColor={PAPEL} ecl="M" quietZone={8} />
      <Text style={s.codeOver}>Código del grupo</Text>
      <Text selectable style={[s.code, { color: p.deep }]}>{spacedCode(code)}</Text>
    </View>
  );
}

/** Quién va en el grupo: el anfitrión primero y «N de 8» */
export function MemberList({ host, members, meId }: { host: Member | null; members: Member[]; meId?: string }) {
  const p = usePalette();
  const all = host ? [host, ...members] : members;
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.count}>{all.length} de {MAX_MEMBERS} personas</Text>
      <View style={s.list}>
        {all.map((m, i) => (
          <View key={m.id} style={[s.member, { backgroundColor: p.soft }]}>
            <View style={[s.dot, { backgroundColor: i === 0 && host ? p.t : p.t2 }]}>
              <Text style={[s.dotText, { color: i === 0 && host ? p.on : neutral.ink }]}>{(m.name.trim()[0] ?? '?').toUpperCase()}</Text>
            </View>
            <Text style={[s.memberName, { color: p.deep }]} numberOfLines={1}>
              {m.name || 'Sin nombre'}{i === 0 && host ? ' · anfitrión' : ''}{m.id === meId && !(i === 0 && host) ? ' · tú' : ''}
            </Text>
          </View>
        ))}
      </View>
      {all.length <= 1 && <Text style={s.empty}>Aún no se ha unido nadie. Que escaneen el QR con la cámara del móvil o desde «Unirse a un grupo» en Paseo.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  paper: { alignSelf: 'center', alignItems: 'center', backgroundColor: PAPEL, borderRadius: radius.md, borderWidth: 1, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 14, ...shadow[2] },
  codeOver: { marginTop: 10, fontFamily: font.heavy, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: neutral.ink3 },
  code: { fontFamily: font.black, fontSize: 38, letterSpacing: 4, fontVariant: ['tabular-nums'] },
  count: { fontFamily: font.heavy, fontSize: 13, color: neutral.ink3 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, paddingLeft: 4, paddingRight: 12, minHeight: 36, maxWidth: '100%' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontFamily: font.black, fontSize: 13 },
  memberName: { fontFamily: font.heavy, fontSize: 14, flexShrink: 1 },
  empty: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: neutral.ink3 },
});
