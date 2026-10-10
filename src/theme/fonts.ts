import { Fraunces_700Bold, Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';

export const fontAssets = {
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
};

/** Fraunces para lugares y títulos; Nunito para la interfaz. */
export const font = {
  serif: 'Fraunces_800ExtraBold',
  serifBold: 'Fraunces_700Bold',
  body: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;
