import type { Caso, MedidasPaso } from './schema';
import type { Paciente, Respirador } from '../engine/types';
import { simular } from '../engine/analisis';
import { gradienteCO2, paco2Equilibrio, pao2Equilibrio, saturacion } from '../engine/gases';
import { gastoRelativo, objetivosHemo } from '../engine/hemodinamica';

/**
 * Recorre un caso por la rama correcta y devuelve las medidas de equilibrio en cada paso.
 * El índice 0 es el estado inicial; el índice k es el estado tras la transición del paso k.
 * Es lo que usan los tests de `expectativas` y el script `npm run medidas`.
 */
export function simularCaso(caso: Caso): MedidasPaso[] {
  let p: Paciente = { ...caso.pacienteInicial };
  let r: Respirador = { ...caso.respiradorInicial };
  let objetivosGases = caso.gasesIniciales;
  const salida: MedidasPaso[] = [medirEstado(0, p, r, objetivosGases)];
  caso.pasos.forEach((paso, i) => {
    const tr = paso.transicion;
    if (tr) {
      if (tr.paciente) p = { ...p, ...tr.paciente };
      if (tr.respirador) r = { ...r, ...tr.respirador };
      if (tr.gases !== undefined) objetivosGases = tr.gases;
    }
    salida.push(medirEstado(i + 1, p, r, objetivosGases));
  });
  return salida;
}

export function medirEstado(
  paso: number,
  p: Paciente,
  r: Respirador,
  objetivosGases?: { paco2?: number; spo2?: number },
): MedidasPaso {
  const res = simular(p, r, { nCiclos: 16 });
  const m = res.medidas;
  const paco2 = objetivosGases?.paco2 ?? paco2Equilibrio(m, p);
  // Hemodinámica y gases se acoplan por el gasto: dos iteraciones bastan.
  let hemo = { tas: p.tasBase, tad: p.tadBase, fc: p.fcBase };
  let spo2 = 97;
  for (let i = 0; i < 3; i++) {
    const gasto = gastoRelativo(hemo, p);
    const pao2 = pao2Equilibrio(p, r, paco2, gasto);
    spo2 = objetivosGases?.spo2 ?? saturacion(pao2);
    hemo = objetivosHemo(p, m, res.autoPeepReal, spo2);
  }
  const gasto = gastoRelativo(hemo, p);
  const fraccionEspirada = m.vti > 0.02 ? m.vte / m.vti : 1;
  const factorFuga = p.extubado || p.fuga >= 1 ? 0 : Math.max(0, Math.min(1, (fraccionEspirada - 0.15) / 0.5));
  const etco2 = Math.max(0, paco2 - gradienteCO2(p, m, gasto)) * factorFuga;
  return {
    paso,
    ppico: m.ppico,
    pplat: m.pplat,
    peepTotal: m.peepTotal,
    autoPeep: m.autoPeep,
    gradiente: m.gradiente,
    drivingPressure: m.drivingPressure,
    complianceEstatica: m.complianceEstatica,
    resistencia: m.resistencia,
    vti: m.vti,
    vte: m.vte,
    vmEsp: m.vmEsp,
    frTotal: m.frTotal,
    frEspontanea: m.frEspontanea,
    pmedia: m.pmedia,
    ti: m.ti,
    te: m.te,
    fuga: m.fuga,
    cicladoPorTiMax: m.cicladoPorTiMax,
    autoPeepReal: res.autoPeepReal,
    flujoFinEsp: res.flujoFinEsp,
    volumenMedidoFinEsp: res.volumenMedidoFinEsp,
    paco2,
    etco2,
    spo2,
    tas: hemo.tas,
    tad: hemo.tad,
    fc: hemo.fc,
  };
}

/** Tabla legible de las medidas de un caso, para el script y la documentación. */
export function tablaMedidas(medidas: MedidasPaso[]): string {
  const f = (v: number | null, d = 1) => (v === null ? '—' : v.toFixed(d));
  const cab = [
    'paso', 'Ppico', 'Pplat', 'PEEPtot', 'autoPEEP', 'grad', 'DP', 'Cest(ml)', 'R', 'VTI(ml)', 'VTE(ml)',
    'VM', 'FR', 'FResp', 'Pmed', 'Ti', 'Te', 'fuga%', 'TiMax', 'Fl.finEsp', 'PaCO2', 'EtCO2', 'SpO2', 'TA', 'FC',
  ];
  const filas = medidas.map((m) => [
    String(m.paso),
    f(m.ppico), f(m.pplat), f(m.peepTotal), f(m.autoPeep), f(m.gradiente), f(m.drivingPressure),
    m.complianceEstatica === null ? '—' : (m.complianceEstatica * 1000).toFixed(0),
    f(m.resistencia), (m.vti * 1000).toFixed(0), (m.vte * 1000).toFixed(0), f(m.vmEsp), f(m.frTotal, 0), f(m.frEspontanea, 0),
    f(m.pmedia), f(m.ti, 2), f(m.te, 2), (m.fuga * 100).toFixed(0), m.cicladoPorTiMax ? 'sí' : 'no',
    f(m.flujoFinEsp, 2), f(m.paco2, 0), f(m.etco2, 0), f(m.spo2, 0), `${m.tas.toFixed(0)}/${m.tad.toFixed(0)}`, f(m.fc, 0),
  ]);
  const anchos = cab.map((c, i) => Math.max(c.length, ...filas.map((fl) => (fl[i] ?? '').length)));
  const linea = (cols: string[]) => cols.map((c, i) => c.padStart(anchos[i] ?? 0)).join('  ');
  return [linea(cab), ...filas.map(linea)].join('\n');
}
