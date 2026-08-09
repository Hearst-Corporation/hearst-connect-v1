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

/**
 * Couche glow — fixée au viewport (HC-ADMIN-FIXED-BACKGROUND-027).
 *
 * `fixed` : le mint reste en place pendant le scroll, comme `.viewport` /espace.
 *
 * ── Pourquoi ancré en haut et masqué, pas `bg-cover bg-center` ──────────────
 * `bg-cover bg-center` étirait le halo sur tout le viewport en le centrant :
 * sa tache la plus intense tombait AU MILIEU de l'écran, précisément là où les
 * cartes courtes laissent du vide — le fond se « salissait » de vert sous le
 * dashboard. Le glow est ancré en haut (`bg-top`), dimensionné en largeur
 * seulement (`bg-[length:100%_auto]` — il ne s'étire plus verticalement), et
 * un masque le fait disparaître avant la moitié de la page. Sous le pli, on
 * retrouve le noir `console-app` propre.
 */
export const consoleGlowLayer =
  'pointer-events-none fixed inset-0 z-0 bg-console-app bg-top bg-no-repeat bg-[length:100%_auto] ' +
  '[mask-image:linear-gradient(to_bottom,black_0,black_18%,transparent_42%)] ' +
  '[-webkit-mask-image:linear-gradient(to_bottom,black_0,black_18%,transparent_42%)]'
