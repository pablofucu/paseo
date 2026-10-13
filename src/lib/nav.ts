import { router } from 'expo-router';

/** Atrás; si se llegó por un enlace y no hay pantalla anterior, al inicio */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
