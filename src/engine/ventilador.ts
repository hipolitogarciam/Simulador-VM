import type { Fase, Medidas, Paciente, Respirador } from './types';
import { pmus } from './pmus';

export const DT = 0.005;

/** Resultado de un paso de integración. */
export interface PasoVentilador {
  /** Presión en la vía aérea mostrada (Y). */
  paw: number;
  /** Flujo medido en la Y (L/s, + inspiratorio). */
  flujoMedido: number;
  /** Volumen medido (integral del flujo medido, se reinicia cada ciclo). */
  volumenMedido: number;
  /** Flujo real que entra al pulmón. */
  flujoPulmon: number;
  /** Volumen pulmonar por encima de la CRF a PEEP (incluye atrapamiento). */
  volumenPulmon: number;
  palv: number;
  fase: Fase;
  inicioCiclo: boolean;
  /** Esfuerzo muscular aplicado. */
  pmus: number;
}

interface AcumuladorCiclo {
  ppico: number;
  sumaP: number;
  n: number;
  vti: number;
  vteVol: number;
  ti: number;
  te: number;
  disparadoPaciente: boolean;
  pplat: number | null;
  peepTotal: number | null;
  cicladoPorTiMax: boolean;
  flujoInspMedio: number;
  nFlujoInsp: number;
}

function acumuladorVacio(): AcumuladorCiclo {
  return {
    ppico: -Infinity,
    sumaP: 0,
    n: 0,
    vti: 0,
    vteVol: 0,
    ti: 0,
    te: 0,
    disparadoPaciente: false,
    pplat: null,
    peepTotal: null,
    cicladoPorTiMax: false,
    flujoInspMedio: 0,
    nFlujoInsp: 0,
  };
}

const DURACION_PAUSA_INSP = 1.0;
const DURACION_PAUSA_ESP = 1.5;
const TE_MINIMO_TRIGGER = 0.3;
const MIN_TI_PS = 0.15;

/**
 * Modelo unicompartimental resistencia–compliance con respirador en VC, PC y PS.
 * El volumen pulmonar persiste entre ciclos: si Te < ~3τ aparece auto-PEEP sola.
 */
export class Ventilador {
  /** Volumen por encima de la CRF a PEEP (L). */
  V = 0;
  /** Volumen medido en la Y (L). */
  vm = 0;
  fase: Fase = 'esp';
  /** Tiempo dentro del ciclo actual. */
  t = 0;
  /** Tiempo global. */
  T = 0;
  /** Tiempo transcurrido en la fase actual. */
  tFase = 0;
  /** Nº de ciclos completados. */
  ciclos = 0;
  pausaInspPendiente = false;
  pausaEspPendiente = false;
  private picoFlujoPS = 0;
  private acum = acumuladorCiclo();
  private historialCiclos: Array<{ T: number; disparadoPaciente: boolean }> = [];
  /** Última Pplat y PEEP total válidas (se mantienen hasta un cambio de parámetros). */
  private ultimaPplat: number | null = null;
  private ultimoPeepTotal: number | null = null;
  medidas: Medidas = medidasIniciales();
  private inicioCicloPendiente = true;
  private ultimoCicloInsp = 0;
  private vmEspAcumulado: Array<{ T: number; vte: number }> = [];

  constructor(public paciente: Paciente, public respirador: Respirador) {}

  /** Programa una pausa inspiratoria al final de la próxima inspiración. */
  pausaInspiratoria(): void {
    this.pausaInspPendiente = true;
  }

  /** Programa una pausa espiratoria al final de la próxima espiración. */
  pausaEspiratoria(): void {
    this.pausaEspPendiente = true;
  }

  /** Invalida los valores de las pausas (tras cambiar parámetros). */
  invalidarPausas(): void {
    this.ultimaPplat = null;
    this.ultimoPeepTotal = null;
    this.medidas = { ...this.medidas, ...derivadas(this.medidas, null, null, this.respirador) };
  }

