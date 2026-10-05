import { describe, expect, it } from 'vitest';
import {
  LocalStorageProgressStore,
  MemoriaProgressStore,
  datosVacios,
  exportarCodigo,
  exportarJSON,
  fallosPorTema,
  importarCodigo,
  nuevoPerfil,
  progresoCasoVacio,
  sanearDatos,
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

describe('Progreso · datos corruptos', () => {
  it('sanearDatos descarta lo irreconocible y repara lo parcial sin lanzar', () => {
    expect(sanearDatos(null)).toEqual(datosVacios());
    expect(sanearDatos('texto')).toEqual(datosVacios());
    expect(sanearDatos({ version: 2, perfiles: [] })).toEqual(datosVacios());
    expect(sanearDatos({ version: 1, perfiles: 'no' })).toEqual(datosVacios());
    const d = sanearDatos({
      version: 1,
      perfilActivo: 'no-existe',
      perfiles: [
        { id: 'a' }, // sin nombre: se descarta
        { id: 'b', nombre: 'Bea', casos: { 'caso-01': { estado: 'raro', intentos: [{ inicio: 'x', respuestas: [{ pasoId: 'p1', etiquetaTema: 'auto-PEEP', correcta: 'sí' }, null, 7] }, 'basura'], mejorPuntuacion: 'alto', pasoActual: -3 } } },
        { nombre: 'Sin id', casos: null },
      ],
    });
    expect(d.perfiles).toHaveLength(2);
    expect(d.perfilActivo).toBe('b');
    const pc = d.perfiles[0]!.casos['caso-01']!;
    expect(pc.casoId).toBe('caso-01');
    expect(pc.estado).toBe('no iniciado');
    expect(pc.intentos).toHaveLength(1);
    expect(pc.intentos[0]!.respuestas).toEqual([{ pasoId: 'p1', opcion: -1, correcta: false, etiquetaTema: 'auto-PEEP', fecha: '' }]);
    expect(pc.mejorPuntuacion).toBeNull();
    expect(pc.pasoActual).toBe(0);
    expect(d.perfiles[1]!.id).toMatch(/^p-/);
    expect(d.perfiles[1]!.casos).toEqual({});
    expect(() => fallosPorTema(d.perfiles[0]!)).not.toThrow();
  });

  it('LocalStorageProgressStore sobrevive a un almacenamiento que falla o tiene basura', () => {
    const g = globalThis as { localStorage?: unknown };
    const original = g.localStorage;
    try {
      g.localStorage = {
        getItem: () => '{esto no es json',
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      };
      const store = new LocalStorageProgressStore();
      expect(store.cargar()).toEqual(datosVacios());
      expect(() => store.guardar(datosVacios())).not.toThrow();
      g.localStorage = { getItem: () => JSON.stringify({ version: 1, perfiles: [{ id: 'x', nombre: 'X', casos: { c: 5 } }], perfilActivo: 'x' }), setItem: () => undefined };
      const datos = new LocalStorageProgressStore().cargar();
      expect(datos.perfiles[0]!.casos.c).toEqual(progresoCasoVacio('c'));
      g.localStorage = {
        getItem: () => {
          throw new Error('SecurityError');
        },
      };
      expect(new LocalStorageProgressStore().cargar()).toEqual(datosVacios());
    } finally {
      g.localStorage = original;
    }
  });

  it('la importación sanea los casos del perfil', async () => {
    const p = await importarCodigo(JSON.stringify({ version: 1, perfil: { nombre: 'Imp', casos: { 'caso-01': { intentos: 'nada' } } } }));
    expect(p.casos['caso-01']).toEqual(progresoCasoVacio('caso-01'));
    await expect(importarCodigo(JSON.stringify({ version: 1, perfil: { nombre: '', casos: {} } }))).rejects.toThrow();
  });
});
