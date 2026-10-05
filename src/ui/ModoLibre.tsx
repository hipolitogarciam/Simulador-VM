import { useEffect, useState } from 'react';
import type { Modo, Paciente, Respirador } from '../engine/types';
import { PACIENTE_BASE, RESPIRADOR_BASE } from '../engine/defaults';
import { cargarPaciente, detenerBucle, getSimulador, iniciarBucle } from '../store/simulacion';
import { useApp } from '../store/useApp';
import { MonitorVentilador } from './MonitorVentilador';
import { MonitorConstantes } from './MonitorConstantes';

interface Preset {
  nombre: string;
  descripcion: string;
  paciente: Partial<Paciente>;
}

const PRESETS: Preset[] = [
  { nombre: 'Pulmón sano', descripcion: 'R 10, C 50 ml/cmH₂O', paciente: {} },
  { nombre: 'Secreciones', descripcion: 'R 18 con dientes de sierra', paciente: { R: 18, Rexp: 18, secreciones: 0.12 } },
  { nombre: 'Obstrucción proximal (tubo)', descripcion: 'R 20 en ambas fases', paciente: { R: 20, Rexp: 20 } },
  { nombre: 'Broncoespasmo (obstrucción distal)', descripcion: 'R 32, Rexp 60: atrapamiento', paciente: { R: 32, Rexp: 60 } },
  { nombre: 'Intubación selectiva', descripcion: 'C 25 ml/cmH₂O', paciente: { C: 0.025, shunt: 0.3 } },
  { nombre: 'SDRA', descripcion: 'C 30 ml/cmH₂O, shunt alto reclutable', paciente: { C: 0.03, shunt: 0.35, reclutabilidad: 0.04 } },
  { nombre: 'Fuga en el circuito', descripcion: 'Conductancia 0,035 L/s/cmH₂O', paciente: { fuga: 0.035 } },
  { nombre: 'Desconexión', descripcion: 'Fuga total', paciente: { fuga: 5 } },
  { nombre: 'Desadaptación', descripcion: 'Esfuerzos fuera de fase', paciente: { pmus: { tipo: 'desadaptado', amp1: 9, per1: 1.3, amp2: 5, per2: 0.55 } } },
  { nombre: 'Hambre de flujo (VC)', descripcion: 'Esfuerzo intenso durante la inspiración', paciente: { pmus: { tipo: 'hambreFlujo', amplitud: 9 } } },
  { nombre: 'Espiración activa (PC)', descripcion: 'Joroba en la presión', paciente: { pmus: { tipo: 'espiracionActiva', amplitud: 14 } } },
  { nombre: 'Respiración espontánea', descripcion: 'FR 16, para PS o trigger', paciente: { pmus: { tipo: 'espontaneo', fr: 16, amplitud: 5, ti: 0.8 } } },
];

