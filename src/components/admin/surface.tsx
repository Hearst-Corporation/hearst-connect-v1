/**
 * Design system surfaces — canon tableau de bord `/admin`.
 *
 * Toute box produit passe par ICI. Pas de `bg-white` / `dark:bg-console-shell` /
 * `ring-*` structurels Tailwind ad hoc sur les pages.
 *
 * | Token class     | Matière                              | Usage                       |
 * |-----------------|--------------------------------------|-----------------------------|
 * | `surfaceBox`    | verre `console-card` + blur          | DashCard, Section/Stat         |
 * | `surfaceNav`    | verre `console-glass` + blur         | Menu / rail                    |
 * | `surfaceInset`  | `console-inset` (puits plus dense)   | pre, champs, sous-blocs        |
 * | `surfaceSelect` | voile mint `data-selected:`          | sélection parcours             |
 */

/** Box — face vitrée (transparence + profondeur). DashCard / Panel. */
export const surfaceBox =
  'rounded-xl bg-console-card shadow-xs ring-1 ring-console-line backdrop-blur-xl backdrop-saturate-150'

/**
 * Menu / rail — même famille verre, token `console-glass` (un peu plus dense).
 */
export const surfaceNav =
  'bg-console-glass backdrop-blur-xl backdrop-saturate-150 ring-1 ring-console-line-soft'

/** Sous-surface en creux (code, formulaires, métadonnées) — un cran plus dense. */
export const surfaceInset =
  'rounded-lg bg-console-inset ring-1 ring-console-line-soft backdrop-blur-md'

/** Sélection — voile mint (état `data-selected` Headless UI / parcours). */
export const surfaceSelect =
  'data-selected:bg-accent-soft data-selected:ring-1 data-selected:ring-accent-400/25'

/** Alias historique → `surfaceBox`. */
export const surfaceRaised = surfaceBox

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