  reiniciar(): void {
    this.V = 0;
    this.vm = 0;
    this.fase = 'esp';
    this.t = 0;
    this.tFase = 0;
    this.ciclos = 0;
    this.acum = acumuladorCiclo();
    this.historialCiclos = [];
    this.vmEspAcumulado = [];
    this.inicioCicloPendiente = true;
    this.medidas = medidasIniciales();
    this.ultimaPplat = null;
    this.ultimoPeepTotal = null;
  }

  private duracionInsp(): number {
    const r = this.respirador;
    if (r.modo === 'VC') return r.vt / r.flujo;
    if (r.modo === 'PC') return r.ti;
    return r.tiMax;
  }

  private ttot(): number {
    return 60 / Math.max(1, this.respirador.fr);
  }

  step(dt = DT): PasoVentilador {
    const p = this.paciente;
    const r = this.respirador;
    const C = Math.max(0.005, p.C);
    const R = Math.max(1, p.R);
    const Rx = Math.max(1, p.Rexp);
    const fuga = p.fuga;
    const pm = pmus(p, this.T, this.t, this.fase, this.ultimoCicloInsp) * p.pmusGanancia;
    const Pa = this.V / C + r.peep - pm;

    let inicioCiclo = false;
    if (this.inicioCicloPendiente) {
      inicioCiclo = true;
      this.inicioCicloPendiente = false;
      this.fase = 'insp';
      this.t = 0;
      this.tFase = 0;
      this.vm = 0;
      this.picoFlujoPS = 0;
      this.ultimoCicloInsp = this.T;
    }

    let paw = r.peep;
    let Fl = 0;
    let Fm = 0;
    const tInsp = this.duracionInsp();

    if (this.fase === 'insp') {
      if (r.modo === 'VC') {
        // Flujo constante programado: parte se pierde por la fuga.
        Fl = (r.flujo - fuga * Pa) / (1 + fuga * R);
        paw = Fl * R + Pa;
        Fm = r.flujo;
        if (this.tFase >= tInsp - 1e-9) {
          this.cambiarFase(r.pausa > 0 || this.pausaInspPendiente ? 'pausaInsp' : 'esp');
        }
      } else {
        const nivel = r.modo === 'PC' ? r.deltaP : r.ps;
        paw = r.peep + nivel * Math.min(1, this.tFase / Math.max(0.02, r.rampa));
        Fl = (paw - Pa) / R;
        Fm = Fl + fuga * paw;
        if (r.modo === 'PC') {
          if (this.tFase >= tInsp - 1e-9) {
            this.cambiarFase(this.pausaInspPendiente ? 'pausaInsp' : 'esp');
          }
        } else {
          this.picoFlujoPS = Math.max(this.picoFlujoPS, Fm);
          const porTiMax = this.tFase >= r.tiMax - 1e-9;
          const porFlujo = this.tFase > MIN_TI_PS && Fm < r.trigE * this.picoFlujoPS;
          if (porTiMax || porFlujo) {
            this.acum.cicladoPorTiMax = porTiMax && !porFlujo;
            this.cambiarFase(this.pausaInspPendiente ? 'pausaInsp' : 'esp');
          }
        }
      }
    } else if (this.fase === 'pausaInsp') {
      // Válvulas cerradas: no hay flujo salvo el que escapa por la fuga.
      Fl = (-fuga * Pa) / (1 + fuga * R);
      paw = Pa + Fl * R;
      Fm = 0;
      const dur = this.pausaInspPendiente ? DURACION_PAUSA_INSP : r.pausa;
      if (this.tFase >= dur - 1e-9) {
        if (this.pausaInspPendiente) {
          this.pausaInspPendiente = false;
          this.acum.pplat = paw;
          this.ultimaPplat = paw;
        } else if (r.modo === 'VC' && r.pausa >= 0.3) {
          // Pausa programada suficientemente larga: Pplat visible.
          this.acum.pplat = paw;
          this.ultimaPplat = paw;
        }
        this.cambiarFase('esp');
      }
    } else if (this.fase === 'esp') {
      paw = r.peep;
      Fl = (paw - Pa) / Rx;
      Fm = Math.min(0, Fl + fuga * paw);
      if (p.secreciones > 0 && Fm < -0.04) {
        Fm += p.secreciones * (((this.T * 16) % 1) - 0.5) * 2;
      }
      const fin = this.t >= this.ttot() - 1e-9;
      const trigger =
        r.triggerFlujo > 0 &&
        this.tFase >= TE_MINIMO_TRIGGER &&
        Fl + fuga * paw > r.triggerFlujo / 60 &&
        pm > 0.3;
      if (fin && this.pausaEspPendiente) {
        this.cambiarFase('pausaEsp');
      } else if (fin || trigger) {
        this.finCiclo(trigger && !fin);
      }
    } else {
      // Pausa espiratoria: válvula cerrada, el circuito se equilibra con el alvéolo.
      Fl = (-fuga * Pa) / (1 + fuga * Rx);
      paw = Pa + Fl * Rx;
      Fm = 0;
      if (this.tFase >= DURACION_PAUSA_ESP - 1e-9) {
        this.pausaEspPendiente = false;
        this.acum.peepTotal = paw;
        this.ultimoPeepTotal = paw;
        this.finCiclo(false);
      }
    }

    // Presión mostrada con "joroba" por espiración activa durante la inspiración en presión.
    let pawMostrada = paw;
    if (p.pmus.tipo === 'espiracionActiva' && this.fase !== 'esp' && Fl < 0) {
      pawMostrada = paw + -Fl * 9 * p.pmusGanancia;
    }
    // Cuando el paciente está desconectado o extubado, la Y está abierta al aire.
    if (fuga >= 1) {
      pawMostrada = paw * 0.05;
    }

    // Integración.
    this.V += Fl * dt;
    if (this.V < -0.2) this.V = -0.2;
    this.vm += Fm * dt;
    if (this.vm < 0) this.vm = 0;

    // Acumuladores del ciclo.
    this.acum.ppico = Math.max(this.acum.ppico, pawMostrada);
    this.acum.sumaP += pawMostrada;
    this.acum.n += 1;
    if (this.fase === 'insp' || this.fase === 'pausaInsp') {
      this.acum.ti += dt;
      this.acum.vti = Math.max(this.acum.vti, this.vm);
      if (this.fase === 'insp' && Fm > 0) {
        this.acum.flujoInspMedio += Fm;
        this.acum.nFlujoInsp += 1;
      }
    } else {
      this.acum.te += dt;
      this.acum.vteVol = this.vm;
    }

    this.t += dt;
    this.tFase += dt;
    this.T += dt;

    return {
      paw: pawMostrada,
      flujoMedido: Fm,
      volumenMedido: this.vm,
      flujoPulmon: Fl,
      volumenPulmon: this.V,
      palv: Pa,
      fase: this.fase,
      inicioCiclo,
      pmus: pm,
    };
  }

