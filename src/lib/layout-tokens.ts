/**
 * Application layout grid — the single source of truth for page composition.
 *
 * Every admin route composes its content through a real 12-column grid at a
 * readable measure. Nothing "stretches to whatever width is available": a
 * block occupies a declared number of columns, and the leftovers are
 * whitespace, not an accident of auto-placement.
 *
 * Breakpoint ladder — 4 / 8 / 12 columns:
 *   base (< 768px)  4 columns
 *   md   (≥ 768px)  8 columns
 *   lg   (≥ 1024px) 12 columns
 *
 * A span is therefore declared three times (base / md / lg) or inherits the
 * sensible default: full width below `lg`.
 */

/** Between content blocks inside one section. */
export const sectionContentGap = 'space-y-6'

/** The grid gutter, used by every `AdminGrid`. */
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
