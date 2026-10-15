import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Speech from 'expo-speech';
import { act, create } from 'react-test-renderer';
import { narrationMinutes, useNarrationPlayer, type NarrationPlayer } from '../useNarrationPlayer';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

/** Monta el reproductor y deja leer su último estado */
function mount(text: string, play = false) {
  const result: { current: NarrationPlayer } = { current: null as unknown as NarrationPlayer };
  function Probe({ text: t, play: p }: { text: string; play: boolean }) {
    result.current = useNarrationPlayer(t, p);
    return null;
  }
  let root!: ReturnType<typeof create>;
  act(() => { root = create(<Probe text={text} play={play} />); });
  return { result, rerender: (t: string, p: boolean) => act(() => { root.update(<Probe text={t} play={p} />); }) };
}

const A = 'La Giralda fue el alminar. Luego, campanario.';
const B = 'La Torre del Oro vigilaba el río. Tenía una cadena.';

describe('useNarrationPlayer', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.mocked(Speech.speak).mockClear(); });
  afterEach(() => { jest.useRealTimers(); });

  it('no suena solo si no se pide', () => {
    mount(A);
    act(() => { jest.runOnlyPendingTimers(); });
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('con otro guion vuelve al principio y, si se ha pedido, suena desde la primera frase', () => {
    const { result, rerender } = mount(A);
    act(() => { result.current.seek(result.current.starts[1]); });
    expect(result.current.index).toBe(1);
    rerender(B, true);
    act(() => { jest.runOnlyPendingTimers(); });
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(true);
    expect(Speech.speak).toHaveBeenLastCalledWith('La Torre del Oro vigilaba el río.', expect.anything());
  });
});

describe('narrationMinutes', () => {
  it('redondea y nunca baja de un minuto', () => {
    expect(narrationMinutes('Hola.')).toBe(1);
    expect(narrationMinutes('a'.repeat(14.5 * 60 * 4))).toBe(4);
  });
});
