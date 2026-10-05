import type { Muestra } from '../engine/types';
import { SWEEP_S } from '../engine/simulador';
import type { ContextoDibujo } from './Lienzo';

export interface EscalaCurva {
  min: number;
  max: number;
  /** Líneas de referencia horizontales. */
  lineas?: number[];
}

export const COLORES = {
  presion: '#ffd23f',
  flujo: '#ff5fb0',
  volumen: '#5bff7f',
  ecg: '#3ef26f',
  pleth: '#52c4ff',
  co2: '#ffb347',
  rejilla: '#1d2a36',
  texto: '#9fb3c8',
  fondo: '#070a0e',
} as const;

/** Hueco de borrado (s) tras la cabeza de barrido. */
const HUECO_S = 0.35;

/**
 * Dibuja una curva con barrido continuo: x proporcional a (t mod SWEEP).
 * La traza antigua se conserva a la derecha de la cabeza, como en un monitor real.
 */
export function dibujarBarrido(
  c: ContextoDibujo,
  muestras: readonly Muestra[],
  posicion: number,
  campo: keyof Omit<Muestra, 't'>,
  escala: EscalaCurva,
  color: string,
  opciones: { titulo?: string; unidad?: string; ancho?: number } = {},
): void {
  const { ctx, w, h } = c;
  ctx.fillStyle = COLORES.fondo;
  ctx.fillRect(0, 0, w, h);
  const margenIzq = 34;
  const margenSup = 6;
  const margenInf = 4;
  const ancho = w - margenIzq - 4;
  const alto = h - margenSup - margenInf;
  const y = (v: number) => margenSup + alto - ((v - escala.min) / (escala.max - escala.min)) * alto;

  // Rejilla y líneas de referencia.
  ctx.strokeStyle = COLORES.rejilla;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let s = 0; s <= SWEEP_S; s += 1) {
    const x = margenIzq + (s / SWEEP_S) * ancho;
    ctx.moveTo(x, margenSup);
    ctx.lineTo(x, margenSup + alto);
  }
  ctx.stroke();
  ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.fillStyle = COLORES.texto;
  ctx.textAlign = 'right';
  const lineas = escala.lineas ?? [escala.min, 0, escala.max];
  for (const v of lineas) {
    if (v < escala.min || v > escala.max) continue;
    const yy = y(v);
    ctx.strokeStyle = v === 0 ? '#34475a' : COLORES.rejilla;
    ctx.beginPath();
    ctx.moveTo(margenIzq, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
    ctx.fillText(String(v), margenIzq - 4, yy + 3);
  }
  if (opciones.titulo) {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${opciones.titulo}${opciones.unidad ? ` (${opciones.unidad})` : ''}`, margenIzq + 4, margenSup + 11);
  }

  // Traza.
  const n = muestras.length;
  if (n === 0) return;
  const ultima = muestras[(posicion - 1 + n) % n];
  const tAhora = ultima ? ultima.t : 0;
  const xDe = (t: number) => margenIzq + ((t % SWEEP_S) / SWEEP_S) * ancho;
  ctx.lineWidth = opciones.ancho ?? 2;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let xPrev = -1;
  let abierto = false;
  for (let i = 0; i < n; i++) {
    const m = muestras[(posicion + i) % n];
    if (!m || m.t < 0) continue;
    // Hueco de borrado justo después de la cabeza.
    if (tAhora - m.t > SWEEP_S - HUECO_S) continue;
    const x = xDe(m.t);
    const yy = y(Math.max(escala.min, Math.min(escala.max, m[campo])));
    if (!abierto || x < xPrev) {
      if (abierto) ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, yy);
      abierto = true;
    } else {
      ctx.lineTo(x, yy);
    }
    xPrev = x;
  }
  if (abierto) ctx.stroke();
  // Cabeza de barrido.
  ctx.fillStyle = color;
  ctx.fillRect(xDe(tAhora) - 1, margenSup, 2, alto);
}
