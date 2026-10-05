import { useEffect, useRef } from 'react';
import { suscribirFrame } from '../store/simulacion';

export interface ContextoDibujo {
  ctx: CanvasRenderingContext2D;
  /** Anchura y altura en píxeles CSS. */
  w: number;
  h: number;
}

interface Props {
  dibujar: (c: ContextoDibujo) => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * Canvas que se redimensiona con ResizeObserver y devicePixelRatio y se
 * redibuja en cada frame del bucle de simulación.
 */
export function Lienzo({ dibujar, className, 'aria-label': ariaLabel }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujarRef = useRef(dibujar);
  dibujarRef.current = dibujar;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const ajustar = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajustar();
    const ro = new ResizeObserver(() => {
      ajustar();
      dibujarRef.current({ ctx, w, h });
    });
    ro.observe(canvas);
    const des = suscribirFrame(() => dibujarRef.current({ ctx, w, h }));
    dibujarRef.current({ ctx, w, h });
    return () => {
      ro.disconnect();
      des();
    };
  }, []);

  return <canvas ref={ref} className={className} role="img" aria-label={ariaLabel} />;
}
