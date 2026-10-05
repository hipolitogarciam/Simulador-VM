import { useEffect, useState } from 'react';
import { pasoActual, useApp } from '../store/useApp';
import { Markdown } from './Markdown';
import { pesoIdeal } from '../engine/defaults';

export function PanelCaso() {
  const sesion = useApp((s) => s.sesion);
  const responder = useApp((s) => s.responder);
  const siguiente = useApp((s) => s.siguientePaso);
  const terminarConsecuencia = useApp((s) => s.terminarConsecuencia);
  const abandonar = useApp((s) => s.abandonarCaso);
  const [restante, setRestante] = useState(0);

  // Cuenta atrás de la consecuencia de una opción errónea.
  useEffect(() => {
    if (!sesion || sesion.fase !== 'consecuencia' || sesion.finConsecuencia === null) return;
    const fin = sesion.finConsecuencia;
    const id = window.setInterval(() => {
      const r = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      setRestante(r);
      if (r <= 0) terminarConsecuencia();
    }, 250);
    return () => window.clearInterval(id);
  }, [sesion, terminarConsecuencia]);

  const actual = pasoActual(sesion);
  if (!sesion || !actual) return null;
  const { caso, paso } = actual;
  const elegida = sesion.opcionElegida !== null ? paso.opciones[sesion.opcionElegida] : null;
  const correcta = paso.opciones.find((o) => o.correcta);
  const pi = pesoIdeal(caso.datos.sexo, caso.datos.talla);
  const ultimo = sesion.pasoIdx >= caso.pasos.length - 1;

  return (
    <section className="panel-caso" aria-label="Panel del caso">
      <header className="caso-cabecera">
        <div>
          <span className="caso-numero">Caso {caso.numero} · paso {sesion.pasoIdx + 1} de {caso.pasos.length}</span>
          <h1 className="caso-titulo">{caso.titulo}</h1>
        </div>
        <button type="button" className="boton secundario" onClick={abandonar}>
          Salir
        </button>
      </header>
      <div className="progreso-pasos" aria-hidden="true">
        {caso.pasos.map((p, i) => {
          const r = sesion.respuestas.find((x) => x.pasoId === p.id);
          const clase = r ? (r.correcta ? 'ok' : 'mal') : i === sesion.pasoIdx ? 'actual' : '';
          return <span key={p.id} className={`punto ${clase}`} />;
        })}
      </div>
      <details className="datos-paciente">
        <summary>Datos del paciente</summary>
        <p>
          {caso.datos.sexo === 'hombre' ? 'Hombre' : 'Mujer'}, {caso.datos.edad} años, talla {caso.datos.talla} cm
          {caso.datos.pesoReal ? `, peso real ${caso.datos.pesoReal} kg` : ''}. Peso ideal ≈ <b>{pi.toFixed(0)} kg</b> → 6 ml/kg ≈{' '}
          <b>{(pi * 6).toFixed(0)} ml</b>.
        </p>
        <p>{caso.datos.contexto}</p>
      </details>

      <h2 className="paso-titulo">{paso.titulo}</h2>
      <Markdown texto={paso.narrativa} className="narrativa" />

      <div className="pregunta" role="group" aria-labelledby="pregunta-texto">
        <p id="pregunta-texto" className="pregunta-texto">
          {paso.pregunta}
        </p>
        {paso.pista && sesion.fase === 'pregunta' && <p className="pista">💡 {paso.pista}</p>}
        <ol className="opciones">
          {paso.opciones.map((o, i) => {
            const estado =
              sesion.fase === 'pregunta'
                ? ''
                : o.correcta
                  ? 'correcta'
                  : sesion.opcionElegida === i
                    ? 'incorrecta'
                    : 'inactiva';
            return (
              <li key={i}>
                <button
                  type="button"
                  className={`opcion ${estado}`}
                  onClick={() => responder(i)}
                  disabled={sesion.fase !== 'pregunta'}
                  aria-pressed={sesion.opcionElegida === i}
                >
                  <span className="letra">{'ABCD'[i]}</span>
                  <span>{o.texto}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {sesion.fase === 'consecuencia' && elegida && (
        <div className="feedback incorrecto" role="alert">
          <h3>Respuesta incorrecta</h3>
          <p>{elegida.consecuencia ?? 'Observa en el monitor la consecuencia de esta decisión.'}</p>
          <p className="cuenta-atras">Observa el monitor… se continúa por la rama correcta en {restante} s.</p>
          <button type="button" className="boton" onClick={terminarConsecuencia}>
            Continuar ya
          </button>
        </div>
      )}

      {sesion.fase === 'feedback' && elegida && correcta && (
        <div className="feedback-bloque">
          {elegida.correcta ? (
            <div className="feedback correcto" role="status">
              <h3>✓ Correcto</h3>
              <p>{elegida.explicacion}</p>
            </div>
          ) : (
            <>
              <div className="feedback incorrecto" role="alert">
                <h3>✗ Incorrecto</h3>
                <p>{elegida.explicacion}</p>
              </div>
              <div className="feedback correcto">
                <h3>Respuesta correcta: {'ABCD'[paso.opciones.indexOf(correcta)]}</h3>
                <p>
                  <b>{correcta.texto}</b>
                </p>
                <p>{correcta.explicacion}</p>
              </div>
            </>
          )}
          {paso.transicion && <p className="nota-transicion">Observa cómo cambian las curvas y las constantes en los próximos segundos.</p>}
          <button type="button" className="boton primario" onClick={siguiente}>
            {ultimo ? 'Ver resumen del caso' : 'Siguiente paso →'}
          </button>
        </div>
      )}
    </section>
  );
}
