import { describe, expect, it } from '@jest/globals';
import { formatDuration } from '../duration';

describe('formatDuration', () => {
  it('minutos por debajo de la hora', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(59.6)).toBe('1 h');
  });
  it('horas y minutos con espacios duros', () => {
    expect(formatDuration(90)).toBe('1 h 30');
    expect(formatDuration(65)).toBe('1 h 05');
    expect(formatDuration(120)).toBe('2 h');
  });
  it('no se parte en líneas', () => {
    expect(formatDuration(90)).not.toContain(' ');
  });
});
