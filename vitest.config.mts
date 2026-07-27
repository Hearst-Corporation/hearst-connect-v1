import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Pas de @vitejs/plugin-react ici : sa version 6 exige Vite 6 alors que
 * vitest 3 embarque Vite 7 (`./internal` non exporté). Le JSX est transpilé
 * par esbuild, ce qui suffit — aucun composant testé n'utilise Fast Refresh.
 */
export default defineConfig({
  resolve: {
    alias: { '@': resolve(import.meta.dirname, './src') },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
