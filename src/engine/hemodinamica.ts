import type { Medidas, Paciente } from './types';

export interface EstadoHemo {
  tas: number;
  tad: number;
  fc: number;
}

export function hemoInicial(p: Paciente): EstadoHemo {
  return { tas: p.tasBase, tad: p.tadBase, fc: p.fcBase };
}

/** Objetivos hemodinámicos según presión intratorácica, auto-PEEP, neumotórax e hipoxemia. */
export function objetivosHemo(p: Paciente, m: Medidas, autoPeepEstimada: number, spo2: number): EstadoHemo {
  const excesoPmedia = Math.max(0, m.pmedia - 8);
  const caidaPorPresion = p.sensibilidadPrecarga * (excesoPmedia + 1.5 * autoPeepEstimada);
  const caidaPorCompresion = 55 * p.compresionMediastinica;
  const tas = Math.max(40, p.tasBase - caidaPorPresion - caidaPorCompresion);
  const proporcion = tas / p.tasBase;
  const tad = Math.max(20, p.tadBase * (0.4 + 0.6 * proporcion));
  const hipoxia = spo2 < 90 ? (90 - spo2) * 1.2 : 0;
  const fc = Math.min(180, Math.max(35, p.fcBase + 0.9 * (p.tasBase - tas) + hipoxia));
  return { tas, tad, fc };
}

export function avanzarHemo(h: EstadoHemo, objetivo: EstadoHemo, dt: number, tau = 15): EstadoHemo {
  const k = 1 - Math.exp(-dt / tau);
  return {
    tas: h.tas + (objetivo.tas - h.tas) * k,
    tad: h.tad + (objetivo.tad - h.tad) * k,
    fc: h.fc + (objetivo.fc - h.fc) * k,
  };
}

/** Gasto cardíaco relativo (1 = normal) estimado a partir de la TA media. */
export function gastoRelativo(h: EstadoHemo, p: Paciente): number {
  const tamBase = (p.tasBase + 2 * p.tadBase) / 3;
  const tam = (h.tas + 2 * h.tad) / 3;
  return Math.max(0.3, Math.min(1.2, tam / tamBase));
}
