import type { Caso } from './schema';
import { caso01 } from './caso-01-intubacion-selectiva';
import { caso02 } from './caso-02-neumotorax-tension';
import { caso03 } from './caso-03-asma-autopeep';
import { caso08 } from './caso-08-asincronia-traslado';

export const CASOS: Caso[] = [caso01, caso02, caso03, caso08].sort((a, b) => a.numero - b.numero);

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}
