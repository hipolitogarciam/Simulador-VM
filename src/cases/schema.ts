import type { Paciente, Respirador } from '../engine/types';
import type { Transicion } from '../engine/simulador';

export type Nivel = 'básico' | 'intermedio' | 'avanzado';
export type Ambito = 'hospital' | 'prehospital';

/** Etiquetas de tema para clasificar los fallos. */
export type EtiquetaTema =
  | 'resistencia frente a compliance'
  | 'auto-PEEP'
  | 'ventilación protectora'
  | 'intubación selectiva'
  | 'neumotórax'
  | 'fuga y desconexión'
  | 'asincronía'
  | 'capnografía'
  | 'oxigenación'
  | 'ventilación y CO2'
  | 'programación obstructiva'
  | 'presión soporte'
  | 'secreciones'
  | 'hemodinámica'
  | 'regla DOPE'
  | 'ecografía';

export interface DatosClinicos {
  edad: number;
  sexo: 'hombre' | 'mujer';
  /** Talla en cm, para el peso ideal. */
  talla: number;
  /** Peso real en kg (opcional, para el contraste con el ideal). */
  pesoReal?: number;
  contexto: string;
}

export interface Opcion {
  texto: string;
  correcta: boolean;
  explicacion: string;
  etiquetaTema: EtiquetaTema;
  /** Texto que describe la consecuencia de la opción errónea (se muestra unos segundos). */
  consecuencia?: string;
  /** Cambios temporales que ilustran la consecuencia de la opción errónea. */
  transicionConsecuencia?: Transicion;
}

export interface Paso {
  id: string;
  titulo: string;
  /** Texto clínico del escenario en este paso (markdown ligero: párrafos y **negrita**). */
  narrativa: string;
  pregunta: string;
  opciones: [Opcion, Opcion, Opcion, Opcion];
  /** Transición que se aplica al avanzar por la rama correcta (al responder bien o tras el feedback). */
  transicion?: Transicion;
  /** Pista opcional sobre qué maniobra de exploración ayuda (pausa, TA...). */
  pista?: string;
  /**
   * Tiempo simulado (s) que se salta al entrar en este paso, para que gases y
   * hemodinámica (lentos) alcancen lo que describe la narrativa. Por defecto 45 s.
   */
  saltoTiempo?: number;
}

export interface MedidasPaso {
  /** Índice del paso (0 = estado inicial antes de responder el paso 1). */
  paso: number;
  ppico: number;
  pplat: number | null;
  peepTotal: number | null;
  autoPeep: number | null;
  gradiente: number | null;
  drivingPressure: number | null;
  complianceEstatica: number | null;
  resistencia: number | null;
  vti: number;
  vte: number;
  vmEsp: number;
  frTotal: number;
  /** Ciclos por minuto disparados por el paciente. */
  frEspontanea: number;
  pmedia: number;
  ti: number;
  te: number;
  fuga: number;
  cicladoPorTiMax: boolean;
  /** Auto-PEEP real del modelo (volumen atrapado / C). */
  autoPeepReal: number;
  flujoFinEsp: number;
  volumenMedidoFinEsp: number;
  /** Gases y hemodinámica en equilibrio tras el paso. */
  paco2: number;
  etco2: number;
  spo2: number;
  tas: number;
  tad: number;
  fc: number;
}

export interface Expectativa {
  /** Paso en el que se evalúa (0 = estado inicial). */
  paso: number;
  descripcion: string;
  comprobar: (m: MedidasPaso, todas: MedidasPaso[]) => boolean;
}

export interface Caso {
  id: string;
  numero: number;
  titulo: string;
  nivel: Nivel;
  ambito: Ambito;
  etiquetasTema: EtiquetaTema[];
  objetivos: string[];
  datos: DatosClinicos;
  pacienteInicial: Paciente;
  respiradorInicial: Respirador;
  /** Estado inicial de gases para no esperar al equilibrio (opcional). */
  gasesIniciales?: { paco2?: number; spo2?: number };
  pasos: Paso[];
  puntosClave: string[];
  expectativas: Expectativa[];
}
