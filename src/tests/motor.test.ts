import { describe, expect, it } from 'vitest';
import { paciente, respirador, simular } from '../engine';

const cerca = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.abs(b);

describe('Motor fisiológico · VC', () => {
  it('Ppico − Pplat ≈ flujo × R y Vt/(Pplat − PEEP) ≈ C (5 %)', () => {
    const p = paciente({ R: 10, C: 0.05 });
    const r = respirador({ modo: 'VC', vt: 0.5, flujo: 0.5, fr: 15, peep: 5 });
    const { medidas: m } = simular(p, r);
    expect(m.pplat).not.toBeNull();
    expect(m.peepTotal).not.toBeNull();
    const gradiente = m.ppico - (m.pplat as number);
    expect(cerca(gradiente, r.flujo * p.R, 0.05)).toBe(true);
    const c = m.vti / ((m.pplat as number) - (m.peepTotal as number));
    expect(cerca(c, p.C, 0.05)).toBe(true);
    expect(cerca(m.vte, 0.5, 0.03)).toBe(true);
  });

  it('Resistencia alta (secreciones): sube Ppico y la Pplat no cambia', () => {
    const r = respirador({ modo: 'VC' });
    const base = simular(paciente({ R: 10 }), r).medidas;
    const sec = simular(paciente({ R: 18, secreciones: 0.12 }), r).medidas;
    expect(sec.ppico).toBeGreaterThan(base.ppico + 3);
    expect(Math.abs((sec.pplat as number) - (base.pplat as number))).toBeLessThan(1);
    expect(sec.resistencia as number).toBeGreaterThan(15);
  });

  it('Intubación selectiva (C ≈ ½): sube la Pplat y el gradiente no cambia', () => {
    const r = respirador({ modo: 'VC' });
    const base = simular(paciente({ C: 0.05 }), r).medidas;
    const sel = simular(paciente({ C: 0.025 }), r).medidas;
    expect(sel.pplat as number).toBeGreaterThan((base.pplat as number) + 8);
    expect(Math.abs((sel.gradiente as number) - (base.gradiente as number))).toBeLessThan(1);
  });
});

describe('Motor fisiológico · PC', () => {
  it('Vt ≈ ΔP · C · (1 − e^(−Ti/τ))', () => {
    const p = paciente({ R: 10, C: 0.05 });
    const r = respirador({ modo: 'PC', deltaP: 10, ti: 1.2, fr: 15, peep: 5 });
    const { medidas: m } = simular(p, r);
    const tau = p.R * p.C;
    const esperado = r.deltaP * p.C * (1 - Math.exp(-r.ti / tau));
    expect(cerca(m.vti, esperado, 0.06)).toBe(true);
  });

  it('En PC con C a la mitad el Vt cae', () => {
    const r = respirador({ modo: 'PC', deltaP: 12, ti: 1.0 });
    const base = simular(paciente({ C: 0.05 }), r).medidas;
    const sel = simular(paciente({ C: 0.025 }), r).medidas;
    expect(sel.vte).toBeLessThan(base.vte * 0.6);
  });
});

describe('Motor fisiológico · auto-PEEP', () => {
  it('Auto-PEEP > 0 con Te < 2τ (Rexp alta) y ≈ 0 con Te > 5τ', () => {
    const obst = paciente({ R: 32, Rexp: 60, C: 0.05 }); // τesp = 3 s
    const corto = respirador({ modo: 'VC', vt: 0.5, flujo: 0.5, fr: 23, peep: 5 }); // Te ≈ 1,6 s
    const res = simular(obst, corto, { nCiclos: 20 });
    expect(res.autoPeepReal).toBeGreaterThan(2);
    expect(res.medidas.autoPeep as number).toBeGreaterThan(2);
    expect(res.flujoFinEsp).toBeLessThan(-0.02);
    const normal = paciente({ R: 10, Rexp: 10, C: 0.05 }); // τ = 0,5 s
    const largo = respirador({ modo: 'VC', vt: 0.5, flujo: 0.5, fr: 15, peep: 5 }); // Te = 3 s = 6τ
    const res2 = simular(normal, largo, { nCiclos: 12 });
    expect(res2.autoPeepReal).toBeLessThan(0.1);
    expect(res2.medidas.autoPeep as number).toBeLessThan(0.3);
  });

  it('Bajar la FR reduce la auto-PEEP', () => {
    const obst = paciente({ R: 32, Rexp: 60, C: 0.05 });
    const a = simular(obst, respirador({ modo: 'VC', fr: 22 }), { nCiclos: 25 });
    const b = simular(obst, respirador({ modo: 'VC', fr: 10 }), { nCiclos: 25 });
    expect(b.autoPeepReal).toBeLessThan(a.autoPeepReal * 0.5);
  });
});

