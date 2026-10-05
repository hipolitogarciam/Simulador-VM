import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto('http://localhost:4173/Simulador-VM/');
await p.getByLabel(/nombre o alias/i).fill('Perf');
await p.getByRole('button', { name: 'Crear' }).click();
const medir = async () => p.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now(); let worst = 0; let last = t0;
  const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 5000) requestAnimationFrame(f); else res({ fps: n / 5, worst: Math.round(worst) }); };
  requestAnimationFrame(f);
}));
await p.getByRole('button', { name: /^Empezar$/ }).first().click();
await p.waitForTimeout(1000);
console.log('caso (móvil, CPU x4):', await medir());
await p.getByRole('tab', { name: 'Monitor' }).click();
console.log('monitor:', await medir());
// Memoria al cambiar de caso varias veces
const heap = async () => (await cdp.send('Runtime.getHeapUsage')).usedSize / 1e6;
for (let i = 0; i < 6; i++) {
  await p.getByRole('button', { name: 'Salir' }).click();
  await p.getByRole('button', { name: /Empezar/ }).first().click();
  await p.waitForTimeout(500);
  if (i === 0 || i === 5) { await cdp.send('HeapProfiler.collectGarbage'); console.log(`heap tras ${i + 1} cambios de caso: ${(await heap()).toFixed(1)} MB`); }
}
await b.close();
