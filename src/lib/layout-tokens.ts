/**
 * Shared layout tokens for the admin console.
 *
 * The dashboard composes its cards through a container-driven **composable
 * Bento** (`src/components/admin/grid.tsx`, `BentoGrid`/`BentoCard`): twelve
 * equal tracks above the container threshold, each card claiming a role-based
 * span (full / 2⁄3 / 1⁄3 / half). The span is authored, never derived from the
 * dataset size.
 */

/** The Bento grid gutter, consumed by `BentoGrid`. */
export const gridGap = 'gap-6'

/*
 * Removed on 2026-08-04 (LOT B): `pageInlinePadding`, `pageBlockPadding`,
 * `surfacePadding`, `surfaceCompactPadding`, `tableCellPadding` and
 * `toolbarPadding`. Introduced by HC-UI-NORMALIZATION-001, they never found a
 * consumer — surfaces declare their own inset.
 *
 * Removed in PASS 1 (2026-08-09): `pageMaxWidth` (`max-w-[1280px]`) — no more
 * runtime imports; the admin shell stays fluid next to the rail. The two tokens
 * above are genuinely used (`surfaces.tsx`, `grid.tsx`).
 */