describe('Motor fisiológico · fuga', () => {
  it('Con fuga el VTE es menor que el VTI y el volumen no vuelve a 0', () => {
    const r = respirador({ modo: 'VC' });
    const res = simular(paciente({ fuga: 0.035 }), r);
    expect(res.medidas.vte).toBeLessThan(res.medidas.vti * 0.85);
    expect(res.volumenMedidoFinEsp).toBeGreaterThan(0.03);
    expect(res.medidas.fuga).toBeGreaterThan(0.15);
  });

  it('Desconexión: presiones a ~0 y VTE ≈ 0', () => {
    const r = respirador({ modo: 'PC', deltaP: 12, ti: 1.0 });
    const res = simular(paciente({ fuga: 5 }), r);
    expect(res.medidas.ppico).toBeLessThan(3);
    expect(res.medidas.vte).toBeLessThan(0.05);
  });

  it('PS con fuga: la inspiración termina por Ti máximo', () => {
    const r = respirador({ modo: 'PS', ps: 10, trigE: 0.25, tiMax: 2.2, fr: 12, triggerFlujo: 2 });
    const pSin = paciente({ pmus: { tipo: 'espontaneo', fr: 16, amplitud: 3, ti: 0.7 } });
    const sin = simular(pSin, r);
    expect(sin.medidas.cicladoPorTiMax).toBe(false);
    expect(sin.medidas.ti).toBeLessThan(1.6);
    const con = simular({ ...pSin, fuga: 0.03 }, r);
    expect(con.medidas.cicladoPorTiMax).toBe(true);
    expect(con.medidas.ti).toBeGreaterThanOrEqual(2.1);
  });
});

describe('Motor fisiológico · PS y trigger', () => {
  it('En PS el paciente dispara los ciclos y la FR total sigue a la del paciente', () => {
    const r = respirador({ modo: 'PS', ps: 10, fr: 10, triggerFlujo: 2, tiMax: 2.5 });
    const p = paciente({ pmus: { tipo: 'espontaneo', fr: 18, amplitud: 6, ti: 0.8 } });
    const res = simular(p, r, { nCiclos: 25, conPausas: false });
    expect(res.medidas.frTotal).toBeGreaterThan(15);
    expect(res.medidas.frEspontanea).toBeGreaterThan(10);
  });

  it('En EPOC (τ larga) el ciclado en PS es tardío y subir el trigger espiratorio lo acorta', () => {
    const p = paciente({ R: 20, Rexp: 35, C: 0.07, pmus: { tipo: 'espontaneo', fr: 16, amplitud: 6, ti: 0.9 } });
    const tardio = simular(p, respirador({ modo: 'PS', ps: 12, trigE: 0.25, tiMax: 3, fr: 10, triggerFlujo: 2 }), { nCiclos: 20, conPausas: false });
    const mejor = simular(p, respirador({ modo: 'PS', ps: 12, trigE: 0.5, tiMax: 3, fr: 10, triggerFlujo: 2 }), { nCiclos: 20, conPausas: false });
    expect(mejor.medidas.ti).toBeLessThan(tardio.medidas.ti - 0.2);
  });
});

describe('Motor fisiológico · neumotórax progresivo', () => {
  it('La Pplat sube ciclo a ciclo al caer la compliance manteniendo el gradiente', () => {
    const r = respirador({ modo: 'VC', pausa: 0.3 });
    const c1 = simular(paciente({ C: 0.05 }), r).medidas;
    const c2 = simular(paciente({ C: 0.035 }), r).medidas;
    const c3 = simular(paciente({ C: 0.022 }), r).medidas;
    expect(c2.pplat as number).toBeGreaterThan(c1.pplat as number);
    expect(c3.pplat as number).toBeGreaterThan(c2.pplat as number);
    expect(Math.abs((c3.gradiente as number) - (c1.gradiente as number))).toBeLessThan(1);
  });
});