  private cambiarFase(f: Fase): void {
    this.fase = f;
    this.tFase = 0;
  }

  private finCiclo(disparado: boolean): void {
    const a = this.acum;
    a.disparadoPaciente = a.disparadoPaciente || disparado;
    this.ciclos += 1;
    this.historialCiclos.push({ T: this.T, disparadoPaciente: disparado });
    this.historialCiclos = this.historialCiclos.filter((c) => this.T - c.T <= 60);
    const vte = Math.max(0, a.vti - a.vteVol);
    this.vmEspAcumulado.push({ T: this.T, vte });
    this.vmEspAcumulado = this.vmEspAcumulado.filter((c) => this.T - c.T <= 60);
    const ttot = Math.max(0.1, a.ti + a.te);
    const ventana = Math.min(60, this.T);
    // FR total: media de los últimos ciclos (hasta 6), como la ventana móvil de un respirador.
    const recientes = this.historialCiclos.slice(-6);
    const primero = recientes[0];
    const ultimo = recientes[recientes.length - 1];
    const frTotal =
      recientes.length >= 2 && primero && ultimo && ultimo.T > primero.T
        ? (60 * (recientes.length - 1)) / (ultimo.T - primero.T)
        : 60 / ttot;
    const fraccionEspontanea =
      recientes.length > 0 ? recientes.filter((c) => c.disparadoPaciente).length / recientes.length : disparado ? 1 : 0;
    const vmEsp =
      ventana >= 15
        ? (this.vmEspAcumulado.reduce((s, c) => s + c.vte, 0) * 60) / ventana
        : vte * frTotal;
    const pplat = a.pplat ?? this.ultimaPplat;
    const peepTotal = a.peepTotal ?? this.ultimoPeepTotal;
    const base: Medidas = {
      ...this.medidas,
      ppico: a.ppico === -Infinity ? 0 : a.ppico,
      pmedia: a.n > 0 ? a.sumaP / a.n : 0,
      peep: this.respirador.peep,
      vti: a.vti,
      vte,
      vmEsp,
      frTotal,
      ti: a.ti,
      te: a.te,
      ie: formatoIE(a.ti, a.te),
      ieRatio: a.te / Math.max(0.05, a.ti),
      fuga: a.vti > 0.02 ? Math.max(0, 1 - vte / a.vti) : 0,
      frEspontanea: fraccionEspontanea * frTotal,
      cicladoPorTiMax: a.cicladoPorTiMax,
      pplat,
      peepTotal,
      autoPeep: null,
      gradiente: null,
      drivingPressure: null,
      complianceEstatica: null,
      resistencia: null,
    };
    const flujoMedio = a.nFlujoInsp > 0 ? a.flujoInspMedio / a.nFlujoInsp : 0;
    this.medidas = { ...base, ...derivadas(base, pplat, peepTotal, this.respirador, flujoMedio) };
    this.acum = acumuladorCiclo();
    this.inicioCicloPendiente = true;
  }
}

