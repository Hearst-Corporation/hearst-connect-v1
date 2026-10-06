import { redirect } from 'next/navigation'
import { Link } from '@/components/catalyst/link'
import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Badge } from '@/components/catalyst/badge'
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Callout, DataTableShell, tableCol } from '@/components/compositions'
import { DashCard } from '@/components/admin/dashboard'
import { HearstBreakdownDonut } from '@/components/charts'
import { ProjectionTable } from '@/features/user-dashboard/projection-table'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { loadAdminOffers, loadOfferSimulation } from '@/lib/admin-dashboard/load'
import { emailsFor } from '@/lib/offers/emails'
import {
  OFFER_NEXT_STEP,
  OFFER_STATUS_LABEL,
  RISK_PROFILE_LABEL,
  type Offer,
} from '@/lib/offers/model'
import { available, isAvailable, unavailable, valueOf, type Availability } from '@/lib/vaults/model'
import {
  BanknotesIcon,
  ChartBarIcon,
  ClockIcon,
  ScaleIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Offer' }
export const dynamic = 'force-dynamic'

/**
 * LA PROPALE — une offre, son allocation, et ce qu'elle projette.
 *
 * Le produit se vend sur mesure : deux clients d'un même profil n'ont pas les
 * mêmes contraintes, donc pas la même allocation. Cet écran porte ce qu'on
 * propose à CELUI-CI, et ce que cette proposition donne sur l'horizon retenu.
 *
 * La simulation tourne sur le MÊME moteur que la projection du client. Ce
 * n'est pas une économie de code : deux moteurs auraient dérivé l'un de
 * l'autre au premier ajustement, et le client aurait découvert après signature
 * un chiffre que la propale ne promettait pas.
 */

function usd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return formatCurrency(String(amount), { unit: '$', fromAtomic: 1 })
}

function btc(value: number): string {
  return `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BTC`
}

function pct(bps: number): string {
  return `${formatNumber(bps / 100, { maximumFractionDigits: 0 })} %`
}

