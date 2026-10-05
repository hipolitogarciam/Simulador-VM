import type { Medidas, Paciente, Respirador } from './types';

export interface EstadoGases {
  paco2: number;
  pao2: number;
  spo2: number;
  etco2: number;
}

export function gasesIniciales(): EstadoGases {
  return { paco2: 40, pao2: 95, spo2: 97, etco2: 35 };
}

/** Ventilación alveolar (L/min) a partir del VTE, el espacio muerto y la FR total. */
export function ventilacionAlveolar(m: Medidas, p: Paciente): number {
  const vtEfectivo = Math.max(0, m.vte - p.espacioMuerto);
  return Math.max(0.05, vtEfectivo * Math.max(0, m.frTotal));
}

/** PaCO2 de equilibrio: 0,863 · VCO2 (ml/min) / VA (L/min). */
export function paco2Equilibrio(m: Medidas, p: Paciente): number {
  const va = ventilacionAlveolar(m, p);
  return Math.min(150, Math.max(15, (0.863 * p.vco2) / va));
}

/** Saturación de la hemoglobina (Severinghaus 1979). */
export function saturacion(pao2: number): number {
  const p = Math.max(1, pao2);
  const s = 1 / (23400 / (p ** 3 + 150 * p) + 1);
  return 100 * s;
}

/** Inversa aproximada de la curva de disociación (búsqueda binaria). */
export function pao2DesdeSaturacion(sat: number): number {
  let lo = 1;
  let hi = 700;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (saturacion(mid) < sat) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * PaO2 de equilibrio por ecuación del shunt con mezcla de contenidos.
 * El PEEP reduce el shunt según la reclutabilidad; el bajo gasto aumenta la diferencia a-v.
 */
export function pao2Equilibrio(
  p: Paciente,
  r: Respirador,
  paco2: number,
  gastoRelativo: number,
): number {
  const PB = 713;
  const pao2Alv = Math.max(20, r.fio2 * PB - paco2 / 0.8);
  const efectoPeep = Math.max(0.3, 1 - p.reclutabilidad * Math.max(0, r.peep - 5));
  const shunt = Math.min(0.9, Math.max(0, p.shunt * efectoPeep));
  const hb = p.hb;
  const ccO2 = 1.34 * hb * (saturacion(pao2Alv) / 100) + 0.003 * pao2Alv;
  const difAV = 5 / Math.max(0.3, gastoRelativo);
  const caO2 = ccO2 - (difAV * shunt) / Math.max(0.05, 1 - shunt);
  // Resolver CaO2 = 1.34·Hb·S(PaO2) + 0.003·PaO2 mediante iteración.
  let pao2 = 80;
  for (let i = 0; i < 25; i++) {
    const sat = Math.max(0, Math.min(1, (caO2 - 0.003 * pao2) / (1.34 * hb)));
    const nuevo = pao2DesdeSaturacion(sat * 100);
    pao2 = pao2 + (nuevo - pao2) * 0.7;
  }
  return Math.max(20, Math.min(650, pao2));
}

/** Gradiente PaCO2–EtCO2 según el espacio muerto y el gasto cardíaco. */
export function gradienteCO2(p: Paciente, m: Medidas, gastoRelativo: number): number {
  const fraccionVd = m.vte > 0.05 ? Math.min(0.8, p.espacioMuerto / m.vte) : 0.3;
  const porVd = 4 + 25 * Math.max(0, fraccionVd - 0.3);
  const porGasto = 12 * Math.max(0, 1 - gastoRelativo);
  return porVd + porGasto;
}

/**
 * Avanza el estado de gases un intervalo dt (s) hacia sus equilibrios.
 */
export function avanzarGases(
  g: EstadoGases,
  p: Paciente,
  r: Respirador,
  m: Medidas,
  gastoRelativo: number,
  dt: number,
  objetivos?: { paco2?: number; spo2?: number },
): EstadoGases {
  const paco2Eq = objetivos?.paco2 ?? paco2Equilibrio(m, p);
  const tauCO2 = Math.max(1, p.tauCO2);
  const paco2 = g.paco2 + (paco2Eq - g.paco2) * (1 - Math.exp(-dt / tauCO2));
  const pao2Eq = pao2Equilibrio(p, r, paco2, gastoRelativo);
  const spo2EqModelo = saturacion(pao2Eq);
  const spo2Eq = objetivos?.spo2 ?? spo2EqModelo;
  const tauO2 = Math.max(1, p.tauSpO2);
  const spo2 = g.spo2 + (spo2Eq - g.spo2) * (1 - Math.exp(-dt / tauO2));
  const pao2 = pao2DesdeSaturacion(Math.min(99.9, spo2));
  // Desconexión/extubación o fuga grande: el sensor de la Y no ve gas espirado.
  const fraccionEspirada = m.vti > 0.02 ? m.vte / m.vti : 1;
  const factorFuga = p.extubado || p.fuga >= 1 ? 0 : Math.max(0, Math.min(1, (fraccionEspirada - 0.15) / 0.5));
  const etco2 = Math.max(0, paco2 - gradienteCO2(p, m, gastoRelativo)) * factorFuga;
  return { paco2, pao2, spo2, etco2 };
}
