import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { font } from '@/theme/fonts';
import { useSettings, useSettingsHydrated } from '@/store/settings';
import { neutral } from '@/theme/tokens';

const ICONS = {
  index: (c: string) => (
    <Path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1Z" fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />
  ),
  pasaporte: (c: string) => (
    <>
      <Rect x={5} y={3} width={14} height={18} rx={2} fill="none" stroke={c} strokeWidth={2} />
      <Path d="M12 8.2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-3 9.3h6" fill="none" stroke={c} strokeWidth={1.7} strokeLinecap="round" />
    </>
  ),
  postales: (c: string) => (
    <>
      <Rect x={2.5} y={5} width={19} height={14} rx={1.5} fill="none" stroke={c} strokeWidth={2} />
      <Path d="M13 9h5M13 12h5M13 15h3M5.5 9h4v4h-4Z" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

const icon = (name: keyof typeof ICONS) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Svg width={24} height={24} viewBox="0 0 24 24">{ICONS[name](String(color))}</Svg>;
  };

export default function TabsLayout() {
  const hydrated = useSettingsHydrated();
  const language = useSettings(s => s.language);
  // La primera vez: bienvenida (idioma) antes de nada; la ciudad se elige en Inicio
  if (!hydrated) return null;
  if (!language) return <Redirect href="/bienvenida" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: neutral.ink,
        tabBarInactiveTintColor: neutral.ink3,
        tabBarLabelStyle: { fontFamily: font.black, fontSize: 11.5 },
        tabBarStyle: { backgroundColor: neutral.bg, borderTopColor: neutral.line },
        sceneStyle: { backgroundColor: neutral.bg },
        // Al cambiar de pestaña la nueva se desliza un poco y aparece; las ocultas se congelan y no se repintan
        animation: 'shift',
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('index') }} />
      <Tabs.Screen name="pasaporte" options={{ title: 'Pasaporte', tabBarIcon: icon('pasaporte') }} />
      <Tabs.Screen name="postales" options={{ title: 'Postales', tabBarIcon: icon('postales') }} />
    </Tabs>
  );
}

/** Un fallo al pintar una pantalla enseña el error en lugar de cerrar la app */
export { ErrorScreen as ErrorBoundary } from '@/components/ErrorScreen';
