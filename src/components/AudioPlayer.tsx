import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NarrationPlayer } from '@/lib/useNarrationPlayer';
import { font } from '@/theme/fonts';
import { neutral, radius } from '@/theme/tokens';
import { usePalette } from '@/theme/TourTheme';

const BARS = 44;
const RATES = [1, 1.25, 1.5];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Alturas de la onda: siempre las mismas para el mismo audio */
function waveFor(seed: string) {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return Array.from({ length: BARS }, (_, i) => {
    h = (h * 1103 + 12345) % 9973;
    const env = 0.55 + 0.45 * Math.sin((i / BARS) * Math.PI);
    return 0.22 + 0.78 * env * (0.35 + (h % 100) / 154);
  });
}

/**
 * Barras de la onda. Se pintan de nuevo solo cuando se enciende otra barra
 * (44 como mucho por audio), no en cada tic del reloj.
 */
const WaveBars = memo(function WaveBars({ wave, lit, on }: { wave: number[]; lit: number; on: string }) {
  return (
    <>
      {wave.map((h, i) => (
        // pointerEvents none: el toque llega siempre a la onda entera, no a la barra, y la posición es la de toda la onda
        <View key={i} pointerEvents="none" style={[s.bar, { height: `${Math.round(h * 100)}%`, backgroundColor: i < lit ? on : 'rgba(255,255,255,0.26)' }]} />
      ))}
    </>
  );
});

function Skip({ back }: { back?: boolean }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" style={back ? undefined : { transform: [{ scaleX: -1 }] }}>
      <Path d="M4 12a8 8 0 1 0 2.5-5.8M4 3v4h4" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlayGlyph({ playing, color }: { playing: boolean; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {playing ? (
        <>
          <Rect x={6} y={5} width={4.2} height={14} rx={1.5} fill={color} />
          <Rect x={13.8} y={5} width={4.2} height={14} rx={1.5} fill={color} />
        </>
      ) : (
        <Path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" fill={color} />
      )}
    </Svg>
  );
}

/** Reproductor completo: onda con progreso (tócala para saltar), tiempos, ±15 s, velocidad y transcripción. */
export function AudioPlayer({ title, player }: { title: string; player: NarrationPlayer }) {
  const p = usePalette();
  const wave = useMemo(() => waveFor(title), [title]);
  const [waveW, setWaveW] = useState(1);
  const [transcript, setTranscript] = useState(false);
  const progress = player.duration ? player.position / player.duration : 0;
  const lit = Math.round(progress * BARS);
  const nextRate = RATES[(RATES.indexOf(player.rate) + 1) % RATES.length];
  const rateText = (r: number) => String(r).replace('.', ',');
  const seekTo = (x: number) => player.seek(Math.max(0, Math.min(1, x / waveW)) * player.duration);

  return (
    <View style={[s.box, { backgroundColor: p.deep }]}>
      <View style={s.hd}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke={p.t2} strokeWidth={2.4} />
          <Rect x={3} y={14} width={5} height={7} rx={2} fill={p.t2} />
          <Rect x={16} y={14} width={5} height={7} rx={2} fill={p.t2} />
        </Svg>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Velocidad ${rateText(player.rate)} por`} accessibilityHint={`Cambia a ${rateText(nextRate)} por`} onPress={() => player.setRate(nextRate)} style={s.rate} hitSlop={6}>
          <Text style={s.rateText}>{String(player.rate).replace('.', ',')}×</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Posición del audio"
        accessibilityValue={{ min: 0, max: Math.round(player.duration), now: Math.round(player.position), text: `${fmt(player.position)} de ${fmt(player.duration)}` }}
        accessibilityActions={[{ name: 'increment', label: 'Adelantar 15 segundos' }, { name: 'decrement', label: 'Atrasar 15 segundos' }]}
        onAccessibilityAction={e => player.skip(e.nativeEvent.actionName === 'increment' ? 15 : -15)}
        onLayout={e => setWaveW(e.nativeEvent.layout.width || 1)}
        onPress={e => seekTo(e.nativeEvent.locationX)}
        style={s.wave}
      >
        <WaveBars wave={wave} lit={lit} on={p.t2} />
      </Pressable>
      <View style={s.times}>
        <Text style={s.time}>{fmt(player.position)}</Text>
        <Text style={s.time}>{fmt(player.duration)}</Text>
      </View>

      <View style={s.ctr}>
        <Pressable accessibilityRole="button" accessibilityLabel="Atrás 15 segundos" onPress={() => player.skip(-15)} hitSlop={8} style={s.skip}>
          <Skip back /><Text style={s.skipText}>15</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={player.playing ? 'Pausar' : 'Reproducir'} onPress={player.toggle} style={({ pressed }) => [s.big, { backgroundColor: p.t2, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
          <PlayGlyph playing={player.playing} color={neutral.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Adelante 15 segundos" onPress={() => player.skip(15)} hitSlop={8} style={s.skip}>
          <Skip /><Text style={s.skipText}>15</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setTranscript(v => !v)} style={s.trBtn}>
        <Text style={s.trBtnText}>{transcript ? 'Ocultar transcripción' : 'Ver transcripción'}</Text>
      </Pressable>
      {transcript && (
        <Text style={s.tr}>
          {player.sentences.map((t, i) => (
            <Text key={i} onPress={() => player.seek((player.starts[i] ?? 0) + 0.01)} style={i === player.index ? { color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' } : undefined}>{t} </Text>
          ))}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderRadius: 22, padding: 16 },
  hd: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: '#fff', fontFamily: font.black, fontSize: 15.5 },
  rate: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  rateText: { color: '#fff', fontFamily: font.black, fontSize: 12.5 },
  wave: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 14, marginBottom: 6 },
  bar: { flex: 1, borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontFamily: font.heavy, fontSize: 12, color: 'rgba(255,255,255,0.75)', fontVariant: ['tabular-nums'] },
  ctr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30, marginTop: 8 },
  skip: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { position: 'absolute', fontFamily: font.black, fontSize: 9, color: '#fff', top: 17 },
  big: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  trBtn: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  trBtnText: { fontFamily: font.heavy, fontSize: 13, color: 'rgba(255,255,255,0.85)', textDecorationLine: 'underline' },
  tr: { marginTop: 8, fontFamily: font.body, fontSize: 14.5, lineHeight: 22, color: 'rgba(255,255,255,0.62)' },
});
