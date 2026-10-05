import { expect, test, type Locator, type Page } from '@playwright/test';
import { CASOS } from '../src/cases';
import type { Caso } from '../src/cases/schema';

const CAPTURAS = 'docs/capturas';

/** Errores de JavaScript no capturados durante el test: la app nunca debe romperse. */
function vigilarErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  return errores;
}

async function crearPerfil(page: Page, nombre: string) {
  await page.goto('./');
  await page.getByLabel(/nombre o alias|Nuevo perfil/i).fill(nombre);
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByLabel('Perfil activo')).toBeVisible();
}

function caso(numero: number): Caso {
  const c = CASOS.find((x) => x.numero === numero);
  if (!c) throw new Error(`No existe el caso ${numero}`);
  return c;
}

async function empezarCaso(page: Page, numero: number) {
  const item = page.locator('.caso-item').filter({ has: page.locator('.caso-numero', { hasText: new RegExp(`^Caso ${numero} `) }) });
  await item.getByRole('button', { name: /Empezar|Repetir/ }).click();
  await expect(page.getByRole('heading', { name: caso(numero).titulo })).toBeVisible();
}

/** Índice del paso actual (0-based) leído de la cabecera "paso X de N". */
async function pasoActual(page: Page): Promise<number> {
  const texto = await page.locator('.panel-caso .caso-numero').textContent();
  const m = /paso (\d+) de (\d+)/.exec(texto ?? '');
  if (!m) throw new Error(`Cabecera del paso no reconocida: ${texto}`);
  return Number(m[1]) - 1;
}

/** Pestaña de monitores (solo existe en móvil). */
async function pestana(page: Page, nombre: 'Ventilador' | 'Monitor') {
  const tab = page.getByRole('tab', { name: nombre });
  if (await tab.isVisible()) await tab.click();
}

function valorMonitor(page: Page, etiqueta: string): Locator {
  return page.locator('.valor').filter({ has: page.locator('.valor-etiqueta', { hasText: new RegExp(`^${etiqueta}$`) }) }).locator('.valor-numero');
}

async function alturasMinimas(locator: Locator, minimo: number, descripcion: string) {
  const n = await locator.count();
  expect(n, `hay elementos: ${descripcion}`).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const el = locator.nth(i);
    if (!(await el.isVisible())) continue;
    const caja = await el.boundingBox();
    expect(caja, `${descripcion} #${i} tiene caja`).not.toBeNull();
    expect(caja!.height, `${descripcion} #${i} (${(await el.textContent())?.trim()}) altura`).toBeGreaterThanOrEqual(minimo);
    expect(caja!.width, `${descripcion} #${i} anchura`).toBeGreaterThanOrEqual(minimo);
  }
}

