import { beforeEach, describe, expect, it } from 'vitest';
import { casoPorId } from '../cases';
import type { Caso } from '../cases/schema';
import { getSimulador } from '../store/simulacion';
import { datosVacios } from '../store/progreso';
import { estadoGasesAntes, estadoPacienteAntes, estadoRespiradorAntes, resumenSesion, useApp } from '../store/useApp';

const app = () => useApp.getState();

function indiceCorrecta(caso: Caso, pasoIdx: number): number {
  return caso.pasos[pasoIdx]!.opciones.findIndex((o) => o.correcta);
}

/** Responde correctamente y avanza hasta quedar en la pregunta del paso `idx`. */
function avanzarHasta(caso: Caso, idx: number): void {
  for (let i = 0; i < idx; i++) {
    app().responder(indiceCorrecta(caso, i));
    app().siguientePaso();
  }
  expect(app().sesion?.pasoIdx).toBe(idx);
  expect(app().sesion?.fase).toBe('pregunta');
}

beforeEach(() => {
  useApp.setState({ datos: datosVacios(), pantalla: 'inicio', sesion: null });
  app().crearPerfil('Test');
});

describe('Store · perfiles', () => {
  it('crea, selecciona, importa y elimina perfiles', () => {
    expect(app().perfilActivo()?.nombre).toBe('Test');
    app().crearPerfil('   ');
    expect(app().datos.perfiles).toHaveLength(1);
    app().crearPerfil('Otro');
    expect(app().perfilActivo()?.nombre).toBe('Otro');
    const primero = app().datos.perfiles[0]!;
    app().seleccionarPerfil(primero.id);
    expect(app().perfilActivo()?.id).toBe(primero.id);
    app().importarPerfil({ ...primero, nombre: 'Renombrado' });
    expect(app().datos.perfiles).toHaveLength(2);
    expect(app().perfilActivo()?.nombre).toBe('Renombrado');
    app().eliminarPerfil(primero.id);
    expect(app().datos.perfiles).toHaveLength(1);
    expect(app().perfilActivo()?.nombre).toBe('Otro');
  });
});

