import { AdminCaption, AdminLabel, adminTypography } from '@/components/admin/typography'
import { AdminSurface } from '@/components/admin/surfaces'
import type { ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Surface KPI — pattern Stats Tailwind Plus / Catalyst.
 *
 * Une seule carte : chiffre héros en tête, métriques secondaires en grille
 * avec séparateurs (gap-px), typographie Subheading + valeur 3xl.
 * Inspiré de Catalyst DescriptionList et des blocs Application UI « Stats ».
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

const TONE_VALUE: Record<NonNullable<AdminKpiItem['tone']>, string> = {
  default: 'text-brand-foreground',
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
  accent: 'text-brand-accent',
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
    <AdminSurface className={clsx(className, 'overflow-hidden p-0 ring-1 ring-white/10 shadow-xs')}>
      {hero ? (
        <div className="border-b border-white/5 bg-linear-to-br from-brand-accent/12 via-brand-surface to-brand-surface px-6 py-7 sm:px-8 sm:py-8">
          <AdminLabel>{hero.label}</AdminLabel>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={clsx(adminTypography.kpiHero, TONE_VALUE[hero.tone ?? 'default'])}
              title={hero.status ?? undefined}
            >
              {displayValue(hero)}
            </span>
            {hero.unit && typeof hero.value === 'number' ? (
              <span className="text-base/7 font-medium text-brand-muted">{hero.unit}</span>
            ) : null}
          </p>
          {hero.hint ? <AdminCaption className="mt-2">{hero.hint}</AdminCaption> : null}
        </div>
      ) : null}

      <dl className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="bg-brand-surface px-5 py-5 sm:px-6 sm:py-6">
            <dt className={clsx('truncate', adminTypography.body, 'font-medium text-brand-muted')}>{item.label}</dt>
            <dd
              className={clsx('mt-2', adminTypography.kpiValue, TONE_VALUE[item.tone ?? 'default'])}
              title={item.status ?? undefined}
            >
              {displayValue(item)}
            </dd>
            {item.hint ? <dd className={clsx('mt-1.5', adminTypography.caption)}>{item.hint}</dd> : null}
          </div>
        ))}
      </dl>
    </AdminSurface>
  )
}
