import { RequirementList, surfaceRaised } from '@/components/admin/surface'
import { AdminSurfaceTitle } from '@/components/admin/typography'
import clsx from 'clsx'

/**
 * Command-post primitives.
 *
 * Two rules govern this file:
 *
 * 1. A card carries a VERDICT, not a measurement. "12 cases" teaches
 *    nothing; "12 cases, the oldest waiting 6 days, Acme Capital leading"
 *    is actionable. Every attention card names the real case and proposes
 *    the move that resolves it.
 *
 * 2. An absence is stated, not drawn. When a surface has no source yet, it
 *    announces that and explains what's missing — never an example table,
 *    never a zero. `SourceAttendue` exists for that.
 */

/* ── Surfaces ────────────────────────────────────────────────────────────── */

/**
 * One surface grammar for the whole console: `Card` doesn't duplicate the
 * class string, it consumes `surfaceRaised` (see `surface.tsx`). Changing
 * the raised plane is therefore a single-point change.
 */
export function Card({
  children,
  className,
  as: Tag = 'section',
}: Readonly<{ children: React.ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'nav' }>) {
  return <Tag className={clsx(className, surfaceRaised)}>{children}</Tag>
}

/**
 * A card's title block. No bottom rule: a bordered header inside a bordered
 * panel is a frame inside a frame, and the review counted every one of them.
 * Space does the separating.
 */
export function CardHeader({
  title,
  hint,
  action,
}: Readonly<{ title: string; hint?: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
      <div className="min-w-0">
        <AdminSurfaceTitle>{title}</AdminSurfaceTitle>
        {hint ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ── Hero figure ─────────────────────────────────────────────────────────── */

export function HeroFigure({
  valeur,
  libelle,
  unite,
}: Readonly<{ valeur: string; libelle: string; unite?: string }>) {
  return (
    <div>
      <p className="text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{libelle}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-zinc-950 tabular-nums sm:text-5xl dark:text-white">
          {valeur}
        </span>
        {unite ? <span className="text-base text-zinc-500 dark:text-zinc-400">{unite}</span> : null}
      </p>
    </div>
  )
}

/** Secondary fact placed beside the hero figure — never one more tile. */
export function SideFact({ libelle, valeur }: Readonly<{ libelle: string; valeur: string }>) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{libelle}</p>
      <p className="mt-0.5 truncate text-sm text-zinc-700 tabular-nums dark:text-zinc-200">{valeur}</p>
    </div>
  )
}

/* ── No source yet ───────────────────────────────────────────────────────── */

/**
 * The product's most important state.
 *
 * Three pages out of five describe a business the service doesn't expose
 * data for yet: the tables exist in the database, nothing reads them over
 * HTTP. An honest console says so and names what's missing, rather than
 * showing an empty list that reads as an outage — or worse, a sample
 * dataset that reads as reality.
 */
export function SourceAttendue({
  quoi,
  detail,
  requis,
  action,
}: Readonly<{
  quoi: string
  detail: string
  requis: readonly string[]
  action?: React.ReactNode
}>) {
  return (
    <Card className="p-6">
      <h3 className="text-base/6 font-semibold text-zinc-950 dark:text-white">{quoi}</h3>
      <p className="mt-1.5 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">{detail}</p>
      {requis.length > 0 ? (
        <div className="mt-4 max-w-prose">
          {/* No inner ringed box: the requirement list is part of this state,
              not a second surface inside it. */}
          <p className="text-[0.6875rem]/4 font-medium tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
            What&apos;s missing
          </p>
          <RequirementList requis={requis} />
        </div>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  )
}

/* ── Calm: nothing needs attention ───────────────────────────────────────── */

export function CalmState({ message }: Readonly<{ message: string }>) {
  return (
    <Card className="flex items-center gap-3 px-5 py-6">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-success-500" />
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
    </Card>
  )
}
