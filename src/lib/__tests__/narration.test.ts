import { describe, expect, it, jest } from '@jest/globals';
import { splitSentences } from '../useNarrationPlayer';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

describe('splitSentences', () => {
  it('parte el guion en frases sin perder texto', () => {
    const text = 'La Giralda fue el alminar. ¿Sabías que se sube por rampas? Sí… para ir a caballo!';
    const s = splitSentences(text);
    expect(s).toEqual(['La Giralda fue el alminar.', '¿Sabías que se sube por rampas?', 'Sí…', 'para ir a caballo!']);
  });
});
