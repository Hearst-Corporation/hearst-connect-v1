import localFont from 'next/font/local'

/**
 * Absolute design system rule: Satoshi Variable everywhere.
 *
 * A single family for interface, headings, and tabular data.
 * Source: Fontshare (Indian Type Foundry) — file vendored in src/assets/fonts/.
 * No other production font (no Inter, Source Sans, Cherry Swash, JetBrains).
 */

export const fontSatoshi = localFont({
  src: '../assets/fonts/Satoshi-Variable.woff2',
  variable: '--font-satoshi',
  display: 'swap',
  weight: '300 900',
  style: 'normal',
})
