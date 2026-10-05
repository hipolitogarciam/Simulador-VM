import type { Alarma, Constantes, Medidas, Muestra, Paciente, Respirador } from './types';
import { DT, Ventilador } from './ventilador';
import { avanzarGases, gasesIniciales, type EstadoGases } from './gases';
import { avanzarHemo, gastoRelativo, hemoInicial, objetivosHemo, type EstadoHemo } from './hemodinamica';
import { avanzarCapno, ecg, pleth, type EstadoCapno } from './ondas';

/** Cambio progresivo de parámetros del paciente y/o del respirador. */
export interface Transicion {
  paciente?: Partial<Paciente>;
  respirador?: Partial<Respirador>;
  /** Duración de la rampa de los parámetros del paciente (s). Los del respirador cambian de golpe. */
  duracion?: number;
  /** Objetivos directos de gases (p. ej. para representar minutos de evolución). */
  gases?: { paco2?: number; spo2?: number };
}

type Numericos = { [K in keyof Paciente]: Paciente[K] extends number ? K : never }[keyof Paciente];

const CLAVES_NUMERICAS: Numericos[] = [
  'R',
  'Rexp',
  'C',
  'espacioMuerto',
  'shunt',
  'reclutabilidad',
  'vco2',
  'hb',
  'fuga',
  'secreciones',
  'pmusGanancia',
  'tasBase',
  'tadBase',
  'fcBase',
  'sensibilidadPrecarga',
  'compresionMediastinica',
  'tauCO2',
  'tauSpO2',
  'aletaTiburon',
];

interface RampaActiva {
  desde: Paciente;
  hasta: Paciente;
  t0: number;
  duracion: number;
}

export const SWEEP_S = 8;
export const FRECUENCIA_MUESTREO = 100;

/**
 * Simulador completo: respirador + pulmón + gases + hemodinámica + ondas del monitor.
 * `avanzar(dtReal)` integra el tiempo transcurrido con paso fijo y rellena el buffer de muestras.
 */
export class Simulador {
  vent: Ventilador;
  gases: EstadoGases = gasesIniciales();
  hemo: EstadoHemo;
  capno: EstadoCapno = { volEsp: 0, valor: 0 };
  objetivosGases: { paco2?: number; spo2?: number } | undefined;
  private rampa: RampaActiva | null = null;
  private faseCardiaca = 0;
  private acumMuestra = 0;
  private muestras: Muestra[] = [];
  private readonly maxMuestras = SWEEP_S * FRECUENCIA_MUESTREO;
  private indiceEscritura = 0;
  private tani: Constantes['tani'] = null;
  private taEnCurso: { inicio: number } | null = null;
  private ultimoCicloT = 0;
  private congelado = false;
  private ultimoPmus = 0;
  private alarmasActivas: Set<Alarma> = new Set();
  private autoPeepEstimada = 0;
  private volFinEsp = 0;

  constructor(paciente: Paciente, respirador: Respirador) {
    this.vent = new Ventilador({ ...paciente }, { ...respirador });
    this.hemo = hemoInicial(paciente);
    for (let i = 0; i < this.maxMuestras; i++) {
      this.muestras.push({ t: -1, paw: 0, flujo: 0, volumen: 0, co2: 0, ecg: 0, pleth: 0 });
    }
  }

  get paciente(): Paciente {
    return this.vent.paciente;
  }

  get respirador(): Respirador {
    return this.vent.respirador;
  }

  get medidas(): Medidas {
    return this.vent.medidas;
  }

  get tiempo(): number {
    return this.vent.T;
  }

  get bufferMuestras(): readonly Muestra[] {
    return this.muestras;
  }

  get posicionEscritura(): number {
    return this.indiceEscritura;
  }

  get estaCongelado(): boolean {
    return this.congelado;
  }

  congelar(v: boolean): void {
    this.congelado = v;
  }

  get alarmas(): Alarma[] {
    return [...this.alarmasActivas];
  }

