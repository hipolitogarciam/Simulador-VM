import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Base para GitHub Pages: https://<usuario>.github.io/Simulador-VM/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/Simulador-VM/',
  build: { target: 'es2022', sourcemap: false },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
