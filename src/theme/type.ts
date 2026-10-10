import { StyleSheet } from 'react-native';
import { font } from './fonts';
import { neutral } from './tokens';

export const type = StyleSheet.create({
  hero: { fontFamily: font.serif, fontSize: 44, lineHeight: 46, letterSpacing: -1, color: neutral.ink },
  title: { fontFamily: font.serif, fontSize: 28, lineHeight: 31, letterSpacing: -0.3, color: neutral.ink },
  headline: { fontFamily: font.black, fontSize: 19, lineHeight: 24, color: neutral.ink },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 25, color: neutral.ink2 },
  caption: { fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: neutral.ink3 },
  overline: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: neutral.ink3 },
  display: { fontFamily: font.black, fontSize: 34, lineHeight: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
});
