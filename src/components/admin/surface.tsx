/**
 * Design system surfaces — canon tableau de bord `/admin`.
 *
 * Toute box produit passe par ICI. Pas de `bg-white` / `dark:bg-zinc-900` /
 * `ring-zinc-*` ad hoc sur les pages.
 *
 * | Token class     | Matière                         | Usage                          |
 * |-----------------|----------------------------------|--------------------------------|
 * | `surfaceBox`    | noir opaque `console-card`       | KPI, DashCard, Section/Stat    |
 * | `surfaceNav`    | verre `console-glass` + blur     | Menu / rail                    |
 * | `surfaceInset`  | `console-inset`                  | pre, champs, sous-blocs        |
 * | `surfaceSelect` | voile mint `accent-soft`         | sélection (parcours, etc.)     |
 */

/** Box — noir deep, filet console. Référence dashboard KPI / DashCard. */
export const surfaceBox =
  'rounded-xl bg-console-card shadow-xs ring-1 ring-console-line'

/**
 * Menu / rail — effet verre (frosted).
 * Distinct des boxes noires et du voile mint de sélection.
 */
export const surfaceNav =
  'bg-console-glass backdrop-blur-xl backdrop-saturate-150 ring-1 ring-console-line-soft'

/** Sous-surface en creux (code, formulaires, métadonnées). */
export const surfaceInset =
  'rounded-lg bg-console-inset ring-1 ring-console-line-soft'

/** Sélection — voile mint très léger (pas un aplat sur la box parente). */
export const surfaceSelect =
  'bg-accent-soft ring-1 ring-accent-400/25'

/** Alias historique → `surfaceBox`. */
export const surfaceRaised = surfaceBox

/**
 * List of items a source still needs to provide.
 */
export function RequirementList({ requis }: Readonly<{ requis: readonly string[] }>) {
  return (
    <ul className="mt-2 space-y-1">
      {requis.map((r) => (
        <li key={r} className="flex gap-2 text-sm text-zinc-300">
          <span aria-hidden="true" className="text-zinc-400">
            ·
          </span>
          {r}
        </li>
      ))}
    </ul>
  )
}
