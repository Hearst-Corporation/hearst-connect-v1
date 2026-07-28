import type { ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Surface KPI — structure HTML identique au Management Cockpit Qatar (MHTML).
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
    const core = value.toLocaleString('fr-FR')
    return unit ? `${core} ${unit}` : core
  }
  return value
}

const TONE_HERO: Record<NonNullable<AdminKpiItem['tone']>, string> = {
  default: 'text-zinc-950 dark:text-white',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400',
  accent: 'text-zinc-950 dark:text-white',
}

const TONE_VALUE: Record<NonNullable<AdminKpiItem['tone']>, string> = {
  default: 'text-zinc-950 dark:text-white',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400',
  accent: 'text-zinc-950 dark:text-white',
}

function CockpitBandDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="dc-cockpit-band absolute inset-y-0 right-0 hidden w-2/5 items-end overflow-hidden lg:flex">
        <svg
          role="img"
          aria-label="Schéma isométrique des baies du portefeuille"
          viewBox="0 0 120 80"
          className="dc-rack w-full text-accent-700 opacity-[0.12] dark:text-accent-400 dark:opacity-[0.18]"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M10 70 V20 L35 10 L60 20 V70 Z" strokeWidth="1.5" />
          <path d="M60 20 L85 30 L85 70 L60 70 Z" strokeWidth="1.5" />
          <path d="M85 30 L110 40 L110 70 L85 70 Z" strokeWidth="1.5" />
          <path d="M10 45 H110" strokeWidth="0.75" opacity="0.45" />
          <path d="M10 55 H110" strokeWidth="0.75" opacity="0.45" />
          <path d="M10 65 H110" strokeWidth="0.75" opacity="0.45" />
        </svg>
      </div>
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
  return (
    <section className={clsx(className)}>
      <div className="rounded-xl bg-zinc-50/80 p-5 ring-1 ring-zinc-950/5 sm:p-6 dark:bg-zinc-950/50 dark:ring-white/5">
        <div className="relative isolate overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:shadow-none dark:ring-white/10">
          <CockpitBandDecor />
          <div className="grid grid-cols-1 gap-px bg-zinc-950/5 lg:grid-cols-12 dark:bg-white/5">
            {hero ? (
              <div className="bg-white px-6 py-7 lg:col-span-4 dark:bg-zinc-900">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-accent-600 dark:text-accent-400">
                  {hero.label}
                </dt>
                <dd
                  className={clsx(
                    'mt-3 text-nowrap text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl xl:text-6xl',
                    TONE_HERO[hero.tone ?? 'accent'],
                  )}
                  title={hero.status ?? undefined}
                >
                  {displayValue(hero)}
                </dd>
                {hero.hint ? (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{hero.hint}</p>
                ) : null}
              </div>
            ) : null}
            <dl
              className={clsx(
                'grid grid-cols-2 gap-px bg-zinc-950/5 dark:bg-white/5',
                hero ? 'lg:col-span-8 lg:grid-cols-3' : 'lg:grid-cols-4',
              )}
            >
              {items.map((item) => (
                <div key={item.id} className="bg-white px-4 py-4 dark:bg-zinc-900">
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.label}</dt>
                  <dd
                    className={clsx(
                      'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
                      TONE_VALUE[item.tone ?? 'default'],
                    )}
                    title={item.status ?? undefined}
                  >
                    {displayValue(item)}
                  </dd>
                  {item.hint ? (
                    <p className="mt-0.5 text-[10px] leading-tight text-zinc-400 dark:text-zinc-500">{item.hint}</p>
                  ) : null}
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
