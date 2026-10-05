import { describe, expect, it } from 'vitest';
import { Simulador, horaSimulada, paciente, respirador } from '../engine';

function nuevo(p = {}, r = {}): Simulador {
  const s = new Simulador(paciente(p), respirador(r));
  s.avanzar(10); // tres ciclos a FR 15: medidas con valor
  return s;
}

describe('Simulador · transiciones', () => {
  it('los parámetros del respirador cambian de golpe e invalidan las pausas', () => {
    const s = nuevo();
    s.pausaInspiratoria();
    s.pausaEspiratoria();
    s.avanzar(12);
    expect(s.medidas.pplat).not.toBeNull();
    expect(s.medidas.peepTotal).not.toBeNull();
    s.aplicarTransicion({ respirador: { peep: 10, fr: 20 } });
    expect(s.respirador.peep).toBe(10);
    expect(s.respirador.fr).toBe(20);
    expect(s.medidas.pplat).toBeNull();
    expect(s.medidas.peepTotal).toBeNull();
    expect(s.medidas.autoPeep).toBeNull();
  });

  it('los parámetros numéricos del paciente cambian en rampa suave y terminan exactos', () => {
    const s = nuevo({ C: 0.05 });
    s.aplicarTransicion({ paciente: { C: 0.025 }, duracion: 10 });
    expect(s.paciente.C).toBeCloseTo(0.05, 6);
    s.avanzar(5);
    expect(s.paciente.C).toBeCloseTo(0.0375, 3); // mitad de la rampa (suavizado simétrico)
    s.avanzar(5.1);
    expect(s.paciente.C).toBe(0.025);
    // Una segunda rampa parte del valor en curso de la anterior.
    s.aplicarTransicion({ paciente: { C: 0.05 }, duracion: 10 });
    s.avanzar(5);
    s.aplicarTransicion({ paciente: { R: 20 }, duracion: 4 });
    s.avanzar(4.1);
    expect(s.paciente.R).toBe(20);
    expect(s.paciente.C).toBe(0.05);
  });

  it('duración 0 aplica el paciente de inmediato y los campos no numéricos nunca esperan a la rampa', () => {
    const s = nuevo();
    s.aplicarTransicion({ paciente: { C: 0.03 }, duracion: 0 });
    expect(s.paciente.C).toBe(0.03);
    s.aplicarTransicion({ paciente: { pmus: { tipo: 'espontaneo', fr: 16, amplitud: 5, ti: 0.8 }, extubado: true, R: 15 }, duracion: 8 });
    expect(s.paciente.pmus.tipo).toBe('espontaneo');
    expect(s.paciente.extubado).toBe(true);
    expect(s.paciente.R).toBeCloseTo(10, 6);
    s.avanzar(8.1);
    expect(s.paciente.R).toBe(15);
    expect(s.paciente.pmus.tipo).toBe('espontaneo');
  });

  it('los objetivos de gases de una transición sustituyen al modelo hasta que se retiran', () => {
    const s = nuevo();
    s.aplicarTransicion({ gases: { paco2: 70 } });
    s.avanzar(300); // 5 τ (τ = 60 s)
    expect(s.constantes.paco2).toBeCloseTo(70, 0);
    s.aplicarTransicion({ gases: {} });
    s.avanzar(300);
    expect(s.constantes.paco2).toBeLessThan(50);
  });

  it('programar() es una transición del respirador', () => {
    const s = nuevo();
    s.programar({ modo: 'PC', deltaP: 15 });
    expect(s.respirador.modo).toBe('PC');
    expect(s.respirador.deltaP).toBe(15);
  });
});

