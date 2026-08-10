/**
 * Shared layout tokens for the admin console.
 *
 * The dashboard composes its cards through a container-driven **masonry**
 * (`src/components/admin/grid.tsx`, `BentoGrid`/`BentoCard`): cards flow down
 * the shortest column at their natural height, so nothing declares a fixed
 * column span and nothing stretches to fill a track.
 */

/** The masonry column gutter, consumed by `BentoGrid`. */
export const gridGap = 'gap-6'

/*
 * Retirés le 2026-08-04 (LOT B) : `pageInlinePadding`, `pageBlockPadding`,
 * `surfacePadding`, `surfaceCompactPadding`, `tableCellPadding` et
 * `toolbarPadding`. Créés par HC-UI-NORMALIZATION-001, ils n'ont jamais trouvé
 * de consommateur — les surfaces déclarent leur propre inset.
 *
 * Retiré PASS 1 (2026-08-09) : `pageMaxWidth` (`max-w-[1280px]`) — plus aucun
 * import runtime ; le shell admin reste fluide à côté du rail. Les deux tokens
 * ci-dessus sont réellement utilisés (`surfaces.tsx`, `grid.tsx`).
 */
