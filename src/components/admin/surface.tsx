import clsx from 'clsx'

/**
 * Grammaire de surface — registre institutionnel Qatar / Hearst Cockpit.
 * Trois plans : raised · sunken · hero.
 */

export const surfaceRaised =
  'rounded-xl bg-white shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:shadow-none dark:ring-white/10'

export const surfaceSunken =
  'rounded-xl bg-zinc-50/80 ring-1 ring-zinc-950/5 dark:bg-zinc-950/50 dark:ring-white/5'

export function Panel({
  className,
  inset = 'md',
  tone = 'raised',
  ...props
}: {
  inset?: 'none' | 'sm' | 'md' | 'lg'
  tone?: 'raised' | 'sunken'
} & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        tone === 'raised' ? surfaceRaised : surfaceSunken,
        inset === 'sm' && 'p-4',
        inset === 'md' && 'p-6',
        inset === 'lg' && 'p-8',
      )}
    />
  )
}

/**
 * Liste des éléments qu'une source doit encore fournir.
 *
 * Deux surfaces l'affichent avec des mises en page différentes (`SourceAttendue`
 * centrée dans `cockpit.tsx`, `AdminSourceAttendue` alignée à gauche dans
 * `surfaces.tsx`). Seule la liste elle-même était identique : elle vit ici, les
 * deux habillages restent chez leurs propriétaires respectifs.
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

export function PanelHeading({ title, action }: Readonly<{ title: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-950/5 px-4 py-3 dark:border-white/5">
      <h2 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">{title}</h2>
      {action}
    </div>
  )
}
