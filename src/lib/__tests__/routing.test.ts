import { describe, expect, it } from '@jest/globals';
import { guide, instruction, prepareLeg } from '../guidance';
import { parseOsrm } from '../routing';

// Respuesta de OSRM recortada: un tramo con un giro a la izquierda a Calle Navarro Caro
const osrm = {
  code: 'Ok',
  routes: [{
    legs: [{
      steps: [
        { name: 'Calle de la Fuente', maneuver: { type: 'depart', location: [-6.0452, 37.374] }, geometry: { coordinates: [[-6.0452, 37.374], [-6.0452, 37.375]] } },
        { name: 'Calle Navarro Caro', maneuver: { type: 'turn', modifier: 'left', location: [-6.0452, 37.375] }, geometry: { coordinates: [[-6.0452, 37.375], [-6.0469, 37.375]] } },
        { name: '', maneuver: { type: 'arrive', location: [-6.0469, 37.375] }, geometry: { coordinates: [[-6.0469, 37.375], [-6.0469, 37.375]] } },
      ],
    }],
  }],
};

describe('routing', () => {
  it('une las geometrías de los pasos y extrae los giros con su calle', () => {
    const [leg] = parseOsrm(osrm as never);
    expect(leg.line).toEqual([[-6.0452, 37.374], [-6.0452, 37.375], [-6.0469, 37.375]]);
    expect(leg.steps).toEqual([{ location: [-6.0452, 37.375], direction: 'left', street: 'Calle Navarro Caro' }]);
  });

  it('las indicaciones nombran la calle', () => {
    const [r] = parseOsrm(osrm as never);
    const leg = prepareLeg(r.line, r.steps);
    const g = guide(leg, [-6.0452, 37.3742]);
    expect(instruction(g, 'la iglesia').text).toBe('Gira a la izquierda en Calle Navarro Caro');
  });

  it('rechaza respuestas sin ruta', () => {
    expect(() => parseOsrm({ code: 'NoRoute' })).toThrow('NoRoute');
  });
});
