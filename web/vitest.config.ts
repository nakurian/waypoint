import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/unit/**/*.test.{ts,tsx}', '__tests__/component/**/*.test.{ts,tsx}', '__tests__/integration/**/*.test.ts'],
    exclude: ['__tests__/visual/**', 'node_modules/**', '.next/**'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
