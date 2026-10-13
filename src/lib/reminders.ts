import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getTour } from '@/data/tours';
import { routeProgress, unfinishedRoutes, type UserRoute } from '@/store/passport';

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
        content: { title: 'Paseo', body: r.body },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
    }
  } catch {
    // Sin avisos (simulador, permisos…): la app sigue igual
  }
}
