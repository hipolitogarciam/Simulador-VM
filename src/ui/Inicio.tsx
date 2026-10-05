import { useRef, useState } from 'react';
import { CASOS } from '../cases';
import { exportarCodigo, exportarJSON, importarCodigo, progresoCasoVacio } from '../store/progreso';
import { useApp } from '../store/useApp';

export function Inicio() {
  const datos = useApp((s) => s.datos);
  const crearPerfil = useApp((s) => s.crearPerfil);
  const seleccionarPerfil = useApp((s) => s.seleccionarPerfil);
  const eliminarPerfil = useApp((s) => s.eliminarPerfil);
  const importarPerfil = useApp((s) => s.importarPerfil);
  const iniciarCaso = useApp((s) => s.iniciarCaso);
  const irA = useApp((s) => s.irA);
  const [nombre, setNombre] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  const perfil = datos.perfiles.find((p) => p.id === datos.perfilActivo) ?? null;

  const exportarArchivo = () => {
    if (!perfil) return;
    const blob = new Blob([exportarJSON(perfil)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progreso-vmi-${perfil.nombre.replace(/\s+/g, '_')}.json`;
    a.click();
    // Revocar de inmediato puede cancelar la descarga en algunos navegadores.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copiarCodigo = async () => {
    if (!perfil) return;
    const c = await exportarCodigo(perfil);
    try {
      await navigator.clipboard.writeText(c);
      setMensaje('Código copiado al portapapeles.');
    } catch {
      setCodigo(c);
      setMostrarImportar(true);
      setMensaje('Copia el código del cuadro de texto.');
    }
  };

  const importar = async (texto: string) => {
    try {
      const p = await importarCodigo(texto);
      importarPerfil(p);
      setMensaje(`Progreso de "${p.nombre}" importado.`);
      setCodigo('');
      setMostrarImportar(false);
    } catch (e) {
      setMensaje(`No se pudo importar: ${(e as Error).message}`);
    }
  };

  const importarArchivo = async (f: File | undefined) => {
    if (!f) return;
    await importar(await f.text());
  };

  return (
    <div className="pagina">
      <header className="cabecera-app">
        <div>
          <h1>Simulador de casos clínicos de ventilación mecánica invasiva</h1>
          <p className="subtitulo">Para médicos de Urgencias y Emergencias, hospitalarias y prehospitalarias.</p>
        </div>
      </header>

      <section className="tarjeta" aria-labelledby="perfiles-titulo">
        <h2 id="perfiles-titulo">Perfil</h2>
        {datos.perfiles.length > 0 && (
          <div className="fila-perfiles">
            <label htmlFor="perfil-activo">Perfil activo</label>
            <select id="perfil-activo" value={datos.perfilActivo ?? ''} onChange={(e) => seleccionarPerfil(e.target.value)}>
              {datos.perfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {perfil && (
              <button
                type="button"
                className="boton secundario"
                onClick={() => {
                  if (window.confirm(`¿Eliminar el perfil "${perfil.nombre}" y todo su progreso de este dispositivo?`)) eliminarPerfil(perfil.id);
                }}
              >
                Eliminar
              </button>
            )}
          </div>
        )}
        <form
          className="fila-perfiles"
          onSubmit={(e) => {
            e.preventDefault();
            crearPerfil(nombre);
            setNombre('');
          }}
        >
          <label htmlFor="nuevo-perfil">{datos.perfiles.length ? 'Nuevo perfil' : 'Escribe tu nombre o alias para empezar'}</label>
          <input id="nuevo-perfil" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre o alias" maxLength={40} />
          <button type="submit" className="boton primario" disabled={!nombre.trim()}>
            Crear
          </button>
        </form>
        {perfil && (
          <div className="fila-acciones">
            <button type="button" className="boton secundario" onClick={() => irA('progreso')}>
              Mi progreso
            </button>
            <button type="button" className="boton secundario" onClick={exportarArchivo}>
              Exportar JSON
            </button>
            <button type="button" className="boton secundario" onClick={copiarCodigo}>
              Copiar código
            </button>
            <button type="button" className="boton secundario" onClick={() => setMostrarImportar((v) => !v)}>
              Importar
            </button>
          </div>
        )}
        {!perfil && datos.perfiles.length === 0 && (
          <div className="fila-acciones">
            <button type="button" className="boton secundario" onClick={() => setMostrarImportar((v) => !v)}>
              Importar progreso de otro dispositivo
            </button>
          </div>
        )}
        {mostrarImportar && (
          <div className="importar">
            <label htmlFor="codigo-importar">Pega aquí el código de texto o el JSON</label>
            <textarea id="codigo-importar" value={codigo} onChange={(e) => setCodigo(e.target.value)} rows={4} />
            <div className="fila-acciones">
              <button type="button" className="boton primario" onClick={() => importar(codigo)} disabled={!codigo.trim()}>
                Importar código
              </button>
              <button type="button" className="boton secundario" onClick={() => archivoRef.current?.click()}>
                Elegir archivo JSON
              </button>
              <input
                ref={archivoRef}
                type="file"
                accept="application/json,.json"
                hidden
                aria-label="Archivo JSON de progreso"
                data-testid="archivo-progreso"
                onChange={(e) => {
                  void importarArchivo(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        )}
        {mensaje && (
          <p className="mensaje" role="status">
            {mensaje}
          </p>
        )}
      </section>

      <section className="tarjeta" aria-labelledby="casos-titulo">
        <h2 id="casos-titulo">Casos</h2>
        {!perfil && <p className="aviso-suave">Crea o selecciona un perfil para guardar tu progreso.</p>}
        <ul className="lista-casos">
          {CASOS.map((c) => {
            const pc = perfil?.casos[c.id] ?? progresoCasoVacio(c.id);
            return (
              <li key={c.id} className="caso-item">
                <div className="caso-info">
                  <span className="caso-numero">Caso {c.numero} · {c.nivel} · {c.ambito}</span>
                  <h3>{c.titulo}</h3>
                  <p className="etiquetas">
                    {c.etiquetasTema.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </p>
                  <p className="estado-caso">
                    <span className={`estado ${pc.estado.replace(/\s/g, '-')}`}>{pc.estado}</span>
                    {pc.mejorPuntuacion !== null && <span> · mejor puntuación {pc.mejorPuntuacion} %</span>}
                    {pc.intentos.length > 0 && <span> · {pc.intentos.length} intento{pc.intentos.length > 1 ? 's' : ''}</span>}
                  </p>
                </div>
                <button type="button" className="boton primario" onClick={() => iniciarCaso(c.id)} disabled={!perfil}>
                  {pc.estado === 'completado' ? 'Repetir' : pc.estado === 'en curso' ? 'Empezar de nuevo' : 'Empezar'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="tarjeta">
        <h2>Modo libre</h2>
        <p>Carga un paciente y cambia los parámetros del respirador para ver cómo responden las curvas.</p>
        <button type="button" className="boton secundario" onClick={() => irA('libre')}>
          Abrir el modo libre
        </button>
      </section>
    </div>
  );
}
