import type { Paciente, Respirador } from './types';

/** Paciente de referencia: R 10, C 0,05, PEEP 5 (como en el prototipo del Anexo A). */
export const PACIENTE_BASE: Paciente = {
  R: 10,
  Rexp: 10,
  C: 0.05,
  espacioMuerto: 0.15,
  shunt: 0.05,
  reclutabilidad: 0.02,
  vco2: 200,
  hb: 14,
  fuga: 0,
  secreciones: 0,
  pmus: { tipo: 'ninguno' },
  pmusGanancia: 1,
  tasBase: 125,
  tadBase: 75,
  fcBase: 80,
  sensibilidadPrecarga: 1.2,
  compresionMediastinica: 0,
  tauCO2: 60,
  tauSpO2: 45,
  aletaTiburon: 0,
  extubado: false,
};

export const RESPIRADOR_BASE: Respirador = {
  modo: 'VC',
  vt: 0.5,
  flujo: 0.5,
  pausa: 0,
  fr: 15,
  peep: 5,
  fio2: 0.5,
  ti: 1.0,
  deltaP: 12,
  ps: 10,
  trigE: 0.25,
  tiMax: 2.5,
  triggerFlujo: 0,
  rampa: 0.08,
  alarmaPmax: 40,
  alarmaVteMin: 0.3,
};

export function paciente(cambios: Partial<Paciente> = {}): Paciente {
  return { ...PACIENTE_BASE, ...cambios };
}

export function respirador(cambios: Partial<Respirador> = {}): Respirador {
  return { ...RESPIRADOR_BASE, ...cambios };
}

/** Peso ideal (ARDSNet): hombre 50 + 0,91·(talla − 152,4); mujer 45,5 + 0,91·(talla − 152,4). */
export function pesoIdeal(sexo: 'hombre' | 'mujer', tallaCm: number): number {
  const base = sexo === 'hombre' ? 50 : 45.5;
  return Math.max(30, base + 0.91 * (tallaCm - 152.4));
}
