import { create } from 'zustand';
import type { Caso, EtiquetaTema, Paso } from '../cases/schema';
import { CASOS, casoPorId } from '../cases';
import {
  LocalStorageProgressStore,
  datosVacios,
  nuevoPerfil,
  progresoCasoVacio,
  type DatosProgreso,
  type Perfil,
  type ProgressStore,
  type RespuestaRegistrada,
} from './progreso';
import { cargarPaciente, getSimulador } from './simulacion';

export type Pantalla = 'inicio' | 'caso' | 'resumen' | 'progreso' | 'libre';

export type FaseSesion = 'pregunta' | 'consecuencia' | 'feedback';

export interface SesionCaso {
  casoId: string;
  pasoIdx: number;
  fase: FaseSesion;
  opcionElegida: number | null;
  respuestas: RespuestaRegistrada[];
  inicio: string;
  /** Instante (ms) en que termina la consecuencia de una opción errónea. */
  finConsecuencia: number | null;
}

interface EstadoApp {
  datos: DatosProgreso;
  pantalla: Pantalla;
  sesion: SesionCaso | null;
  sonidoAlarmas: boolean;
  store: ProgressStore;
  // Perfiles
  crearPerfil(nombre: string): void;
  seleccionarPerfil(id: string): void;
  eliminarPerfil(id: string): void;
  importarPerfil(perfil: Perfil): void;
  perfilActivo(): Perfil | null;
  // Navegación
  irA(p: Pantalla): void;
  // Caso
  iniciarCaso(casoId: string): void;
  responder(opcion: number): void;
  terminarConsecuencia(): void;
  siguientePaso(): void;
  abandonarCaso(): void;
  setSonido(v: boolean): void;
}

function guardar(store: ProgressStore, datos: DatosProgreso): DatosProgreso {
  store.guardar(datos);
  return datos;
}

