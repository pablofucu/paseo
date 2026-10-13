import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTap, PressableScale, rise } from '@/components/motion';
import { IconButton } from '@/components/ui';
import { getCity } from '@/data/tours';
import { goBack } from '@/lib/nav';
import { usePassport } from '@/store/passport';
import { LANGUAGES, useSettings } from '@/store/settings';
import { font } from '@/theme/fonts';
import { brand, neutral, shadow } from '@/theme/tokens';
import { useFontScale, useType } from '@/theme/type';

function Section({ title, i, children }: { title: string; i: number; children: ReactNode }) {
  const type = useType();
  return (
    <Animated.View entering={rise(i)} style={{ gap: 8 }}>
      <Text style={[type.overline, { marginLeft: 4 }]}>{title}</Text>
      <View style={s.group}>{children}</View>
    </Animated.View>
  );
}

/** Ajustes: idioma, ciudad de Inicio y modo prueba */
export default function Ajustes() {
  const insets = useSafeAreaInsets();
  const type = useType();
  const rt = { fontSize: 15.5 * useFontScale() };
  const language = useSettings(s => s.language);
  const setLanguage = useSettings(s => s.setLanguage);
  const city = useSettings(s => s.city);
  const testMode = useSettings(s => s.testMode);
  const setTestMode = useSettings(s => s.setTestMode);
  const largeText = useSettings(s => s.largeText);
  const setLargeText = useSettings(s => s.setLargeText);
  const reset = usePassport(s => s.reset);
  const current = language ?? 'es';

  const confirmReset = () =>
    Alert.alert('¿Borrar el pasaporte?', 'Se borrarán todos tus sellos y postales. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => { lightTap(); reset(); } },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32, paddingHorizontal: 20, gap: 22 }}>
      <View style={{ gap: 10 }}>
        <IconButton label="Volver" icon="back" onPress={goBack} />
        <Animated.Text entering={rise(0)} style={type.title}>Ajustes</Animated.Text>
      </View>

      <Section title="Idioma · Language" i={1}>
        {LANGUAGES.map((l, n) => {
          const on = current === l.id;
          return (
            <PressableScale
              key={l.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !l.ready }}
              accessibilityLabel={l.ready ? l.name : `${l.name}, próximamente`}
              disabled={!l.ready}
              scaleTo={0.98}
              onPress={() => { lightTap(); setLanguage(l.id); }}
              style={[s.row, n > 0 && s.divider]}
            >
              <View style={[s.code, !l.ready && s.codeOff]}>
                <Text style={[s.codeText, !l.ready && { color: neutral.ink3 }]}>{l.id.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, rt, !l.ready && { color: neutral.ink3 }]}>{l.name}</Text>
                <Text style={type.caption}>{l.note}</Text>
              </View>
              <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
            </PressableScale>
          );
        })}
      </Section>

      <Section title="Ciudad" i={2}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Cambiar de ciudad" scaleTo={0.98} onPress={() => router.push({ pathname: '/ciudad', params: { change: '1' } })} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={[s.rowTitle, rt]}>{(city && getCity(city)?.name) ?? 'Sin elegir'}</Text>
            <Text style={type.caption}>Sus rutas salen primero en Inicio</Text>
          </View>
          <Text style={s.go}>›</Text>
        </PressableScale>
      </Section>

      <Section title="Información" i={3}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Créditos de las fotos" scaleTo={0.98} onPress={() => router.push('/creditos')} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>Créditos de las fotos</Text>
            <Text style={type.caption}>Autoría, licencia y fuente de cada foto</Text>
          </View>
          <Text style={s.go}>›</Text>
        </PressableScale>
      </Section>

      <Section title="Accesibilidad" i={4}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={[s.rowTitle, rt]}>Texto grande</Text>
            <Text style={type.caption}>Agranda los textos de la app, además del tamaño de letra del sistema.</Text>
          </View>
          <Switch accessibilityLabel="Texto grande" value={largeText} onValueChange={on => { lightTap(); setLargeText(on); }} trackColor={{ true: brand.primary, false: neutral.line }} thumbColor={neutral.white} />
        </View>
      </Section>

      <Section title="Pruebas" i={5}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={[s.rowTitle, rt]}>Modo prueba</Text>
            <Text style={type.caption}>Recorre los tours sin moverte: paseo simulado, velocidad, llegar a la parada o tocar el mapa para moverte.</Text>
          </View>
          <Switch accessibilityLabel="Modo prueba" value={testMode} onValueChange={setTestMode} trackColor={{ true: brand.primary, false: neutral.line }} thumbColor={neutral.white} />
        </View>
        {testMode && (
          <Pressable accessibilityRole="button" accessibilityHint="Te pregunta antes de borrar nada" onPress={confirmReset} style={[s.row, s.divider]}>
            <Text style={[s.rowTitle, rt, { color: brand.primaryDark }]}>Borrar el pasaporte (sellos y postales)</Text>
          </Pressable>
        )}
      </Section>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  group: { backgroundColor: neutral.surface, borderRadius: 20, overflow: 'hidden', ...shadow[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: neutral.line },
  rowTitle: { fontFamily: font.black, fontSize: 15.5, color: neutral.ink },
  code: { width: 40, height: 40, borderRadius: 12, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  codeOff: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: neutral.line },
  codeText: { fontFamily: font.black, fontSize: 13, color: neutral.white, letterSpacing: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: neutral.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: brand.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: brand.primary },
  go: { fontFamily: font.black, fontSize: 26, color: brand.primary },
});
