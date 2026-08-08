import nextVitals from 'eslint-config-next/core-web-vitals'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  ...nextVitals,
  // Artefacts générés : jamais commités (cf. .gitignore), jamais écrits à la
  // main — les linter revient à juger la sortie d'un outil. Le reporter lcov de
  // @vitest/coverage-v8 pose notamment des `eslint-disable` dans son HTML.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    '.scannerwork/**',
    'storybook-static/**',
    '.worktrees/**',
  ]),
  {
    // Les blocs officiels Tailwind Plus utilisent <img> : c'est du code vendoré, tel quel.
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
])

export default eslintConfig
