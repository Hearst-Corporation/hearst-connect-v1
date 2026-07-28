import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { ComputeHallPoster } from '@/components/admin/compute-hall-poster'
import { formatNumber } from '@/lib/format'
import type { ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * The dashboard-overview measure band.
 *
 * ── What was wrong ────────────────────────────────────────────────────────
 * It rendered as one wide slab: a 12-column internal grid whose cells were
 * separated by 1px background bleed. Eight measures came out as a spreadsheet
 * — same weight, same size, no reading order — and the slab spanned the full
 * page whatever it contained.
 *
 * ── What it is now ────────────────────────────────────────────────────────
 * The recipe the review asked for: a primary metric holding 5 of 12 columns,
 * the supporting metrics in a balanced grid across the remaining 7. Without a
 * primary metric the supporting grid takes the full width — still balanced,
 * because `AdminMetricGrid` picks a column count that leaves no orphan in the
 * last row.
 *
 * Each measure is its own tile with a real gutter between them, so size and
 * spacing carry the hierarchy instead of a hairline.
 */

export type AdminKpiItem = {
  readonly id: string
  readonly label: string
  readonly value: string | number | null | undefined
  readonly unit?: string
  readonly hint?: string
  readonly status?: ResolvedStatus
  readonly tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent'
}

function displayValue(item: AdminKpiItem): string {
  const { value, unit } = item
  const displayable =
    value !== null && value !== undefined && (typeof value !== 'number' || Number.isFinite(value))
  if (!displayable) return '—'
  if (typeof value === 'number') {
    const core = formatNumber(value)
    return unit ? `${core} ${unit}` : core
  }
  return value
}

/**
 * Tone is a CLAIM about the value, so only `success` / `warning` / `danger`
 * colour anything — `accent` and `default` stay neutral. A measure that is
 * merely large is not a good measure.
 */
const TONE_VALUE: Record<NonNullable<AdminKpiItem['tone']>, string> = {
  default: 'text-zinc-950 dark:text-white',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400',
  accent: 'text-zinc-950 dark:text-white',
}

const TILE = 'rounded-xl bg-white p-4 ring-1 ring-zinc-950/10 dark:bg-console-card dark:ring-console-line'

function KpiTile({ item }: Readonly<{ item: AdminKpiItem }>) {
  return (
    <div className={clsx(TILE, 'min-w-0')}>
      <dt className="text-[0.6875rem]/4 font-medium tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
        {item.label}
      </dt>
      <dd
        className={clsx(
          'mt-1.5 text-2xl/8 font-semibold tracking-tight tabular-nums break-words',
          TONE_VALUE[item.tone ?? 'default'],
        )}
        title={item.status ?? undefined}
      >
        {displayValue(item)}
      </dd>
      {item.hint ? (
        <dd className="mt-1 truncate text-xs/5 text-zinc-500 dark:text-zinc-400">{item.hint}</dd>
      ) : null}
    </div>
  )
}

export function AdminKpiSurface({
  hero,
  items,
  className,
}: Readonly<{
  hero?: AdminKpiItem
  items: readonly AdminKpiItem[]
  className?: string
}>) {
  const supporting = (
    <AdminMetricGrid as="dl" count={items.length}>
      {items.map((item) => (
        <KpiTile key={item.id} item={item} />
      ))}
    </AdminMetricGrid>
  )

  if (hero === undefined) return <div className={className}>{supporting}</div>

  return (
    <AdminGrid className={className}>
      <AdminCol span={5}>
        {/* The decorative compute-hall band rides on the primary metric only:
            behind a grid of small tiles it read as noise in an empty region. */}
        <div className={clsx(TILE, 'relative isolate h-full overflow-hidden px-6 py-6')}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="dc-cockpit-band absolute inset-y-0 right-0 hidden w-3/5 items-end overflow-hidden sm:flex">
              <ComputeHallPoster
                bays={5}
                className="text-accent-700 opacity-[0.12] dark:text-accent-400 dark:opacity-[0.18]"
              />
            </div>
          </div>
          <dl>
            <dt className="text-[0.6875rem]/4 font-medium tracking-[0.08em] text-accent-600 uppercase dark:text-accent-400">
              {hero.label}
            </dt>
            <dd
              className={clsx(
                'mt-2 text-nowrap text-4xl/10 font-semibold tracking-tight tabular-nums sm:text-5xl/12',
                TONE_VALUE[hero.tone ?? 'accent'],
              )}
              title={hero.status ?? undefined}
            >
              {displayValue(hero)}
            </dd>
            {hero.hint ? (
              <dd className="mt-2 text-xs/5 text-zinc-500 dark:text-zinc-400">{hero.hint}</dd>
            ) : null}
          </dl>
        </div>
      </AdminCol>
      <AdminCol span={7}>{supporting}</AdminCol>
    </AdminGrid>
  )
}
