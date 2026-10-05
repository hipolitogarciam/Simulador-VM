import { CASOS } from '../cases';
import { fallosPorTema } from '../store/progreso';
import { useApp } from '../store/useApp';

function fecha(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function Progreso() {
  const datos = useApp((s) => s.datos);
  const irA = useApp((s) => s.irA);
  const perfil = datos.perfiles.find((p) => p.id === datos.perfilActivo) ?? null;
  if (!perfil) {
    return (
      <div className="pagina">
        <p>No hay ningún perfil activo.</p>
        <button type="button" className="boton" onClick={() => irA('inicio')}>
          Volver
        </button>
      </div>
    );
  }
  const fallos = fallosPorTema(perfil);
  const maxFallos = Math.max(1, ...fallos.map((f) => f.fallos));

  return (
    <div className="pagina">
      <header className="cabecera-app">
        <h1>Mi progreso · {perfil.nombre}</h1>
        <button type="button" className="boton secundario" onClick={() => irA('inicio')}>
          ← Inicio
        </button>
      </header>
      <section className="tarjeta">
        <h2>Aciertos por caso</h2>
        <table className="tabla">
          <thead>
            <tr>
              <th>Caso</th>
              <th>Estado</th>
              <th>Intentos</th>
              <th>Mejor</th>
              <th>Último intento</th>
            </tr>
          </thead>
          <tbody>
            {CASOS.map((c) => {
              const pc = perfil.casos[c.id];
              const ultimo = pc?.intentos[pc.intentos.length - 1];
              const aciertos = ultimo ? ultimo.respuestas.filter((r) => r.correcta).length : null;
              return (
                <tr key={c.id}>
                  <td>
                    {c.numero}. {c.titulo}
                  </td>
                  <td>{pc?.estado ?? 'no iniciado'}</td>
                  <td>{pc?.intentos.length ?? 0}</td>
                  <td>{pc?.mejorPuntuacion !== null && pc?.mejorPuntuacion !== undefined ? `${pc.mejorPuntuacion} %` : '—'}</td>
                  <td>
                    {fecha(pc?.ultimoIntento ?? null)}
                    {aciertos !== null && ultimo ? ` (${aciertos}/${ultimo.respuestas.length})` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="tarjeta">
        <h2>Fallos por tema</h2>
        {fallos.length === 0 ? (
          <p>Todavía no hay fallos registrados.</p>
        ) : (
          <ul className="barras">
            {fallos.map((f) => (
              <li key={f.tema}>
                <span className="barra-etiqueta">{f.tema}</span>
                <span className="barra" style={{ width: `${(100 * f.fallos) / maxFallos}%` }} aria-hidden="true" />
                <span className="barra-valor">{f.fallos}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
