/**
 * Fond lumineux derrière les faces vitrées (admin + espace).
 * Asset : `public/brand/console-glow.png`.
 */
export const CONSOLE_GLOW_SRC = '/brand/console-glow.png' as const

/** Monogramme H Hearst — accent mint (`public/brand/hearst-h.svg`). */
export const HEARST_H_SRC = '/brand/hearst-h.svg' as const

/** Lockup H + « Hearst Connect » (`public/brand/hearst-connect.svg`). */
export const HEARST_CONNECT_LOCKUP_SRC = '/brand/hearst-connect.svg' as const

/** Classes Tailwind pour peindre le glow en couche absolue (sous le contenu). */
export const consoleGlowLayer =
  'pointer-events-none absolute inset-0 bg-console-app bg-cover bg-center bg-no-repeat'