test('la app arranca y muestra el aviso docente', async ({ page }, testInfo) => {
  const errores = vigilarErrores(page);
  await page.goto('./');
  await expect(page.getByText('Herramienta docente. No apta para decisiones clínicas reales.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Simulador de casos clínicos');
  // Sin perfil los casos no se pueden empezar, pero se ven.
  await expect(page.locator('.caso-item')).toHaveCount(CASOS.length);
  await expect(page.getByRole('button', { name: /^Empezar$/ }).first()).toBeDisabled();
  await crearPerfil(page, 'Inicio');
  await expect(page.getByRole('button', { name: /^Empezar$/ }).first()).toBeEnabled();
  await page.screenshot({ path: `${CAPTURAS}/${testInfo.project.name}-inicio.png`, fullPage: true });
  expect(errores).toEqual([]);
});

test('recorrer el caso 1 acertando todo, con pausas, congelar y TA', async ({ page }, testInfo) => {
  const errores = vigilarErrores(page);
  const c = caso(1);
  await crearPerfil(page, 'Prueba');
  await empezarCaso(page, 1);

  // Pausas: los valores "--" pasan a número.
  await pestana(page, 'Ventilador');
  await expect(valorMonitor(page, 'Pplat')).toHaveText('--');
  await expect(valorMonitor(page, 'PEEP total')).toHaveText('--');
  await page.getByRole('button', { name: 'Pausa insp.' }).click();
  await expect(page.getByRole('button', { name: 'Pausa insp…' })).toBeDisabled();
  await expect(valorMonitor(page, 'Pplat')).toHaveText(/^\d+$/, { timeout: 20_000 });
  await expect(valorMonitor(page, 'Pplat')).toBeInViewport();
  await page.getByRole('button', { name: 'Pausa esp.' }).click();
  await expect(valorMonitor(page, 'PEEP total')).toHaveText(/^\d+$/, { timeout: 20_000 });
  await expect(valorMonitor(page, 'PEEP total')).toBeInViewport();
  const pplat = Number(await valorMonitor(page, 'Pplat').textContent());
  const ppico = Number(await valorMonitor(page, 'Ppico').textContent());
  expect(pplat).toBeGreaterThan(5);
  expect(pplat).toBeLessThanOrEqual(ppico);

  // Congelar detiene las curvas; reanudar las vuelve a mover.
  const curva = page.getByRole('img', { name: 'Curva de presión en la vía aérea' });
  const imagen = () => curva.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await page.getByRole('button', { name: 'Congelar' }).click();
  await expect(page.getByRole('button', { name: 'Reanudar' })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(300);
  const a = await imagen();
  await page.waitForTimeout(700);
  expect(await imagen()).toBe(a);
  await page.getByRole('button', { name: 'Reanudar' }).click();
  await page.waitForTimeout(700);
  expect(await imagen()).not.toBe(a);

  // TA no invasiva: tarda unos 15 s y muestra la hora de la toma.
  await pestana(page, 'Monitor');
  await expect(valorMonitor(page, 'TA NI')).toHaveText('--/--');
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Medir TA' }).click();
  await expect(page.getByText('Midiendo TA…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Midiendo TA…' })).toBeDisabled();
  await expect(valorMonitor(page, 'TA NI')).toHaveText(/^\d{2,3}\/\d{2,3}$/, { timeout: 25_000 });
  const tardo = (Date.now() - t0) / 1000;
  expect(tardo).toBeGreaterThanOrEqual(12);
  expect(tardo).toBeLessThan(22);
  await expect(page.locator('.valor', { hasText: 'TA NI' })).toContainText(/\d{2}:\d{2}/);
  await pestana(page, 'Ventilador');

  for (let paso = 0; paso < c.pasos.length; paso++) {
    expect(await pasoActual(page)).toBe(paso);
    const opciones = page.locator('.opcion');
    await expect(opciones).toHaveCount(4);
    const correcta = c.pasos[paso]!.opciones.findIndex((o) => o.correcta);
    await opciones.nth(correcta).click();
    await expect(page.locator('.feedback.correcto')).toBeVisible();
    await expect(page.locator('.feedback.correcto h3')).toContainText('Correcto');
    await expect(page.locator('.opcion.correcta')).toHaveCount(1);
    await expect(page.locator('.opcion.incorrecta')).toHaveCount(0);
    if (paso === 0) {
      // Tras la transición del paso 1 (intubación selectiva en PC) cae el VTE y salta la alarma.
      await expect(page.locator('.monitor-vent .alarma', { hasText: 'VTE BAJO' })).toBeVisible({ timeout: 25_000 });
      await expect(page.locator('.valor.alerta', { hasText: 'VTE' })).toBeVisible();
      await page.screenshot({ path: `${CAPTURAS}/${testInfo.project.name}-caso.png`, fullPage: false });
    }
    const siguiente = page.getByRole('button', { name: paso === c.pasos.length - 1 ? /Ver resumen/ : /Siguiente paso/ });
    await siguiente.click();
  }
  await expect(page.getByText(`${c.pasos.length} de ${c.pasos.length} aciertos`)).toBeVisible();
  await expect(page.getByText('100 %')).toBeVisible();
  await expect(page.getByText('Sin fallos')).toBeVisible();
  await expect(page.locator('.puntos-clave li')).toHaveCount(c.puntosClave.length);
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  const fila = page.locator('.tabla tbody tr', { hasText: c.titulo });
  await expect(fila).toContainText('completado');
  await expect(fila).toContainText('100 %');
  await expect(fila).toContainText(`(${c.pasos.length}/${c.pasos.length})`);
  await expect(page.getByText('Todavía no hay fallos registrados.')).toBeVisible();
  expect(errores).toEqual([]);
});

test('recorrer el caso 3 fallando todas las preguntas', async ({ page }, testInfo) => {
  const errores = vigilarErrores(page);
  const c = caso(3);
  await crearPerfil(page, 'Fallos');
  await empezarCaso(page, 3);
  const temas = new Map<string, number>();
  for (let paso = 0; paso < c.pasos.length; paso++) {
    expect(await pasoActual(page)).toBe(paso);
    const ops = c.pasos[paso]!.opciones;
    // Preferimos una opción errónea con consecuencia para ver el empeoramiento en el monitor.
    let idx = ops.findIndex((o) => !o.correcta && o.transicionConsecuencia);
    if (idx < 0) idx = ops.findIndex((o) => !o.correcta);
    const op = ops[idx]!;
    temas.set(op.etiquetaTema, (temas.get(op.etiquetaTema) ?? 0) + 1);
    await page.locator('.opcion').nth(idx).click();
    if (op.transicionConsecuencia) {
      const cuenta = page.locator('.cuenta-atras');
      await expect(cuenta).toBeVisible();
      await expect(cuenta).toHaveText(/en [1-9] s/);
      await expect(page.getByRole('heading', { name: 'Respuesta incorrecta' })).toBeVisible();
      await page.getByRole('button', { name: 'Continuar ya' }).click();
      await expect(cuenta).toBeHidden();
    }
    await expect(page.locator('.feedback.incorrecto h3')).toContainText('Incorrecto');
    await expect(page.locator('.feedback.correcto')).toContainText('Respuesta correcta');
    await expect(page.locator('.opcion.correcta')).toHaveCount(1);
    await expect(page.locator('.opcion.incorrecta')).toHaveCount(1);
    await expect(page.locator('.opcion.incorrecta')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.opcion').first()).toBeDisabled();
    if (paso === 0) {
      await page.locator('.feedback.incorrecto').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${CAPTURAS}/${testInfo.project.name}-feedback-incorrecto.png`, fullPage: false });
    }
    await page.getByRole('button', { name: paso === c.pasos.length - 1 ? /Ver resumen/ : /Siguiente paso/ }).click();
  }
  await expect(page.getByText(`0 de ${c.pasos.length} aciertos`)).toBeVisible();
  await expect(page.locator('.puntuacion')).toContainText('0 %');
  await expect(page.getByRole('heading', { name: 'Fallos por tema' })).toBeVisible();
  const items = page.locator('.resumen ul li');
  await expect(items).toHaveCount(temas.size);
  for (const [tema, n] of temas) await expect(items.filter({ hasText: `${tema}: ${n}` })).toHaveCount(1);
  await page.screenshot({ path: `${CAPTURAS}/${testInfo.project.name}-resumen.png`, fullPage: true });

  await page.getByRole('button', { name: 'Mi progreso' }).click();
  const fila = page.locator('.tabla tbody tr', { hasText: c.titulo });
  await expect(fila).toContainText('completado');
  await expect(fila).toContainText('0 %');
  await expect(fila).toContainText(`(0/${c.pasos.length})`);
  const barras = page.locator('.barras li');
  await expect(barras).toHaveCount(temas.size);
  let suma = 0;
  for (const [tema, n] of temas) {
    const li = barras.filter({ has: page.locator('.barra-etiqueta', { hasText: tema }) });
    await expect(li.locator('.barra-valor')).toHaveText(String(n));
    suma += n;
  }
  expect(suma).toBe(c.pasos.length);
  // Al volver al inicio el caso figura como completado con su mejor puntuación.
  await page.getByRole('button', { name: '← Inicio' }).click();
  const item = page.locator('.caso-item').filter({ hasText: c.titulo });
  await expect(item).toContainText('completado');
  await expect(item).toContainText('mejor puntuación 0 %');
  await expect(item.getByRole('button', { name: 'Repetir' })).toBeVisible();
  expect(errores).toEqual([]);
});

test('responder mal y abandonar registra el intento parcial', async ({ page }) => {
  const c = caso(1);
  await crearPerfil(page, 'Parcial');
  await empezarCaso(page, 1);
  const idx = c.pasos[0]!.opciones.findIndex((o) => !o.correcta && !o.transicionConsecuencia);
  await page.locator('.opcion').nth(idx).click();
  await expect(page.locator('.feedback.incorrecto')).toBeVisible();
  await expect(page.locator('.feedback.correcto')).toContainText('Respuesta correcta');
  await page.getByRole('button', { name: /Siguiente paso/ }).click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page.locator('.caso-item').filter({ hasText: c.titulo })).toContainText('en curso');
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.locator('.barras li', { hasText: c.pasos[0]!.opciones[idx]!.etiquetaTema })).toBeVisible();
  await expect(page.locator('.tabla tbody tr', { hasText: c.titulo })).toContainText('en curso');
});

test('el modo libre carga un paciente y responde a los cambios de parámetros', async ({ page }, testInfo) => {
  const errores = vigilarErrores(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Abrir el modo libre' }).click();
  await expect(page.getByRole('heading', { name: 'Modo libre' })).toBeVisible();
  await expect(page.locator('.monitor-vent .monitor-titulo')).toHaveText('VENTILADOR · VC');
  await expect(valorMonitor(page, 'VTE')).toHaveText(/^\d+$/);
  await expect(page.locator('.monitor-vent .alarma.ok')).toHaveText('Sin alarmas');

  // Cambiar la PEEP con el teclado sobre el deslizador: el valor programado y el medido siguen.
  const peep = page.locator('.deslizador', { hasText: 'PEEP (cmH₂O)' });
  await peep.locator('input[type=range]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(peep.locator('b')).toHaveText('6');
  await expect(valorMonitor(page, 'PEEP')).toHaveText('6', { timeout: 15_000 });

  // Cambiar de modo: cabecera y controles cambian.
  await page.getByLabel('Modo').selectOption('PC');
  await expect(page.locator('.monitor-vent .monitor-titulo')).toHaveText('VENTILADOR · PC');
  await expect(page.locator('.deslizador', { hasText: 'ΔP' })).toBeVisible();
  await expect(page.locator('.deslizador', { hasText: 'Vt (ml)' })).toHaveCount(0);

  // Un preset del paciente: desconexión → alarma.
  const situacion = page.getByLabel('Situación');
  const opcionPreset = async (texto: string) => (await situacion.locator('option').allTextContents()).find((t) => t.includes(texto))!;
  await situacion.selectOption({ label: await opcionPreset('Desconexión') });
  await expect(page.locator('.monitor-vent .alarma', { hasText: 'DESCONEXIÓN' })).toBeVisible({ timeout: 20_000 });
  await situacion.selectOption({ label: await opcionPreset('Broncoespasmo') });
  await expect(page.locator('.monitor-vent .alarma', { hasText: 'DESCONEXIÓN' })).toBeHidden({ timeout: 20_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${CAPTURAS}/${testInfo.project.name}-modo-libre.png`, fullPage: false });
  // Los controles largos no deben ensanchar la página.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Simulador de casos clínicos');
  expect(errores).toEqual([]);
});

test('exportar e importar el progreso como código', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  await crearPerfil(page, 'Exporta');
  await page.getByRole('button', { name: 'Copiar código' }).click();
  await expect(page.getByText(/Código copiado|Copia el código/)).toBeVisible();
  const codigo = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  if (codigo) {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: 'Importar progreso de otro dispositivo' }).click();
    await page.getByLabel(/Pega aquí/).fill(codigo);
    await page.getByRole('button', { name: 'Importar código' }).click();
    await expect(page.getByText(/importado/)).toBeVisible();
    await expect(page.getByLabel('Perfil activo')).toHaveValue(/.+/);
  }
});

