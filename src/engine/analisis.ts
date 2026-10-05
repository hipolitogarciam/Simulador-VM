import type { Medidas, Paciente, Respirador } from './types';
import { DT, Ventilador } from './ventilador';

export interface ResultadoSimulacion {
  medidas: Medidas;
  /** Muestras [T, Paw, flujo medido, volumen medido] del último ciclo completo. */
  ultimoCiclo: Array<[number, number, number, number]>;
  /** Volumen pulmonar residual al final de la espiración (atrapamiento, L). */
  volumenAtrapado: number;
  /** Auto-PEEP real del modelo (volumen atrapado / C). */
  autoPeepReal: number;
  /** Flujo espiratorio justo antes de la siguiente inspiración (L/s, negativo). */
  flujoFinEsp: number;
  /** Volumen medido al final de la espiración (L): > 0 si hay fuga. */
  volumenMedidoFinEsp: number;
  ciclos: number;
}

/**
 * Ejecuta el respirador `nCiclos` ciclos y mide en los últimos, incluyendo una
 * pausa inspiratoria y una espiratoria para obtener Pplat y PEEP total.
 */
export function simular(
  p: Paciente,
  r: Respirador,
  opciones: { nCiclos?: number; conPausas?: boolean } = {},
): ResultadoSimulacion {
  const nCiclos = Math.max(5, opciones.nCiclos ?? 12);
  const conPausas = opciones.conPausas ?? true;
  const v = new Ventilador({ ...p }, { ...r });
  const muestras: Array<[number, number, number, number]> = [];
  let flujoFinEsp = 0;
  let volumenMedidoFinEsp = 0;
  let volumenAtrapado = 0;
  let ultimoFlujo = 0;
  let grabando = false;
  let pausaInspPedida = false;
  let pausaEspPedida = false;
  const maxPasos = Math.ceil(((nCiclos + 4) * (60 / Math.max(1, r.fr)) + 10) / DT);
  for (let i = 0; i < maxPasos; i++) {
    if (conPausas && !pausaInspPedida && v.ciclos === nCiclos - 3) {
      v.pausaInspiratoria();
      pausaInspPedida = true;
    }
    if (conPausas && !pausaEspPedida && v.ciclos === nCiclos - 2) {
      v.pausaEspiratoria();
      pausaEspPedida = true;
    }
    const antesV = v.V;
    const antesVm = v.vm;
    const s = v.step(DT);
    if (s.inicioCiclo) {
      grabando = v.ciclos === nCiclos - 1;
      if (grabando) muestras.length = 0;
    }
    if (grabando) muestras.push([v.T, s.paw, s.flujoMedido, s.volumenMedido]);
    if (v.ciclos >= nCiclos) {
      flujoFinEsp = ultimoFlujo;
      volumenMedidoFinEsp = antesVm;
      volumenAtrapado = antesV;
      break;
    }
    ultimoFlujo = s.flujoMedido;
  }
  const C = Math.max(0.005, p.C);
  return {
    medidas: v.medidas,
    ultimoCiclo: muestras,
    volumenAtrapado,
    autoPeepReal: Math.max(0, volumenAtrapado / C),
    flujoFinEsp,
    volumenMedidoFinEsp,
    ciclos: v.ciclos,
  };
}
