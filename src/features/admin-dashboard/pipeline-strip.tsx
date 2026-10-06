import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { CalmState } from '@/components/compositions'
import { formatCurrency } from '@/lib/format'
import {
  OFFER_NEXT_STEP,
  OFFER_STATUS_LABEL,
  PIPELINE_STATUSES,
  buildPipeline,
  type Offer,
} from '@/lib/offers/model'
import { isAvailable, type Availability } from '@/lib/vaults/model'

/**
 * Le pipeline commercial, en une bande.
 *
 * Le tableau de bord ouvrait sur l'AUM et la dérive maximale — des mesures de
 * ce qui tourne déjà. Mais l'essentiel du travail d'une journée est en amont :
 * des offres à finir, à relancer, des fonds à appeler, des vaults à ouvrir.
 * Rien de tout cela n'était visible.
 */

/** Teinte de chaque étape : plus l'offre avance, plus le vert est franc. */
const STAGE_TINT = [22, 38, 56, 76, 100] as const

function usd(amount: number): string {
  return formatCurrency(String(amount), { unit: '$', fromAtomic: 1 })
}

export function PipelineStrip({
  offers,
}: Readonly<{ offers: Availability<readonly Offer[]> }>) {
  if (!isAvailable(offers)) {
    return <CalmState message="The commercial pipeline could not be read." />
  }

  const pipeline = buildPipeline(offers.value)

  /* Montant en jeu PAR ÉTAPE : c'est lui qui dessine la barre. Un compteur
     seul met sur le même plan un brouillon à 50 k$ et un versement à 5 M$. */
  const amountOf = Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [
      status,
      offers.value
        .filter((o) => o.status === status)
        .reduce((sum, o) => sum + (o.amountUsdc ?? 0), 0),
    ]),
  ) as Record<(typeof PIPELINE_STATUSES)[number], number>
  const openCount = PIPELINE_STATUSES.reduce((n, s) => n + pipeline.counts[s], 0)
  const total = pipeline.openAmountUsdc

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[34px] leading-none font-medium tracking-[-0.03em] tabular-nums text-fg">
            {usd(total)}
          </p>
          <p className="mt-1.5 text-xs text-fg-tertiary">
            In play across {openCount} open offers
          </p>
        </div>
        {pipeline.needsAction.length > 0 ? (
          <Badge color="amber">{pipeline.needsAction.length} waiting on you</Badge>
        ) : (
          <Badge color="lime">Nothing blocked</Badge>
        )}
      </div>

      {/* La barre : une part par étape, dans l'ordre du parcours, du vert le
          plus pâle (brouillon) au plus franc (fonds reçus). Les états terminaux
          n'y figurent pas : un vault ouvert a quitté le pipeline. */}
      {total > 0 ? (
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {PIPELINE_STATUSES.map((status, i) =>
            amountOf[status] > 0 ? (
              <div
                key={status}
                className="h-full"
                style={{
                  width: `${(amountOf[status] / total) * 100}%`,
                  background: `color-mix(in srgb, var(--hearst-green) ${STAGE_TINT[i]}%, transparent)`,
                }}
              />
            ) : null,
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)] sm:grid-cols-5">
        {PIPELINE_STATUSES.map((status, i) => {
          const count = pipeline.counts[status]
          const needsUs = OFFER_NEXT_STEP[status] !== null && count > 0
          return (
            <div key={status} className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-fg-tertiary">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: `color-mix(in srgb, var(--hearst-green) ${STAGE_TINT[i]}%, transparent)` }}
                />
                {OFFER_STATUS_LABEL[status]}
              </span>
              <span className="flex items-baseline gap-2">
                <span className={`text-xl font-medium tabular-nums ${needsUs ? 'text-[var(--hearst-green)]' : 'text-fg'}`}>
                  {count}
                </span>
                <span className="truncate text-xs tabular-nums text-fg-tertiary">
                  {amountOf[status] > 0 ? usd(amountOf[status]) : '—'}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      {/* Les offres qui attendent un geste, nommées, avec leur montant et le
          geste attendu. Un compteur seul oblige à ouvrir un autre écran pour
          savoir de qui il s'agit. */}
      {pipeline.needsAction.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[var(--ud-line)] border-t border-[var(--ud-line)]">
          {pipeline.needsAction.slice(0, 4).map((offer) => (
            <li key={offer.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{offer.clientName}</p>
                <p className="text-xs text-fg-tertiary">{OFFER_STATUS_LABEL[offer.status]}</p>
              </div>
              <span className="text-sm tabular-nums text-fg sm:text-right">
                {offer.amountUsdc !== null ? usd(offer.amountUsdc) : '—'}
              </span>
              <span className="hidden truncate text-xs text-fg-secondary sm:block">
                {OFFER_NEXT_STEP[offer.status]}
              </span>
              <Link href={`/admin/offers/${offer.id}`} className="ud-detail-btn inline-flex items-center">
                Open
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
