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
 * Readable content measure. 1280px keeps a 12-column grid at ~86px per column
 * with 24px gutters — wide enough for a chart-plus-panel split, narrow enough
 * that a line of body text stays readable. The previous 1600px produced
 * columns nobody had content for.
 */
export const pageMaxWidth = 'max-w-[1280px]'

/** Horizontal page inset. Identical left and right — owned by the shell, once. */
export const pageInlinePadding = 'px-3 sm:px-4 lg:px-5'

/** Vertical page inset. */
export const pageBlockPadding = 'py-8 lg:py-10'

/** Between top-level sections of a page. Sections are separated by space, not by boxes. */
export const pageSectionGap = 'space-y-10'

/** Between content blocks inside one section. */
export const sectionContentGap = 'space-y-6'

/** The grid gutter, used by every `AdminGrid`. */
export const gridGap = 'gap-6'

/** Standard card/surface padding. */
export const surfacePadding = 'p-6'

/** Dense rows: toolbar, metric tile, probe result. */
export const surfaceCompactPadding = 'p-4'

export const tableCellPadding = 'px-4 py-3'
export const toolbarPadding = 'px-4 py-3'
