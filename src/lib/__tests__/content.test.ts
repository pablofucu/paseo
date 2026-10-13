import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAMP_ART } from '@/data/stamps/images';
import { LOCKED_TOURS, TOURS } from '@/data/tours';
import { creditPending } from '@/data/types';
import { distance } from '@/lib/geo';

/** Cuánto se puede alejar una parada del extremo de su tramo (el router la coloca en la calle más cercana) */
const MAX_M = 40;
const root = join(__dirname, '../../..');

describe('contenido de las rutas', () => {
  it('los tours de pago con sello dibujado lo tienen también en blanco y negro', () => {
    for (const t of LOCKED_TOURS.filter(l => l.stamp)) {
      expect(existsSync(join(root, 'assets/route-stamps/gray', `${t.id}.png`))).toBe(true);
    }
  });


  for (const tour of TOURS) {
    describe(tour.id, () => {
      it('tiene sello de ruta y postal', () => {
        expect(tour.stamp.art).toBeTruthy();
        expect(tour.stamp.symbol.length).toBeGreaterThan(10);
        expect(tour.postcard.art).toBeTruthy();
        expect(tour.postcard.value).toBeTruthy();
        expect(tour.postcard.subtitle).toBeTruthy();
      });

      it('tiene su sello de ruta en blanco y negro (scripts/shrink-assets.py)', () => {
        expect(existsSync(join(root, 'assets/route-stamps/gray', `${tour.id}.png`))).toBe(true);
      });

      it('cada parada tiene sello de goma, foto, miniatura y crédito (o «pendiente»)', () => {
        for (const st of tour.stops) {
          expect(STAMP_ART[st.id]).toBeTruthy();
          expect(st.photo).toBeTruthy();
          expect(st.thumb).toBeTruthy();
          expect(st.photoCredit).toBeTruthy();
          if (!creditPending(st.photoCredit)) {
            expect(st.photoCredit.author).toBeTruthy();
            expect(st.photoCredit.license).toBeTruthy();
            expect(st.photoCredit.source).toMatch(/^https:\/\//);
          }
        }
      });

      it('las fotos antiguas («Así era») son de dominio público y anteriores a 1940', () => {
        for (const st of tour.stops.filter(x => x.then)) {
          const t = st.then!;
          expect(t.photo).toBeTruthy();
          expect(t.title).toBeTruthy();
          expect(t.text).toBeTruthy();
          expect(t.year).toBeGreaterThanOrEqual(1839);
          expect(t.year).toBeLessThanOrEqual(1940);
          expect(t.credit.license).toMatch(/public domain|^pd|cc0/i);
          expect(t.credit.source).toMatch(/^https:\/\//);
        }
      });

      it('los archivos de foto y miniatura existen', () => {
        const file = { 'tomares-4-paradas': 'tomares', 'sevilla-centro': 'sevilla' }[tour.id] ?? tour.id;
        const src = readFileSync(join(root, 'src/data/tours', `${file}.ts`), 'utf8');
        const paths = [...src.matchAll(/require\('([^']*assets\/tours\/[^']+\.jpg)'\)/g)].map(m => join(root, 'src/data/tours', m[1]));
        // Foto y miniatura de cada parada, más las fotos antiguas de «Así era»
        expect(paths.length).toBe(tour.stops.length * 2 + tour.stops.filter(st => st.then).length);
        for (const f of paths) expect({ f, existe: existsSync(f) }).toEqual({ f, existe: true });
      });

      it('las coordenadas están a menos de 40 m del extremo de su tramo', () => {
        tour.stops.forEach((st, i) => {
          if (i > 0) expect(distance(st.coord, tour.legs[i - 1].at(-1)!)).toBeLessThan(MAX_M);
          if (i < tour.legs.length) expect(distance(st.coord, tour.legs[i][0])).toBeLessThan(MAX_M);
        });
        expect(tour.legs.length).toBe(tour.stops.length - 1);
      });

      it('cada «de camino» tiene historia y cuelga de una parada con tramo', () => {
        for (const w of tour.onTheWay) {
          expect((w.spoken ?? w.story ?? '').length).toBeGreaterThan(20);
          expect(w.afterStop).toBeGreaterThanOrEqual(0);
          expect(w.afterStop).toBeLessThan(tour.stops.length - 1);
        }
      });

      it('las fichas tienen todos los textos', () => {
        for (const st of tour.stops) {
          for (const k of ['arriveHint', 'audioTitle', 'p1', 'look', 'p2', 'fact'] as const) expect(st[k].trim().length).toBeGreaterThan(5);
          expect(st.captions.length).toBeGreaterThan(0);
        }
      });
    });
  }
});
