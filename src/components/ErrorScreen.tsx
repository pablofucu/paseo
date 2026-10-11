import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton, PrimaryButton } from '@/components/ui';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';

/**
 * Si una pantalla falla al pintarse, en lugar de cerrarse la app se ve esto,
 * con el mensaje del error para poder contarlo y arreglarlo.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 20 }]}>
      <Text style={s.over}>Algo ha fallado</Text>
      <Text style={s.title}>Esta pantalla no se ha podido abrir</Text>
      <Text style={s.body}>Tus sellos y postales están a salvo. Si vuelve a pasar, haz una captura de este mensaje:</Text>
      <ScrollView style={s.box} contentContainerStyle={{ padding: 12 }}>
        <Text selectable style={s.code}>{error.name}: {error.message}</Text>
        <Text selectable style={[s.code, { marginTop: 8, opacity: 0.7 }]}>{(error.stack ?? '').split('\n').slice(1, 7).join('\n')}</Text>
      </ScrollView>
      <View style={{ gap: 10, marginTop: 'auto' }}>
        <PrimaryButton label="Reintentar" onPress={retry} />
        <GhostButton label="Volver al inicio" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral.bg, paddingHorizontal: 22, gap: 10 },
  over: { fontFamily: font.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: neutral.ink3 },
  title: { fontFamily: font.serif, fontSize: 28, lineHeight: 32, color: neutral.ink },
  body: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: neutral.ink2 },
  box: { maxHeight: 220, borderRadius: 14, backgroundColor: neutral.bg2 },
  code: { fontFamily: 'monospace', fontSize: 12.5, color: neutral.ink },
});