test('importar el progreso desde un archivo JSON y rechazar uno inválido', async ({ page }) => {
  const c = caso(1);
  await page.goto('./');
  await page.getByRole('button', { name: 'Importar progreso de otro dispositivo' }).click();
  const perfil = {
    version: 1,
    perfil: {
      id: 'p-importado',
      nombre: 'Importado',
      creado: '2026-01-01T10:00:00.000Z',
      casos: {
        [c.id]: {
          casoId: c.id,
          estado: 'completado',
          mejorPuntuacion: 83,
          ultimoIntento: '2026-01-01T10:12:00.000Z',
          pasoActual: 0,
          intentos: [
            {
              inicio: '2026-01-01T10:00:00.000Z',
              fin: '2026-01-01T10:12:00.000Z',
              puntuacion: 83,
              respuestas: [
                { pasoId: 'p1', opcion: 0, correcta: true, etiquetaTema: 'ventilación protectora', fecha: '2026-01-01T10:01:00.000Z' },
                { pasoId: 'p2', opcion: 1, correcta: false, etiquetaTema: 'auto-PEEP', fecha: '2026-01-01T10:03:00.000Z' },
              ],
            },
          ],
        },
      },
    },
  };
  const archivo = page.getByTestId('archivo-progreso');
  await archivo.setInputFiles({ name: 'progreso.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(perfil)) });
  await expect(page.getByText('Progreso de "Importado" importado.')).toBeVisible();
  await expect(page.getByLabel('Perfil activo')).toHaveValue('p-importado');
  const item = page.locator('.caso-item').filter({ hasText: c.titulo });
  await expect(item).toContainText('completado');
  await expect(item).toContainText('mejor puntuación 83 %');
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.locator('.barras li', { hasText: 'auto-PEEP' })).toBeVisible();
  await page.getByRole('button', { name: '← Inicio' }).click();
  // Un archivo inválido se rechaza con un mensaje y no toca el perfil.
  await page.getByRole('button', { name: 'Importar' }).click();
  await page.getByTestId('archivo-progreso').setInputFiles({ name: 'malo.json', mimeType: 'application/json', buffer: Buffer.from('{"nada": true}') });
  await expect(page.getByText(/No se pudo importar/)).toBeVisible();
  await expect(page.getByLabel('Perfil activo')).toHaveValue('p-importado');
  // Y el progreso sobrevive a una recarga.
  await page.reload();
  await expect(page.getByLabel('Perfil activo')).toHaveValue('p-importado');
});

test('la app funciona con localStorage bloqueado', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('localStorage bloqueado');
    };
    Storage.prototype.getItem = () => {
      throw new Error('localStorage bloqueado');
    };
  });
  const c = caso(2);
  await crearPerfil(page, 'Sin almacenamiento');
  await empezarCaso(page, 2);
  await page.locator('.opcion').nth(c.pasos[0]!.opciones.findIndex((o) => o.correcta)).click();
  await expect(page.locator('.feedback.correcto')).toBeVisible();
  await page.getByRole('button', { name: /Siguiente paso/ }).click();
  expect(await pasoActual(page)).toBe(1);
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.locator('.tabla tbody tr', { hasText: c.titulo })).toContainText('en curso');
  expect(errores).toEqual([]);
});

