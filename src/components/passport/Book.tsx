import { memo, useCallback, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { pageTurn } from '@/lib/feedback';
import { sheetFor } from '@/lib/sheet';
import { font } from '@/theme/fonts';

/** Pasar hoja con los botones: rotateY 0 → −180° sobre el lomo en 750 ms; arranca suave, se acelera y se posa */
const TURN_MS = 750;
/**
 * La hoja se curva como el papel: se parte en tramos (en fracciones del ancho,
 * del lomo al borde) unidos por bisagras. Cada bisagra dobla una parte de la
 * curva, más hacia el borde, que se queda atrás al levantarse la hoja.
 */
const SEGMENTS = [0.4, 0.3, 0.3];
const JOINTS = [0, 0.4, 0.6];
/** Las hojas que no pueden girar ahora van de una pieza: sin tramos, una sola copia de cada cara */
const WHOLE = [1];
/** Curva total del borde en el punto más alto del giro (grados) */
const BEND = { paper: 46, cover: 9 };
/** Distancia de la cámara en anchos de hoja: más cerca, más se acerca el borde de la hoja al levantarse */
const DEPTH = 3;
const EASE = Easing.bezier(0.42, 0.05, 0.2, 1);
/** La pista de «se puede pasar con el dedo» se enseña una vez por sesión */
let hinted = false;

export interface Leaf {
  key: string;
  front: ReactNode;
  back: ReactNode;
  /** Tapa de piel: apenas se curva al girar */
  stiff?: boolean;
}

interface Props {
  leaves: Leaf[];
  /** Ancho de una hoja */
  width: number;
  /** Doble página (pantallas anchas): el reverso de la hoja anterior a la izquierda */
  spread?: boolean;
  index: number;
  onIndex: (i: number) => void;
  /** Pestañas del canto para saltar a una hoja (una por ruta, del color de la ruta) */
  tabs?: BookTab[];
}

export interface BookTab {
  key: string;
  color: string;
  label: string;
  /** Posición de su hoja en `leaves` */
  index: number;
}

/** Ancho que sobresale el canto con las pestañas */
const TAB_W = 14;

/**
 * El pasaporte como libreta: las hojas giran sobre el borde izquierdo. Se
 * pasan arrastrando con el dedo (más del 30 % del ancho o soltando con
 * velocidad > 0,5 px/ms) o con los botones. Cada hoja tiene reverso de papel
 * y una sombra recorre la cara mientras gira.
 *
 * Qué hoja está pasada, cuál gira y en qué orden se apilan se decide en el
 * hilo de UI (indexSV, turningSV): si dependiera del render de React, al
 * terminar un giro la hoja volvería un instante a su sitio antes de que
 * llegase el índice nuevo.
 */
export function Book({ leaves, width, spread, index, onIndex, tabs }: Props) {
  const height = sheetFor(width).h;
  const reduced = useReducedMotion();
  const deg = useSharedValue(0);
  // Hoja que gira (−1 si ninguna) y hoja abierta, en el hilo de UI
  const turningSV = useSharedValue(-1);
  const indexSV = useSharedValue(index);
  const countSV = useSharedValue(leaves.length);
  /** 1 mientras el dedo arrastra una hoja */
  const dragSV = useSharedValue(0);
  const reducedSV = useSharedValue(reduced);
  useEffect(() => { reducedSV.set(reduced); }, [reduced, reducedSV]);
  useEffect(() => { indexSV.set(index); }, [index, indexSV]);
  useEffect(() => { countSV.set(leaves.length); }, [leaves.length, countSV]);

  // Fin del giro (en JS): avisa del índice nuevo; la libreta ya lo enseña desde el hilo de UI
  const settled = useCallback((next: number) => onIndex(next), [onIndex]);

  const flip = (dir: 1 | -1) => {
    // El índice del hilo de UI ya va por delante si un giro acaba de terminar
    const idx = indexSV.value;
    if (turningSV.value >= 0) return;
    if (dir === 1 && idx >= leaves.length - 1) return;
    if (dir === -1 && idx <= 0) return;
    const i = dir === 1 ? idx : idx - 1;
    deg.set(dir === 1 ? 0 : -180);
    turningSV.set(i);
    pageTurn();
    deg.set(withTiming(dir === 1 ? -180 : 0, { duration: reduced ? 0 : TURN_MS, easing: EASE }, done => {
      'worklet';
      land(i, dir, true);
    }));
  };

  // Salto a una hoja desde una pestaña: la vecina se pasa con el giro; las lejanas, directas
  const jump = (to: number) => {
    const idx = indexSV.value;
    if (turningSV.value >= 0 || to === idx || to < 0 || to >= leaves.length) return;
    if (Math.abs(to - idx) === 1) return flip(to > idx ? 1 : -1);
    pageTurn();
    indexSV.set(to);
    onIndex(to);
  };

  // Al posarse la hoja, el índice y la pila cambian en el mismo fotograma
  const land = (i: number, dir: number, complete: boolean) => {
    'worklet';
    if (turningSV.value !== i) return;
    const next = complete ? (dir === 1 ? i + 1 : i) : indexSV.value;
    indexSV.set(next);
    turningSV.set(-1);
    if (complete) scheduleOnRN(settled, next);
  };

  // Pista la primera vez: la esquina de la tapa se levanta un poco y vuelve
  useEffect(() => {
    if (hinted || reduced || index !== 0 || leaves.length < 2) return;
    const t = setTimeout(() => {
      if (hinted || turningSV.value >= 0) return;
      hinted = true;
      turningSV.set(0);
      deg.set(withSequence(
        withTiming(-24, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 640, easing: Easing.inOut(Easing.quad) }),
      ));
      // El aviso de fin de una animación dentro de withSequence no siempre llega: se cierra a tiempo fijo
      end = setTimeout(() => { deg.set(0); if (turningSV.value === 0) turningSV.set(-1); }, 1300);
    }, 700);
    let end: ReturnType<typeof setTimeout> | undefined;
    return () => { clearTimeout(t); clearTimeout(end); };
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-24, 24],
    onUpdate: e => {
      'worklet';
      // La dirección se decide con el primer movimiento claro (al activarse el gesto aún puede valer 0)
      if (!dragSV.value) {
        // Si una hoja está girando con los botones, el dedo espera
        if (turningSV.value >= 0 || Math.abs(e.translationX) < 8) return;
        const dir = e.translationX < 0 ? 1 : -1;
        const idx = indexSV.value;
        if ((dir === 1 && idx >= countSV.value - 1) || (dir === -1 && idx <= 0)) return;
        const i = dir === 1 ? idx : idx - 1;
        deg.set(dir === 1 ? 0 : -180);
        turningSV.set(i);
        dragSV.set(1);
      }
      const t = turningSV.value;
      // La hoja sigue al dedo; pasado el lomo, se curva un poco más deprisa
      const p = Math.min(1, Math.max(0, (t === indexSV.value ? -e.translationX : e.translationX) / width));
      const q = p < 0.5 ? p * 1.15 : 1 - (1 - p) * 0.85;
      deg.set(t === indexSV.value ? -180 * q : -180 * (1 - q));
    },
    onDeactivate: e => {
      'worklet';
      const t = turningSV.value;
      if (!dragSV.value || t < 0) return;
      dragSV.set(0);
      const dir = t === indexSV.value ? 1 : -1;
      const p = (dir === 1 ? -e.translationX : e.translationX) / width;
      const fling = (dir === 1 ? -e.velocityX : e.velocityX) / 1000;
      const complete = (p > 0.3 && fling > -0.3) || fling > 0.5;
      const target = dir === 1 ? (complete ? -180 : 0) : complete ? 0 : -180;
      if (complete) scheduleOnRN(pageTurn);
      // Al soltar, la hoja sigue con la velocidad del dedo y se asienta con un muelle
      if (reducedSV.get()) {
        deg.set(withTiming(target, { duration: 0 }, () => {
          'worklet';
          land(t, dir, complete);
        }));
        return;
      }
      deg.set(withSpring(target, { velocity: (e.velocityX / width) * 180, damping: 22, stiffness: 170, mass: 0.9, overshootClamping: true }, done => {
        'worklet';
        land(t, dir, complete);
      }));
    },
  });

  // Se montan la hoja actual y dos a cada lado: la siguiente ya está lista antes de girarla
  const visible = leaves.map((l, i) => ({ l, i })).filter(({ i }) => i >= index - (spread ? 3 : 2) && i <= index + 2);

  // Sombra que la hoja al girar proyecta sobre la de debajo
  const cast = useAnimatedStyle(() => {
    const a = -deg.value;
    return { opacity: turningSV.value >= 0 ? Math.sin((a * Math.PI) / 180) * 0.55 : 0 };
  });
  // Con una sola hoja en pantalla, la cámara acompaña a la que gira: la libreta se aleja
  // un poco y se desplaza hacia el lado del lomo para que se vea la hoja de pie y su vuelta
  const camera = useAnimatedStyle(() => {
    const a = !spread && !reducedSV.get() && turningSV.value >= 0 ? Math.sin((-deg.value * Math.PI) / 180) : 0;
    return { transform: [{ translateX: width * 0.12 * a }, { scale: 1 - a * 0.14 }] };
  });

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ width: (spread ? width * 2 : width) + (tabs?.length ? TAB_W : 0), height }}>
      <GestureDetector gesture={pan}>
        {/* Sin recortar: la hoja sale del lomo hacia el espectador y sigue más allá del borde */}
        <Animated.View style={[{ width: spread ? width * 2 : width, height }, camera]}>
          {visible.map(({ l, i }) => (
            // Solo se parten en tramos las dos hojas del lomo, las únicas que el próximo giro puede mover
            <Page key={l.key} i={i} strips={i >= index - 1 && i <= index} current={i === index} side={Math.sign(i - index)} deg={deg} turning={turningSV} index={indexSV} spread={!!spread} stiff={!!l.stiff} width={width} height={height} left={spread ? width : 0} back={l.back}>
              {l.front}
            </Page>
          ))}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: spread ? width : 0, top: 0, width, height, zIndex: 999 }, s.cast, cast]} />
        </Animated.View>
      </GestureDetector>
      {tabs?.map((t, n) => (
        <Pressable
          key={t.key}
          accessibilityRole="button"
          accessibilityLabel={`Ir a la hoja ${t.index + 1}: ${t.label}`}
          accessibilityState={{ selected: t.index === index }}
          hitSlop={{ top: 3, bottom: 3, left: 6, right: 10 }}
          onPress={() => jump(t.index)}
          style={[s.tab, { left: spread ? width * 2 : width, top: 34 + n * 38, backgroundColor: t.color, width: t.index === index ? TAB_W : TAB_W - 4 }]}
        />
      ))}
      </View>
      <View style={s.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hoja anterior" disabled={index === 0} onPress={() => flip(-1)} style={({ pressed }) => [s.navBtn, index === 0 && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Text style={s.navText}>‹ Anterior</Text>
        </Pressable>
        <Text style={s.navCount}>{index + 1} / {leaves.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Hoja siguiente" disabled={index >= leaves.length - 1} onPress={() => flip(1)} style={({ pressed }) => [s.navBtn, index >= leaves.length - 1 && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Text style={s.navText}>{index === 0 ? 'Abrir ›' : 'Siguiente ›'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface PageProps {
  i: number;
  deg: SharedValue<number>;
  turning: SharedValue<number>;
  index: SharedValue<number>;
  spread: boolean;
  stiff: boolean;
  strips: boolean;
  /** La hoja abierta: las demás se esconden a los lectores de pantalla */
  current: boolean;
  /** −1 ya pasada, 1 por pasar, 0 la abierta */
  side: number;
  width: number;
  height: number;
  left: number;
  back: ReactNode;
  children: ReactNode;
}

const Page = memo(function Page({ i, deg, turning, index, spread, stiff, strips, current, side, width, height, left, back, children }: PageProps) {
  const perspective = width * DEPTH;
  // Cada estilo lee los valores compartidos directamente: así Reanimated sabe de qué depende
  const leaf = useAnimatedStyle(() => {
    const t = turning.value === i;
    const flipped = i < index.value;
    const a = t ? deg.value : flipped ? -180 : 0;
    return {
      // Encima la que gira; luego las pasadas (la última arriba) y las por pasar (la siguiente arriba)
      zIndex: t ? 1000 : flipped ? i : 500 - i,
      // No se dibuja lo que no puede verse: con una sola hoja, las ya pasadas quedan fuera de
      // la pantalla; y debajo de la hoja de al lado (o de la anterior en doble página) no asoma nada
      opacity: !t && (i > index.value + 1 || i < index.value - (spread ? 2 : 0)) ? 0 : 1,
      transform: [{ perspective }, { rotateY: `${a}deg` }],
    };
  });
  const cuts = strips ? SEGMENTS : WHOLE;
  // Una hoja que no puede girar ahora solo enseña una cara: la otra ni se monta
  const front = strips || side > 0 ? children : null;
  const rear = strips || side < 0 ? back : null;
  const seg = { cuts, i, deg, turning, index, stiff, width, height, perspective, front, back: rear, layer: strips, touch: current };
  return (
    <Animated.View accessibilityElementsHidden={!current} importantForAccessibility={current ? 'auto' : 'no-hide-descendants'} style={[{ position: 'absolute', left, top: 0, width: edges(width, cuts)[1], height, transformOrigin: 'left center' }, leaf]}>
      <Segment k={0} {...seg} />
    </Animated.View>
  );
});

/** Bordes de los tramos en píxeles enteros, para que no se abran rendijas entre ellos */
function edges(width: number, cuts: number[]) {
  let acc = 0;
  return [0, ...cuts.map(f => Math.round((acc += f) * width))];
}

interface SegmentProps {
  /** Fracciones del ancho de cada tramo */
  cuts: number[];
  k: number;
  i: number;
  deg: SharedValue<number>;
  turning: SharedValue<number>;
  index: SharedValue<number>;
  stiff: boolean;
  width: number;
  height: number;
  perspective: number;
  front: ReactNode;
  back: ReactNode;
  /** Guardar las caras como textura: solo en las hojas que pueden girar (las demás no se mueven y la textura solo gasta memoria) */
  layer: boolean;
  /** Solo la hoja abierta recibe toques (sellos del pasaporte); las demás y los reversos los dejan pasar */
  touch: boolean;
}

/**
 * Un tramo de la hoja: recorta su franja del anverso y del reverso, y lleva
 * colgado el siguiente tramo de su borde derecho, doblado un poco más.
 */
const Segment = memo(function Segment({ cuts, k, i, deg, turning, index, stiff, width, height, perspective, front, back, layer, touch }: SegmentProps) {
  const e = edges(width, cuts);
  const x = e[k], w = e[k + 1] - x;
  const last = k === cuts.length - 1;
  // Curva de la hoja que gira: más al levantarse que al posarse, y nada en reposo.
  // Hacia delante el borde se queda atrás (menos girado); hacia atrás, igual en sentido contrario.
  // Las funciones reciben los valores ya leídos: cada estilo los lee directamente para que Reanimated sepa de qué depende
  const bend = (t: number, d: number, idx: number) => {
    'worklet';
    if (t !== i) return 0;
    const r = (-d * Math.PI) / 180;
    const lag = i === idx ? 1 : -1;
    return lag * (stiff ? BEND.cover : BEND.paper) * Math.sin(r) * (1 + 0.4 * Math.cos(r));
  };
  // Ángulo total de este tramo, para saber qué cara enseña y cuánta sombra lleva
  let share = 0;
  for (let j = 1; j <= k; j++) share += JOINTS[j];
  const angle = (t: number, d: number, idx: number) => {
    'worklet';
    return (t === i ? d : i < idx ? -180 : 0) + share * bend(t, d, idx);
  };
  const face = useAnimatedStyle(() => ({ opacity: angle(turning.value, deg.value, index.value) > -90 ? 1 : 0 }));
  const rear = useAnimatedStyle(() => ({ opacity: angle(turning.value, deg.value, index.value) > -90 ? 0 : 1 }));
  // Sombra que recorre la cara mientras gira: los tramos más doblados, algo más oscuros
  // Va aparte de la cara (que se guarda como textura) y solo sobre la cara que se ve
  const shade = useAnimatedStyle(() => {
    const t = turning.value;
    const a = angle(t, deg.value, index.value);
    return { opacity: t === i && a > -90 ? Math.min(1, Math.sin((-a * Math.PI) / 180) * 0.9) : 0 };
  });
  const shadeBack = useAnimatedStyle(() => {
    const t = turning.value;
    const a = angle(t, deg.value, index.value);
    return { opacity: t === i && a <= -90 ? interpolate(-a, [90, 180], [0.7, 0], 'clamp') : 0 };
  });
  const joint = useAnimatedStyle(() => ({ transform: [{ perspective }, { rotateY: `${last ? 0 : JOINTS[k + 1] * bend(turning.value, deg.value, index.value)}deg` }] }));
  // Cada franja solapa 1 px con la siguiente para que no se vea la costura
  const clip = { position: 'absolute', left: 0, top: 0, width: last ? w : w + 1, height, overflow: 'hidden' } as const;
  const sheet = { position: 'absolute', left: -x, top: 0, width, height } as const;
  // Cada cara se pinta una vez y se guarda como textura: al girar solo se mueve la textura, no se
  // vuelven a dibujar los SVG del papel y los sellos en cada fotograma
  return (
    <>
      <Animated.View pointerEvents={touch ? 'auto' : 'none'} style={[clip, face]} renderToHardwareTextureAndroid={layer} shouldRasterizeIOS={layer}>
        <View style={sheet}>{front}</View>
      </Animated.View>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[clip, rear]} renderToHardwareTextureAndroid={layer} shouldRasterizeIOS={layer}>
        <View style={[sheet, { transform: [{ scaleX: -1 }] }]}>{back}</View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[clip, shade]}>
        <View style={[sheet, s.shade]} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[clip, shadeBack]}>
        <View style={[sheet, s.shadeBack, { transform: [{ scaleX: -1 }] }]} />
      </Animated.View>
      {!last && (
        <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', left: w, top: 0, width: e[k + 2] - e[k + 1], height, transformOrigin: 'left center' }, joint]}>
          <Segment {...{ cuts, i, deg, turning, index, stiff, width, height, perspective, front, back, layer, touch }} k={k + 1} />
        </Animated.View>
      )}
    </>
  );
});

const s = StyleSheet.create({
  cast: { experimental_backgroundImage: 'linear-gradient(90deg, rgba(40,28,10,0.35), rgba(40,28,10,0) 55%)', borderRadius: 6 },
  shade: { experimental_backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.18), rgba(0,0,0,0) 40%)', borderRadius: 6 },
  shadeBack: { experimental_backgroundImage: 'linear-gradient(270deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 50%)', borderRadius: 6 },
  tab: { position: 'absolute', height: 30, borderTopRightRadius: 6, borderBottomRightRadius: 6, boxShadow: '1px 1px 3px rgba(0,0,0,0.25)', zIndex: 2000 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navBtn: { height: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(28,26,23,0.06)' },
  navText: { fontFamily: font.black, fontSize: 14, color: '#1c1a17' },
  navCount: { fontFamily: font.heavy, fontSize: 13, color: '#7d705a', fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'center' },
});
