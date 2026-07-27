import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Pas de @vitejs/plugin-react ici : sa version 6 exige Vite 6 alors que
 * vitest 3 embarque Vite 7 (`./internal` non exporté). Le JSX est transpilé
 * par esbuild, ce qui suffit — aucun composant testé n'utilise Fast Refresh.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      // `server-only` lève à l'import hors serveur — c'est sa raison d'être, et
      // la preuve que la garde tient. Sous vitest, on pointe vers sa variante
      // serveur : les modules serveur restent testables sans que la protection
      // soit affaiblie dans le bundle applicatif.
      'server-only': resolve(import.meta.dirname, './node_modules/server-only/empty.js'),
    },
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
