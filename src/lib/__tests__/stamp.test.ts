import { describe, expect, it } from '@jest/globals';
import { stampXml } from '../stamp';

describe('stampXml', () => {
  it('coloca el pictograma con transform y sin <svg> anidados', () => {
    for (const shape of ['round', 'ticket', 'arch', 'postal', 'oval', 'chapa'] as const) {
      const xml = stampXml({ shape, pictogram: '<path d="M0 0 H60 V40 H0 Z" stroke="currentColor"/>', name: 'IGLESIA', sub: 'PARADA 3 · 10·10·26', color: '#B23A2E' });
      expect(xml.match(/<svg/g)).toHaveLength(1);
      expect(xml).toContain('transform="translate(');
      expect(xml).not.toContain('currentColor');
    }
  });
});
