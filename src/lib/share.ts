import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';

export const APP_NAME = 'Paseo';
/** Enlace a la app para el texto al compartir: aún no existe, se rellena cuando haya ficha en las tiendas */
export const APP_LINK = '';

const withLink = (text: string) => (APP_LINK ? `${text} ${APP_LINK}` : text);

/** Comparte lo que hay en `ref` (con fondo opaco: ver ShareMat) como imagen; si no se puede capturar, comparte el texto */
export async function shareImage(ref: RefObject<View | null>, title: string, message: string) {
  try {
    if (Platform.OS !== 'web' && ref.current && (await Sharing.isAvailableAsync())) {
      // Se carga solo en nativo: el módulo no existe en la web
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
      return;
    }
  } catch {
    // seguimos con el texto
  }
  await Share.share({ message: withLink(message) }).catch(() => {});
}

/** Comparte la postal (con el sello de su ruta en el pie) */
export const sharePostcard = (ref: RefObject<View | null>, title: string) =>
  shareImage(ref, title, `He completado «${title}» con ${APP_NAME} y me he ganado su postal.`);

/** Comparte la hoja de sellos de una ruta */
export const shareStampSheet = (ref: RefObject<View | null>, title: string) =>
  shareImage(ref, title, `Mi hoja de sellos de «${title}» en ${APP_NAME}.`);
