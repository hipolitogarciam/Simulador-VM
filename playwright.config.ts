import { defineConfig } from '@playwright/test';

const base = '/Simulador-VM/';

export default defineConfig({
  testDir: 'tests-e2e',
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:4173${base}`,
    headless: true,
    screenshot: 'only-on-failure',
    // En entornos con Chromium preinstalado se puede fijar la ruta del ejecutable.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: `http://localhost:4173${base}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'movil', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'escritorio', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
