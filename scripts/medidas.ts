/**
 * Imprime las medidas del motor para cada paso de un caso (rama correcta)
 * y comprueba sus expectativas.
 *
 * Uso:
 *   npm run medidas -- caso-01                     (filtra por id entre los casos registrados)
 *   npm run medidas -- src/cases/caso-02-xxx.ts    (archivo concreto, aunque no esté en el índice)
 *   npm run medidas                                (todos los casos registrados)
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Caso } from '../src/cases/schema';
import { simularCaso, tablaMedidas } from '../src/cases/simularCaso';

async function cargarCasos(arg: string | undefined): Promise<Caso[]> {
  if (arg && arg.endsWith('.ts')) {
    const mod = (await import(pathToFileURL(resolve(arg)).href)) as Record<string, unknown>;
    return Object.values(mod).filter((v): v is Caso => !!v && typeof v === 'object' && 'pasos' in (v as object));
  }
  const { CASOS } = await import('../src/cases');
  return CASOS.filter((c) => !arg || c.id.includes(arg));
}

const casos = await cargarCasos(process.argv[2]);
if (casos.length === 0) {
  console.error('No se ha encontrado ningún caso.');
  process.exit(1);
}
let fallosTotales = 0;
for (const caso of casos) {
  console.log(`\n=== ${caso.id} · ${caso.titulo} ===`);
  const medidas = simularCaso(caso);
  console.log(tablaMedidas(medidas));
  const fallos = caso.expectativas.filter((e) => {
    const m = medidas[e.paso];
    return !m || !e.comprobar(m, medidas);
  });
  fallosTotales += fallos.length;
  if (fallos.length) {
    console.log(`\nExpectativas no cumplidas (${fallos.length}):`);
    for (const e of fallos) console.log(`  · paso ${e.paso}: ${e.descripcion}`);
  } else {
    console.log(`\nTodas las expectativas se cumplen (${caso.expectativas.length}).`);
  }
}
process.exit(fallosTotales > 0 ? 1 : 0);
