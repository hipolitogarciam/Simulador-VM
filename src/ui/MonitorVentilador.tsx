import { useCallback, useEffect, useState } from 'react';
import type { Alarma, Medidas, Respirador } from '../engine/types';
import type { Simulador } from '../engine/simulador';
import { getSimulador, suscribirLento } from '../store/simulacion';
import { Lienzo, type ContextoDibujo } from './Lienzo';
import { COLORES, dibujarBarrido, type EscalaCurva } from './curvas';
import { useApp } from '../store/useApp';

const ETIQUETAS_ALARMA: Record<Alarma, string> = {
  presionAlta: 'PRESIÓN ALTA',
  vteBajo: 'VTE BAJO',
  vmBajo: 'VOLUMEN MINUTO BAJO',
  desconexion: 'DESCONEXIÓN',
  apnea: 'APNEA',
  spo2Baja: 'SpO₂ BAJA',
  fcAlta: 'FC ALTA',
  taBaja: 'TA BAJA',
};

const ALARMAS_VENT: Alarma[] = ['desconexion', 'apnea', 'presionAlta', 'vteBajo', 'vmBajo'];

function escalaPresion(m: Medidas): EscalaCurva {
  const max = m.ppico > 38 ? 60 : m.ppico > 28 ? 40 : 30;
  return { min: -5, max, lineas: [0, 10, 20, max] };
}

function escalaFlujo(r: Respirador): EscalaCurva {
  const max = r.modo === 'VC' && r.flujo <= 0.6 ? 60 : 120;
  return { min: -max, max, lineas: [-max, 0, max] };
}

function escalaVolumen(m: Medidas): EscalaCurva {
  const max = m.vti > 0.55 ? 1000 : 600;
  return { min: 0, max, lineas: [0, max / 2, max] };
}

