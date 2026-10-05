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
 * Fondo (rejilla, líneas de referencia, etiquetas y título) cacheado en un canvas
 * fuera de pantalla: el texto y la rejilla son lo más caro de dibujar en cada frame
 * y solo cambian con el tamaño o la escala.
 */
const fondos = new Map<string, HTMLCanvasElement | OffscreenCanvas>();
const MAX_FONDOS = 24;

function fondoCacheado(
  clave: string,
  w: number,
  h: number,
  dpr: number,
  pintar: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void,
): HTMLCanvasElement | OffscreenCanvas | null {
  const existente = fondos.get(clave);
  if (existente) return existente;
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  let lienzo: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    lienzo = new OffscreenCanvas(pw, ph);
  } else if (typeof document !== 'undefined') {
    lienzo = document.createElement('canvas');
    lienzo.width = pw;
    lienzo.height = ph;
  } else {
    return null;
  }
  const ctx = lienzo.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pintar(ctx);
  if (fondos.size >= MAX_FONDOS) fondos.clear();
  fondos.set(clave, lienzo);
  return lienzo;
}

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
  // Un canvas oculto (display: none) mide 1×1: no hay nada que dibujar.
  if (w < 2 || h < 2) return;
  const margenIzq = 34;
  const margenSup = 6;
  const margenInf = 4;
  const ancho = w - margenIzq - 4;
  const alto = h - margenSup - margenInf;
  const y = (v: number) => margenSup + alto - ((v - escala.min) / (escala.max - escala.min)) * alto;
  const lineas = escala.lineas ?? [escala.min, 0, escala.max];

  const pintarFondo = (g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
    g.fillStyle = COLORES.fondo;
    g.fillRect(0, 0, w, h);
    // Rejilla y líneas de referencia.
    g.strokeStyle = COLORES.rejilla;
    g.lineWidth = 1;
    g.beginPath();
    for (let s = 0; s <= SWEEP_S; s += 1) {
      const x = margenIzq + (s / SWEEP_S) * ancho;
      g.moveTo(x, margenSup);
      g.lineTo(x, margenSup + alto);
    }
    g.stroke();
    g.font = '10px ui-monospace, Menlo, monospace';
    g.fillStyle = COLORES.texto;
    g.textAlign = 'right';
    for (const v of lineas) {
      if (v < escala.min || v > escala.max) continue;
      const yy = y(v);
      g.strokeStyle = v === 0 ? '#34475a' : COLORES.rejilla;
      g.beginPath();
      g.moveTo(margenIzq, yy);
      g.lineTo(w, yy);
      g.stroke();
      g.fillText(String(v), margenIzq - 4, yy + 3);
    }
    if (opciones.titulo) {
      g.textAlign = 'left';
      g.fillStyle = color;
      g.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      g.fillText(`${opciones.titulo}${opciones.unidad ? ` (${opciones.unidad})` : ''}`, margenIzq + 4, margenSup + 11);
    }
  };
  const dpr = ctx.getTransform().a || 1;
  const clave = `${w}x${h}@${dpr}|${escala.min}|${escala.max}|${lineas.join(',')}|${opciones.titulo ?? ''}|${opciones.unidad ?? ''}|${color}`;
  const fondo = fondoCacheado(clave, w, h, dpr, pintarFondo);
  if (fondo) ctx.drawImage(fondo, 0, 0, w, h);
  else pintarFondo(ctx);

  // Traza.
  const n = muestras.length;
  if (n === 0) return;
  const ultima = muestras[(posicion - 1 + n) % n];
  const tAhora = ultima ? ultima.t : 0;
  const xDe = (t: number) => margenIzq + ((t % SWEEP_S) / SWEEP_S) * ancho;
  ctx.lineWidth = opciones.ancho ?? 2;
  ctx.strokeStyle = color;
  // Uniones biseladas: con 800 puntos por traza las redondeadas cuestan bastante más y no se distinguen.
  ctx.lineJoin = 'bevel';
  ctx.lineCap = 'butt';
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
