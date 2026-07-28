/**
 * Global admin layout grid — named aliases over Tailwind's default 4px scale.
 * One owner per rhythm: `AdminPage` (page-section-gap), `AdminSection`
 * (section-content-gap), surfaces (surface padding). Nothing else should
 * declare a competing space-y-* at the page or section level.
 */

export const pageMaxWidth = 'max-w-[1600px]'
export const pageSectionGap = 'space-y-8' // 32px — between top-level sections on a page
export const sectionContentGap = 'space-y-6' // 24px — between content blocks inside a section/surface body
export const surfacePadding = 'p-6' // 24px — standard card/surface padding
export const surfaceCompactPadding = 'p-4' // 16px — dense rows: toolbar, metric tile, probe result
export const tableCellPadding = 'px-4 py-3' // 16px / 12px
export const toolbarPadding = 'px-4 py-3' // 16px / 12px
