import { useFonts } from 'expo-font';
import { router, Stack, usePathname, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getTour } from '@/data/tours';
import '@/lib/arrivalWatch';
import { usePassport, usePassportHydrated } from '@/store/passport';
import { fontAssets } from '@/theme/fonts';
import { useSettingsHydrated } from '@/store/settings';
import { brand, neutral } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

// Se carga solo en nativo y a la hora de usarlo: el módulo no existe en la web
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notifications = () => require('expo-notifications') as typeof import('expo-notifications');

/**
 * Toque en el aviso de llegada: si el paseo sigue en esa parada se registra la
 * llegada y se abre su guía (sin audio: lo arranca el usuario); si no, se vuelve
 * al mapa del paseo, o a la ficha de la ruta si ya no hay paseo. En arranque en
 * frío espera a que el paseo guardado se haya leído.
 */
function ArrivalTap() {
  const hydrated = usePassportHydrated();
  const ready = !!useRootNavigationState()?.key && hydrated;
  const pathname = usePathname();
  const at = useRef(pathname);
  useEffect(() => { at.current = pathname; }, [pathname]);
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    let N: ReturnType<typeof notifications>;
    try { N = notifications(); } catch { return; }
    const handled = new Set<string>();
    const open = (r: import('expo-notifications').NotificationResponse | null) => {
      const req = r?.notification.request;
      if (!req || req.identifier !== 'arrival' || handled.has(`${req.identifier}${r.notification.date}`)) return;
      handled.add(`${req.identifier}${r.notification.date}`);
      N.clearLastNotificationResponseAsync().catch(() => {});
      const { tourId, n } = req.content.data as { tourId?: string; n?: number };
      const tour = tourId ? getTour(tourId) : undefined;
      if (!tourId || !tour) return;
      const { walk, arrive } = usePassport.getState();
      if (!at.current.startsWith(`/tour/${tourId}`)) router.push(walk?.tourId === tourId ? { pathname: '/tour/[id]/walk', params: { id: tourId } } : { pathname: '/tour/[id]', params: { id: tourId } });
      const stop = typeof n === 'number' ? tour.stops[n] : undefined;
      if (walk?.tourId !== tourId || walk.target !== n || !stop) return;
      const repeat = arrive(tourId, stop.id);
      router.push({ pathname: '/tour/[id]/stop/[n]', params: { id: tourId, n: String(n), arrived: repeat ? 'repeat' : '1' } });
    };
    N.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
  return null;
}

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
        <ArrivalTap />
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
