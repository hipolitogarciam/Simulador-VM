import { describe, expect, it } from 'vitest';
import {
  avanzarGases,
  factorFugaCapno,
  fio2AlveolarEquilibrio,
  gasesIniciales,
  gradienteCO2,
  medidasIniciales,
  paciente,
  paco2Equilibrio,
  pao2DesdeSaturacion,
  pao2Equilibrio,
  respirador,
  saturacion,
  ventilacionAlveolar,
  type Medidas,
} from '../engine';

/** Medidas de un ciclo "normal": VTE 500 ml, FR 15, sin fuga. */
function medidas(cambios: Partial<Medidas> = {}): Medidas {
  return { ...medidasIniciales(), vte: 0.5, vti: 0.5, vtPulmon: 0.5, frTotal: 15, ...cambios };
}

describe('Gases · curva de disociación', () => {
  it('la saturación es monótona creciente y pasa por los puntos clásicos', () => {
    let previa = 0;
    for (let p = 1; p <= 600; p += 1) {
      const s = saturacion(p);
      expect(s).toBeGreaterThanOrEqual(previa);
      previa = s;
    }
    expect(saturacion(27)).toBeGreaterThan(45);
    expect(saturacion(27)).toBeLessThan(55);
    expect(saturacion(60)).toBeGreaterThan(88);
    expect(saturacion(60)).toBeLessThan(92);
    expect(saturacion(100)).toBeGreaterThan(96);
    expect(saturacion(500)).toBeGreaterThan(99.9);
  });

  it('pao2DesdeSaturacion invierte a saturacion', () => {
    for (const p of [30, 45, 60, 80, 100, 150]) {
      expect(Math.abs(pao2DesdeSaturacion(saturacion(p)) - p)).toBeLessThan(0.01);
    }
  });
});

describe('Gases · PaCO2', () => {
  it('la ventilación alveolar descuenta el espacio muerto y usa el volumen que entra en el pulmón', () => {
    const p = paciente({ espacioMuerto: 0.15 });
    expect(ventilacionAlveolar(medidas(), p)).toBeCloseTo((0.5 - 0.15) * 15, 5);
    // Con fuga: VTE medido 0,3 pero al pulmón entran 0,5.
    expect(ventilacionAlveolar(medidas({ vte: 0.3 }), p)).toBeCloseTo((0.5 - 0.15) * 15, 5);
    // Sin dato de pulmón se usa el VTE.
    expect(ventilacionAlveolar(medidas({ vtPulmon: 0, vte: 0.4 }), p)).toBeCloseTo((0.4 - 0.15) * 15, 5);
  });

  it('PaCO2 de equilibrio = 0,863·VCO2/VA y se reduce a la mitad al doblar la VA', () => {
    const p = paciente({ vco2: 200, espacioMuerto: 0.15 });
    const normal = paco2Equilibrio(medidas(), p);
    expect(normal).toBeCloseTo((0.863 * 200) / ((0.5 - 0.15) * 15), 3);
    const doble = paco2Equilibrio(medidas({ frTotal: 30 }), p);
    expect(doble).toBeCloseTo(normal / 2, 3);
  });

  it('PaCO2 de equilibrio queda acotada entre 15 y 150 (apnea)', () => {
    const p = paciente();
    expect(paco2Equilibrio(medidas({ vte: 0, vtPulmon: 0, frTotal: 0 }), p)).toBe(150);
    expect(paco2Equilibrio(medidas({ vte: 1, vtPulmon: 1, frTotal: 60 }), p)).toBe(15);
  });

  it('el gradiente PaCO2–EtCO2 sube con la fracción de espacio muerto y con el bajo gasto', () => {
    const p = paciente({ espacioMuerto: 0.15 });
    const base = gradienteCO2(p, medidas(), 1);
    expect(base).toBeCloseTo(4, 5);
    expect(gradienteCO2(p, medidas({ vte: 0.25 }), 1)).toBeGreaterThan(base + 5);
    expect(gradienteCO2(p, medidas(), 0.5)).toBeCloseTo(base + 6, 5);
  });
});

describe('Gases · PaO2 por shunt', () => {
  it('más shunt baja la PaO2; más FiO2 la sube', () => {
    const r = respirador({ fio2: 0.5, peep: 5 });
    const sano = pao2Equilibrio(paciente({ shunt: 0.05 }), r, 40, 1);
    const shunt = pao2Equilibrio(paciente({ shunt: 0.3 }), r, 40, 1);
    expect(shunt).toBeLessThan(sano * 0.5);
    const masO2 = pao2Equilibrio(paciente({ shunt: 0.3 }), respirador({ fio2: 1.0 }), 40, 1);
    expect(masO2).toBeGreaterThan(shunt);
  });

  it('la PEEP recluta según la reclutabilidad y el bajo gasto empeora la oxigenación', () => {
    const p = paciente({ shunt: 0.35, reclutabilidad: 0.04 });
    const peep5 = pao2Equilibrio(p, respirador({ fio2: 0.6, peep: 5 }), 40, 1);
    const peep14 = pao2Equilibrio(p, respirador({ fio2: 0.6, peep: 14 }), 40, 1);
    expect(peep14).toBeGreaterThan(peep5 + 10);
    const sinReclutar = paciente({ shunt: 0.35, reclutabilidad: 0 });
    expect(pao2Equilibrio(sinReclutar, respirador({ fio2: 0.6, peep: 14 }), 40, 1)).toBeCloseTo(
      pao2Equilibrio(sinReclutar, respirador({ fio2: 0.6, peep: 5 }), 40, 1),
      3,
    );
    expect(pao2Equilibrio(p, respirador({ fio2: 0.6, peep: 5 }), 40, 0.5)).toBeLessThan(peep5);
  });

  it('resuelve exactamente la ecuación de contenidos y queda acotada', () => {
    const p = paciente({ shunt: 0.15, hb: 14 });
    const r = respirador({ fio2: 0.4, peep: 5 });
    const pao2 = pao2Equilibrio(p, r, 40, 1);
    // Reconstruir CaO2 a partir del resultado y comprobar la ecuación de mezcla.
    const pAlv = 0.4 * 713 - 40 / 0.8;
    const cc = 1.34 * 14 * (saturacion(pAlv) / 100) + 0.003 * pAlv;
    const ca = cc - (5 * 0.15) / 0.85;
    expect(1.34 * 14 * (saturacion(pao2) / 100) + 0.003 * pao2).toBeCloseTo(ca, 4);
    expect(pao2Equilibrio(paciente({ shunt: 0 }), respirador({ fio2: 1 }), 20, 1.2)).toBe(650);
    expect(pao2Equilibrio(paciente({ shunt: 0.9 }), respirador({ fio2: 0.21 }), 100, 0.3)).toBe(20);
  });
});

