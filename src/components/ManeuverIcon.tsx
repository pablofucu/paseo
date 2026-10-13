import Svg, { Circle, Path } from 'react-native-svg';
import type { TurnDirection } from '@/lib/geo';

export type ManeuverKind = TurnDirection | 'straight' | 'arrive' | 'back' | 'wait';

/** Trazos de cada maniobra (viewBox 24×24); los giros fuertes son ángulos rectos y los ligeros, diagonales */
const PATHS: Record<Exclude<ManeuverKind, 'arrive' | 'wait'>, string[]> = {
  left: ['M15 21v-8a3 3 0 0 0-3-3H5', 'M8.5 6.5 5 10l3.5 3.5'],
  right: ['M9 21v-8a3 3 0 0 1 3-3h7', 'M15.5 6.5 19 10l-3.5 3.5'],
  'slight-left': ['M16 21v-6L8 7', 'M13.5 6.5H8V12'],
  'slight-right': ['M8 21v-6l8-8', 'M10.5 6.5H16V12'],
  uturn: ['M7 21V9.5a4.5 4.5 0 0 1 9 0V16', 'M12.5 12.5 16 16l3.5-3.5'],
  straight: ['M12 21V5', 'M6.5 10.5 12 5l5.5 5.5'],
  back: ['M5.5 12a7 7 0 1 0 2.2-5.1', 'M4.5 4v4.5H9'],
};

/** Icono de la indicación del paseo: giro, seguir recto, bandera de llegada, volver a la ruta o «buscando» */
export function ManeuverIcon({ kind, color, size = 32 }: { kind: ManeuverKind; color: string; size?: number }) {
  if (kind === 'arrive') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M6.5 21V4" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M6.5 5h11l-2.8 4 2.8 4h-11Z" fill={color} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'wait') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {[5.5, 12, 18.5].map(x => <Circle key={x} cx={x} cy={12} r={2.1} fill={color} />)}
      </Svg>
    );
  }
  const [body, head] = PATHS[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={body} fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={head} fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
