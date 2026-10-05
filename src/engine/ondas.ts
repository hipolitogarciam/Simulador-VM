/**
 * Formas de onda del monitor de constantes: capnograma, ECG y pletismografía.
 * Son funciones puras del estado fisiológico; no "dibujan", solo producen valores.
 */
import type { Paciente } from './types';

export interface EstadoCapno {
  /** Volumen espirado desde el inicio de la espiración (L). */
  volEsp: number;
  /** Valor actual del capnograma (mmHg). */
  valor: number;
}

/**
 * Capnograma volumétrico-temporal: fase II rápida y meseta normal, o "aleta de tiburón"
 * cuando hay obstrucción espiratoria. Cae a 0 al empezar la inspiración.
 */
export function avanzarCapno(
  s: EstadoCapno,
  flujoMedido: number,
  etco2: number,
  p: Paciente,
  pmusValor: number,
  dt: number,
): EstadoCapno {
  const inspirando = flujoMedido > 0.01;
  if (inspirando) {
    // Lavado rápido del sensor al entrar gas fresco.
    const valor = s.valor + (0 - s.valor) * (1 - Math.exp(-dt / 0.04));
    return { volEsp: 0, valor };
  }
  const volEsp = s.volEsp + Math.max(0, -flujoMedido) * dt;
  const vd = Math.max(0.05, p.espacioMuerto);
  // Grado de obstrucción: ratio Rexp/R y resistencia absoluta.
  const obstr = Math.max(
    p.aletaTiburon,
    Math.min(1, Math.max(0, (p.Rexp - 12) / 30) * 0.7 + Math.max(0, p.Rexp / Math.max(1, p.R) - 1) * 0.3),
  );
  const x = volEsp;
  // Forma normal: sigmoide centrada en el espacio muerto, meseta con ligera pendiente.
  const normal = etco2 * suave((x - vd * 0.65) / (vd * 0.45)) * (1 + 0.04 * Math.max(0, x - vd) / 0.3);
  // Aleta de tiburón: ascenso exponencial lento que no alcanza meseta.
  const tiburon = etco2 * (1 - Math.exp(-x / (vd * (1.2 + 2.5 * obstr))));
  let objetivo = normal * (1 - obstr) + tiburon * obstr;
  // Hendidura por esfuerzo inspiratorio del paciente durante la meseta (curare cleft).
  if (pmusValor > 1 && x > vd) {
    objetivo *= Math.max(0.55, 1 - pmusValor / 25);
  }
  const valor = s.valor + (objetivo - s.valor) * (1 - Math.exp(-dt / 0.03));
  return { volEsp, valor };
}

function suave(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/** Onda de ECG sinusal (derivación II) para una fase del ciclo cardíaco 0–1. */
export function ecg(fase: number, fc: number): number {
  const f = fase - Math.floor(fase);
  // Duraciones relativas que se comprimen con FC alta.
  const comp = Math.max(0.55, Math.min(1, 75 / Math.max(40, fc)));
  const p = gauss(f, 0.12 * comp, 0.025 * comp) * 0.12;
  const q = -gauss(f, 0.235 * comp, 0.008) * 0.12;
  const r = gauss(f, 0.25 * comp, 0.009) * 1.0;
  const s = -gauss(f, 0.265 * comp, 0.01) * 0.25;
  const t = gauss(f, 0.42 * comp, 0.045 * comp) * 0.28;
  return p + q + r + s + t;
}

function gauss(x: number, mu: number, sigma: number): number {
  const d = (x - mu) / sigma;
  return Math.exp(-0.5 * d * d);
}

/** Pletismografía: pulso con muesca dícrota, amplitud según perfusión. */
export function pleth(fase: number, amplitud: number): number {
  const f = fase - Math.floor(fase);
  const subida = f < 0.15 ? Math.sin((Math.PI / 2) * (f / 0.15)) : 1;
  const bajada = f >= 0.15 ? Math.exp(-(f - 0.15) / 0.28) : 1;
  const dicrota = f > 0.35 ? 0.15 * Math.exp(-((f - 0.42) ** 2) / 0.004) : 0;
  return amplitud * (subida * bajada + dicrota);
}