test('la app arranca con datos corruptos en el almacenamiento', async ({ page }) => {
  const errores = vigilarErrores(page);
  const c = caso(1);
  const clave = 'simulador-vmi:progreso:v1';
  // 1) JSON roto (solo en la primera carga: el script de inicio se ejecuta en cada navegación).
  await page.addInitScript(([k]) => {
    if (sessionStorage.getItem('qa-corrupto')) return;
    sessionStorage.setItem('qa-corrupto', '1');
    localStorage.setItem(k!, '{"version":1,"perfiles":[{');
  }, [clave]);
  await page.goto('./');
  await expect(page.getByLabel(/nombre o alias/i)).toBeVisible();
  await crearPerfil(page, 'Recuperado');
  // 2) Estructura parcialmente válida: perfiles sin nombre, casos con basura, perfil activo inexistente.
  await page.evaluate(
    ([k, id]) =>
      localStorage.setItem(
        k!,
        JSON.stringify({
          version: 1,
          perfilActivo: 'no-existe',
          perfiles: [{ id: 'sin-nombre' }, { id: 'x', nombre: 'Corrupto', casos: { [id!]: { estado: 'raro', intentos: 'nada', mejorPuntuacion: 'alto' }, otro: null } }],
        }),
      ),
    [clave, c.id],
  );
  await page.reload();
  await expect(page.getByLabel('Perfil activo')).toHaveValue('x');
  await expect(page.locator('.caso-item').filter({ hasText: c.titulo })).toContainText('no iniciado');
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.getByRole('heading', { name: /Mi progreso · Corrupto/ })).toBeVisible();
  await expect(page.getByText('Todavía no hay fallos registrados.')).toBeVisible();
  await page.getByRole('button', { name: '← Inicio' }).click();
  await empezarCaso(page, 1);
  await expect(page.locator('.opcion')).toHaveCount(4);
  expect(errores).toEqual([]);
});

