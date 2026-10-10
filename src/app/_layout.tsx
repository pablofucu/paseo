import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fontAssets } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts(fontAssets);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: neutral.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="tour/[id]/stop/[n]" options={{ animation: 'fade' }} />
        <Stack.Screen name="tour/[id]/done" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