describe('Store · sesión de caso', () => {
  it('iniciar un caso carga el simulador y marca el caso en curso', () => {
    const caso = casoPorId('caso-01-intubacion-selectiva')!;
    app().iniciarCaso(caso.id);
    expect(app().pantalla).toBe('caso');
    expect(app().sesion).toMatchObject({ casoId: caso.id, pasoIdx: 0, fase: 'pregunta', respuestas: [] });
    expect(getSimulador().respirador).toEqual(caso.respiradorInicial);
    expect(getSimulador().medidas.vte).toBeGreaterThan(0.3);
    expect(app().perfilActivo()?.casos[caso.id]?.estado).toBe('en curso');
  });

  it('responder bien aplica la transición del paso; "Siguiente" salta el tiempo del paso siguiente', () => {
    const caso = casoPorId('caso-08-asincronia-traslado')!;
    app().iniciarCaso(caso.id);
    const t0 = getSimulador().tiempo;
    app().responder(indiceCorrecta(caso, 0));
    expect(app().sesion?.fase).toBe('feedback');
    expect(app().sesion?.respuestas[0]?.correcta).toBe(true);
    // Responder de nuevo en feedback no hace nada.
    app().responder(0);
    expect(app().sesion?.respuestas).toHaveLength(1);
    app().siguientePaso();
    expect(app().sesion?.pasoIdx).toBe(1);
    expect(getSimulador().tiempo - t0).toBeCloseTo(caso.pasos[1]!.saltoTiempo ?? 45, 1);
    expect(app().perfilActivo()?.casos[caso.id]?.pasoActual).toBe(1);
  });

  it('una opción errónea con consecuencia en el respirador se muestra y después se revierte', () => {
    const caso = casoPorId('caso-01-intubacion-selectiva')!;
    const pasoIdx = caso.pasos.findIndex((p) => p.opciones.some((o) => o.transicionConsecuencia?.respirador));
    const paso = caso.pasos[pasoIdx]!;
    const opIdx = paso.opciones.findIndex((o) => o.transicionConsecuencia?.respirador);
    const cambio = paso.opciones[opIdx]!.transicionConsecuencia!.respirador!;
    app().iniciarCaso(caso.id);
    avanzarHasta(caso, pasoIdx);
    app().responder(opIdx);
    expect(app().sesion?.fase).toBe('consecuencia');
    expect(app().sesion?.finConsecuencia).toBeGreaterThan(Date.now());
    expect(getSimulador().respirador).toMatchObject(cambio);
    app().terminarConsecuencia();
    expect(app().sesion?.fase).toBe('feedback');
    expect(app().sesion?.finConsecuencia).toBeNull();
    expect(getSimulador().respirador).toEqual({ ...estadoRespiradorAntes(caso, pasoIdx), ...paso.transicion?.respirador });
  });

  it('una consecuencia que fija gases se revierte a los objetivos previos del caso', () => {
    const caso = casoPorId('caso-06-secreciones-traslado')!;
    const pasoIdx = caso.pasos.findIndex((p) => p.opciones.some((o) => o.transicionConsecuencia?.gases));
    const paso = caso.pasos[pasoIdx]!;
    const opIdx = paso.opciones.findIndex((o) => o.transicionConsecuencia?.gases);
    app().iniciarCaso(caso.id);
    avanzarHasta(caso, pasoIdx);
    app().responder(opIdx);
    expect(getSimulador().objetivosGases).toEqual(paso.opciones[opIdx]!.transicionConsecuencia!.gases);
    app().terminarConsecuencia();
    expect(getSimulador().objetivosGases).toEqual(paso.transicion?.gases ?? estadoGasesAntes(caso, pasoIdx));
    expect(getSimulador().objetivosGases?.spo2).toBeUndefined();
    getSimulador().avanzar(200);
    expect(getSimulador().constantes.spo2).toBeGreaterThan(95);
  });

  it('una consecuencia que cambia al paciente no contamina la rampa de la transición del paso', () => {
    const caso = casoPorId('caso-08-asincronia-traslado')!;
    const pasoIdx = caso.pasos.findIndex((p) => p.opciones.some((o) => o.transicionConsecuencia?.paciente?.fcBase));
    const paso = caso.pasos[pasoIdx]!;
    const opIdx = paso.opciones.findIndex((o) => o.transicionConsecuencia?.paciente?.fcBase);
    app().iniciarCaso(caso.id);
    avanzarHasta(caso, pasoIdx);
    app().responder(opIdx);
    getSimulador().avanzar(5);
    expect(getSimulador().paciente.fcBase).toBe(paso.opciones[opIdx]!.transicionConsecuencia!.paciente!.fcBase);
    app().terminarConsecuencia();
    getSimulador().avanzar((paso.transicion?.duracion ?? 8) + 1);
    const esperado = { ...estadoPacienteAntes(caso, pasoIdx), ...paso.transicion?.paciente };
    expect(getSimulador().paciente).toEqual(esperado);
  });

  it('al terminar el caso se guarda el intento con su puntuación y se muestra el resumen', () => {
    const caso = casoPorId('caso-01-intubacion-selectiva')!;
    app().iniciarCaso(caso.id);
    for (let i = 0; i < caso.pasos.length; i++) {
      const correcta = indiceCorrecta(caso, i);
      // El primer paso se falla con una opción sin consecuencia (o se termina la consecuencia).
      app().responder(i === 0 ? (correcta + 1) % 4 : correcta);
      if (app().sesion?.fase === 'consecuencia') app().terminarConsecuencia();
      app().siguientePaso();
    }
    expect(app().pantalla).toBe('resumen');
    const r = resumenSesion(app().sesion!, caso);
    expect(r.aciertos).toBe(caso.pasos.length - 1);
    expect(r.fallosPorTema).toHaveLength(1);
    const pc = app().perfilActivo()!.casos[caso.id]!;
    expect(pc.estado).toBe('completado');
    expect(pc.intentos).toHaveLength(1);
    expect(pc.intentos[0]?.puntuacion).toBe(Math.round((100 * (caso.pasos.length - 1)) / caso.pasos.length));
    expect(pc.mejorPuntuacion).toBe(pc.intentos[0]?.puntuacion);
    expect(pc.pasoActual).toBe(0);
    // Al volver al inicio la sesión se descarta.
    app().irA('inicio');
    expect(app().sesion).toBeNull();
  });

  it('abandonar un caso con respuestas registra el intento parcial y limpia la sesión', () => {
    const caso = casoPorId('caso-03-asma-autopeep')!;
    app().iniciarCaso(caso.id);
    app().responder((indiceCorrecta(caso, 0) + 1) % 4);
    if (app().sesion?.fase === 'consecuencia') app().terminarConsecuencia();
    app().abandonarCaso();
    expect(app().sesion).toBeNull();
    expect(app().pantalla).toBe('inicio');
    const pc = app().perfilActivo()!.casos[caso.id]!;
    expect(pc.estado).toBe('en curso');
    expect(pc.intentos).toHaveLength(1);
    expect(pc.intentos[0]?.puntuacion).toBeUndefined();
    expect(pc.intentos[0]?.respuestas[0]?.correcta).toBe(false);
    // Abandonar sin responder no registra nada.
    app().iniciarCaso(caso.id);
    app().abandonarCaso();
    expect(app().perfilActivo()!.casos[caso.id]!.intentos).toHaveLength(1);
  });

  it('sin perfil activo se puede jugar pero no se guarda progreso', () => {
    useApp.setState({ datos: datosVacios() });
    const caso = casoPorId('caso-02-neumotorax-tension')!;
    app().iniciarCaso(caso.id);
    expect(app().sesion?.casoId).toBe(caso.id);
    app().responder(indiceCorrecta(caso, 0));
    app().siguientePaso();
    expect(app().sesion?.pasoIdx).toBe(1);
    expect(app().datos.perfiles).toHaveLength(0);
  });
});
