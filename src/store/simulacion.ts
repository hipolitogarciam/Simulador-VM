/**
 * Instancia única del simulador y bucle de animación compartido.
 * Se mantiene fuera de React: los canvas leen el buffer directamente y
 * el panel numérico se refresca a baja frecuencia mediante suscriptores.
 */
import { Simulador } from '../engine/simulador';
import { PACIENTE_BASE, RESPIRADOR_BASE } from '../engine/defaults';
import type { Paciente, Respirador } from '../engine/types';

let simulador = new Simulador(PACIENTE_BASE, RESPIRADOR_BASE);
let raf = 0;
let ultimoT = 0;
const suscriptoresFrame = new Set<() => void>();
const suscriptoresLento = new Set<(s: Simulador) => void>();
let acumLento = 0;
let velocidad = 1;

export function getSimulador(): Simulador {
  return simulador;
}

export function cargarPaciente(p: Paciente, r: Respirador, gases?: { paco2?: number; spo2?: number }): Simulador {
  simulador = new Simulador(p, r);
  if (gases) {
    simulador.objetivosGases = gases;
    if (gases.paco2 !== undefined) simulador.gases.paco2 = gases.paco2;
    if (gases.spo2 !== undefined) simulador.gases.spo2 = gases.spo2;
  }
  // Precalentamiento: unos ciclos para que las medidas tengan valor al mostrar el monitor.
  simulador.avanzar((60 / Math.max(1, r.fr)) * 3 + 2);
  // Lleva gases y hemodinámica a su equilibrio para no mostrar valores de arranque.
  for (let i = 0; i < 600; i++) simulador.avanzarGasesSolo(1, gases);
  for (const s of suscriptoresLento) s(simulador);
  return simulador;
}

export function setVelocidad(v: number): void {
  velocidad = v;
}

function frame(ahora: number): void {
  const dtReal = ultimoT ? Math.min(0.1, (ahora - ultimoT) / 1000) : 0;
  ultimoT = ahora;
  if (dtReal > 0) simulador.avanzar(dtReal * velocidad);
  for (const s of suscriptoresFrame) s();
  acumLento += dtReal;
  if (acumLento >= 0.25) {
    acumLento = 0;
    for (const s of suscriptoresLento) s(simulador);
  }
  raf = requestAnimationFrame(frame);
}

export function iniciarBucle(): void {
  if (raf) return;
  ultimoT = 0;
  raf = requestAnimationFrame(frame);
}

export function detenerBucle(): void {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  ultimoT = 0;
}

export function suscribirFrame(fn: () => void): () => void {
  suscriptoresFrame.add(fn);
  return () => suscriptoresFrame.delete(fn);
}

export function suscribirLento(fn: (s: Simulador) => void): () => void {
  suscriptoresLento.add(fn);
  fn(simulador);
  return () => suscriptoresLento.delete(fn);
}
