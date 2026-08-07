/**
 * Surface grammar — boxes tokenisées + menu verre.
 *
 * - Boxes KPI : `--color-console-card` (noir opaque)
 * - Menu / rail : `--color-console-glass` + blur (effet verre)
 * - Sélection parcours : `--color-accent-soft` (voile mint) — pas le menu
 */

/** Box surface — noir tokenisé + filet console. */
export const surfaceBox =
  'rounded-xl bg-console-card shadow-xs ring-1 ring-console-line'

/**
 * Menu / rail — effet verre (frosted), pas un aplat noir ni un voile mint.
 * `backdrop-blur` + fond glass tokenisé.
 */
export const surfaceNav =
  'bg-console-glass backdrop-blur-xl backdrop-saturate-150 ring-1 ring-console-line-soft'

/** Alias historique — même matière que `surfaceBox` (produit dark-only). */
export const surfaceRaised = surfaceBox

/**
 * List of items a source still needs to provide.
 */
export function RequirementList({ requis }: Readonly<{ requis: readonly string[] }>) {
  return (
    <ul className="mt-2 space-y-1">
      {requis.map((r) => (
        <li key={r} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span aria-hidden="true" className="text-zinc-400">
            ·
          </span>
          {r}
        </li>
      ))}
    </ul>
  )
}