export function MonitorVentilador({ compacto = false }: { compacto?: boolean }) {
  const [sim, setSim] = useState<Simulador>(getSimulador);
  const [, setTick] = useState(0);
  const sonido = useApp((s) => s.sonidoAlarmas);
  const setSonido = useApp((s) => s.setSonido);
  const [congelado, setCongelado] = useState(false);

  useEffect(
    () =>
      suscribirLento((s) => {
        setSim(s);
        setTick((t) => t + 1);
      }),
    [],
  );

  useEffect(() => {
    if (!sonido) return;
    const alarmas = sim.alarmas.filter((a) => ALARMAS_VENT.includes(a));
    if (alarmas.length === 0) return;
    pitido();
  });

  const m = sim.medidas;
  const r = sim.respirador;
  const alarmas = sim.alarmas.filter((a) => ALARMAS_VENT.includes(a));

  const dibujarPresion = useCallback(
    (c: ContextoDibujo) => {
      const s = getSimulador();
      const muestras = s.bufferMuestras;
      dibujarBarrido(c, muestras, s.posicionEscritura, 'paw', escalaPresion(s.medidas), COLORES.presion, { titulo: 'Presión', unidad: 'cmH₂O' });
    },
    [],
  );
  const dibujarFlujo = useCallback((c: ContextoDibujo) => {
    const s = getSimulador();
    const esc = escalaFlujo(s.respirador);
    const ctxFlujo = { ...c };
    // El flujo se muestra en L/min: se escala el buffer al vuelo mediante una vista.
    dibujarBarrido(ctxFlujo, vistaFlujoLmin(s), s.posicionEscritura, 'flujo', esc, COLORES.flujo, { titulo: 'Flujo', unidad: 'L/min' });
  }, []);
  const dibujarVolumen = useCallback((c: ContextoDibujo) => {
    const s = getSimulador();
    dibujarBarrido(c, vistaVolumenMl(s), s.posicionEscritura, 'volumen', escalaVolumen(s.medidas), COLORES.volumen, { titulo: 'Volumen', unidad: 'ml' });
  }, []);

  const toggleCongelar = () => {
    const v = !congelado;
    setCongelado(v);
    sim.congelar(v);
  };

  const f0 = (v: number | null) => (v === null ? '--' : v.toFixed(0));
  const f1 = (v: number | null) => (v === null ? '--' : v.toFixed(1));

  return (
    <section id="monitor-vent" className={`monitor monitor-vent ${compacto ? 'compacto' : ''}`} aria-label="Monitor del ventilador">
      <header className="monitor-cabecera">
        <span className="monitor-titulo">VENTILADOR · {r.modo}</span>
        <div className="alarmas" role="status" aria-live="polite">
          {alarmas.length === 0 ? (
            <span className="alarma ok">Sin alarmas</span>
          ) : (
            alarmas.map((a) => (
              <span key={a} className={`alarma ${a === 'desconexion' || a === 'apnea' || a === 'presionAlta' ? 'alta' : 'media'}`}>
                {ETIQUETAS_ALARMA[a]}
              </span>
            ))
          )}
        </div>
        <label className="interruptor" title="Sonido de alarmas">
          <input type="checkbox" checked={sonido} onChange={(e) => setSonido(e.target.checked)} aria-label="Sonido de alarmas" />
          <span aria-hidden="true">🔔</span>
        </label>
      </header>
      <div className="monitor-cuerpo">
        <div className="curvas">
          <Lienzo dibujar={dibujarPresion} className="curva" aria-label="Curva de presión en la vía aérea" />
          <Lienzo dibujar={dibujarFlujo} className="curva" aria-label="Curva de flujo" />
          <Lienzo dibujar={dibujarVolumen} className="curva" aria-label="Curva de volumen" />
        </div>
        <div className="numeros">
          <Valor etiqueta="Ppico" valor={f0(m.ppico)} unidad="cmH₂O" color={COLORES.presion} alerta={m.ppico > r.alarmaPmax} />
          <Valor etiqueta="PEEP" valor={f0(m.peep)} unidad="cmH₂O" color={COLORES.presion} />
          <Valor etiqueta="VTE" valor={f0(m.vte * 1000)} unidad="ml" color={COLORES.volumen} alerta={m.vte < r.alarmaVteMin} />
          <Valor etiqueta="VM" valor={f1(m.vmEsp)} unidad="L/min" color={COLORES.volumen} />
          <Valor etiqueta="FR" valor={f0(m.frTotal)} unidad="rpm" sub={m.frEspontanea > 0.5 ? `esp ${f0(m.frEspontanea)}` : undefined} />
          <Valor etiqueta="FiO₂" valor={(r.fio2 * 100).toFixed(0)} unidad="%" />
          <Valor etiqueta="Pplat" valor={f0(m.pplat)} unidad="cmH₂O" color={COLORES.presion} atenuado={m.pplat === null} />
          <Valor etiqueta="PEEP total" valor={f0(m.peepTotal)} unidad="cmH₂O" color={COLORES.presion} atenuado={m.peepTotal === null} />
        </div>
      </div>
      <div className="detalle-medidas">
        <span>Pmedia <b>{f0(m.pmedia)}</b></span>
        <span>VTI <b>{f0(m.vti * 1000)}</b> ml</span>
        <span>I:E <b>{m.ie}</b></span>
        <span>Ti <b>{m.ti.toFixed(1)}</b> s</span>
        {m.fuga > 0.05 && <span>Fuga <b>{(m.fuga * 100).toFixed(0)}</b> %</span>}
        {m.pplat !== null && (
          <>
            <span>Ppico−Pplat <b>{f0(m.gradiente)}</b></span>
            {m.resistencia !== null && <span>R <b>{f0(m.resistencia)}</b> cmH₂O/L/s</span>}
          </>
        )}
        {m.peepTotal !== null && <span>auto-PEEP <b>{f1(m.autoPeep)}</b></span>}
        {m.pplat !== null && m.drivingPressure !== null && (
          <>
            <span>DP <b>{f0(m.drivingPressure)}</b></span>
            <span>Cest <b>{m.complianceEstatica === null ? '--' : (m.complianceEstatica * 1000).toFixed(0)}</b> ml/cmH₂O</span>
          </>
        )}
      </div>
      <footer className="monitor-pie">
        <div className="programado" role="group" aria-label="Parámetros programados">
          <span className="chip">{r.modo}</span>
          {r.modo === 'VC' && (
            <>
              <span className="chip">Vt {(r.vt * 1000).toFixed(0)} ml</span>
              <span className="chip">Flujo {(r.flujo * 60).toFixed(0)} L/min</span>
              {r.pausa > 0 && <span className="chip">Pausa {r.pausa.toFixed(1)} s</span>}
            </>
          )}
          {r.modo === 'PC' && (
            <>
              <span className="chip">ΔP {r.deltaP} cmH₂O</span>
              <span className="chip">Ti {r.ti.toFixed(1)} s</span>
            </>
          )}
          {r.modo === 'PS' && (
            <>
              <span className="chip">PS {r.ps} cmH₂O</span>
              <span className="chip">Trigger esp. {(r.trigE * 100).toFixed(0)} %</span>
              <span className="chip">Ti máx {r.tiMax.toFixed(1)} s</span>
            </>
          )}
          <span className="chip">FR {r.fr}{r.modo === 'PS' ? ' (resp.)' : ''}</span>
          <span className="chip">PEEP {r.peep}</span>
          <span className="chip">FiO₂ {(r.fio2 * 100).toFixed(0)} %</span>
          {r.triggerFlujo > 0 && <span className="chip">Trigger {r.triggerFlujo} L/min</span>}
          {r.modo !== 'PS' && <span className="chip">I:E {ieProgramado(r)}</span>}
        </div>
        <div className="botones-monitor">
          <button type="button" className="boton" onClick={() => sim.pausaInspiratoria()} disabled={sim.vent.pausaInspPendiente}>
            {sim.vent.pausaInspPendiente ? 'Pausa insp…' : 'Pausa insp.'}
          </button>
          <button type="button" className="boton" onClick={() => sim.pausaEspiratoria()} disabled={sim.vent.pausaEspPendiente}>
            {sim.vent.pausaEspPendiente ? 'Pausa esp…' : 'Pausa esp.'}
          </button>
          <button type="button" className={`boton ${congelado ? 'activo' : ''}`} onClick={toggleCongelar} aria-pressed={congelado}>
            {congelado ? 'Reanudar' : 'Congelar'}
          </button>
        </div>
      </footer>
    </section>
  );
}