export const useApp = create<EstadoApp>((set, get) => {
  const store: ProgressStore = new LocalStorageProgressStore();
  let datos: DatosProgreso;
  try {
    datos = store.cargar();
  } catch {
    datos = datosVacios();
  }
  return {
    datos,
    pantalla: 'inicio',
    sesion: null,
    sonidoAlarmas: false,
    store,

    perfilActivo() {
      const d = get().datos;
      return d.perfiles.find((p) => p.id === d.perfilActivo) ?? null;
    },

    crearPerfil(nombre) {
      const limpio = nombre.trim();
      if (!limpio) return;
      const perfil = nuevoPerfil(limpio);
      const d = get().datos;
      set({ datos: guardar(store, { ...d, perfiles: [...d.perfiles, perfil], perfilActivo: perfil.id }) });
    },

    seleccionarPerfil(id) {
      const d = get().datos;
      set({ datos: guardar(store, { ...d, perfilActivo: id }) });
    },

    eliminarPerfil(id) {
      const d = get().datos;
      const perfiles = d.perfiles.filter((p) => p.id !== id);
      set({ datos: guardar(store, { ...d, perfiles, perfilActivo: d.perfilActivo === id ? (perfiles[0]?.id ?? null) : d.perfilActivo }) });
    },

    importarPerfil(perfil) {
      const d = get().datos;
      const existe = d.perfiles.some((p) => p.id === perfil.id);
      const perfiles = existe ? d.perfiles.map((p) => (p.id === perfil.id ? perfil : p)) : [...d.perfiles, perfil];
      set({ datos: guardar(store, { ...d, perfiles, perfilActivo: perfil.id }) });
    },

    irA(p) {
      // Al salir de un caso o de su resumen se descarta la sesión para no arrastrar estado.
      const conservarSesion = p === 'caso' || p === 'resumen';
      set({ pantalla: p, sesion: conservarSesion ? get().sesion : null });
    },

    iniciarCaso(casoId) {
      const caso = casoPorId(casoId);
      if (!caso) return;
      cargarPaciente(caso.pacienteInicial, caso.respiradorInicial, caso.gasesIniciales);
      const sesion: SesionCaso = {
        casoId,
        pasoIdx: 0,
        fase: 'pregunta',
        opcionElegida: null,
        respuestas: [],
        inicio: new Date().toISOString(),
        finConsecuencia: null,
      };
      actualizarProgreso(get, set, store, casoId, (pc) => ({ ...pc, estado: pc.estado === 'completado' ? 'completado' : 'en curso', pasoActual: 0 }));
      set({ sesion, pantalla: 'caso' });
    },

    responder(opcion) {
      const { sesion } = get();
      if (!sesion || sesion.fase !== 'pregunta') return;
      const caso = casoPorId(sesion.casoId);
      const paso = caso?.pasos[sesion.pasoIdx];
      if (!caso || !paso) return;
      const op = paso.opciones[opcion];
      if (!op) return;
      const registro: RespuestaRegistrada = {
        pasoId: paso.id,
        opcion,
        correcta: op.correcta,
        etiquetaTema: op.etiquetaTema,
        fecha: new Date().toISOString(),
      };
      const sim = getSimulador();
      if (!op.correcta && op.transicionConsecuencia) {
        sim.aplicarTransicion(op.transicionConsecuencia);
        set({
          sesion: { ...sesion, fase: 'consecuencia', opcionElegida: opcion, respuestas: [...sesion.respuestas, registro], finConsecuencia: Date.now() + 9000 },
        });
        return;
      }
      if (paso.transicion) sim.aplicarTransicion(paso.transicion);
      set({ sesion: { ...sesion, fase: 'feedback', opcionElegida: opcion, respuestas: [...sesion.respuestas, registro] } });
    },

    terminarConsecuencia() {
      const { sesion } = get();
      if (!sesion || sesion.fase !== 'consecuencia') return;
      const caso = casoPorId(sesion.casoId);
      const paso = caso?.pasos[sesion.pasoIdx];
      if (!caso || !paso) return;
      const sim = getSimulador();
      // Se vuelve por la rama correcta: se deshace lo que cambió la consecuencia (paciente,
      // respirador y objetivos de gases) y se aplica la transición del paso en una sola
      // transición, para que la rampa del paso no se construya sobre el estado de la consecuencia.
      const op = sesion.opcionElegida !== null ? paso.opciones[sesion.opcionElegida] : undefined;
      const revertir = op?.transicionConsecuencia;
      const tr = paso.transicion;
      const paciente = revertir?.paciente || tr?.paciente ? { ...(revertir?.paciente ? estadoPacienteAntes(caso, sesion.pasoIdx) : {}), ...tr?.paciente } : undefined;
      const respirador = revertir?.respirador || tr?.respirador ? { ...(revertir?.respirador ? estadoRespiradorAntes(caso, sesion.pasoIdx) : {}), ...tr?.respirador } : undefined;
      const gases = tr?.gases !== undefined ? tr.gases : revertir?.gases !== undefined ? estadoGasesAntes(caso, sesion.pasoIdx) : undefined;
      if (paciente || respirador || gases !== undefined) {
        sim.aplicarTransicion({ paciente, respirador, gases, duracion: tr?.duracion ?? (revertir?.paciente ? 4 : undefined) });
      }
      set({ sesion: { ...sesion, fase: 'feedback', finConsecuencia: null } });
    },

    siguientePaso() {
      const { sesion } = get();
      if (!sesion || sesion.fase !== 'feedback') return;
      const caso = casoPorId(sesion.casoId);
      if (!caso) return;
      const ultimo = sesion.pasoIdx >= caso.pasos.length - 1;
      if (ultimo) {
        const aciertos = sesion.respuestas.filter((r) => r.correcta).length;
        const puntuacion = Math.round((100 * aciertos) / caso.pasos.length);
        const fin = new Date().toISOString();
        actualizarProgreso(get, set, store, caso.id, (pc) => ({
          ...pc,
          estado: 'completado',
          intentos: [...pc.intentos, { inicio: sesion.inicio, fin, respuestas: sesion.respuestas, puntuacion }],
          mejorPuntuacion: pc.mejorPuntuacion === null ? puntuacion : Math.max(pc.mejorPuntuacion, puntuacion),
          ultimoIntento: fin,
          pasoActual: 0,
        }));
        set({ pantalla: 'resumen' });
        return;
      }
      actualizarProgreso(get, set, store, caso.id, (pc) => ({ ...pc, pasoActual: sesion.pasoIdx + 1 }));
      // Salto de tiempo: la narrativa del siguiente paso describe minutos de evolución.
      const siguiente = caso.pasos[sesion.pasoIdx + 1];
      getSimulador().saltar(siguiente?.saltoTiempo ?? 45);
      set({ sesion: { ...sesion, pasoIdx: sesion.pasoIdx + 1, fase: 'pregunta', opcionElegida: null, finConsecuencia: null } });
    },

    abandonarCaso() {
      const { sesion } = get();
      if (sesion && sesion.respuestas.length > 0) {
        const fin = new Date().toISOString();
        actualizarProgreso(get, set, store, sesion.casoId, (pc) => ({
          ...pc,
          intentos: [...pc.intentos, { inicio: sesion.inicio, fin, respuestas: sesion.respuestas }],
          ultimoIntento: fin,
        }));
      }
      set({ sesion: null, pantalla: 'inicio' });
    },

    setSonido(v) {
      set({ sonidoAlarmas: v });
    },
  };
});

