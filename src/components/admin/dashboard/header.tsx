import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { isAvailable, signalOf } from '@/lib/vaults/model'
import type { CSSProperties, ReactNode } from 'react'

export type DashboardKpi = AdminHeroKpi

/**
 * Cockpit command bar — the header of every admin cockpit page.
 *
 * Titre et action sur une ligne, puis les chiffres en BANDEAU PLEINE LARGEUR :
 * des tuiles égales, calées à gauche, séparées par un filet — le même gabarit
 * que le bloc « Your position » de /account. Serrés au bord droit, les
 * chiffres laissaient un trou à gauche et se lisaient comme une note.
 *
 * Les tuiles reprennent le balisage de `StatTile` (classes `.stat-*` de
 * `.ud-root`) sans l'importer : c'est un composant client, et ses icônes ne
 * traversent pas la frontière serveur → client.
 */
export function DashboardHeader({
  title,
  description,
  titleAddon,
  kpis,
  action,
  aside,
  tone = 'accent',
}: Readonly<{
  title?: string
  description?: string
  /** Inline link or control beside the page title (e.g. back to directory). */
  titleAddon?: ReactNode
  kpis: readonly DashboardKpi[]
  action?: ReactNode
  /**
   * Un bloc posé à droite des chiffres, à la même hauteur (ex. la répartition
   * de l'AUM en donut). Les chiffres passent alors en deux colonnes sur les
   * deux tiers de la largeur, et s'étirent à la hauteur du bloc.
   */
  aside?: ReactNode
  /** `accent` : chiffres en aplat vert citrus (défaut). `neutral` : sur fond
   *  de carte — le tableau de bord, dont le bloc Market porte déjà le vert. */
  tone?: 'accent' | 'neutral'
}>) {
  const hasTitle = title !== undefined && title !== ''
  /* La bande basse (jauge / note) n'existe que si au moins une tuile en porte :
     sinon elle creuse un vide sous les chiffres. Quand elle existe, TOUTES les
     tuiles la réservent, pour que les valeurs tombent sur la même ligne. */
  const hasFoot = kpis.some((kpi) => hasMeter(kpi.meter) || Boolean(kpi.footnote))

  return (
    <header data-admin="hero-header" className="flex flex-col gap-5">
      {hasTitle || action !== undefined ? (
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          {hasTitle ? (
            <div className="min-w-0">
              {titleAddon !== undefined ? (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{title}</h1>
                  {titleAddon}
                </div>
              ) : (
                <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{title}</h1>
              )}
              {description !== undefined && description !== '' ? (
                <p className="mt-0.5 text-xs text-fg-tertiary">{description}</p>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}

      {kpis.length > 0 ? (
        <div className={aside === undefined ? 'contents' : 'grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'}>
        <dl
          className={`kpi-band${hasFoot ? ' has-foot' : ''}${aside === undefined ? '' : ' is-stretched'}${tone === 'accent' ? ' is-accent' : ''}`}
          style={{ '--kpi-cols': Math.min(kpis.length, aside === undefined ? 4 : 2) } as CSSProperties}
        >
          {kpis.map((kpi) => {
            const available = isAvailable(kpi.value)
            const meter = hasMeter(kpi.meter) ? kpi.meter : null
            return (
              <div key={kpi.id} className="stat-tile">
                <dt className="stat-eyebrow">
                  <kpi.icon className="size-4" aria-hidden="true" />
                  <span>{kpi.title}</span>
                  <i className="stat-signal" data-signal={signalOf(kpi.value)} aria-hidden="true" />
                </dt>
                {/* `min-w-0` + ellipse : une valeur longue — l'identifiant d'un
                    vault fait 45 caractères — poussait la page au-delà de
                    l'écran. Le chiffre reste lisible, le reste s'élide. */}
                <dd className="stat-value-row">
                  <strong className={`stat-value mono${available ? '' : ' is-absent'}`}>
                    {available ? kpi.value.value : '—'}
                  </strong>
                  {kpi.unit !== undefined && kpi.unit !== '' ? (
                    <span className="stat-aside">{kpi.unit}</span>
                  ) : null}
                </dd>
                {hasFoot ? (
                  <dd className="stat-foot">
                    {meter !== null ? (
                      <div className="stat-meter" role="presentation">
                        <span style={{ width: `${Math.max(0, Math.min(100, meter * 100))}%` }} />
                      </div>
                    ) : null}
                    {kpi.footnote ? <p className="stat-footnote">{kpi.footnote}</p> : null}
                  </dd>
                ) : null}
              </div>
            )
          })}
        </dl>
        {aside}
        </div>
      ) : null}
    </header>
  )
}

function hasMeter(meter: number | null | undefined): meter is number {
  return meter !== null && meter !== undefined && Number.isFinite(meter)
}
