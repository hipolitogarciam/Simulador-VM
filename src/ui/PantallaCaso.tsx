import { useEffect, useState } from 'react';
import { detenerBucle, iniciarBucle } from '../store/simulacion';
import { MonitorVentilador } from './MonitorVentilador';
import { MonitorConstantes } from './MonitorConstantes';
import { PanelCaso } from './PanelCaso';

/**
 * Pantalla de un caso: panel del caso + monitor del ventilador + monitor de constantes.
 * En móvil los monitores van arriba, fijos, con pestañas.
 */
export function PantallaCaso() {
  const [pestana, setPestana] = useState<'vent' | 'const'>('vent');

  useEffect(() => {
    iniciarBucle();
    return () => detenerBucle();
  }, []);

  return (
    <div className="pantalla-caso">
      <div className="zona-monitores">
        <div className="pestanas" role="tablist" aria-label="Monitores">
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
        <PanelCaso />
      </div>
    </div>
  );
}
