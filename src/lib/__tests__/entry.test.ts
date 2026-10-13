import { describe, expect, it } from '@jest/globals';
import { CONFIRM_RADIUS_M, entryMode, type EntryInput } from '../entry';

const base: EntryInput = { arrived: false, distance: 400, accuracy: 10, permission: 'granted', hasFix: true, noFix: false, source: 'gps' };
const mode = (o: Partial<EntryInput>) => entryMode({ ...base, ...o });

describe('entryMode', () => {
  it('con la llegada registrada es «here», pase lo que pase', () => {
    expect(mode({ arrived: true })).toBe('here');
    expect(mode({ arrived: true, permission: 'denied', distance: null })).toBe('here');
  });

  it('con GPS fiable y lejos es «far»', () => {
    expect(mode({})).toBe('far');
    expect(mode({ distance: CONFIRM_RADIUS_M + 1 })).toBe('far');
  });

  it('a menos de 150 m sin haber llegado pregunta', () => {
    expect(mode({ distance: CONFIRM_RADIUS_M })).toBe('confirm');
    expect(mode({ distance: 40 })).toBe('confirm');
  });

  it('con mala precisión pregunta, salvo si queda lejos incluso contando el error', () => {
    expect(mode({ accuracy: 60, distance: 200 })).toBe('confirm');
    expect(mode({ accuracy: 35, distance: 200 })).toBe('far');
    expect(mode({ accuracy: 60, distance: 400 })).toBe('far');
  });

  it('sin permiso o con la ubicación apagada pregunta', () => {
    expect(mode({ permission: 'denied', hasFix: false, distance: null })).toBe('confirm');
    expect(mode({ permission: 'unavailable', hasFix: false, distance: null })).toBe('confirm');
  });

  it('sin lectura del GPS pregunta solo pasado el tiempo de espera', () => {
    expect(mode({ hasFix: false, distance: null })).toBe('far');
    expect(mode({ hasFix: false, distance: null, noFix: true })).toBe('confirm');
  });

  it('el paseo simulado cuenta como GPS bueno', () => {
    expect(mode({ source: 'simulated', permission: 'denied', hasFix: false, accuracy: null })).toBe('far');
    expect(mode({ source: 'simulated', accuracy: null, distance: 80 })).toBe('confirm');
  });
});
