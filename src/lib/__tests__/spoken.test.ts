import { describe, expect, it } from '@jest/globals';
import { TOURS } from '@/data/tours';
import { numberToSpanish, romanToInt, stopScript, toSpeech, wayScript } from '../spoken';

describe('numberToSpanish', () => {
  it('escribe años y cifras', () => {
    expect(numberToSpanish(1749)).toBe('mil setecientos cuarenta y nueve');
    expect(numberToSpanish(1220)).toBe('mil doscientos veinte');
    expect(numberToSpanish(2016)).toBe('dos mil dieciséis');
    expect(numberToSpanish(1100)).toBe('mil cien');
    expect(numberToSpanish(1929)).toBe('mil novecientos veintinueve');
    expect(numberToSpanish(80)).toBe('ochenta');
    expect(numberToSpanish(100)).toBe('cien');
  });
});

describe('romanToInt', () => {
  it('lee romanos válidos', () => {
    expect(romanToInt('XVIII')).toBe(18);
    expect(romanToInt('XIX')).toBe(19);
    expect(romanToInt('XIII')).toBe(13);
    expect(romanToInt('IIII')).toBeNull();
    expect(romanToInt('')).toBeNull();
  });
});

describe('toSpeech', () => {
  it('convierte siglos, reyes y años', () => {
    expect(toSpeech('es del siglo XVIII')).toBe('es del siglo dieciocho');
    expect(toSpeech('En los siglos XVI y XVII')).toBe('En los siglos dieciséis y diecisiete');
    expect(toSpeech('Se empezó en 1749.')).toBe('Se empezó en mil setecientos cuarenta y nueve.');
    expect(toSpeech('Carlos III y Alfonso XIII')).toBe('Carlos tercero y Alfonso trece');
    expect(toSpeech('miden 80 metros')).toBe('miden ochenta metros');
  });
  it('deja el resto igual', () => {
    expect(toSpeech('La Giralda gira.')).toBe('La Giralda gira.');
    expect(toSpeech('a las 10:30')).toBe('a las 10:30');
  });
  it('ninguna ficha de ninguna ruta lleva cifras ni romanos al leerla', () => {
    for (const t of TOURS) {
      for (const st of t.stops) expect(stopScript(st)).not.toMatch(/\d|siglo [IVX]+\b/);
      for (const w of t.onTheWay) expect(wayScript(w)).not.toMatch(/\d|siglo [IVX]+\b/);
    }
  });
});
