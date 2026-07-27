import nextVitals from 'eslint-config-next/core-web-vitals'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    // Les blocs officiels Tailwind Plus utilisent <img> : c'est du code vendoré, tel quel.
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
])

export default eslintConfig
