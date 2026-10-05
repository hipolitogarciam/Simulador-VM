import { useApp } from './store/useApp';
import { Inicio } from './ui/Inicio';
import { PantallaCaso } from './ui/PantallaCaso';
import { Progreso } from './ui/Progreso';
import { Resumen } from './ui/Resumen';
import { ModoLibre } from './ui/ModoLibre';

export function App() {
  const pantalla = useApp((s) => s.pantalla);
  return (
    <div className="app">
      <div className="aviso-docente" role="note">
        Herramienta docente. No apta para decisiones clínicas reales.
      </div>
      {pantalla === 'inicio' && <Inicio />}
      {pantalla === 'caso' && <PantallaCaso />}
      {pantalla === 'resumen' && <Resumen />}
      {pantalla === 'progreso' && <Progreso />}
      {pantalla === 'libre' && <ModoLibre />}
    </div>
  );
}
