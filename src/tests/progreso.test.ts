import { describe, expect, it } from 'vitest';
import {
  MemoriaProgressStore,
  exportarCodigo,
  exportarJSON,
  fallosPorTema,
  importarCodigo,
  nuevoPerfil,
  progresoCasoVacio,
  type Perfil,
} from '../store/progreso';

function perfilDePrueba(): Perfil {
  const p = nuevoPerfil('Ana');
  const pc = progresoCasoVacio('caso-01-intubacion-selectiva');
  pc.estado = 'completado';
  pc.mejorPuntuacion = 83;
  pc.intentos.push({
    inicio: '2026-01-01T10:00:00.000Z',
    fin: '2026-01-01T10:12:00.000Z',
    puntuacion: 83,
    respuestas: [
      { pasoId: 'p1', opcion: 0, correcta: true, etiquetaTema: 'ventilación protectora', fecha: '2026-01-01T10:01:00.000Z' },
      { pasoId: 'p2', opcion: 1, correcta: false, etiquetaTema: 'resistencia frente a compliance', fecha: '2026-01-01T10:03:00.000Z' },
      { pasoId: 'p3', opcion: 2, correcta: false, etiquetaTema: 'resistencia frente a compliance', fecha: '2026-01-01T10:05:00.000Z' },
      { pasoId: 'p4', opcion: 3, correcta: false, etiquetaTema: 'ecografía', fecha: '2026-01-01T10:07:00.000Z' },
    ],
  });
  p.casos[pc.casoId] = pc;
  return p;
}

describe('Progreso', () => {
  it('cuenta los fallos por tema ordenados de mayor a menor', () => {
    const f = fallosPorTema(perfilDePrueba());
    expect(f[0]).toEqual({ tema: 'resistencia frente a compliance', fallos: 2 });
    expect(f[1]).toEqual({ tema: 'ecografía', fallos: 1 });
  });

  it('exporta e importa como JSON sin pérdidas', async () => {
    const p = perfilDePrueba();
    const json = exportarJSON(p);
    const q = await importarCodigo(json);
    expect(q).toEqual(p);
  });

  it('exporta e importa como código de texto comprimido', async () => {
    const p = perfilDePrueba();
    const codigo = await exportarCodigo(p);
    expect(codigo.startsWith('VMI')).toBe(true);
    expect(codigo.length).toBeLessThan(exportarJSON(p).length);
    const q = await importarCodigo(codigo);
    expect(q).toEqual(p);
  });

  it('rechaza códigos inválidos', async () => {
    await expect(importarCodigo('hola')).rejects.toThrow();
    await expect(importarCodigo('{"nada": true}')).rejects.toThrow();
  });

  it('la implementación en memoria guarda y carga', () => {
    const store = new MemoriaProgressStore();
    const datos = store.cargar();
    datos.perfiles.push(perfilDePrueba());
    store.guardar(datos);
    expect(store.cargar().perfiles[0]?.nombre).toBe('Ana');
  });
});