describe('Simulador · congelar y saltar', () => {
  it('congelar detiene el tiempo y el buffer; saltar avanza aunque esté congelado', () => {
    const s = nuevo();
    const t0 = s.tiempo;
    const pos0 = s.posicionEscritura;
    s.congelar(true);
    expect(s.estaCongelado).toBe(true);
    s.avanzar(2);
    expect(s.tiempo).toBe(t0);
    expect(s.posicionEscritura).toBe(pos0);
    s.saltar(45);
    expect(s.tiempo).toBeCloseTo(t0 + 45, 2);
    expect(s.estaCongelado).toBe(true);
    s.congelar(false);
    s.avanzar(1);
    expect(s.tiempo).toBeCloseTo(t0 + 46, 2);
  });

  it('un salto largo es asumible en tiempo real (< 400 ms por 180 s simulados)', () => {
    const s = nuevo({ shunt: 0.3 }, { fio2: 0.6 });
    const inicio = performance.now();
    s.saltar(180);
    expect(performance.now() - inicio).toBeLessThan(400);
    expect(s.tiempo).toBeCloseTo(190, 1);
  });

  it('el buffer de muestras es circular a 100 Hz y 8 s', () => {
    const s = nuevo();
    expect(s.bufferMuestras.length).toBe(800);
    const pos = s.posicionEscritura;
    s.avanzar(1);
    expect((s.posicionEscritura - pos + 800) % 800).toBe(100);
    const ultima = s.bufferMuestras[(s.posicionEscritura - 1 + 800) % 800];
    expect(ultima?.t).toBeCloseTo(s.tiempo, 1);
  });
});

describe('Simulador · TA no invasiva y hora', () => {
  it('la TA se mide a los 15 s y registra la hora simulada', () => {
    const s = nuevo();
    expect(s.constantes.tani).toBeNull();
    s.medirTA();
    s.medirTA(); // una segunda pulsación no reinicia la medida
    s.avanzar(14);
    expect(s.constantes.midiendoTA).toBe(true);
    expect(s.constantes.progresoTA).toBeGreaterThan(0.9);
    expect(s.constantes.tani).toBeNull();
    s.avanzar(1.2);
    expect(s.constantes.midiendoTA).toBe(false);
    const tani = s.constantes.tani;
    expect(tani).not.toBeNull();
    expect(tani?.tas).toBeGreaterThan(100);
    expect(tani?.hora).toMatch(/^\d{2}:\d{2}$/);
    expect(tani?.tam).toBe(Math.round(((tani?.tas ?? 0) + 2 * (tani?.tad ?? 0)) / 3));
  });

  it('horaSimulada parte de las 10:12 y da la vuelta a medianoche', () => {
    expect(horaSimulada(0)).toBe('10:12');
    expect(horaSimulada(3600 + 5 * 60 + 59)).toBe('11:17');
    expect(horaSimulada(14 * 3600)).toBe('00:12');
  });
});

describe('Simulador · alarmas', () => {
  it('sin problemas no hay alarmas', () => {
    expect(nuevo().alarmas).toEqual([]);
  });

  it('presión alta cuando la Ppico supera el límite programado', () => {
    const s = nuevo({ C: 0.015 }); // Pplat ≈ 38, Ppico ≈ 43 > 40
    expect(s.alarmas).toContain('presionAlta');
    s.programar({ alarmaPmax: 50 });
    s.avanzar(5);
    expect(s.alarmas).not.toContain('presionAlta');
  });

  it('VTE bajo según el límite configurable, sin duplicarse con la desconexión', () => {
    const s = nuevo({}, { vt: 0.25, alarmaVteMin: 0.3 });
    expect(s.alarmas).toContain('vteBajo');
    expect(s.alarmas).not.toContain('desconexion');
    s.programar({ alarmaVteMin: 0.2 });
    s.avanzar(5);
    expect(s.alarmas).not.toContain('vteBajo');
    const d = nuevo({ fuga: 5 });
    expect(d.alarmas).toContain('desconexion');
    expect(d.alarmas).not.toContain('vteBajo');
    const e = nuevo({ extubado: true });
    expect(e.alarmas).toContain('desconexion');
  });

  it('apnea si no empieza ningún ciclo en 12 s', () => {
    const s = new Simulador(paciente(), respirador({ fr: 2 })); // ciclo cada 30 s
    s.avanzar(13);
    expect(s.alarmas).toContain('apnea');
    s.avanzar(18);
    expect(s.alarmas).not.toContain('apnea');
  });

  it('SpO2 baja, FC alta y TA baja (esta última solo tras medir)', () => {
    const s = nuevo({ fcBase: 140, compresionMediastinica: 0.8 });
    s.aplicarTransicion({ gases: { spo2: 85 } });
    s.avanzar(240);
    expect(s.alarmas).toContain('spo2Baja');
    expect(s.alarmas).toContain('fcAlta');
    expect(s.alarmas).not.toContain('taBaja');
    expect(s.constantes.tas).toBeLessThan(90);
    s.medirTA();
    s.avanzar(16);
    expect(s.alarmas).toContain('taBaja');
  });
});
