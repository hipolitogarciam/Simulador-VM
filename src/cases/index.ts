import type { Caso } from './schema';
import { caso01 } from './caso-01-intubacion-selectiva';
import { caso02 } from './caso-02-neumotorax-tension';
import { caso03 } from './caso-03-asma-autopeep';
import { caso04 } from './caso-04-epoc-vc-ps';
import { caso05 } from './caso-05-sdra-obeso';
import { caso06 } from './caso-06-secreciones-traslado';
import { caso07 } from './caso-07-desconexion-fuga';
import { caso08 } from './caso-08-asincronia-traslado';

export const CASOS: Caso[] = [caso01, caso02, caso03, caso04, caso05, caso06, caso07, caso08].sort((a, b) => a.numero - b.numero);

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}
