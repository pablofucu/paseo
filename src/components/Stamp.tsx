import { useEffect, useMemo } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { SHAPE_FOR_KIND, type Stop, type Tour } from '@/data/types';
import { stampXml } from '@/lib/stamp';

interface Props {
  size: number;
  rotate?: number;
  /** Anima el golpe del tampón al montarse */
  slam?: boolean;
  delay?: number;
  style?: ViewStyle;
}

function StampView({ xml, size, rotate = 0, slam, delay = 0, style }: Props & { xml: string }) {
  const k = useSharedValue(slam ? 0 : 1);
  useEffect(() => {
    if (!slam) return;
    k.value = withDelay(delay, withSequence(
      withTiming(0.92, { duration: 380, easing: Easing.in(Easing.cubic) }),
      withSpring(1, { damping: 9, stiffness: 260 }),
    ));
  }, [slam, delay, k]);
  const anim = useAnimatedStyle(() => {
    const t = k.value;
    return {
      opacity: Math.min(1, t * 1.6),
      transform: [{ scale: 1 + (1 - t) * 1.8 }, { rotate: `${rotate - (1 - t) * 26}deg` }],
    };
  });
  return (
    <Animated.View style={[{ width: size, height: size }, anim, style]}>
      <SvgXml xml={xml} width={size} height={size} />
    </Animated.View>
  );
}

const ROTATIONS = [-8, 6, -5, 9, -3, 7];

/** Sello de una parada */
export function StopStamp({ stop, index, date, ghost, color, ...p }: Props & { stop: Stop; index: number; date: string; ghost?: boolean; color: string }) {
  const xml = useMemo(
    () => stampXml({ shape: SHAPE_FOR_KIND[stop.kind], pictogram: stop.pictogram, name: stop.stampLabel, sub: `PARADA ${index + 1} · ${date}`, color, ghost }),
    [stop, index, date, color, ghost],
  );
  return <StampView xml={xml} rotate={p.rotate ?? (ghost ? 0 : ROTATIONS[index % ROTATIONS.length])} {...p} />;
}

/** Sello grande del tour, al completar todas las paradas */
export function TourSeal({ tour, date, ghost, ...p }: Props & { tour: Tour; date: string; ghost?: boolean }) {
  const xml = useMemo(
    () => stampXml({ shape: 'round', pictogram: tour.stops[1]?.pictogram ?? tour.stops[0].pictogram, name: tour.city.toUpperCase(), sub: `${tour.stops.length} PARADAS · ${date}`, color: tour.palette.t, ghost }),
    [tour, date, ghost],
  );
  return <StampView xml={xml} rotate={p.rotate ?? -12} {...p} />;
}
