/**
 * DashboardGrid — layout moderne 2026 pour dashboards.
 *
 * Pattern observé dans les dashboards modernes (Linear, Stripe, Vercel 2026) :
 * - Grid flexible, pas de hauteurs fixes
 * - Cards qui respirent (gap-6, padding généreux)
 * - Responsive natif (1 → 2 → 3 → 4 cols)
 * - KPI strip en haut, charts en dessous, layout auto
 *
 * Références :
 * - next-shadcn-dashboard (kiranism) — grid auto-rows-[minmax(120px,auto)]
 * - data-viz-dashboard (KaranChandekar) — glassmorphism + drag-reorder
 * - analytics-dashboard (Serkanbyx) — 4 KPI cards + responsive
 */

import clsx from 'clsx'

/**
 * Container principal du dashboard — remplace le layout rigide GCC.
 */
export function DashboardGrid({
  children,
  className,
}: Readonly<{
  children: React.ReactNode
  className?: string
}>) {
  return (
    <div className={clsx('space-y-6 p-6', className)}>
      {children}
    </div>
  )
}

/**
 * Grid de KPI — 4 cards en haut, responsive.
 * 1 col mobile → 2 cols tablet → 4 cols desktop.
 */
export function KpiGrid({
  children,
  className,
}: Readonly<{
  children: React.ReactNode
  className?: string
}>) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Grid de charts — flexible, auto-rows.
 * 1 col mobile → 2 cols desktop.
 */
export function ChartGrid({
  children,
  className,
}: Readonly<{
  children: React.ReactNode
  className?: string
}>) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 gap-6 lg:grid-cols-2',
        'auto-rows-[minmax(300px,auto)]',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Card moderne — wrapper universel pour KPI, charts, widgets.
 * Remplace Panel pour le layout dashboard.
 */
export function DashboardCard({
  children,
  className,
}: Readonly<{
  children: React.ReactNode
  className?: string
}>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-zinc-950/10 bg-white p-6',
        'shadow-sm dark:border-white/10 dark:bg-zinc-900',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Header de card — titre + action optionnelle.
 */
export function DashboardCardHeader({
  title,
  action,
  description,
}: Readonly<{
  title: string
  action?: React.ReactNode
  description?: string
}>) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  )
}
