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

/**
 * Mesure de lecture optionnelle pour un bloc de prose — le shell admin
 * n’impose plus de plafond global (`max-w-6xl` retiré) : le contenu est fluide
 * dans la colonne à côté du rail.
 */
export const pageMaxWidth = 'max-w-[1280px]'

/** Between content blocks inside one section. */
export const sectionContentGap = 'space-y-6'

/** The grid gutter, used by every `AdminGrid`. */
export const gridGap = 'gap-6'

/*
 * Retirés le 2026-08-04 (LOT B) : `pageInlinePadding`, `pageBlockPadding`,
 * `surfacePadding`, `surfaceCompactPadding`, `tableCellPadding` et
 * `toolbarPadding`. Créés par HC-UI-NORMALIZATION-001, ils n'ont jamais trouvé
 * de consommateur — les surfaces déclarent leur propre inset. Les quatre
 * tokens ci-dessus sont, eux, réellement utilisés.
 */
