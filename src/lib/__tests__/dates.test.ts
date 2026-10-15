import { describe, expect, it } from '@jest/globals';
import { completedPhrase } from '../dates';

describe('completedPhrase', () => {
  const now = new Date(2026, 9, 14, 18, 0);
  it('hoy', () => {
    expect(completedPhrase(new Date(2026, 9, 14, 9, 0).toISOString(), now)).toBe('Hoy he completado');
  });
  it('otro día del mismo año', () => {
    expect(completedPhrase(new Date(2026, 9, 3, 9, 0).toISOString(), now)).toBe('El 3 de octubre completé');
  });
  it('otro año', () => {
    expect(completedPhrase(new Date(2025, 11, 31, 9, 0).toISOString(), now)).toBe('El 31 de diciembre de 2025 completé');
  });
});
