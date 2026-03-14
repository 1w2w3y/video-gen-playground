import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['src/client/**', 'jsdom'],
      ['src/server/**', 'node'],
    ],
    setupFiles: ['./src/client/test-setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
