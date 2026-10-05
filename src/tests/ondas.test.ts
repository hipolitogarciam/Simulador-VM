import { describe, expect, it } from 'vitest';
import { avanzarCapno, ecg, paciente, pleth, type EstadoCapno } from '../engine';

/** Simula una espiración a flujo constante y devuelve el capnograma muestreado. */
function espirar(p: ReturnType<typeof paciente>, etco2: number, flujo = -0.4, dur = 2, pmus = 0, dt = 0.005): number[] {
  let s: EstadoCapno = { volEsp: 0, valor: 0 };
  const out: number[] = [];
  for (let t = 0; t < dur; t += dt) {
    s = avanzarCapno(s, flujo, etco2, p, pmus, dt);
    out.push(s.valor);
  }
  return out;
}

describe('Ondas · capnograma', () => {
  it('sube hasta una meseta cercana al EtCO2 y cae a 0 al empezar la inspiración', () => {
    const p = paciente({ R: 10, Rexp: 10 });
    const curva = espirar(p, 35);
    const final = curva[curva.length - 1] as number;
    expect(final).toBeGreaterThan(33);
    expect(final).toBeLessThan(40);
    // Fase I: los primeros ml (espacio muerto) salen sin CO2.
    expect(curva[10]).toBeLessThan(1);
    let s: EstadoCapno = { volEsp: 0.6, valor: final };
    for (let i = 0; i < 40; i++) s = avanzarCapno(s, 0.5, 35, p, 0, 0.005);
    expect(s.valor).toBeLessThan(1);
    expect(s.volEsp).toBe(0);
  });

  it('con obstrucción espiratoria la curva es una aleta de tiburón: ascenso más lento', () => {
    const normal = espirar(paciente({ R: 10, Rexp: 10 }), 40);
    const obstruido = espirar(paciente({ R: 32, Rexp: 60 }), 40);
    const forzado = espirar(paciente({ aletaTiburon: 1 }), 40);
    const i = Math.round(0.5 / 0.005); // a los 0,5 s (200 ml espirados)
    expect(obstruido[i] as number).toBeLessThan((normal[i] as number) * 0.85);
    expect(forzado[i] as number).toBeLessThan((normal[i] as number) * 0.85);
    // Pero al final de una espiración larga ambas se acercan al EtCO2.
    expect(obstruido[obstruido.length - 1] as number).toBeGreaterThan(30);
  });

  it('el esfuerzo inspiratorio del paciente durante la meseta produce una hendidura', () => {
    const p = paciente();
    const sinEsfuerzo = espirar(p, 35);
    const conEsfuerzo = espirar(p, 35, -0.4, 2, 8);
    const i = sinEsfuerzo.length - 1;
    expect(conEsfuerzo[i] as number).toBeLessThan((sinEsfuerzo[i] as number) * 0.8);
  });
});

describe('Ondas · ECG y pletismografía', () => {
  it('el ECG es periódico, con la R como máximo y la S como mínimo', () => {
    let max = -Infinity;
    let min = Infinity;
    let faseMax = 0;
    for (let f = 0; f < 1; f += 0.001) {
      const v = ecg(f, 75);
      if (v > max) {
        max = v;
        faseMax = f;
      }
      min = Math.min(min, v);
    }
    expect(max).toBeGreaterThan(0.85); // la R (1,0) menos la cola de Q y S
    expect(max).toBeLessThan(1.05);
    expect(faseMax).toBeCloseTo(0.25, 1);
    expect(min).toBeLessThan(-0.1); // onda S
    expect(ecg(0.3, 75)).toBeCloseTo(ecg(2.3, 75), 10);
    // Línea isoeléctrica entre T y P.
    expect(Math.abs(ecg(0.8, 75))).toBeLessThan(0.01);
    // Con FC alta los intervalos se comprimen: la R ocurre antes en la fase.
    let faseMaxRapido = 0;
    let maxRapido = -Infinity;
    for (let f = 0; f < 1; f += 0.001) {
      const v = ecg(f, 160);
      if (v > maxRapido) {
        maxRapido = v;
        faseMaxRapido = f;
      }
    }
    expect(faseMaxRapido).toBeLessThan(0.2);
    expect(maxRapido).toBeGreaterThan(0.6);
  });

  it('la pletismografía escala con la perfusión y tiene muesca dícrota', () => {
    let max = 0;
    for (let f = 0; f < 1; f += 0.001) max = Math.max(max, pleth(f, 1));
    expect(max).toBeCloseTo(1, 1);
    expect(pleth(0.15, 0.5)).toBeCloseTo(pleth(0.15, 1) / 2, 6);
    expect(pleth(0.15, 0)).toBe(0);
    // Muesca dícrota: en torno a la fase 0,42 la onda queda por encima del descenso exponencial puro.
    const descensoPuro = (f: number) => Math.exp(-(f - 0.15) / 0.28);
    expect(pleth(0.42, 1) - descensoPuro(0.42)).toBeGreaterThan(0.1);
    expect(pleth(0.3, 1) - descensoPuro(0.3)).toBeLessThan(0.01);
    expect(pleth(0.9, 1)).toBeLessThan(0.1);
  });
});
