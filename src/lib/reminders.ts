import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getTour } from '@/data/tours';
import { knownRoutes, routeProgress, unfinishedRoutes, usePassport, usePassportHydrated, type UserRoute } from '@/store/passport';

/** Días sin sellar tras los que se avisa de una ruta a medias */
export const REMINDER_DAYS = 3;
const DAY = 86_400_000;
const ASKED = 'paseo-reminders-asked';

export interface Reminder {
  tourId: string;
  body: string;
  at: Date;
}

/**
 * Qué avisos tocan: uno por ruta empezada y sin terminar, a los 3 días de su
 * último sello (o dentro de 2 h si ese momento ya pasó). Pura, sin tocar nada.
 */
export function planReminders(tourIds: string[], routes: Record<string, UserRoute>, now = Date.now()): Reminder[] {
  return unfinishedRoutes(tourIds, routes).flatMap(id => {
    const tour = getTour(id);
    const last = routes[id]?.stamps.map(s => s.date).sort().at(-1);
    if (!tour || !last) return [];
    const missing = routeProgress(id, routes[id]).missing.length;
    const at = new Date(Math.max(+new Date(last) + REMINDER_DAYS * DAY, now + 2 * 3_600_000));
    const body = missing === 1 ? `Te falta 1 sello para tu postal de ${tour.title}` : `Te faltan ${missing} sellos para tu postal de ${tour.title}`;
    return [{ tourId: id, body, at }];
  });
}

// Se carga solo en nativo y a la hora de usarlo: el módulo no existe en la web
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notifications = () => require('expo-notifications') as typeof import('expo-notifications');

/**
 * Programa (o quita) los avisos según las rutas a medias. `ask` pide permiso
 * una sola vez, y solo se usa tras el primer sello. Sin permiso no hace nada.
 */
export async function syncReminders(tourIds: string[], routes: Record<string, UserRoute>, ask = false) {
  if (Platform.OS === 'web') return;
  try {
    const N = notifications();
    let perm = await N.getPermissionsAsync();
    if (!perm.granted && ask && perm.canAskAgain && (await AsyncStorage.getItem(ASKED)) == null) {
      await AsyncStorage.setItem(ASKED, '1');
      perm = await N.requestPermissionsAsync();
    }
    await N.cancelAllScheduledNotificationsAsync();
    if (!perm.granted) return;
    for (const r of planReminders(tourIds, routes)) {
      await N.scheduleNotificationAsync({
        identifier: `reminder-${r.tourId}`,
        content: { title: 'Paseo', body: r.body, data: { tourId: r.tourId } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
    }
  } catch {
    // Sin avisos (simulador, permisos…): la app sigue igual
  }
}

/** Reprograma los avisos con el estado actual del pasaporte (tras cancelar una ruta o borrarlo) */
export function resyncReminders() {
  const st = usePassport.getState();
  return syncReminders(knownRoutes(st.passport.pageOrder), st.routes);
}

/**
 * Se monta una vez en la raíz: al abrir la app (con el pasaporte ya leído)
 * reprograma los avisos, y al tocar un aviso «Te faltan sellos» abre la ficha
 * de esa ruta.
 */
export function RemindersBridge() {
  const hydrated = usePassportHydrated();
  const ready = !!useRootNavigationState()?.key;
  useEffect(() => { if (hydrated) resyncReminders(); }, [hydrated]);
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    let N: ReturnType<typeof notifications>;
    try { N = notifications(); } catch { return; }
    const handled = new Set<string>();
    const open = (r: import('expo-notifications').NotificationResponse | null) => {
      const req = r?.notification.request;
      if (!req || !req.identifier.startsWith('reminder-') || handled.has(`${req.identifier}${r.notification.date}`)) return;
      handled.add(`${req.identifier}${r.notification.date}`);
      N.clearLastNotificationResponseAsync().catch(() => {});
      const id = (req.content.data as { tourId?: string } | undefined)?.tourId ?? req.identifier.slice('reminder-'.length);
      if (getTour(id)) router.push({ pathname: '/tour/[id]', params: { id } });
    };
    N.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
  return null;
}
