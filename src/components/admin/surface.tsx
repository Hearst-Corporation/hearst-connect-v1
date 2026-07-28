import clsx from 'clsx'

/**
 * Surface grammar — the approved neutral-graphite system.
 *
 * A card is CHARCOAL ON GRAPHITE: `--bg-card` (#2a2a2a) sitting on the shell's
 * `--bg-shell` (#232323), one hairline border, one restrained shadow. It is
 * lighter than what it sits on, which is what makes the console legible — the
 * previous build cut cards out of the background as darker holes, and every
 * panel read as a recess.
 *
 * An inset is the opposite move, and the only one: `--bg-inset` (#202020) for
 * a block that genuinely sinks into a card. Nothing in this file introduces a
 * hue; the accent is applied deliberately, never as a surface tint.
 */

export const surfaceRaised =
  'rounded-xl bg-white shadow-lg ring-1 ring-zinc-950/10 dark:bg-console-card dark:shadow-[0_10px_28px_rgba(0,0,0,0.24)] dark:ring-console-line'

export const surfaceSunken =
  'rounded-xl bg-zinc-50/80 ring-1 ring-zinc-950/5 dark:bg-console-inset dark:ring-console-line-soft'

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
 * List of items a source still needs to provide.
 *
 * Two surfaces render it with different layouts (`SourceAttendue`, centered,
 * in `cockpit.tsx`; `AdminSourceAttendue`, left-aligned, in `surfaces.tsx`).
 * Only the list itself was identical: it lives here, both wrappers stay with
 * their respective owners.
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

/** Panel title block — spacing, no rule: a bordered header inside a bordered panel is a frame too many. */
export function PanelHeading({ title, action }: Readonly<{ title: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <h3 className="text-base/6 font-semibold text-zinc-950 dark:text-white">{title}</h3>
      {action}
    </div>
  )
}
