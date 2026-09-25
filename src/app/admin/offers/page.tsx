import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Callout, DataTableShell, tableCol } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/format'
import { loadAdminOffers } from '@/lib/admin-dashboard/load'
import {
  OFFER_NEXT_STEP,
  OFFER_STATUS_LABEL,
  PIPELINE_STATUSES,
  RISK_PROFILE_LABEL,
  buildPipeline,
  isTerminal,
  type Offer,
  type OfferStatus,
} from '@/lib/offers/model'
import { available, isAvailable, unavailable, valueOf, type Availability } from '@/lib/vaults/model'
import {
  BanknotesIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  InboxArrowDownIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Offers' }
export const dynamic = 'force-dynamic'

/**
 * Le pipeline commercial.
 *
 * Le produit se vend sur mesure : un appel, une proposition chiffrée, une
 * validation, un virement, puis un vault taillé pour ce client-là. L'outil ne
 * connaissait que les deux extrémités de cette chaîne — un dossier KYC d'un
 * côté, un vault actif de l'autre — et rien entre les deux.
 *
 * Cet écran porte le milieu : où en est chaque offre, et laquelle attend un
 * geste de notre part.
 */

/** La teinte suit l'AVANCEMENT, pas l'humeur : un refus n'est pas une alerte. */
function statusTone(status: OfferStatus): 'lime' | 'neutral' | 'amber' | 'sky' {
  if (status === 'active') return 'lime'
  if (status === 'declined' || status === 'expired') return 'neutral'
  // Distingue ce qui attend un geste de nous de ce qui attend le client.
  if (OFFER_NEXT_STEP[status] !== null) return 'amber'
  return 'sky'
}

function usd(amount: number | null): string {
  if (amount === null) return '—'
  return formatCurrency(String(amount), { unit: '$', fromAtomic: 1 })
}

/** L'allocation proposée, en une ligne lisible. */
function allocationLine(offer: Offer): string {
  const { miningBps, lendingBps, stableBps } = offer.allocation
  const pct = (bps: number) => `${Math.round(bps / 100)}%`
  return `${pct(miningBps)} mining · ${pct(lendingBps)} lending · ${pct(stableBps)} USDC`
}

export default async function OffersPage() {
  await requireSession()

  const offers = await loadAdminOffers()
  const rows = valueOf(offers) ?? []
  const pipeline = buildPipeline(rows)

  const open = rows.filter((o) => !isTerminal(o.status))
  const won = rows.filter((o) => o.status === 'active')

  /* Une lecture absente reste absente : si le pipeline n'a pas pu être lu, les
     compteurs ne tombent pas à zéro — ils disent qu'ils ne savent pas. */
  const reading = (text: string): Availability<string> =>
    isAvailable(offers)
      ? available(text, { provenance: offers.provenance })
      : unavailable({
          endpoint: offers.endpoint,
          status: offers.status,
          reason: offers.reason,
        })

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'open',
      title: 'Open offers',
      value: reading(String(open.length)),
      icon: DocumentTextIcon,
    },
    {
      id: 'capital',
      title: 'Capital in play',
      value: reading(usd(pipeline.openAmountUsdc)),
      icon: BanknotesIcon,
    },
    {
      id: 'waiting',
      title: 'Waiting on you',
      value: reading(String(pipeline.needsAction.length)),
      icon: InboxArrowDownIcon,
    },
    {
      id: 'won',
      title: 'Vaults opened',
      value: reading(String(won.length)),
      icon: CheckCircleIcon,
    },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title="Offers"
        description="One offer per prospect — from the first proposal to the vault it opens."
        kpis={kpis}
      />

      {!isAvailable(offers) ? (
        <BentoGrid>
          <BentoCard span={12}>
            <Callout tone="warning" title="Offers are not available">
              The pipeline could not be read from {offers.endpoint ?? 'the backend'}. Nothing is
              shown rather than a guess.
            </Callout>
          </BentoCard>
        </BentoGrid>
      ) : (
        <BentoGrid>
          {/* ── LE PIPELINE, ÉTAT PAR ÉTAT ────────────────────────────────
              Cinq colonnes dans l'ordre du parcours. Les états terminaux n'y
              figurent pas : un vault ouvert a quitté le pipeline, un refus
              aussi. Les compter ici gonflerait le tuyau de choses qui n'y
              circulent plus. */}
          {PIPELINE_STATUSES.map((status) => {
            const count = pipeline.counts[status]
            const step = OFFER_NEXT_STEP[status]
            return (
              <BentoCard key={status} span={4}>
                <div className="text-xs text-fg-tertiary">{OFFER_STATUS_LABEL[status]}</div>
                <div className="mt-1 text-2xl font-medium tabular-nums">{count}</div>
                <div className="mt-1 text-xs text-fg-tertiary">
                  {step ?? 'waiting on the client'}
                </div>
              </BentoCard>
            )
          })}

          {/* ── CE QUI ATTEND UN GESTE ────────────────────────────────────
              Sorti en tête, avant la liste complète : c'est la seule partie
              sur laquelle on peut agir aujourd'hui. */}
          {pipeline.needsAction.length > 0 ? (
            <BentoCard span={12}>
              <DataTableShell
                title="Waiting on you"
                description="Each of these is blocked until someone here moves it forward."
              >
                  <TableHead>
                    <TableRow>
                      <TableHeader className={tableCol.primary}>Client</TableHeader>
                      <TableHeader className={tableCol.numeric}>Amount</TableHeader>
                      <TableHeader className={tableCol.status}>Status</TableHeader>
                      <TableHeader>Next step</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pipeline.needsAction.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className={tableCol.primary}>
                          <div className="truncate font-medium">{offer.clientName}</div>
                          <div className="text-xs text-fg-tertiary">{offer.reference}</div>
                        </TableCell>
                        <TableCell className={tableCol.numeric}>{usd(offer.amountUsdc)}</TableCell>
                        <TableCell className={tableCol.status}>
                          <Badge color={statusTone(offer.status)}>
                            {OFFER_STATUS_LABEL[offer.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{OFFER_NEXT_STEP[offer.status]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </DataTableShell>
            </BentoCard>
          ) : null}

          {/* ── TOUTES LES OFFRES ─────────────────────────────────────────
              L'allocation proposée est portée sur chaque ligne : c'est ce qui
              distingue deux offres d'un même montant, et c'est elle qui devient
              la cible du vault une fois l'offre signée. */}
          <BentoCard span={12}>
            <DataTableShell
              title="All offers"
              description="The allocation shown is what was proposed to that client — it becomes the vault target once signed."
            >
                <TableHead>
                  <TableRow>
                    <TableHeader className={tableCol.primary}>Client</TableHeader>
                    <TableHeader>Profile</TableHeader>
                    <TableHeader className={tableCol.numeric}>Amount</TableHeader>
                    <TableHeader>Proposed allocation</TableHeader>
                    <TableHeader className={tableCol.status}>Status</TableHeader>
                    <TableHeader className={tableCol.date}>Updated</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className={tableCol.primary}>
                        <Link href={`/admin/offers/${offer.id}`} className="font-medium">
                          {offer.clientName}
                        </Link>
                        <div className="text-xs text-fg-tertiary">
                          {offer.reference}
                          {offer.clientKind !== null ? ` · ${offer.clientKind}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>{RISK_PROFILE_LABEL[offer.riskProfile]}</TableCell>
                      <TableCell className={tableCol.numeric}>{usd(offer.amountUsdc)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-fg-secondary">{allocationLine(offer)}</span>
                      </TableCell>
                      <TableCell className={tableCol.status}>
                        <Badge color={statusTone(offer.status)}>
                          {OFFER_STATUS_LABEL[offer.status]}
                        </Badge>
                      </TableCell>
                      {/* Date ABSOLUE, pas « il y a 4 j » : un relatif se
                          calcule à l'instant du rendu, donc le serveur et le
                          navigateur n'écrivaient pas la même chose et React
                          rejetait l'hydratation. Dans un pipeline commercial,
                          savoir QUAND une offre a bougé vaut de toute façon
                          mieux qu'une ancienneté approximative. */}
                      <TableCell className={tableCol.date}>{formatDate(offer.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </DataTableShell>
          </BentoCard>
        </BentoGrid>
      )}
    </DashboardShell>
  )
}
