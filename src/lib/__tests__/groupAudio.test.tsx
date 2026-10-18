import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, create } from 'react-test-renderer';
import { useGroupAudio, type GroupAudio } from '../group/useGroupAudio';
import type { AudioState } from '../group/protocol';
import { useNarrationPlayer } from '../useNarrationPlayer';
import { useGroup } from '@/store/group';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('../../../modules/paseo-ble', () => ({ isAvailable: () => false }));

const TEXT = 'La Giralda fue el alminar de la mezquita mayor. Luego fue campanario de la catedral. Arriba está el Giraldillo, que gira con el viento.';

function mount(key: string) {
  const result: { current: GroupAudio } = { current: null as unknown as GroupAudio };
  function Probe() {
    result.current = useGroupAudio(useNarrationPlayer(TEXT), key);
    return null;
  }
  act(() => { create(<Probe />); });
  return result;
}

const setGroupAudio = (audio: AudioState | null) =>
  act(() => {
    useGroup.setState({
      role: 'guest', tourId: 'sevilla-centro', status: 'connected',
      state: { v: 1, k: 'state', seq: Date.now(), tourId: 'sevilla-centro', host: { id: 'HOST0001', name: 'Ana' }, members: [], target: 0, arrived: null, audio, ended: false },
    });
  });

describe('useGroupAudio en el invitado', () => {
  beforeEach(() => { jest.useFakeTimers(); useGroup.setState({ adrift: false }); });
  afterEach(() => { act(() => { useGroup.setState({ role: null, state: null, adrift: false }); }); jest.useRealTimers(); });

  it('sigue al anfitrión: suena, salta a su posición y se para', () => {
    const r = mount('stop:giralda');
    setGroupAudio({ key: 'stop:giralda', playing: true, position: 0, rate: 1, at: Date.now() });
    expect(r.current.following).toBe(true);
    expect(r.current.player.playing).toBe(true);
    expect(r.current.player.index).toBe(0);
    // El anfitrión va ya por la última frase
    setGroupAudio({ key: 'stop:giralda', playing: true, position: r.current.player.starts[2] + 0.5, rate: 1, at: Date.now() });
    expect(r.current.player.index).toBe(2);
    setGroupAudio({ key: 'stop:giralda', playing: false, position: r.current.player.starts[2] + 1, rate: 1, at: Date.now() });
    expect(r.current.player.playing).toBe(false);
  });

  it('otra pista no se toca; si el invitado toca, va a su aire hasta volver al ritmo', () => {
    const r = mount('stop:catedral');
    setGroupAudio({ key: 'stop:giralda', playing: true, position: 0, rate: 1, at: Date.now() });
    expect(r.current.following).toBe(false);
    expect(r.current.player.playing).toBe(false);
    expect(r.current.groupKey).toBe('stop:giralda');

    const s = mount('stop:giralda');
    expect(s.current.player.playing).toBe(true);
    act(() => { s.current.player.pause(); });
    expect(s.current.adrift).toBe(true);
    expect(s.current.player.playing).toBe(false);
    act(() => { s.current.rejoin(); });
    expect(s.current.adrift).toBe(false);
    expect(s.current.player.playing).toBe(true);
  });
});
