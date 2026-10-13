import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type PressableProps, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PressableScale } from '@/components/motion';
import { font } from '@/theme/fonts';
import { neutral, radius, shadow } from '@/theme/tokens';
import { usePalette } from '@/theme/TourTheme';

export function PrimaryButton({ label, icon, style, ...rest }: PressableProps & { label: string; icon?: ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <PressableScale accessibilityRole="button" {...rest} style={[s.primary, { backgroundColor: p.t, shadowColor: p.t }, style]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.primaryText, { color: p.on }]}>{label}</Text>
      {icon}
    </PressableScale>
  );
}

export function GhostButton({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={[s.ghost, light && s.ghostLight]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.ghostText, light && { color: neutral.white }]}>{label}</Text>
    </PressableScale>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={[s.chip, { backgroundColor: p.soft }]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.chipText, { color: p.deep }]}>{children}</Text>
    </View>
  );
}

const ICONS = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  map: 'M9 5 3.5 7v12L9 17l6 2 5.5-2V5L15 7zM9 5v12M15 7v12',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
} as const;

export function IconButton({ label, icon, onPress, style }: { label: string; icon: keyof typeof ICONS; onPress: () => void; style?: ViewStyle }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} scaleTo={0.88} style={[s.icon, style]}>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d={ICONS[icon]} fill="none" stroke={neutral.ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  primary: { minHeight: 56, paddingVertical: 8, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  primaryText: { fontFamily: font.black, fontSize: 17 },
  ghost: { minHeight: 52, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: neutral.surface, ...shadow[1] },
  ghostLight: { backgroundColor: 'rgba(255,255,255,0.18)', shadowOpacity: 0, elevation: 0 },
  ghostText: { fontFamily: font.black, fontSize: 16, color: neutral.ink },
  chip: { minHeight: 34, paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  chipText: { fontFamily: font.heavy, fontSize: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
});
