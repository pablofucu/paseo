import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fontAssets } from '@/theme/fonts';
import { useSettingsHydrated } from '@/store/settings';
import { brand, neutral } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, fontError] = useFonts(fontAssets);
  const hydrated = useSettingsHydrated();
  // Se enseña la app cuando hay fuentes (o fallaron: se verá con las del sistema) y ajustes leídos;
  // hasta entonces sigue el splash azul y no hay destello blanco ni redirecciones erróneas
  const ready = (loaded || !!fontError) && hydrated;
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {/*
          Transiciones: las pantallas nuevas entran desde la derecha con la de
          debajo desplazándose en paralaje (como en iOS, también en Android) y
          se pueden cerrar deslizando desde cualquier punto. La llegada a una
          parada y el final suben desde abajo; la postal se abre como una lámina.
        */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: neutral.bg },
            animation: 'ios_from_right',
            fullScreenGestureEnabled: true,
            animationMatchesGesture: true,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="bienvenida" options={{ animation: 'fade', contentStyle: { backgroundColor: brand.navy } }} />
          <Stack.Screen name="ajustes" />
          <Stack.Screen name="tour/[id]/walk" options={{ animation: 'fade', animationDuration: 380 }} />
          <Stack.Screen name="tour/[id]/stop/[n]" options={{ animation: 'fade_from_bottom', animationDuration: 420 }} />
          <Stack.Screen name="tour/[id]/done" options={{ animation: 'fade_from_bottom', animationDuration: 480, gestureEnabled: false }} />
          <Stack.Screen name="postal/[id]" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal', gestureDirection: 'vertical', contentStyle: { backgroundColor: neutral.night } }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Un fallo al pintar una pantalla enseña el error en lugar de cerrar la app */
export { ErrorScreen as ErrorBoundary } from '@/components/ErrorScreen';
