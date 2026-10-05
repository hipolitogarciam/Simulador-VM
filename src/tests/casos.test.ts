import { describe, expect, it } from 'vitest';
import { CASOS } from '../cases';
import { simularCaso } from '../cases/simularCaso';

describe('Casos clínicos', () => {
  it('hay casos y todos tienen identificadores únicos', () => {
    const ids = new Set(CASOS.map((c) => c.id));
    expect(ids.size).toBe(CASOS.length);
    expect(CASOS.length).toBeGreaterThan(0);
  });

  for (const caso of CASOS) {
    describe(`${caso.id} · ${caso.titulo}`, () => {
      it('tiene entre 5 y 8 pasos con 4 opciones y una sola correcta', () => {
        expect(caso.pasos.length).toBeGreaterThanOrEqual(5);
        expect(caso.pasos.length).toBeLessThanOrEqual(8);
        for (const paso of caso.pasos) {
          expect(paso.opciones.length).toBe(4);
          expect(paso.opciones.filter((o) => o.correcta).length).toBe(1);
          for (const o of paso.opciones) {
            expect(o.explicacion.length).toBeGreaterThan(20);
            expect(o.etiquetaTema.length).toBeGreaterThan(0);
          }
        }
        expect(caso.puntosClave.length).toBeGreaterThanOrEqual(3);
        expect(caso.puntosClave.length).toBeLessThanOrEqual(5);
        expect(caso.datos.talla).toBeGreaterThan(100);
      });

      it('no incluye dosis de fármacos', () => {
        const texto = JSON.stringify(caso);
        // Se permiten ml/kg (volumen corriente); se prohíben mg, mcg, µg y UI con número.
        expect(texto).not.toMatch(/\d+(?:[.,]\d+)?\s?(mg|mcg|µg|ug|UI)\s?\/\s?(kg|h|min)/i);
        expect(texto).not.toMatch(/\d+(?:[.,]\d+)?\s?(mg|mcg|µg|ug)\b/i);
      });

      const medidas = simularCaso(caso);
      it('tiene expectativas y todas se cumplen en el motor', () => {
        expect(caso.expectativas.length).toBeGreaterThanOrEqual(3);
        const fallos = caso.expectativas.filter((e) => {
          const m = medidas[e.paso];
          return !m || !e.comprobar(m, medidas);
        });
        expect(fallos.map((f) => `paso ${f.paso}: ${f.descripcion}`)).toEqual([]);
      });
    });
  }
});
