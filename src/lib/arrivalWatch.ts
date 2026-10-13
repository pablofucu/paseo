import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppState, Platform } from 'react-native';
import { getTour } from '@/data/tours';
import { usePassport } from '@/store/passport';
import { distance } from './geo';
import { accuracySlack, ARRIVE_RADIUS_M } from './guidance';
import { MAX_ACCURACY_M } from './useWalkPosition';

const TASK = 'paseo-arrival-watch';
const ASKED_BG = 'paseo-arrival-bg-asked';
const ASKED_NOTIF = 'paseo-arrival-notif-asked';
const NOTIFIED = 'paseo-arrival-notified';

// Se cargan solo en nativo y a la hora de usarlos: no existen en la web
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notifications = () => require('expo-notifications') as typeof import('expo-notifications');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const taskManager = () => require('expo-task-manager') as typeof import('expo-task-manager');

export interface NotifyInput {
  accuracy: number | null;
  /** Metros en línea recta hasta la parada a la que se va */
  distance: number;
  /** Ya sellada, o la llegada ya está registrada */
  done: boolean;
  /** Ya se avisó de esta parada en este paseo */
  notified: boolean;
}

/** ¿Toca avisar de la llegada? Solo con buena precisión, dentro del radio de llegada y una vez por parada. */
export function shouldNotify({ accuracy, distance: d, done, notified }: NotifyInput): boolean {
  if (done || notified || accuracy == null || accuracy > MAX_ACCURACY_M) return false;
  return d <= ARRIVE_RADIUS_M + accuracySlack(accuracy) / 2;
}

const sent = new Set<string>();
const readSent = async () => {
  try {
    (JSON.parse((await AsyncStorage.getItem(NOTIFIED)) ?? '[]') as string[]).forEach(k => sent.add(k));
  } catch {
    // Sin lista guardada: se parte de la de memoria
  }
};

async function onLocations(locations: Location.LocationObject[]) {
  // Con la app delante avisa la propia pantalla del paseo
  if (AppState.currentState === 'active') return;
  const loc = locations.at(-1);
  if (!loc) return;
  if (!usePassport.persist.hasHydrated()) await usePassport.persist.rehydrate();
  const { walk, routes } = usePassport.getState();
  const tour = walk && getTour(walk.tourId);
  const stop = tour?.stops[walk?.target ?? -1];
  if (!walk || !tour || !stop) return;
  const key = `${tour.id}:${stop.id}`;
  if (!sent.size) await readSent();
  const done = walk.arrived === stop.id || !!routes[tour.id]?.stamps.some(x => x.stopId === stop.id);
  const d = distance([loc.coords.longitude, loc.coords.latitude], stop.coord);
  if (!shouldNotify({ accuracy: loc.coords.accuracy ?? null, distance: d, done, notified: sent.has(key) })) return;
  sent.add(key);
  await AsyncStorage.setItem(NOTIFIED, JSON.stringify([...sent])).catch(() => {});
  await notifications().scheduleNotificationAsync({
    identifier: 'arrival',
    content: { title: `Estás en ${stop.name}`, body: 'Toca para escuchar su historia.', data: { tourId: tour.id, n: walk.target } },
    trigger: null,
  });
}

// La tarea se define al cargar la app (la importa el layout raíz), no al montar la pantalla
if (Platform.OS !== 'web') {
  try {
    taskManager().defineTask(TASK, async ({ data, error }) => {
      if (error) return;
      try {
        await onLocations((data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? []);
      } catch {
        // Sin aviso: la pantalla del paseo sigue funcionando igual
      }
    });
  } catch {
    // Sin módulo nativo (Expo Go, pruebas): no hay aviso en segundo plano
  }
}

/** Pide un permiso una sola vez en la vida de la app (si el sistema aún deja preguntar) */
async function askOnce(flag: string, perm: { granted: boolean; canAskAgain: boolean }, ask: () => Promise<{ granted: boolean }>) {
  if (perm.granted) return true;
  if (!perm.canAskAgain || (await AsyncStorage.getItem(flag)) != null) return false;
  await AsyncStorage.setItem(flag, '1');
  return (await ask()).granted;
}

let run = 0;

/**
 * Sigue la ubicación en segundo plano mientras dura el paseo y avisa al llegar
 * a la parada. Pide el permiso de segundo plano y el de avisos una sola vez;
 * sin ellos (o en web, Expo Go, simulador) no hace nada.
 */
export async function startArrivalWatch() {
  if (Platform.OS === 'web') return;
  const me = ++run;
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted) return;
    if (!(await askOnce(ASKED_BG, await Location.getBackgroundPermissionsAsync(), Location.requestBackgroundPermissionsAsync))) return;
    const N = notifications();
    if (!(await askOnce(ASKED_NOTIF, await N.getPermissionsAsync(), N.requestPermissionsAsync))) return;
    // Si mientras tanto se ha parado el paseo (o se ha vuelto a pedir), no se arranca
    if (me !== run || (await Location.hasStartedLocationUpdatesAsync(TASK))) return;
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 15,
      foregroundService: { notificationTitle: 'Paseo te guía', notificationBody: 'Te avisamos al llegar a cada parada', notificationColor: '#086F81' },
    });
    if (me !== run) await Location.stopLocationUpdatesAsync(TASK).catch(() => {});
  } catch {
    // Sin seguimiento en segundo plano: la app sigue igual
  }
}

export async function stopArrivalWatch() {
  if (Platform.OS === 'web') return;
  run++;
  sent.clear();
  AsyncStorage.removeItem(NOTIFIED).catch(() => {});
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  } catch {
    // Nada que parar
  }
}