describe('Gases · capnografía y fuga', () => {
  it('el factor de fuga es 1 sin fuga, intermedio con fuga y 0 en desconexión o extubación', () => {
    expect(factorFugaCapno(paciente(), medidas())).toBeCloseTo(1, 5);
    const conFuga = factorFugaCapno(paciente({ fuga: 0.02 }), medidas({ vte: 0.4 }));
    expect(conFuga).toBeGreaterThan(0.6);
    expect(conFuga).toBeLessThan(1);
    expect(factorFugaCapno(paciente({ fuga: 0.1 }), medidas({ vte: 0.12 }))).toBeLessThan(0.4);
    expect(factorFugaCapno(paciente({ fuga: 5 }), medidas())).toBe(0);
    expect(factorFugaCapno(paciente({ extubado: true }), medidas())).toBe(0);
  });
});

describe('Gases · integración temporal', () => {
  it('la PaCO2 y la SpO2 tienden exponencialmente a su equilibrio con su τ', () => {
    const p = paciente({ tauCO2: 60, tauSpO2: 45, shunt: 0.3 });
    const r = respirador({ fio2: 0.5 });
    let g = gasesIniciales();
    const eqCO2 = paco2Equilibrio(medidas({ frTotal: 8 }), p);
    expect(eqCO2).toBeGreaterThan(60);
    const g1 = avanzarGases(g, p, r, medidas({ frTotal: 8 }), 1, 60);
    // Tras una τ se recorre el 63 % de la distancia.
    expect(g1.paco2).toBeCloseTo(40 + (eqCO2 - 40) * (1 - Math.exp(-1)), 3);
    for (let i = 0; i < 20; i++) g = avanzarGases(g, p, r, medidas({ frTotal: 8 }), 1, 60);
    expect(g.paco2).toBeCloseTo(eqCO2, 1);
    expect(g.spo2).toBeLessThan(97);
    expect(g.etco2).toBeLessThan(g.paco2);
    expect(g.pao2).toBeCloseTo(pao2DesdeSaturacion(g.spo2), 2);
  });

  it('integrar en un paso de 50 ms equivale a diez pasos de 5 ms (objetivos constantes)', () => {
    const p = paciente({ shunt: 0.2 });
    const r = respirador({ fio2: 0.4 });
    const m = medidas({ frTotal: 10 });
    let fino = gasesIniciales();
    for (let i = 0; i < 10; i++) fino = avanzarGases(fino, p, r, m, 0.9, 0.005);
    const grueso = avanzarGases(gasesIniciales(), p, r, m, 0.9, 0.05);
    expect(grueso.paco2).toBeCloseTo(fino.paco2, 6);
    expect(grueso.spo2).toBeCloseTo(fino.spo2, 6);
    expect(grueso.fio2Alv).toBeCloseTo(fino.fio2Alv as number, 6);
  });

  it('los objetivos directos (gases de un caso) sustituyen al modelo', () => {
    const p = paciente();
    const r = respirador();
    let g = gasesIniciales();
    for (let i = 0; i < 600; i++) g = avanzarGases(g, p, r, medidas(), 1, 1, { paco2: 70, spo2: 86 });
    expect(g.paco2).toBeCloseTo(70, 1);
    expect(g.spo2).toBeCloseTo(86, 1);
    expect(g.etco2).toBeLessThan(70);
  });

  it('en apnea la FiO2 alveolar decae hacia 0,08 y al ventilar se recupera', () => {
    const p = paciente();
    const r = respirador({ fio2: 0.5 });
    const apnea = medidas({ vte: 0, vtPulmon: 0, frTotal: 0 });
    expect(fio2AlveolarEquilibrio(apnea, p, r)).toBe(0.08);
    expect(fio2AlveolarEquilibrio(medidas(), p, r)).toBe(0.5);
    let g = gasesIniciales();
    for (let i = 0; i < 120; i++) g = avanzarGases(g, p, r, apnea, 1, 1);
    expect(g.fio2Alv as number).toBeLessThan(0.2);
    expect(g.spo2).toBeLessThan(90);
    for (let i = 0; i < 30; i++) g = avanzarGases(g, p, r, medidas(), 1, 1);
    expect(g.fio2Alv as number).toBeGreaterThan(0.47); // τ de recuperación 10 s
    for (let i = 0; i < 200; i++) g = avanzarGases(g, p, r, medidas(), 1, 1);
    expect(g.spo2).toBeGreaterThan(95); // τ de la SpO2 45 s
  });
});
