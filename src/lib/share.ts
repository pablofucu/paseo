import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';

/** Comparte la postal como imagen; si no se puede capturar, comparte el texto */
export async function sharePostcard(ref: RefObject<View | null>, title: string) {
  const message = `He completado «${title}» con Paseo y me he ganado su postal.`;
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
  await Share.share({ message }).catch(() => {});
}
