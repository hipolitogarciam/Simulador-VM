import { describe, expect, it } from 'vitest';
import { avanzarHemo, gastoRelativo, hemoInicial, medidasIniciales, objetivosHemo, paciente, type Medidas } from '../engine';

function medidas(pmedia: number): Medidas {
  return { ...medidasIniciales(), pmedia };
}

describe('Hemodinámica', () => {
  it('parte de los valores basales del paciente', () => {
    const p = paciente({ tasBase: 118, tadBase: 72, fcBase: 95 });
    expect(hemoInicial(p)).toEqual({ tas: 118, tad: 72, fc: 95 });
  });

  it('con presión media ≤ 8 y sin auto-PEEP la TA es la basal', () => {
    const p = paciente();
    expect(objetivosHemo(p, medidas(8), 0, 97)).toEqual({ tas: p.tasBase, tad: p.tadBase, fc: p.fcBase });
    expect(objetivosHemo(p, medidas(5), 0, 97).tas).toBe(p.tasBase);
  });

  it('la TAS cae con la presión media y con la auto-PEEP según la sensibilidad, y la FC compensa', () => {
    const p = paciente({ sensibilidadPrecarga: 2, tasBase: 120, fcBase: 80 });
    const o = objetivosHemo(p, medidas(18), 4, 97);
    expect(o.tas).toBeCloseTo(120 - 2 * (10 + 1.5 * 4), 6);
    expect(o.fc).toBeCloseTo(80 + 0.9 * (120 - o.tas), 6);
    expect(o.tad).toBeLessThan(p.tadBase);
    expect(o.tad).toBeGreaterThan(p.tadBase * 0.4);
  });

  it('la compresión mediastínica (neumotórax a tensión) hunde la TA', () => {
    const p = paciente({ tasBase: 120 });
    const o = objetivosHemo(p, medidas(8), 0, 97);
    const tension = objetivosHemo({ ...p, compresionMediastinica: 0.6 }, medidas(8), 0, 97);
    expect(tension.tas).toBeCloseTo(o.tas - 55 * 0.6, 6);
    expect(tension.fc).toBeGreaterThan(o.fc + 20);
  });

  it('la hipoxemia sube la FC y los valores quedan acotados', () => {
    const p = paciente({ fcBase: 80 });
    expect(objetivosHemo(p, medidas(8), 0, 80).fc).toBeCloseTo(80 + 12, 6);
    expect(objetivosHemo(p, medidas(8), 0, 95).fc).toBe(80);
    const extremo = objetivosHemo(paciente({ sensibilidadPrecarga: 10, compresionMediastinica: 1 }), medidas(40), 15, 50);
    expect(extremo.tas).toBe(40);
    expect(extremo.tad).toBeGreaterThanOrEqual(20);
    expect(extremo.fc).toBe(180);
  });

  it('avanzarHemo converge exponencialmente con τ = 15 s', () => {
    const objetivo = { tas: 80, tad: 50, fc: 120 };
    let h = { tas: 120, tad: 75, fc: 80 };
    h = avanzarHemo(h, objetivo, 15);
    expect(h.tas).toBeCloseTo(120 + (80 - 120) * (1 - Math.exp(-1)), 6);
    for (let i = 0; i < 10; i++) h = avanzarHemo(h, objetivo, 15);
    expect(h.tas).toBeCloseTo(80, 1);
    expect(h.fc).toBeCloseTo(120, 1);
    // τ configurable.
    const rapido = avanzarHemo({ tas: 120, tad: 75, fc: 80 }, objetivo, 1, 1);
    expect(rapido.tas).toBeCloseTo(120 + (80 - 120) * (1 - Math.exp(-1)), 6);
  });

  it('el gasto relativo sigue a la TA media y queda entre 0,3 y 1,2', () => {
    const p = paciente({ tasBase: 120, tadBase: 75 });
    expect(gastoRelativo({ tas: 120, tad: 75, fc: 80 }, p)).toBeCloseTo(1, 6);
    expect(gastoRelativo({ tas: 60, tad: 37.5, fc: 80 }, p)).toBeCloseTo(0.5, 6);
    expect(gastoRelativo({ tas: 20, tad: 10, fc: 80 }, p)).toBe(0.3);
    expect(gastoRelativo({ tas: 200, tad: 150, fc: 80 }, p)).toBe(1.2);
  });
});