  /** Aplica una transición: el respirador cambia de golpe, el paciente en rampa. */
  aplicarTransicion(tr: Transicion): void {
    if (tr.respirador) {
      this.vent.respirador = { ...this.vent.respirador, ...tr.respirador };
      this.vent.invalidarPausas();
    }
    if (tr.gases !== undefined) this.objetivosGases = tr.gases;
    if (tr.paciente) {
      const actual = this.rampa ? this.pacienteEnRampa(this.vent.T) : this.vent.paciente;
      const hasta: Paciente = { ...actual, ...tr.paciente };
      const duracion = tr.duracion ?? 8;
      if (duracion <= 0) {
        this.vent.paciente = hasta;
        this.rampa = null;
      } else {
        this.rampa = { desde: { ...actual }, hasta, t0: this.vent.T, duracion };
        // Los campos no numéricos cambian de inmediato.
        this.vent.paciente = { ...actual, pmus: hasta.pmus, extubado: hasta.extubado };
      }
      this.vent.invalidarPausas();
    }
  }

  /** Cambia un parámetro del respirador (desde la UI o el modo libre). */
  programar(cambios: Partial<Respirador>): void {
    this.aplicarTransicion({ respirador: cambios });
  }

  private pacienteEnRampa(T: number): Paciente {
    const r = this.rampa;
    if (!r) return this.vent.paciente;
    const f = Math.min(1, Math.max(0, (T - r.t0) / r.duracion));
    const s = f * f * (3 - 2 * f);
    const out: Paciente = { ...r.hasta };
    for (const k of CLAVES_NUMERICAS) {
      out[k] = r.desde[k] + (r.hasta[k] - r.desde[k]) * s;
    }
    return out;
  }

  pausaInspiratoria(): void {
    this.vent.pausaInspiratoria();
  }

  pausaEspiratoria(): void {
    this.vent.pausaEspiratoria();
  }

  medirTA(): void {
    if (!this.taEnCurso) this.taEnCurso = { inicio: this.vent.T };
  }

  get constantes(): Constantes {
    const h = this.hemo;
    const tam = (h.tas + 2 * h.tad) / 3;
    return {
      fc: h.fc,
      spo2: this.gases.spo2,
      etco2: this.gases.etco2,
      paco2: this.gases.paco2,
      pao2: this.gases.pao2,
      frResp: this.vent.medidas.frTotal,
      tas: h.tas,
      tad: h.tad,
      tam,
      tani: this.tani,
      midiendoTA: this.taEnCurso !== null,
      progresoTA: this.taEnCurso ? Math.min(1, (this.vent.T - this.taEnCurso.inicio) / 15) : 0,
    };
  }

  /** Avanza solo los gases (para llevarlos al equilibrio al cargar un caso). */
  avanzarGasesSolo(dt: number, objetivos?: { paco2?: number; spo2?: number }): void {
    const gasto = gastoRelativo(this.hemo, this.vent.paciente);
    this.gases = avanzarGases(this.gases, this.vent.paciente, this.vent.respirador, this.vent.medidas, gasto, dt, objetivos ?? this.objetivosGases);
    const obj = objetivosHemo(this.vent.paciente, this.vent.medidas, this.autoPeepEstimada, this.gases.spo2);
    this.hemo = avanzarHemo(this.hemo, obj, dt);
  }

  /** Salto de tiempo (p. ej. al pasar de paso): avanza aunque las curvas estén congeladas. */
  saltar(segundos: number): void {
    const c = this.congelado;
    this.congelado = false;
    this.avanzar(segundos);
    this.congelado = c;
  }

  /** Avanza la simulación `segundos` de tiempo simulado. */
  avanzar(segundos: number): void {
    if (this.congelado) return;
    const pasos = Math.max(1, Math.round(segundos / DT));
    for (let i = 0; i < pasos; i++) this.paso();
  }

