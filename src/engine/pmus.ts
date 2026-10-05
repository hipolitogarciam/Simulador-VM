import type { Fase, Paciente } from './types';

/**
 * Presión muscular del paciente (cmH2O). Positiva = esfuerzo inspiratorio.
 * @param T tiempo global (s)
 * @param t tiempo dentro del ciclo del respirador (s)
 * @param fase fase actual del respirador
 * @param inicioInsp instante global en que empezó la última inspiración
 */
export function pmus(p: Paciente, T: number, t: number, fase: Fase, inicioInsp: number): number {
  const cfg = p.pmus;
  switch (cfg.tipo) {
    case 'ninguno':
      return 0;
    case 'espontaneo': {
      const periodo = 60 / Math.max(1, cfg.fr);
      const tl = T % periodo;
      if (tl < cfg.ti) return cfg.amplitud * Math.sin((Math.PI * tl) / cfg.ti);
      return 0;
    }
    case 'desadaptado':
      return (
        cfg.amp1 * Math.sin((2 * Math.PI * T) / cfg.per1) +
        cfg.amp2 * Math.sin((2 * Math.PI * T) / cfg.per2)
      );
    case 'hambreFlujo': {
      const tt = T - inicioInsp;
      if (fase === 'insp' && tt > 0.05 && tt < 1) {
        return cfg.amplitud * Math.sin((Math.PI * (tt - 0.05)) / 0.95);
      }
      return 0;
    }
    case 'espiracionActiva': {
      const tt = t;
      if (fase !== 'esp' && tt > 0.75 && tt < 1.3) {
        return -cfg.amplitud * Math.sin((Math.PI * (tt - 0.75)) / 0.55);
      }
      return 0;
    }
  }
}
