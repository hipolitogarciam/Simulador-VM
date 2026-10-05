/**
 * Tipos del motor fisiológico.
 * Unidades: presiones en cmH2O, volúmenes en L, flujos en L/s, tiempos en s,
 * resistencia en cmH2O/L/s, compliance en L/cmH2O.
 */

export type Modo = 'VC' | 'PC' | 'PS';

/** Esfuerzo muscular del paciente (Pmus > 0 = inspiratorio, < 0 = espiración activa). */
export type ConfigPmus =
  | { tipo: 'ninguno' }
  /** Respiración espontánea regular (dispara el respirador si hay trigger). */
  | { tipo: 'espontaneo'; fr: number; amplitud: number; ti: number }
  /** Esfuerzos desacoplados del respirador (desadaptación): suma de dos senos. */
  | { tipo: 'desadaptado'; amp1: number; per1: number; amp2: number; per2: number }
  /** "Hambre de flujo" en VC: esfuerzo intenso durante la inspiración mecánica. */
  | { tipo: 'hambreFlujo'; amplitud: number }
  /** Espiración activa en PC: esfuerzo espiratorio al final de la inspiración (joroba). */
  | { tipo: 'espiracionActiva'; amplitud: number };

export interface Paciente {
  /** Resistencia inspiratoria (cmH2O/L/s). */
  R: number;
  /** Resistencia espiratoria; si es mayor que R hay obstrucción distal (atrapamiento). */
  Rexp: number;
  /** Compliance estática del sistema respiratorio (L/cmH2O). */
  C: number;
  /** Espacio muerto total: anatómico + instrumental (L). */
  espacioMuerto: number;
  /** Fracción de shunt (0–1) sin PEEP. */
  shunt: number;
  /** Reducción relativa del shunt por cada cmH2O de PEEP por encima de 5 (reclutabilidad). */
  reclutabilidad: number;
  /** Producción de CO2 (ml/min). */
  vco2: number;
  /** Hemoglobina (g/dl). */
  hb: number;
  /** Conductancia de la fuga en el circuito (L/s por cmH2O). 0 = sin fuga; ≥ 1 ≈ desconexión. */
  fuga: number;
  /** Amplitud del ruido de dientes de sierra en el flujo espiratorio (secreciones), L/s. */
  secreciones: number;
  /** Esfuerzo muscular. */
  pmus: ConfigPmus;
  /** Factor global de amplitud de Pmus (0–1), para transiciones suaves. */
  pmusGanancia: number;
  /** Hemodinámica basal. */
  tasBase: number;
  tadBase: number;
  fcBase: number;
  /** Sensibilidad de la TA a la presión intratorácica (mmHg por cmH2O de presión media por encima de 8). */
  sensibilidadPrecarga: number;
  /** Compresión mediastínica (0–1): neumotórax a tensión; baja la TA y sube la FC. */
  compresionMediastinica: number;
  /** Constante de tiempo de la PaCO2 (s). */
  tauCO2: number;
  /** Constante de tiempo de la SpO2 (s). */
  tauSpO2: number;
  /** Fracción del capnograma de "aleta de tiburón" forzada (0 = según Rexp). */
  aletaTiburon: number;
  /** Si es true el tubo está fuera de la vía aérea: capnografía a 0 además de la fuga. */
  extubado: boolean;
}

export interface Respirador {
  modo: Modo;
  /** Volumen corriente programado en VC (L). */
  vt: number;
  /** Flujo inspiratorio en VC (L/s). */
  flujo: number;
  /** Pausa inspiratoria programada en VC (s). */
  pausa: number;
  /** FR programada (en PS: FR de respaldo). */
  fr: number;
  /** PEEP extrínseca. */
  peep: number;
  /** FiO2 (0.21–1). */
  fio2: number;
  /** Ti programado en PC (s). */
  ti: number;
  /** Presión inspiratoria sobre PEEP en PC (ΔP). */
  deltaP: number;
  /** Nivel de presión soporte sobre PEEP en PS. */
  ps: number;
  /** Trigger espiratorio en PS (fracción del flujo pico, 0–1). */
  trigE: number;
  /** Ti máximo en PS (s). */
  tiMax: number;
  /** Trigger inspiratorio por flujo (L/min); si es ≤ 0 está desactivado (modo controlado puro). */
  triggerFlujo: number;
  /** Tiempo de rampa de presión en PC/PS (s). */
  rampa: number;
  /** Límite de alarma de presión alta. */
  alarmaPmax: number;
  /** Límite de alarma de VTE bajo (L). */
  alarmaVteMin: number;
}

export type Fase = 'insp' | 'pausaInsp' | 'esp' | 'pausaEsp';

/** Valores medidos por el respirador en la pieza en Y (actualizados ciclo a ciclo). */
export interface Medidas {
  ppico: number;
  pmedia: number;
  peep: number;
  vti: number;
  vte: number;
  vmEsp: number;
  frTotal: number;
  ie: string;
  ieRatio: number;
  ti: number;
  te: number;
  /** Solo tras pausa inspiratoria. */
  pplat: number | null;
  /** Solo tras pausa espiratoria. */
  peepTotal: number | null;
  autoPeep: number | null;
  gradiente: number | null;
  drivingPressure: number | null;
  complianceEstatica: number | null;
  resistencia: number | null;
  /** Fracción de fuga 1 − VTE/VTI. */
  fuga: number;
  /** Ciclos disparados por el paciente en el último minuto estimado. */
  frEspontanea: number;
  /** Último ciclo terminado por Ti máximo (PS). */
  cicladoPorTiMax: boolean;
  /** Volumen corriente que realmente entra en el pulmón (L); con fuga difiere del VTE medido. */
  vtPulmon: number;
}

export interface Constantes {
  fc: number;
  spo2: number;
  etco2: number;
  paco2: number;
  pao2: number;
  frResp: number;
  /** TA actual "real" (no visible hasta medir). */
  tas: number;
  tad: number;
  tam: number;
  /** Última TA no invasiva medida. */
  tani: { tas: number; tad: number; tam: number; hora: string } | null;
  midiendoTA: boolean;
  progresoTA: number;
}

export type Alarma =
  | 'presionAlta'
  | 'vteBajo'
  | 'vmBajo'
  | 'desconexion'
  | 'apnea'
  | 'spo2Baja'
  | 'fcAlta'
  | 'taBaja';

export interface Muestra {
  t: number;
  paw: number;
  flujo: number;
  volumen: number;
  co2: number;
  ecg: number;
  pleth: number;
}