  private paso(): void {
    const T = this.vent.T;
    if (this.rampa) {
      this.vent.paciente = this.pacienteEnRampa(T);
      if (T >= this.rampa.t0 + this.rampa.duracion) {
        this.vent.paciente = { ...this.rampa.hasta };
        this.rampa = null;
      }
    }
    const p = this.vent.paciente;
    const r = this.vent.respirador;
    const paso = this.vent.step(DT);
    this.ultimoPmus = paso.pmus;

    if (paso.inicioCiclo) {
      this.ultimoCicloT = T;
      this.autoPeepEstimada = Math.max(0, this.volFinEsp / Math.max(0.005, p.C));
    }
    if (paso.fase === 'esp') this.volFinEsp = paso.volumenPulmon;

    // Gases y hemodinámica (lentos).
    const gasto = gastoRelativo(this.hemo, p);
    this.gases = avanzarGases(this.gases, p, r, this.vent.medidas, gasto, DT, this.objetivosGases);
    const obj = objetivosHemo(p, this.vent.medidas, this.autoPeepEstimada, this.gases.spo2);
    this.hemo = avanzarHemo(this.hemo, obj, DT);

    // Ondas de constantes.
    this.capno = avanzarCapno(this.capno, paso.flujoMedido, this.gases.etco2, p, this.ultimoPmus, DT);
    this.faseCardiaca += (this.hemo.fc / 60) * DT;
    const perfusion = Math.max(0.15, Math.min(1, this.hemo.tas / 110));
    const ecgV = ecg(this.faseCardiaca, this.hemo.fc);
    const plethV = pleth(this.faseCardiaca + 0.15, perfusion) * (this.gases.spo2 > 60 ? 1 : 0.4);

    // TA no invasiva.
    if (this.taEnCurso && T - this.taEnCurso.inicio >= 15) {
      const tam = (this.hemo.tas + 2 * this.hemo.tad) / 3;
      this.tani = {
        tas: Math.round(this.hemo.tas),
        tad: Math.round(this.hemo.tad),
        tam: Math.round(tam),
        hora: horaSimulada(T),
      };
      this.taEnCurso = null;
    }

    // Muestreo para el monitor.
    this.acumMuestra += DT;
    const periodo = 1 / FRECUENCIA_MUESTREO;
    if (this.acumMuestra >= periodo - 1e-9) {
      this.acumMuestra -= periodo;
      const m = this.muestras[this.indiceEscritura];
      if (m) {
        m.t = T;
        m.paw = paso.paw;
        m.flujo = paso.flujoMedido;
        m.volumen = paso.volumenMedido;
        m.co2 = this.capno.valor;
        m.ecg = ecgV;
        m.pleth = plethV;
      }
      this.indiceEscritura = (this.indiceEscritura + 1) % this.maxMuestras;
    }

    this.actualizarAlarmas();
  }

  private actualizarAlarmas(): void {
    const m = this.vent.medidas;
    const r = this.vent.respirador;
    const p = this.vent.paciente;
    const a = this.alarmasActivas;
    const T = this.vent.T;
    const set = (al: Alarma, on: boolean) => (on ? a.add(al) : a.delete(al));
    const listo = this.vent.ciclos >= 2;
    set('presionAlta', listo && m.ppico > r.alarmaPmax);
    const desconectado = p.fuga >= 1 || p.extubado || (listo && m.vti > 0.05 && m.fuga > 0.85);
    set('desconexion', listo && desconectado);
    set('vteBajo', listo && !desconectado && m.vte < r.alarmaVteMin);
    set('vmBajo', listo && !desconectado && T > 20 && m.vmEsp < 3);
    set('apnea', T - this.ultimoCicloT > 12);
    set('spo2Baja', this.gases.spo2 < 90);
    set('fcAlta', this.hemo.fc > 130);
    set('taBaja', this.tani !== null && this.tani.tas < 90);
  }
}

export function horaSimulada(T: number): string {
  const base = 10 * 3600 + 12 * 60;
  const s = Math.floor(base + T);
  const h = Math.floor(s / 3600) % 24;
  const min = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