export default async function OfferPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession()
  const { id } = await params

  const offers = await loadAdminOffers()
  const offer: Offer | undefined = (valueOf(offers) ?? []).find((o) => o.id === id)
  /* Une offre rattachée à un client vit sur la fiche de ce client : offre,
     projection, PDF et courriels y sont réunis. Cette page reste pour les
     offres que le backend ne rattache encore à personne. */
  if (offer?.clientId) redirect(`/admin/clients/${offer.clientId}`)

  if (offer === undefined) {
    if (isAvailable(offers)) notFound()
    return (
      <DashboardShell>
        <DashboardHeader title="Offer" description="" kpis={[]} />
        <BentoGrid>
          <BentoCard span={12}>
            <Callout tone="warning" title="Offer not available">
              The pipeline could not be read — nothing is shown rather than a guess.
            </Callout>
          </BentoCard>
        </BentoGrid>
      </DashboardShell>
    )
  }

  /* La simulation ne tourne QUE si l'offre porte un montant : projeter sur un
     capital inconnu produirait une courbe qui ne veut rien dire. */
  const simulation: Availability<import('@/lib/admin-dashboard/contracts').OfferSimulation> =
    offer.amountUsdc !== null
      ? await loadOfferSimulation(offer.id, {
          amountUsdc: offer.amountUsdc,
          months: offer.lockupMonths,
          miningBps: offer.allocation.miningBps,
          lendingBps: offer.allocation.lendingBps,
          stableBps: offer.allocation.stableBps,
        })
      : unavailable({
          endpoint: `/api/v1/admin/offers/${offer.id}/simulate`,
          status: 'EMPTY',
          reason: 'no_amount_on_offer',
        })

  const sim = valueOf(simulation)
  const horizon = sim?.points[sim.points.length - 1]

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'amount',
      title: 'Amount',
      value: available(usd(offer.amountUsdc)),
      icon: BanknotesIcon,
    },
    {
      id: 'profile',
      title: 'Risk profile',
      value: available(RISK_PROFILE_LABEL[offer.riskProfile]),
      icon: ScaleIcon,
    },
    {
      id: 'lockup',
      title: 'Lock-up',
      value: available(`${offer.lockupMonths} months`),
      icon: ClockIcon,
    },
    {
      /* Le produit est une réserve de bitcoin : on annonce le bitcoin visé au
         terme (médiane), pas un rendement en pourcentage. */
      id: 'reserve',
      title: 'Bitcoin at term',
      value: isAvailable(simulation)
        ? available(
            `${formatNumber(simulation.value.points[simulation.value.points.length - 1]?.btcP50 ?? 0, { maximumFractionDigits: 2 })} BTC`,
          )
        : unavailable({ status: simulation.status, reason: simulation.reason }),
      icon: ChartBarIcon,
    },
  ]

  const nextStep = OFFER_NEXT_STEP[offer.status]

  return (
    <DashboardShell>
      <DashboardHeader
        title={offer.clientName}
        description={`${offer.reference} · ${offer.clientKind ?? 'Client kind not recorded'}`}
        kpis={kpis}
        /* La propale imprimable : générée depuis cette offre et sa simulation,
           à enregistrer en PDF puis à envoyer au client. */
        action={
          <Link href={`/proposal/${offer.id}`} className="ud-cta">
            Proposal (PDF)
          </Link>
        }
      />

      <BentoGrid>
        {/* ── OÙ EN EST-ELLE ────────────────────────────────────────────── */}
        <BentoCard span={12}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge color={offer.status === 'active' ? 'lime' : nextStep !== null ? 'amber' : 'sky'}>
                {OFFER_STATUS_LABEL[offer.status]}
              </Badge>
              {nextStep !== null ? (
                <span className="text-sm text-fg-secondary">{nextStep}</span>
              ) : (
                <span className="text-sm text-fg-tertiary">Waiting on the client</span>
              )}
            </div>
            <span className="text-xs text-fg-tertiary">
              Updated {formatDate(offer.updatedAt)}
              {offer.sentAt !== null ? ` · sent ${formatDate(offer.sentAt)}` : ''}
            </span>
          </div>
          {offer.notes !== null ? (
            <p className="mt-3 text-sm text-fg-secondary">{offer.notes}</p>
          ) : null}
        </BentoCard>

        {/* ── L'ALLOCATION PROPOSÉE ─────────────────────────────────────── */}
        <BentoCard span={6} bare className="self-stretch">
          {/* Un anneau, pas un tableau de trois lignes : la répartition se lit
              d'un regard, et la légende porte le montant de chaque poche. */}
          <DashCard
            className="h-full min-w-0"
            eyebrow="Mandate"
            title="Proposed allocation"
            subtitle="What this client is offered — it becomes the vault target once signed"
          >
            <HearstBreakdownDonut
              slices={[
                { label: 'Mining Alpha', bps: offer.allocation.miningBps },
                { label: 'Bitcoin Lending', bps: offer.allocation.lendingBps },
                { label: 'USDC Yield', bps: offer.allocation.stableBps },
              ].map((row) => ({
                label: row.label,
                value:
                  offer.amountUsdc === null
                    ? row.bps / 100
                    : Math.round((offer.amountUsdc * row.bps) / 10_000),
              }))}
              kind={offer.amountUsdc === null ? 'percent' : 'usd'}
              unit="USD"
              centerCaption="proposed"
              layout="side"
            />
          </DashCard>
        </BentoCard>

        {/* ── LE QUESTIONNAIRE ──────────────────────────────────────────── */}
        <BentoCard span={6}>
          {offer.questionnaire === null ? (
            <Callout tone="info" title="Questionnaire not returned">
              This offer was built before the qualification form came back. The risk profile was
              set by hand.
            </Callout>
          ) : (
            <DataTableShell
              eyebrow="Client"
              title="Qualification"
              description="What the client answered — the basis for the risk profile."
            >
              <TableHead>
                <TableRow>
                  <TableHeader className={tableCol.primary}>Question</TableHeader>
                  <TableHeader>Answer</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['Platform', offer.questionnaire.platformKind],
                  ['Assets under management', offer.questionnaire.assetsUnderManagement],
                  ['Funds today', offer.questionnaire.fundsIdleOrEarning],
                  ['Product live', offer.questionnaire.hasProductToday],
                  ['Interest', offer.questionnaire.productInterest],
                  ['First vault size', offer.questionnaire.firstVaultSize],
                  ['Timeline', offer.questionnaire.launchTimeline],
                ].map(([q, a]) => (
                  <TableRow key={q as string}>
                    <td className={tableCol.primary}>{q}</td>
                    <td>{a ?? <span className="text-fg-tertiary">not answered</span>}</td>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          )}
        </BentoCard>

        {/* ── LA PROJECTION ─────────────────────────────────────────────────
            Deux lectures côte à côte, comme le produit les pose : ce que le
            capital devient en dollars, et combien de bitcoin il représente
            face à un simple achat au comptant. L'écart entre p10 et p90 EST
            le message — une projection n'est pas une promesse. */}
        <BentoCard span={12}>
          {!isAvailable(simulation) ? (
            <Callout tone="warning" title="Projection not available">
              {simulation.reason === 'no_amount_on_offer'
                ? 'This offer carries no amount yet — projecting on an unknown capital would draw a meaningless curve.'
                : (simulation.reason ?? 'not read')}
            </Callout>
          ) : horizon === undefined ? (
            <Callout tone="warning" title="Projection came back empty">
              The engine answered without a single point — nothing is drawn rather than a guess.
            </Callout>
          ) : (
            <DashCard
              className="min-w-0"
              eyebrow="Projection"
              title={`Projection at ${offer.lockupMonths} months`}
              subtitle={`${formatNumber(simulation.value.runs)} runs · BTC volatility ${formatNumber(simulation.value.btcVolAnnualPct, { maximumFractionDigits: 0 })} % · the same engine the client sees`}
            >
              {/* Le tableau de projection de /account, à l'identique : ce que le
                  client verra une fois son vault ouvert. */}
              <ProjectionTable
                projection={simulation.value}
                leadLabel="Proposed capital"
                horizons={[...new Set([6, 12, offer.lockupMonths])]
                  .filter((m) => m <= offer.lockupMonths)
                  .sort((x, y) => x - y)}
              />
            </DashCard>
          )}
        </BentoCard>

        {/* ── LES COURRIELS DU PARCOURS ─────────────────────────────────
            Quatre moments où le client reçoit un texte qui engage
            l'entreprise. Celui de l'étape courante est déplié : c'est le seul
            qu'on ait à envoyer maintenant.

            Aucun envoi n'est branché — le transport et le lien Fireblocks
            restent à raccorder. En attendant, le texte se copie d'ici plutôt
            que de se réécrire à chaque fois. */}
        <BentoCard span={12} bare>
          <DashCard
            className="min-w-0"
            eyebrow="Journey"
            title="Emails"
            subtitle="Each is triggered by a change of state, never sent by hand. Nothing is wired to a mail service yet — copy the text for now"
          >
          <div className="flex flex-col gap-3">
            {emailsFor(offer).map((mail) => {
              const current = mail.trigger.startsWith(`${offer.status} →`)
              return (
                <details
                  key={mail.id}
                  open={current}
                  className="rounded-lg border border-console-line bg-console-inset px-4 py-3"
                >
                  <summary className="cursor-pointer text-sm">
                    <span className={current ? 'font-medium text-accent-400' : ''}>
                      {mail.subject}
                    </span>
                    <span className="ml-2 text-xs text-fg-tertiary">{mail.trigger}</span>
                  </summary>
                  <pre className="mt-3 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap text-fg-secondary">
                    {mail.body}
                  </pre>
                </details>
              )
            })}
          </div>
          </DashCard>
        </BentoCard>

        {/* Le point de comparaison de la thèse, dit en toutes lettres. */}
        {isAvailable(simulation) ? (
          <BentoCard span={12}>
            <Callout tone="info" title="The benchmark">
              {usd(simulation.value.startValueUsdc)} buys {btc(simulation.value.hodlBtc)}{' '}at
              today&apos;s spot. The question this product answers is whether the client ends up
              with more bitcoin than that — not whether the price goes up.
            </Callout>
          </BentoCard>
        ) : null}
      </BentoGrid>
    </DashboardShell>
  )
}
