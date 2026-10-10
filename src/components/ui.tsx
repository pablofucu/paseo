import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from 'react-native';
import { font } from '@/theme/fonts';
import { neutral, radius, shadow } from '@/theme/tokens';
import { usePalette } from '@/theme/TourTheme';

export function PrimaryButton({ label, icon, style, ...rest }: PressableProps & { label: string; icon?: ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="button" {...rest} style={({ pressed }) => [s.primary, { backgroundColor: p.t, shadowColor: p.t, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      <Text style={[s.primaryText, { color: p.on }]}>{label}</Text>
      {icon}
    </Pressable>
  );
}

export function GhostButton({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.ghost, light && s.ghostLight, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[s.ghostText, light && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={[s.chip, { backgroundColor: p.soft }]}>
      <Text style={[s.chipText, { color: p.deep }]}>{children}</Text>
    </View>
  );
}

export function IconButton({ label, glyph, onPress, style }: { label: string; glyph: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => [s.icon, { opacity: pressed ? 0.8 : 1 }, style]}>
      <Text style={s.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  primary: { height: 56, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  primaryText: { fontFamily: font.black, fontSize: 17 },
  ghost: { height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: neutral.surface, ...shadow[1] },
  ghostLight: { backgroundColor: 'rgba(255,255,255,0.18)', shadowOpacity: 0, elevation: 0 },
  ghostText: { fontFamily: font.black, fontSize: 16, color: neutral.ink },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  chipText: { fontFamily: font.heavy, fontSize: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadow[2] },
  iconGlyph: { fontFamily: font.black, fontSize: 20, color: neutral.ink, marginTop: -2 },
});