function ieProgramado(r: Respirador): string {
  const ttot = 60 / r.fr;
  const ti = r.modo === 'VC' ? r.vt / r.flujo + r.pausa : r.ti;
  const te = ttot - ti;
  if (te <= 0) return '—';
  const ratio = te / ti;
  return ratio >= 1 ? `1:${ratio.toFixed(1)}` : `${(1 / ratio).toFixed(1)}:1`;
}

function Valor({
  etiqueta,
  valor,
  unidad,
  color,
  alerta,
  atenuado,
  sub,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  color?: string;
  alerta?: boolean;
  atenuado?: boolean;
  sub?: string;
}) {
  return (
    <div className={`valor ${alerta ? 'alerta' : ''} ${atenuado ? 'atenuado' : ''}`} style={{ color: color ?? '#e6edf3' }}>
      <span className="valor-etiqueta">{etiqueta}</span>
      <span className="valor-numero">{valor}</span>
      <span className="valor-unidad">{unidad}{sub ? ` · ${sub}` : ''}</span>
    </div>
  );
}

// Vistas del buffer en unidades de pantalla, reutilizando un array para no generar basura.
let vistaFlujo: Array<{ t: number; paw: number; flujo: number; volumen: number; co2: number; ecg: number; pleth: number }> = [];
let vistaVolumen: typeof vistaFlujo = [];

function vistaFlujoLmin(s: Simulador) {
  const b = s.bufferMuestras;
  if (vistaFlujo.length !== b.length) vistaFlujo = b.map((m) => ({ ...m }));
  for (let i = 0; i < b.length; i++) {
    const src = b[i];
    const dst = vistaFlujo[i];
    if (!src || !dst) continue;
    dst.t = src.t;
    dst.flujo = src.flujo * 60;
  }
  return vistaFlujo;
}

function vistaVolumenMl(s: Simulador) {
  const b = s.bufferMuestras;
  if (vistaVolumen.length !== b.length) vistaVolumen = b.map((m) => ({ ...m }));
  for (let i = 0; i < b.length; i++) {
    const src = b[i];
    const dst = vistaVolumen[i];
    if (!src || !dst) continue;
    dst.t = src.t;
    dst.volumen = src.volumen * 1000;
  }
  return vistaVolumen;
}

let audioCtx: AudioContext | null = null;
let ultimoPitido = 0;
function pitido(): void {
  const ahora = performance.now();
  if (ahora - ultimoPitido < 1500) return;
  ultimoPitido = ahora;
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch {
    // Sin audio disponible.
  }
}
