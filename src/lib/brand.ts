/**
 * Fond lumineux derrière les faces vitrées (admin + espace).
 * Asset : `public/brand/console-glow.png`.
 */
export const CONSOLE_GLOW_SRC = '/brand/console-glow.png' as const

/** Monogramme H Hearst — accent mint (`public/brand/hearst-h.svg`). */
export const HEARST_H_SRC = '/brand/hearst-h.svg' as const

/**
 * Lockup officiel Hearst Connect (Illustrator / Hearst-Defi) :
 * H mint + HEARST blanc + CONNECT mint.
 */
export const HEARST_CONNECT_LOCKUP_SRC = '/brand/hearst-connect.svg' as const
export const HEARST_CONNECT_LOCKUP_DARK_SRC = '/brand/hearst-connect-dark.svg' as const
export const HEARST_CONNECT_OFFICIAL_SRC = '/brand/hearst-connect-official.svg' as const

/** Classes Tailwind pour peindre le glow en couche absolue (sous le contenu). */
export const consoleGlowLayer =
  'pointer-events-none absolute inset-0 bg-console-app bg-cover bg-center bg-no-repeat'
