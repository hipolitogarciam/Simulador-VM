import { useCallback, useEffect, useState } from 'react';
import type { Simulador } from '../engine/simulador';
import { getSimulador, suscribirLento } from '../store/simulacion';
import { Lienzo, type ContextoDibujo } from './Lienzo';
import { COLORES, dibujarBarrido } from './curvas';

export function MonitorConstantes({ compacto = false }: { compacto?: boolean }) {
  const [sim, setSim] = useState<Simulador>(getSimulador);
  const [, setTick] = useState(0);
  useEffect(
    () =>
      suscribirLento((s) => {
        setSim(s);
        setTick((t) => t + 1);
      }),
    [],
  );
  const c = sim.constantes;
  const alarmas = sim.alarmas;

  const dibujarEcg = useCallback((ctx: ContextoDibujo) => {
    const s = getSimulador();
    dibujarBarrido(ctx, s.bufferMuestras, s.posicionEscritura, 'ecg', { min: -0.4, max: 1.2, lineas: [] }, COLORES.ecg, { titulo: 'ECG II', ancho: 1.6 });
  }, []);
  const dibujarPleth = useCallback((ctx: ContextoDibujo) => {
    const s = getSimulador();
    dibujarBarrido(ctx, s.bufferMuestras, s.posicionEscritura, 'pleth', { min: -0.1, max: 1.2, lineas: [] }, COLORES.pleth, { titulo: 'Pleth', ancho: 1.6 });
  }, []);
  const dibujarCo2 = useCallback((ctx: ContextoDibujo) => {
    const s = getSimulador();
    const max = s.constantes.etco2 > 55 ? 80 : 50;
    dibujarBarrido(ctx, s.bufferMuestras, s.posicionEscritura, 'co2', { min: 0, max, lineas: [0, max / 2, max] }, COLORES.co2, { titulo: 'CO₂', unidad: 'mmHg', ancho: 1.8 });
  }, []);

  const taTexto = c.tani ? `${c.tani.tas}/${c.tani.tad}` : '--/--';
  const tam = c.tani ? `(${c.tani.tam})` : '';

  return (
    <section className={`monitor monitor-const ${compacto ? 'compacto' : ''}`} aria-label="Monitor de constantes">
      <header className="monitor-cabecera">
        <span className="monitor-titulo">MONITOR</span>
        <div className="alarmas" role="status" aria-live="polite">
          {alarmas.includes('spo2Baja') && <span className="alarma alta">SpO₂ BAJA</span>}
          {alarmas.includes('fcAlta') && <span className="alarma media">FC ALTA</span>}
          {alarmas.includes('taBaja') && <span className="alarma alta">TA BAJA</span>}
        </div>
      </header>
      <div className="monitor-cuerpo">
        <div className="curvas">
          <Lienzo dibujar={dibujarEcg} className="curva" aria-label="Electrocardiograma" />
          <Lienzo dibujar={dibujarPleth} className="curva" aria-label="Pletismografía" />
          <Lienzo dibujar={dibujarCo2} className="curva" aria-label="Capnograma" />
        </div>
        <div className="numeros numeros-const">
          <div className="valor" style={{ color: COLORES.ecg }}>
            <span className="valor-etiqueta">FC</span>
            <span className="valor-numero">{c.fc.toFixed(0)}</span>
            <span className="valor-unidad">lpm</span>
          </div>
          <div className={`valor ${c.spo2 < 90 ? 'alerta' : ''}`} style={{ color: COLORES.pleth }}>
            <span className="valor-etiqueta">SpO₂</span>
            <span className="valor-numero">{c.spo2.toFixed(0)}</span>
            <span className="valor-unidad">%</span>
          </div>
          <div className="valor" style={{ color: COLORES.co2 }}>
            <span className="valor-etiqueta">EtCO₂</span>
            <span className="valor-numero">{c.etco2.toFixed(0)}</span>
            <span className="valor-unidad">mmHg · FR {c.frResp.toFixed(0)}</span>
          </div>
          <div className={`valor ${c.tani && c.tani.tas < 90 ? 'alerta' : ''}`} style={{ color: '#e6edf3' }}>
            <span className="valor-etiqueta">TA NI</span>
            <span className={`valor-numero tani ${c.midiendoTA ? 'midiendo' : ''}`}>{c.midiendoTA ? 'midiendo…' : taTexto}</span>
            <span className="valor-unidad">
              {c.midiendoTA ? `${Math.round(c.progresoTA * 100)} %` : c.tani ? `${tam} mmHg · ${c.tani.hora}` : 'mmHg · sin medir'}
            </span>
          </div>
        </div>
      </div>
      <footer className="monitor-pie">
        <div className="programado">
          <span className="chip">Deriv. II</span>
          <span className="chip">Capnografía mainstream</span>
        </div>
        <div className="botones-monitor">
          <button type="button" className="boton" onClick={() => sim.medirTA()} disabled={c.midiendoTA}>
            {c.midiendoTA ? 'Midiendo TA…' : 'Medir TA'}
          </button>
        </div>
      </footer>
    </section>
  );
}