function actualizarProgreso(
  get: () => EstadoApp,
  set: (p: Partial<EstadoApp>) => void,
  store: ProgressStore,
  casoId: string,
  fn: (pc: ReturnType<typeof progresoCasoVacio>) => ReturnType<typeof progresoCasoVacio>,
): void {
  const d = get().datos;
  const perfil = d.perfiles.find((p) => p.id === d.perfilActivo);
  if (!perfil) return;
  const pc = perfil.casos[casoId] ?? progresoCasoVacio(casoId);
  const nuevoPerfil: Perfil = { ...perfil, casos: { ...perfil.casos, [casoId]: fn(pc) } };
  const perfiles = d.perfiles.map((p) => (p.id === perfil.id ? nuevoPerfil : p));
  set({ datos: guardar(store, { ...d, perfiles }) });
}

/** Estado del paciente justo antes de la transición del paso `idx` (rama correcta acumulada). */
function estadoPacienteAntes(caso: Caso, idx: number) {
  let p = { ...caso.pacienteInicial };
  for (let i = 0; i < idx; i++) {
    const tr = caso.pasos[i]?.transicion;
    if (tr?.paciente) p = { ...p, ...tr.paciente };
  }
  return p;
}

function estadoRespiradorAntes(caso: Caso, idx: number) {
  let r = { ...caso.respiradorInicial };
  for (let i = 0; i < idx; i++) {
    const tr = caso.pasos[i]?.transicion;
    if (tr?.respirador) r = { ...r, ...tr.respirador };
  }
  return r;
}

/** Objetivos de gases vigentes justo antes de la transición del paso `idx` (rama correcta). */
function estadoGasesAntes(caso: Caso, idx: number): { paco2?: number; spo2?: number } {
  let g: { paco2?: number; spo2?: number } = caso.gasesIniciales ?? {};
  for (let i = 0; i < idx; i++) {
    const tr = caso.pasos[i]?.transicion;
    if (tr?.gases !== undefined) g = tr.gases;
  }
  return g;
}

export function pasoActual(sesion: SesionCaso | null): { caso: Caso; paso: Paso } | null {
  if (!sesion) return null;
  const caso = casoPorId(sesion.casoId);
  const paso = caso?.pasos[sesion.pasoIdx];
  if (!caso || !paso) return null;
  return { caso, paso };
}

export function resumenSesion(sesion: SesionCaso, caso: Caso) {
  const aciertos = sesion.respuestas.filter((r) => r.correcta).length;
  const fallos = new Map<EtiquetaTema, number>();
  for (const r of sesion.respuestas) if (!r.correcta) fallos.set(r.etiquetaTema, (fallos.get(r.etiquetaTema) ?? 0) + 1);
  return { aciertos, total: caso.pasos.length, fallosPorTema: [...fallos.entries()] };
}

export { CASOS, estadoPacienteAntes, estadoRespiradorAntes, estadoGasesAntes };
