import { describe, expect, it } from '@jest/globals';
import { duotoneMatrix } from '@/components/DuotoneImage';

const apply = (m: number[], [r, g, b]: number[]) => [0, 1, 2].map(i => m[i * 5] * r + m[i * 5 + 1] * g + m[i * 5 + 2] * b + m[i * 5 + 4]);

describe('duotoneMatrix', () => {
  it('lleva el negro al color oscuro y el blanco hacia el claro', () => {
    const m = duotoneMatrix('#000000', '#FFFFFF', 1, 0).split(' ').map(Number);
    expect(apply(m, [0, 0, 0])).toEqual([0, 0, 0]);
    apply(m, [1, 1, 1]).forEach(v => expect(v).toBeCloseTo(1, 3));
    const dark = duotoneMatrix('#4A1610', '#F3D99B').split(' ').map(Number);
    const out = apply(dark, [0.1, 0.1, 0.1]);
    expect(out[0]).toBeGreaterThan(out[2]); // las sombras quedan en el tono almagra
  });
});
