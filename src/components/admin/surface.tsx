/**
 * Design system surfaces — canonical Hearst Connect material.
 *
 * ── PASS 2 architecture ───────────────────────────────────────────────────
 * ONE box material: `surfaceBox` (`console-card`, OPAQUE depuis la passe UI
 * 2026-09 : le verre laissait le halo mint délaver chaque surface).
 * Components (`Panel`, `DashCard`, tooltips…) COMPOSE this material.
 * They do not redeclare a second glass via a CSS module (`.panel` / csl).
 *
 * Other materials = DISTINCT roles, not duplicate boxes:
 * | Token class     | Material                             | Usage                       |
 * |-----------------|--------------------------------------|-----------------------------|
 * | `surfaceBox`    | `console-card` opaque                | Panel, DashCard, tooltips   |
 * | `surfaceNav`    | `console-glass` opaque               | Menu / rail                 |
 * | `surfaceInset`  | `console-inset` (denser well)        | pre, wells, sub-blocks      |
 * | `surfaceSelect` | mint veil `data-selected:`           | journey selection           |
 *
 * Dimensions: width and height follow the container and the page layout.
 */

/** Box — glass face (transparency + depth). The single box material. */
export const surfaceBox =
  'rounded-xl bg-console-card ring-1 ring-console-line'

/**
 * Menu / rail — same glass family, `console-glass` token (slightly denser).
 */
export const surfaceNav = 'bg-console-glass ring-1 ring-console-line-soft'

/** Recessed sub-surface (code, forms, metadata) — one notch denser. */
export const surfaceInset = 'rounded-lg bg-console-inset ring-1 ring-console-line-soft'

/** Selection — mint veil (`data-selected` Headless UI state / journey). */
export const surfaceSelect =
  'data-selected:bg-accent-soft data-selected:ring-1 data-selected:ring-accent-400/25'

/**
 * List of items a source still needs to provide.
 */
export function RequirementList({ requis }: Readonly<{ requis: readonly string[] }>) {
  return (
    <ul className="mt-2 space-y-1">
      {requis.map((r) => (
        <li key={r} className="flex gap-2 text-sm text-fg">
          <span aria-hidden="true" className="text-fg-secondary">
            ·
          </span>
          {r}
        </li>
      ))}
    </ul>
  )
}