export function ModoLibre() {
  const irA = useApp((s) => s.irA);
  const [presetIdx, setPresetIdx] = useState(0);
  const [r, setR] = useState<Respirador>({ ...RESPIRADOR_BASE });
  const [pestana, setPestana] = useState<'vent' | 'const'>('vent');

  useEffect(() => {
    cargarPaciente(PACIENTE_BASE, RESPIRADOR_BASE);
    iniciarBucle();
    return () => detenerBucle();
  }, []);

  const aplicarPreset = (i: number) => {
    setPresetIdx(i);
    const p = PRESETS[i];
    if (!p) return;
    getSimulador().aplicarTransicion({ paciente: { ...PACIENTE_BASE, ...p.paciente }, duracion: 3 });
  };

  const cambiar = (c: Partial<Respirador>) => {
    const nuevo = { ...r, ...c };
    setR(nuevo);
    getSimulador().programar(c);
  };

  return (
    <div className="pantalla-caso modo-libre">
      <div className="zona-monitores">
        <div className="pestanas" role="tablist">
          <button type="button" role="tab" aria-selected={pestana === 'vent'} className={pestana === 'vent' ? 'activa' : ''} onClick={() => setPestana('vent')}>
            Ventilador
          </button>
          <button type="button" role="tab" aria-selected={pestana === 'const'} className={pestana === 'const' ? 'activa' : ''} onClick={() => setPestana('const')}>
            Monitor
          </button>
        </div>
        <div className={`monitores pestana-${pestana}`}>
          <MonitorVentilador />
          <MonitorConstantes />
        </div>
      </div>
      <div className="zona-caso">
        <section className="panel-caso">
          <header className="caso-cabecera">
            <h1 className="caso-titulo">Modo libre</h1>
            <button type="button" className="boton secundario" onClick={() => irA('inicio')}>
              Salir
            </button>
          </header>
          <h2 className="paso-titulo">Paciente</h2>
          <div className="controles">
            <label>
              Situación
              <select value={presetIdx} onChange={(e) => aplicarPreset(Number(e.target.value))}>
                {PRESETS.map((p, i) => (
                  <option key={p.nombre} value={i}>
                    {p.nombre} — {p.descripcion}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h2 className="paso-titulo">Respirador</h2>
          <div className="controles">
            <label>
              Modo
              <select value={r.modo} onChange={(e) => cambiar({ modo: e.target.value as Modo })}>
                <option value="VC">VC · volumen control</option>
                <option value="PC">PC · presión control</option>
                <option value="PS">PS · presión soporte</option>
              </select>
            </label>
            {r.modo === 'VC' && (
              <>
                <Deslizador etiqueta="Vt (ml)" valor={r.vt * 1000} min={200} max={800} paso={10} onChange={(v) => cambiar({ vt: v / 1000 })} />
                <Deslizador etiqueta="Flujo (L/min)" valor={r.flujo * 60} min={20} max={90} paso={5} onChange={(v) => cambiar({ flujo: v / 60 })} />
                <Deslizador etiqueta="Pausa insp. (s)" valor={r.pausa} min={0} max={1} paso={0.1} onChange={(v) => cambiar({ pausa: v })} />
              </>
            )}
            {r.modo === 'PC' && (
              <>
                <Deslizador etiqueta="ΔP (cmH₂O)" valor={r.deltaP} min={5} max={30} paso={1} onChange={(v) => cambiar({ deltaP: v })} />
                <Deslizador etiqueta="Ti (s)" valor={r.ti} min={0.5} max={2.5} paso={0.1} onChange={(v) => cambiar({ ti: v })} />
              </>
            )}
            {r.modo === 'PS' && (
              <>
                <Deslizador etiqueta="PS (cmH₂O)" valor={r.ps} min={4} max={25} paso={1} onChange={(v) => cambiar({ ps: v })} />
                <Deslizador etiqueta="Trigger esp. (%)" valor={r.trigE * 100} min={5} max={70} paso={5} onChange={(v) => cambiar({ trigE: v / 100 })} />
                <Deslizador etiqueta="Ti máx (s)" valor={r.tiMax} min={1} max={4} paso={0.1} onChange={(v) => cambiar({ tiMax: v })} />
              </>
            )}
            <Deslizador etiqueta={r.modo === 'PS' ? 'FR respaldo' : 'FR (rpm)'} valor={r.fr} min={6} max={35} paso={1} onChange={(v) => cambiar({ fr: v })} />
            <Deslizador etiqueta="PEEP (cmH₂O)" valor={r.peep} min={0} max={20} paso={1} onChange={(v) => cambiar({ peep: v })} />
            <Deslizador etiqueta="FiO₂ (%)" valor={r.fio2 * 100} min={21} max={100} paso={1} onChange={(v) => cambiar({ fio2: v / 100 })} />
            <Deslizador etiqueta="Trigger insp. (L/min, 0 = off)" valor={r.triggerFlujo} min={0} max={5} paso={0.5} onChange={(v) => cambiar({ triggerFlujo: v })} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Deslizador({ etiqueta, valor, min, max, paso, onChange }: { etiqueta: string; valor: number; min: number; max: number; paso: number; onChange: (v: number) => void }) {
  return (
    <label className="deslizador">
      <span>
        {etiqueta}: <b>{Number.isInteger(paso) ? valor.toFixed(0) : valor.toFixed(1)}</b>
      </span>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