test('accesibilidad básica: etiquetas, roles y tamaño táctil', async ({ page }, testInfo) => {
  await crearPerfil(page, 'A11y');
  // Inicio: botones y controles.
  await alturasMinimas(page.locator('.boton'), 44, 'botones del inicio');
  await expect(page.getByLabel('Perfil activo')).toBeVisible();
  await empezarCaso(page, 1);
  // Canvas con nombre accesible y pestañas con rol.
  const canvases = page.locator('canvas');
  const n = await canvases.count();
  expect(n).toBe(6);
  for (let i = 0; i < n; i++) {
    await expect(canvases.nth(i)).toHaveAttribute('role', 'img');
    expect((await canvases.nth(i).getAttribute('aria-label'))?.length ?? 0).toBeGreaterThan(3);
  }
  await expect(page.getByRole('checkbox', { name: 'Sonido de alarmas' })).toBeAttached();
  // En móvil el monitor no activo está oculto (display: none) y no entra en el árbol de accesibilidad.
  await expect(page.getByRole('region', { name: 'Monitor del ventilador', includeHidden: true })).toBeAttached();
  await expect(page.getByRole('region', { name: 'Monitor de constantes', includeHidden: true })).toBeAttached();
  await expect(page.getByRole('group', { name: 'Parámetros programados', includeHidden: true })).toBeAttached();
  if (testInfo.project.name === 'movil') {
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.first()).toHaveAttribute('aria-controls', 'monitor-vent');
    await alturasMinimas(tabs, 44, 'pestañas');
    await alturasMinimas(page.locator('.botones-monitor .boton'), 44, 'botones del monitor');
    await page.getByRole('tab', { name: 'Monitor' }).click();
    await alturasMinimas(page.locator('.botones-monitor .boton'), 44, 'botón de TA');
    await page.getByRole('tab', { name: 'Ventilador' }).click();
  }
  await alturasMinimas(page.locator('.opcion'), 44, 'opciones');
  await alturasMinimas(page.locator('.panel-caso .boton'), 44, 'botones del panel');
  // Foco visible en las opciones al navegar con teclado.
  await page.locator('.pregunta-texto').click();
  let enOpcion = false;
  for (let i = 0; i < 40 && !enOpcion; i++) {
    await page.keyboard.press('Tab');
    enOpcion = await page.evaluate(() => document.activeElement?.classList.contains('opcion') ?? false);
  }
  expect(enOpcion).toBe(true);
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const cs = getComputedStyle(el);
    return { estilo: cs.outlineStyle, ancho: parseFloat(cs.outlineWidth) };
  });
  expect(outline.estilo).not.toBe('none');
  expect(outline.ancho).toBeGreaterThanOrEqual(2);
  // Nada se sale del ancho de la pantalla.
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(scroll).toBeLessThanOrEqual(1);
});
