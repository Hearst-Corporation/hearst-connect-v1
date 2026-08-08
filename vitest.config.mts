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
    // OPS-02: emit a machine-readable JSON report so the CI "0 tests ran" guard
    // can actually fire. The org workflow reads /tmp/vitest-report.json; on a
    // dev machine that path is harmless. The human-readable default stays too.
    reporters: process.env.CI ? ['default', 'json'] : ['default'],
    outputFile: { json: '/tmp/vitest-report.json' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      // TEST-03: coverage was measured over 12 lib files only — 0 % of the
      // veracity and security surface the audit found broken. The truthful
      // core (availability model, overview arithmetic) and the session/auth
      // surface are now in scope, so the percentage measures what matters.
      include: [
        'src/lib/auth.ts',
        'src/lib/actions.ts',
        'src/lib/env.ts',
        'src/lib/explorer.ts',
        'src/lib/fonts.ts',
        'src/lib/resolved.ts',
        'src/lib/serie-etat.ts',
        'src/lib/session.ts',
        'src/lib/vaults/model.ts',
        'src/lib/vaults/overview.ts',
        'src/lib/vaults/registry.ts',
        'src/lib/backend/auth.ts',
        'src/lib/backend/endpoints.ts',
        'src/lib/backend/http-failure.ts',
        'src/lib/backend/probe.ts',
        'src/lib/backend/availability.ts',
        'src/lib/backend/lecture-etat.ts',
        'src/lib/backend/reading-state.ts',
      ],
    },
  },
})
