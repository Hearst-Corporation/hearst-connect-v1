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

  return (
    <div className="flex flex-col gap-4">
      {/* Les cinq états du parcours, dans l'ordre. Les états terminaux n'y
          figurent pas : un vault ouvert a quitté le pipeline, un refus aussi. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {PIPELINE_STATUSES.map((status) => {
          const count = pipeline.counts[status]
          const needsUs = OFFER_NEXT_STEP[status] !== null && count > 0
          return (
            <div
              key={status}
              className="rounded-lg border border-console-line-soft px-3 py-2.5"
            >
              <div className="text-xs text-fg-tertiary">{OFFER_STATUS_LABEL[status]}</div>
              <div
                className={`mt-0.5 text-xl font-medium tabular-nums ${needsUs ? 'text-accent-400' : ''}`}
              >
                {count}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-fg-tertiary">
          {usd(pipeline.openAmountUsdc)} in play across {pipeline.counts.draft +
            pipeline.counts.sent +
            pipeline.counts.accepted +
            pipeline.counts.funding +
            pipeline.counts.funded}{' '}
          open offers
        </span>
        {pipeline.needsAction.length > 0 ? (
          <Badge color="amber">{pipeline.needsAction.length} waiting on you</Badge>
        ) : (
          <Badge color="lime">Nothing blocked</Badge>
        )}
      </div>

      {/* Les offres qui attendent un geste, nommées. Un compteur seul oblige à
          ouvrir un autre écran pour savoir de qui il s'agit. */}
      {pipeline.needsAction.length > 0 ? (
        <ul className="flex flex-col divide-y divide-console-line-soft">
          {pipeline.needsAction.slice(0, 4).map((offer) => (
            <li key={offer.id} className="flex items-baseline justify-between gap-3 py-2">
              <Link href={`/admin/offers/${offer.id}`} className="truncate text-sm font-medium">
                {offer.clientName}
              </Link>
              <span className="shrink-0 text-xs text-fg-tertiary">
                {OFFER_NEXT_STEP[offer.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
