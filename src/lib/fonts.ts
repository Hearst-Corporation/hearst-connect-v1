import localFont from 'next/font/local'

/**
 * Règle absolue design system : Satoshi Variable partout.
 *
 * Une seule famille pour interface, titres et données tabulaires.
 * Source : Fontshare (Indian Type Foundry) — fichier vendu dans src/assets/fonts/.
 * Pas d'autre police de prod (pas Inter, Source Sans, Cherry Swash, JetBrains).
 */

export const fontSatoshi = localFont({
  src: '../assets/fonts/Satoshi-Variable.woff2',
  variable: '--font-satoshi',
  display: 'swap',
  weight: '300 900',
  style: 'normal',
})

/** Alias — toutes les stacks Tailwind pointent vers Satoshi. */
export const fontSans = fontSatoshi
export const fontDisplay = fontSatoshi
export const fontMono = fontSatoshi
