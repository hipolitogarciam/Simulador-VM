import type { EtiquetaTema } from '../cases/schema';

export type EstadoCaso = 'no iniciado' | 'en curso' | 'completado';

export interface RespuestaRegistrada {
  pasoId: string;
  opcion: number;
  correcta: boolean;
  etiquetaTema: EtiquetaTema;
  fecha: string;
}

export interface Intento {
  inicio: string;
  fin?: string;
  respuestas: RespuestaRegistrada[];
  puntuacion?: number;
}

export interface ProgresoCaso {
  casoId: string;
  estado: EstadoCaso;
  intentos: Intento[];
  mejorPuntuacion: number | null;
  ultimoIntento: string | null;
  /** Paso en curso del intento abierto (para reanudar). */
  pasoActual: number;
}

export interface Perfil {
  id: string;
  nombre: string;
  creado: string;
  casos: Record<string, ProgresoCaso>;
}

export interface DatosProgreso {
  version: 1;
  perfiles: Perfil[];
  perfilActivo: string | null;
}

/**
 * Interfaz de persistencia. La v1 usa localStorage; una v2 con backend
 * solo tiene que implementar esta interfaz.
 */
export interface ProgressStore {
  cargar(): DatosProgreso;
  guardar(datos: DatosProgreso): void;
}

export function datosVacios(): DatosProgreso {
  return { version: 1, perfiles: [], perfilActivo: null };
}

const CLAVE = 'simulador-vmi:progreso:v1';

export class LocalStorageProgressStore implements ProgressStore {
  constructor(private clave = CLAVE) {}

  cargar(): DatosProgreso {
    try {
      const raw = globalThis.localStorage?.getItem(this.clave);
      if (!raw) return datosVacios();
      const datos = JSON.parse(raw) as DatosProgreso;
      if (!datos || datos.version !== 1 || !Array.isArray(datos.perfiles)) return datosVacios();
      return datos;
    } catch {
      return datosVacios();
    }
  }

  guardar(datos: DatosProgreso): void {
    try {
      globalThis.localStorage?.setItem(this.clave, JSON.stringify(datos));
    } catch {
      // Sin persistencia: la app sigue funcionando en memoria.
    }
  }
}

export class MemoriaProgressStore implements ProgressStore {
  private datos = datosVacios();
  cargar(): DatosProgreso {
    return structuredClone(this.datos);
  }
  guardar(datos: DatosProgreso): void {
    this.datos = structuredClone(datos);
  }
}

export function nuevoPerfil(nombre: string): Perfil {
  return {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: nombre.trim(),
    creado: new Date().toISOString(),
    casos: {},
  };
}

export function progresoCasoVacio(casoId: string): ProgresoCaso {
  return { casoId, estado: 'no iniciado', intentos: [], mejorPuntuacion: null, ultimoIntento: null, pasoActual: 0 };
}

/** Fallos por etiqueta de tema acumulados en todos los intentos de un perfil. */
export function fallosPorTema(perfil: Perfil): Array<{ tema: EtiquetaTema; fallos: number }> {
  const conteo = new Map<EtiquetaTema, number>();
  for (const pc of Object.values(perfil.casos)) {
    for (const intento of pc.intentos) {
      for (const r of intento.respuestas) {
        if (!r.correcta) conteo.set(r.etiquetaTema, (conteo.get(r.etiquetaTema) ?? 0) + 1);
      }
    }
  }
  return [...conteo.entries()].map(([tema, fallos]) => ({ tema, fallos })).sort((a, b) => b.fallos - a.fallos);
}

// --- Exportar e importar ---------------------------------------------------

export function exportarJSON(perfil: Perfil): string {
  return JSON.stringify({ version: 1, perfil }, null, 2);
}

function bytesABase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ABytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function comprimir(texto: string): Promise<Uint8Array> {
  const codificado = new TextEncoder().encode(texto);
  const datos = new Uint8Array(new ArrayBuffer(codificado.length));
  datos.set(codificado);
  if (typeof CompressionStream === 'undefined') return datos;
  const cs = new CompressionStream('deflate-raw');
  const stream = new Blob([datos]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function descomprimir(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (typeof DecompressionStream === 'undefined') return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return await new Response(stream).text();
}

/** Código de texto portable: "VMI1." + base64(deflate(json)). */
export async function exportarCodigo(perfil: Perfil): Promise<string> {
  const json = JSON.stringify({ version: 1, perfil });
  const bytes = await comprimir(json);
  const prefijo = typeof CompressionStream === 'undefined' ? 'VMI0.' : 'VMI1.';
  return prefijo + bytesABase64(bytes);
}

export async function importarCodigo(codigo: string): Promise<Perfil> {
  const limpio = codigo.trim();
  if (limpio.startsWith('{')) return validarPerfil(JSON.parse(limpio));
  const m = /^VMI([01])\.(.+)$/s.exec(limpio);
  if (!m) throw new Error('El código no tiene el formato esperado.');
  const bytes = base64ABytes((m[2] ?? '').replace(/\s+/g, ''));
  const json = m[1] === '1' ? await descomprimir(bytes) : new TextDecoder().decode(bytes);
  return validarPerfil(JSON.parse(json));
}

export function validarPerfil(obj: unknown): Perfil {
  const raiz = obj as { version?: number; perfil?: unknown } | null;
  const p = (raiz && typeof raiz === 'object' && 'perfil' in raiz ? raiz.perfil : raiz) as Partial<Perfil> | null;
  if (!p || typeof p !== 'object' || typeof p.nombre !== 'string' || typeof p.casos !== 'object' || p.casos === null) {
    throw new Error('El archivo no contiene un perfil válido.');
  }
  return {
    id: typeof p.id === 'string' ? p.id : nuevoPerfil(p.nombre).id,
    nombre: p.nombre,
    creado: typeof p.creado === 'string' ? p.creado : new Date().toISOString(),
    casos: p.casos as Record<string, ProgresoCaso>,
  };
}
