import type { Caso } from './schema';
import { caso01 } from './caso-01-intubacion-selectiva';

export const CASOS: Caso[] = [caso01].sort((a, b) => a.numero - b.numero);

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}
