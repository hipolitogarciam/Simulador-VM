import { expect, test, type Page } from '@playwright/test';

async function crearPerfil(page: Page, nombre: string) {
  await page.goto('./');
  await page.getByLabel(/nombre o alias|Nuevo perfil/i).fill(nombre);
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByLabel('Perfil activo')).toBeVisible();
}

test('la app arranca y muestra el aviso docente', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('Herramienta docente. No apta para decisiones clínicas reales.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Simulador de casos clínicos');
});

test('recorrer el caso 1 acertando todo, con pausas y TA', async ({ page }, testInfo) => {
  await crearPerfil(page, 'Prueba');
  await page.getByRole('button', { name: /^Empezar$/ }).first().click();
  await expect(page.getByRole('heading', { name: /Intubación selectiva/ })).toBeVisible();
  // Maniobras de exploración.
  await page.getByRole('button', { name: 'Pausa insp.' }).click();
  await page.getByRole('button', { name: 'Pausa esp.' }).click();
  if (testInfo.project.name === 'movil') {
    await page.getByRole('tab', { name: 'Monitor' }).click();
  }
  await page.getByRole('button', { name: 'Medir TA' }).click();
  await expect(page.getByText('Midiendo TA…')).toBeVisible();
  let pasos = 0;
  for (;;) {
    const opciones = page.locator('.opcion');
    await expect(opciones).toHaveCount(4);
    // Elegir la opción correcta probando: la correcta queda marcada tras responder.
    const textos = await opciones.allTextContents();
    let elegida = -1;
    for (let i = 0; i < 4; i++) {
      if (/peso ideal|Desconectar del respirador|Intubación selectiva en el bronquio|Desinflar el neumotaponamiento|compliance ha caído|Mantener ΔP 10/.test(textos[i] ?? '')) {
        elegida = i;
        break;
      }
    }
    expect(elegida).toBeGreaterThanOrEqual(0);
    await opciones.nth(elegida).click();
    await expect(page.locator('.feedback.correcto')).toBeVisible();
    pasos += 1;
    if (pasos === 2) {
      // Tras la transición del paso 1 (10 s): captura con la alarma de VTE bajo y la TA medida.
      await expect(page.getByText(/^\d{2,3}\/\d{2,3}$/)).toBeVisible({ timeout: 20_000 });
      await page.screenshot({ path: `docs/capturas/${testInfo.project.name}-caso.png`, fullPage: false });
    }
    const siguiente = page.getByRole('button', { name: /Siguiente paso|Ver resumen/ });
    const texto = await siguiente.textContent();
    await siguiente.click();
    if (texto?.includes('resumen')) break;
    if (pasos > 10) throw new Error('Demasiados pasos');
  }
  await expect(page.getByText(/aciertos/)).toBeVisible();
  await expect(page.getByText('100 %')).toBeVisible();
  await page.screenshot({ path: `docs/capturas/${testInfo.project.name}-resumen.png`, fullPage: true });
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.getByText('completado')).toBeVisible();
});

test('responder mal muestra la corrección y registra el fallo por tema', async ({ page }) => {
  await crearPerfil(page, 'Fallos');
  await page.getByRole('button', { name: /^Empezar$/ }).first().click();
  // Primera opción incorrecta del paso 1 (peso real).
  await page.locator('.opcion').filter({ hasText: '82 kg' }).click();
  await expect(page.locator('.feedback.incorrecto')).toBeVisible();
  await expect(page.locator('.feedback.correcto')).toContainText('Respuesta correcta');
  await page.getByRole('button', { name: /Siguiente paso/ }).click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.getByRole('button', { name: 'Mi progreso' }).click();
  await expect(page.getByText('ventilación protectora')).toBeVisible();
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
