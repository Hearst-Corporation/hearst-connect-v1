/**
 * Glow backdrop behind the glass faces (admin + space).
 * Asset: `public/brand/console-glow.png`.
 */
export const CONSOLE_GLOW_SRC = '/brand/console-glow.png' as const

/** Hearst H monogram — mint accent (`public/brand/hearst-h.svg`). */
export const HEARST_H_SRC = '/brand/hearst-h.svg' as const

/**
 * Official Hearst Connect lockup (Illustrator / Hearst-Defi):
 * mint H + white HEARST + mint CONNECT.
 */
export const HEARST_CONNECT_LOCKUP_SRC = '/brand/hearst-connect.svg' as const

/**
 * Glow layer — pinned to the viewport (HC-ADMIN-FIXED-BACKGROUND-027).
 *
 * `fixed`: the mint stays in place while scrolling, like `.viewport` /space.
 *
 * ── Why anchored at the top and masked, not `bg-cover bg-center` ──────────────
 * `bg-cover bg-center` stretched the halo across the whole viewport while
 * centering it: its most intense spot fell IN THE MIDDLE of the screen, exactly
 * where short cards leave empty space — the background got "dirtied" with green
 * under the dashboard. The glow is anchored at the top (`bg-top`), sized by
 * width only (`bg-[length:100%_auto]` — it no longer stretches vertically), and
 * a mask makes it fade out before the middle of the page. Below the fold, the
 * clean `console-app` black returns.
 */
export const consoleGlowLayer =
  'pointer-events-none fixed inset-0 z-0 bg-console-app bg-top bg-no-repeat bg-[length:100%_auto] ' +
  '[mask-image:linear-gradient(to_bottom,black_0,black_18%,transparent_42%)] ' +
  '[-webkit-mask-image:linear-gradient(to_bottom,black_0,black_18%,transparent_42%)]'