function acumuladorCiclo(): AcumuladorCiclo {
  return acumuladorVacio();
}

export function medidasIniciales(): Medidas {
  return {
    ppico: 0,
    pmedia: 0,
    peep: 0,
    vti: 0,
    vte: 0,
    vmEsp: 0,
    frTotal: 0,
    ie: '1:2',
    ieRatio: 2,
    ti: 1,
    te: 2,
    pplat: null,
    peepTotal: null,
    autoPeep: null,
    gradiente: null,
    drivingPressure: null,
    complianceEstatica: null,
    resistencia: null,
    fuga: 0,
    frEspontanea: 0,
    cicladoPorTiMax: false,
  };
}

function formatoIE(ti: number, te: number): string {
  if (ti <= 0) return '—';
  const ratio = te / ti;
  if (ratio >= 1) return `1:${ratio.toFixed(1)}`;
  return `${(1 / ratio).toFixed(1)}:1`;
}

/** Cálculos derivados de las pausas: gradiente, DP, compliance, resistencia y auto-PEEP. */
function derivadas(
  m: Medidas,
  pplat: number | null,
  peepTotal: number | null,
  r: Respirador,
  flujoMedio?: number,
): Pick<
  Medidas,
  'pplat' | 'peepTotal' | 'autoPeep' | 'gradiente' | 'drivingPressure' | 'complianceEstatica' | 'resistencia'
> {
  const autoPeep = peepTotal === null ? null : Math.max(0, peepTotal - r.peep);
  const gradiente = pplat === null ? null : m.ppico - pplat;
  const peepRef = peepTotal ?? r.peep;
  const dp = pplat === null ? null : pplat - peepRef;
  const compliance = dp !== null && dp > 0.5 ? m.vti / dp : null;
  // La resistencia solo es interpretable con flujo constante (VC).
  void flujoMedio;
  const resistencia = r.modo === 'VC' && gradiente !== null && r.flujo > 0.05 ? gradiente / r.flujo : null;
  return {
    pplat,
    peepTotal,
    autoPeep,
    gradiente,
    drivingPressure: dp,
    complianceEstatica: compliance,
    resistencia,
  };
}
