import { describe, expect, it, jest } from '@jest/globals';
import { splitSentences } from '../useNarrationPlayer';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

describe('splitSentences', () => {
  it('parte el guion en frases sin perder texto', () => {
    const text = 'La Giralda fue el alminar. ¿Sabías que se sube por rampas? Sí… para ir a caballo!';
    const s = splitSentences(text);
    expect(s).toEqual(['La Giralda fue el alminar.', '¿Sabías que se sube por rampas?', 'Sí…', 'para ir a caballo!']);
  });

  it('parte las frases largas por comas y puntos y coma, sin perder texto', () => {
    const text = 'La levantaron los almohades hacia el año doce veinte para vigilar el Guadalquivir, proteger el puerto y avisar de los barcos; formaba parte de la muralla que bajaba hasta el río.';
    const s = splitSentences(text);
    expect(s.length).toBeGreaterThan(1);
    expect(s.join(' ')).toBe(text);
    for (const t of s) expect(t.length).toBeGreaterThanOrEqual(25);
  });

  it('no parte las frases cortas aunque lleven comas', () => {
    expect(splitSentences('Mira, ahí está la torre.')).toEqual(['Mira, ahí está la torre.']);
  });
});
