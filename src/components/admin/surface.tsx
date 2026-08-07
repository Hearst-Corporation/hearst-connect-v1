/**
 * Surface grammar — boxes tokenisées.
 *
 * Les cartes KPI / DashCard / StatCard passent par `--color-console-card`
 * (noir). Le chrome page reste graphite (`console-shell` / zinc). Aucun hex
 * dans les composants : uniquement les classes token.
 */

/** Box surface — noir tokenisé + filet console. */
export const surfaceBox =
  'rounded-xl bg-console-card shadow-xs ring-1 ring-console-line'

/** Menu / rail — même noir deep que les boxes. */
export const surfaceNav = 'bg-console-card'

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
