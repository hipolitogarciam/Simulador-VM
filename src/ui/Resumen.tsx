import { casoPorId } from '../cases';
import { resumenSesion, useApp } from '../store/useApp';

export function Resumen() {
  const sesion = useApp((s) => s.sesion);
  const irA = useApp((s) => s.irA);
  const iniciarCaso = useApp((s) => s.iniciarCaso);
  const caso = sesion ? casoPorId(sesion.casoId) : undefined;
  if (!sesion || !caso) {
    return (
      <div className="pagina">
        <button type="button" className="boton" onClick={() => irA('inicio')}>
          Volver al inicio
        </button>
      </div>
    );
  }
  const r = resumenSesion(sesion, caso);
  const pct = Math.round((100 * r.aciertos) / r.total);
  return (
    <div className="pagina">
      <header className="cabecera-app">
        <div>
          <span className="caso-numero">Caso {caso.numero}</span>
          <h1>{caso.titulo}</h1>
        </div>
      </header>
      <section className="tarjeta resumen">
        <h2>Resultado</h2>
        <p className="puntuacion">
          {r.aciertos} de {r.total} aciertos · <b>{pct} %</b>
        </p>
        {r.fallosPorTema.length > 0 ? (
          <>
            <h3>Fallos por tema</h3>
            <ul>
              {r.fallosPorTema.map(([tema, n]) => (
                <li key={tema}>
                  {tema}: {n}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Sin fallos. ¡Enhorabuena!</p>
        )}
      </section>
      <section className="tarjeta">
        <h2>Puntos clave</h2>
        <ol className="puntos-clave">
          {caso.puntosClave.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      </section>
      <div className="fila-acciones">
        <button type="button" className="boton primario" onClick={() => irA('inicio')}>
          Volver al inicio
        </button>
        <button type="button" className="boton secundario" onClick={() => iniciarCaso(caso.id)}>
          Repetir el caso
        </button>
        <button type="button" className="boton secundario" onClick={() => irA('progreso')}>
          Mi progreso
        </button>
      </div>
    </div>
  );
}
