import type { Caso } from './schema';
import { caso01 } from './caso-01-intubacion-selectiva';
import { caso02 } from './caso-02-neumotorax-tension';
import { caso03 } from './caso-03-asma-autopeep';
import { caso06 } from './caso-06-secreciones-traslado';
import { caso07 } from './caso-07-desconexion-fuga';
import { caso08 } from './caso-08-asincronia-traslado';

export const CASOS: Caso[] = [caso01, caso02, caso03, caso06, caso07, caso08].sort((a, b) => a.numero - b.numero);

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}
