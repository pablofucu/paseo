import { Image } from 'expo-image';
import { Image as RNImage, type ImageSourcePropType } from 'react-native';

/**
 * Calienta la caché de expo-image con la foto de la siguiente parada, para que
 * se vea al instante al abrirla. Las fotos empaquetadas se resuelven a su URI
 * (en desarrollo, la del servidor de Metro; en la app, un archivo local).
 */
export function prefetchPhoto(source?: ImageSourcePropType) {
  try {
    if (!source) return;
    const uri = RNImage.resolveAssetSource(source)?.uri;
    if (uri) Image.prefetch(uri).catch(() => {});
  } catch {
    // Sin caché (web, pruebas): la foto se carga al abrir la parada
  }
}
