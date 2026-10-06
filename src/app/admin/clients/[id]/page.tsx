import { SectionNav } from '@/features/admin-clients/section-nav'
import { Link } from '@/components/catalyst/link'
import { DashCard, DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Badge } from '@/components/catalyst/badge'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { HearstBreakdownDonut } from '@/components/charts'
import { Callout, tableCol } from '@/components/compositions'
import { Journey } from '@/features/admin-clients/journey'
import { ClientCompute } from '@/features/admin-clients/client-compute'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { approvalAmount, btcFromSats, formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { allocatedTo, loadFleetCompute } from '@/lib/mining/compute'
import { EmailComposer } from '@/features/admin-offers/email-composer'
import { BucketsByMonthChart } from '@/features/admin-dashboard/book-charts'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { ProjectionTable } from '@/features/user-dashboard/projection-table'
import { driftThresholdOf, isVaultDrifting } from '@/lib/admin-dashboard/contracts'
import { loadAdminRebalancingOperations, loadOfferSimulation } from '@/lib/admin-dashboard/load'
import { AllocationRebalancing } from '@/features/admin-clients/allocation-rebalancing'
import { DecisionButtons } from '@/features/admin-approvals/decision-buttons'
import { requireSession } from '@/lib/auth'
import { loadClientBook, STAGE_LABEL } from '@/lib/clients/book'
import { loadClientDossier } from '@/lib/clients/dossier'
import { formatCurrency, formatDate, formatHash, formatNumber } from '@/lib/format'
import { kycStatusLabel } from '@/lib/labels'
import { emailsFor } from '@/lib/offers/emails'
import { OFFER_STATUS_LABEL, RISK_PROFILE_LABEL } from '@/lib/offers/model'
import { available, isAvailable, unavailable, valueOf, type Availability } from '@/lib/vaults/model'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartPieIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Client' }
export const dynamic = 'force-dynamic'

/**
 * LA FICHE CLIENT — tout le parcours d'un client, de haut en bas, sur une page.
 *
 * Elle répond dans l'ordre aux questions qu'on se pose en l'ouvrant : où en
 * est-il, qu'est-ce qui m'attend, qu'est-ce qu'on lui a proposé, comment
 * tourne son vault, et qui est-il. L'offre, le KYC et le vault ne sont plus
 * des pages à recouper : ce sont des sections de la même fiche.
 *
 * Seul l'essentiel y figure. La traçabilité de chaque chiffre (endpoint,
 * dérivation) vit dans l'explorateur d'API, pas dans le travail quotidien.
 */

const usd = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 })
const pct = (bps: number) => `${formatNumber(bps / 100, { maximumFractionDigits: 0 })} %`
const pts = (bps: number) => `${formatNumber(bps / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`

/** Les trois poches d'un vault, dans l'ordre de /account. */
const BUCKETS = ['Mining Alpha', 'Bitcoin Lending', 'USDC Yield'] as const
const monthName = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

const DECISION_LABEL: Record<string, string> = {
  deposit: 'Deposit to authorise',
  withdrawal: 'Withdrawal to process',
  distribution: 'Distribution to sign off',
  rebalance: 'Rebalance to approve',
  protocol: 'Protocol change to approve',
}
/** L'état d'un reward mensuel, dit pour l'admin. */
const REWARD_LABEL: Record<string, string> = {
  pending: 'To approve',
  distributed: 'Paid to the client',
  approved: 'Approved',
  declined: 'Declined',
}
const REWARD_TONE: Record<string, 'amber' | 'lime' | 'sky' | 'red'> = {
  pending: 'amber',
  distributed: 'lime',
  approved: 'sky',
  declined: 'red',
}
/** Les décisions qui se prennent dans une section de la fiche, pas dans la liste. */
const DECISION_SECTION: Record<string, string> = {
  distribution: '#rewards',
  rebalance: '#allocation',
  protocol: '#allocation',
}

const DECISION_ACTION: Record<string, string> = {
  deposit: 'Authorise',
  withdrawal: 'Process',
  distribution: 'Approve',
  rebalance: 'Approve',
  protocol: 'Approve',
}

export default async function ClientPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession()
  const { id } = await params

  const [book, dossier, compute, rebalancing] = await Promise.all([
    loadClientBook(),
    loadClientDossier(id),
    loadFleetCompute(),
    loadAdminRebalancingOperations(200),
  ])
  const entry = book.entries.find((e) => e.clientId === id)
  if (entry === undefined) notFound()

  const { offer, vault, decisions } = entry
  const isActive = entry.stage === 'active'
  const bucketYields = valueOf(dossier.bucketYields) ?? []
  const distributions = valueOf(dossier.distributions) ?? []
  const movements = valueOf(dossier.movements) ?? []
  const questionnaire = offer?.questionnaire ?? null

  const simulation =
    offer !== null && offer.amountUsdc !== null && !isActive
      ? await loadOfferSimulation(offer.id, {
          amountUsdc: offer.amountUsdc,
          months: offer.lockupMonths,
          miningBps: offer.allocation.miningBps,
          lendingBps: offer.allocation.lendingBps,
          stableBps: offer.allocation.stableBps,
        })
      : null
  const sim = simulation !== null && isAvailable(simulation) ? simulation.value : null

  const shown = (text: string | null): Availability<string> => (text === null ? unavailable() : available(text))

  /* Le bandeau dépend de l'étape : un vault actif se lit par sa RÉSERVE de
     bitcoin ; un client en route, par l'offre qui le fait avancer. */
  const vaultCompute = vault !== null ? allocatedTo(compute, vault.vaultId) : null
  /* La réserve, comme en tête de /account : le versement d'entrée converti en
     bitcoin, PLUS ce que les trois poches ont rapporté et qui a été converti en
     bitcoin mois après mois. */
  const validated = distributions.filter((d) => d.status === 'distributed')
  const pendingReward = distributions.find((d) => d.status === 'pending') ?? null
  // Les distributions vivent dans « Monthly rewards » : le journal ne garde que dépôts et retraits.
  const cashMoves = movements.filter((m) => m.type !== 'distribution')
  const reserveBtc =
    distributions.length > 0 ? validated.reduce((t, d) => t + (d.btcAmountSats ?? 0), 0) / 1e8 : null
  const capitalBtc =
    movements.filter((m) => m.type === 'deposit').reduce((t, m) => t + (m.amountBtcSats ?? 0), 0) / 1e8 || null
  const totalReserveBtc = capitalBtc !== null || reserveBtc !== null ? (capitalBtc ?? 0) + (reserveBtc ?? 0) : null
  const btcFmt = (v: number) => `${formatBtcValue(v)} BTC`
  const termPoint = sim?.points[sim.points.length - 1] ?? null

  const kpis: readonly AdminHeroKpi[] = isActive
    ? [
        {
          id: 'reserve-total',
          title: 'Bitcoin reserve',
          value: shown(totalReserveBtc !== null ? btcFmt(totalReserveBtc) : null),
          icon: BitcoinIcon,
          footnote:
            capitalBtc !== null
              ? `${btcFmt(capitalBtc)} from the ${usd(vault?.principalUsdc)} USDC deposit + ${btcFmt(reserveBtc ?? 0)} accumulated`
              : `Capital ${usd(vault?.principalUsdc)} USDC`,
        },
        {
          id: 'lockup',
          title: 'Lockup',
          value: shown(
            vault?.lockupMonths != null && vault.lockupElapsedMonths != null
              ? `${Math.min(vault.lockupElapsedMonths, vault.lockupMonths)} of ${vault.lockupMonths} mo`
              : null,
          ),
          icon: LockClosedIcon,
          footnote:
            vault?.lockupStartAt && vault?.lockupEndAt
              ? `${formatDate(vault.lockupStartAt)} → ${formatDate(vault.lockupEndAt)}`
              : vault?.lockupEndAt
                ? `Unlocks ${formatDate(vault.lockupEndAt)}`
                : null,
        },
        {
          /* LA promesse du produit, comme en tête de /account et du tableau de
             bord : combien de bitcoin EN PLUS de ce que le dépôt a acheté. */
          id: 'vs-hodl',
          title: 'Ahead of simply holding',
          value: shown(
            capitalBtc !== null && reserveBtc !== null
              ? `+${formatNumber((reserveBtc / capitalBtc) * 100, { maximumFractionDigits: 1 })} %`
              : null,
          ),
          icon: ArrowTrendingUpIcon,
          footnote: reserveBtc !== null ? `+${btcFmt(reserveBtc)} more than the deposit bought at entry` : null,
        },
        {
          id: 'drift',
          title: 'Allocation drift',
          value: shown(vault?.worstDriftBps != null ? pts(vault.worstDriftBps) : 'Not read'),
          icon: ChartPieIcon,
          footnote: vault
            ? `Band ±${formatNumber(driftThresholdOf(vault) / 100, { maximumFractionDigits: 1 })} pt${isVaultDrifting(vault) ? ' — rebalance' : ''}`
            : null,
        },
      ]
    : [
        {
          id: 'amount',
          title: 'Amount proposed',
          value: shown(offer ? `${usd(offer.amountUsdc)} USDC` : null),
          icon: BanknotesIcon,
          // Le seul montant en USDC : il sera converti en bitcoin à l'entrée.
          footnote: offer
            ? sim
              ? `≈ ${btcFmt(sim.hodlBtc)} at entry · ${offer.lockupMonths}-month lockup`
              : `${offer.lockupMonths}-month lockup`
            : 'No offer yet',
        },
        {
          /* La même promesse, PROJETÉE : la réserve médiane à l'échéance contre
             ce que le dépôt achèterait aujourd'hui. L'étape, elle, est déjà
             écrite sous le nom du client. */
          id: 'vs-hodl',
          title: 'Ahead of simply holding',
          value: shown(
            sim && termPoint !== null && sim.hodlBtc > 0
              ? `${formatNumber((termPoint.btcP50 / sim.hodlBtc - 1) * 100, { maximumFractionDigits: 0, signDisplay: 'exceptZero' })} %`
              : null,
          ),
          icon: ArrowTrendingUpIcon,
          footnote: offer ? `Median at ${offer.lockupMonths} months · projected` : null,
        },
        {
          id: 'reserve',
          title: 'Bitcoin at term',
          value: shown(termPoint !== null ? btcFmt(termPoint.btcP50) : null),
          icon: BitcoinIcon,
          footnote:
            sim && termPoint !== null
              ? `Median · vs ${btcFmt(sim.hodlBtc)} bought today`
              : offer
                ? `${RISK_PROFILE_LABEL[offer.riskProfile]} profile`
                : null,
        },
        {
          id: 'kyc',
          title: 'KYC',
          value: available(entry.kycStatus === null ? 'Not started' : kycStatusLabel(entry.kycStatus)),
          icon: ShieldCheckIcon,
          footnote: 'Decided by Som, the KYC partner',
        },
      ]

  /* L'anneau de tête : la répartition réelle du vault s'il tourne, sinon celle
     qui est proposée. */
  /* En parts, pas en dollars : la console ne parle pas en USD d'une réserve de
     bitcoin. La part réelle de chaque poche si le vault tourne, sinon celle
     proposée. */
  const capitalTotal = bucketYields.reduce((t, y) => t + (y.capitalUsdc ?? 0), 0)
  const allocationSlices = isActive
    ? bucketYields.map((y) => ({
        label: y.bucket,
        value: capitalTotal > 0 ? Math.round(((y.capitalUsdc ?? 0) / capitalTotal) * 1000) / 10 : 0,
      }))
    : offer !== null
      ? [
          { label: 'Mining Alpha', value: offer.allocation.miningBps / 100 },
          { label: 'Bitcoin Lending', value: offer.allocation.lendingBps / 100 },
          { label: 'USDC Yield', value: offer.allocation.stableBps / 100 },
        ]
      : []

  /* Les sections présentes sur CETTE fiche, dans l'ordre de la page — avec le
     nombre de décisions qui attendent dans chacune. */
  const waitingIn = (kinds: readonly string[]) => decisions.filter((d) => kinds.includes(d.kind)).length
  const sections = [
    offer !== null ? { id: 'offer', label: 'Offer', badge: 0 } : null,
    decisions.length > 0 ? { id: 'decisions', label: 'Waiting on you', badge: decisions.length } : null,
    !isActive && sim !== null ? { id: 'projection', label: 'Projection', badge: 0 } : null,
    isActive ? { id: 'rewards', label: 'Rewards', badge: waitingIn(['distribution']) } : null,
    isActive && vault !== null ? { id: 'allocation', label: 'Allocation', badge: waitingIn(['rebalance', 'protocol']) } : null,
    isActive && vault !== null ? { id: 'compute', label: 'Compute', badge: 0 } : null,
    isActive ? { id: 'moves', label: 'Deposits & withdrawals', badge: 0 } : null,
    { id: 'kyc', label: 'KYC', badge: 0 },
  ].filter((x): x is { id: string; label: string; badge: number } => x !== null)

  const offerHref = `/admin/offers/new?clientId=${encodeURIComponent(entry.clientId)}&client=${encodeURIComponent(entry.name)}`

  return (
    <DashboardShell>
      <DashboardHeader
        title={entry.name}
        description={`${entry.kind ?? 'Kind not recorded'} · ${entry.stage === 'closed' ? 'Closed' : STAGE_LABEL[entry.stage]}`}
        titleAddon={
          <Link href="/admin/clients" className="text-xs text-fg-tertiary hover:text-fg">
            ← All clients
          </Link>
        }
        kpis={kpis}
        aside={
          isActive ? undefined : (
          <DashCard
            className="min-w-0"
            eyebrow="Allocation"
            title={isActive ? 'Capital by pocket' : 'Proposed allocation'}
            subtitle={isActive ? 'Where this client’s capital sits today' : 'Becomes the vault target once signed'}
          >
            {allocationSlices.length > 0 ? (
              <HearstBreakdownDonut
                slices={allocationSlices}
                kind="percent"
                unit="%"
                centerCaption={isActive ? 'of the vault' : 'allocated'}
                layout="side"
              />
            ) : (
              <p className="py-6 text-center text-sm text-fg-tertiary">No allocation yet — prepare an offer.</p>
            )}
          </DashCard>
          )
        }
        action={
          <span className="flex flex-wrap gap-2">
            {offer !== null && !isActive && entry.stage !== 'closed' ? (
              <Link href={`/proposal/${offer.id}`} className="ud-cta">
                Proposal (PDF)
              </Link>
            ) : null}
            <Link href={offerHref} className="ud-cta">
              {isActive ? 'New tranche' : offer === null || entry.stage === 'closed' ? 'New offer' : 'New version'}
            </Link>
          </span>
        }
      />

      {/* Le sommaire de la fiche : le sélecteur de la console, section active en blanc. */}
      <SectionNav sections={sections} />

      {/* ── 1. LE PARCOURS ─────────────────────────────────────────────── */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashCard className="min-w-0" eyebrow="Journey" title="Where this client stands" subtitle="From the first offer to a live vault">
            <Journey entry={entry} />
          </DashCard>
        </BentoCard>
      </BentoGrid>

      {/* ── 2. L'OFFRE ─────────────────────────────────────────────────── */}
      {offer !== null ? (
        <BentoGrid>
          <BentoCard id="offer" span={isActive || sim === null ? 12 : 8} bare className="scroll-mt-24 self-stretch">
            <DashCard
              className="h-full min-w-0"
              eyebrow="Offer"
              title={`${offer.reference} · ${OFFER_STATUS_LABEL[offer.status]}`}
              subtitle={`Created ${formatDate(offer.createdAt)}${offer.sentAt ? ` · sent ${formatDate(offer.sentAt)}` : ''}`}
              action={
                <Link href={`/proposal/${offer.id}`} className="ud-cta">
                  Proposal (PDF)
                </Link>
              }
            >
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)] sm:grid-cols-4">
                {[
                  ['Amount', usd(offer.amountUsdc)],
                  ['Lockup', `${offer.lockupMonths} months`],
                  ['Profile', RISK_PROFILE_LABEL[offer.riskProfile]],
                  ['Allocation', `${pct(offer.allocation.miningBps)} · ${pct(offer.allocation.lendingBps)} · ${pct(offer.allocation.stableBps)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3">
                    <dt className="text-xs text-fg-tertiary">{k}</dt>
                    <dd className="text-sm font-medium tabular-nums text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-[11px] text-fg-tertiary">Allocation: Mining Alpha · Bitcoin Lending · USDC Yield</p>
              {offer.notes ? <p className="mt-4 text-sm text-fg-secondary">“{offer.notes}”</p> : null}

              {/* Les courriels du parcours : relire, modifier, ajouter des copies,
                  puis envoyer depuis Gmail ou la messagerie. Celui de l'étape en
                  cours est déplié. */}
              <div className="mt-6">
                <EmailComposer
                  offerId={offer.id}
                  to={offer.contactEmail}
                  emails={emailsFor(offer).map((mail) => ({
                    id: mail.id,
                    subject: mail.subject,
                    trigger: mail.trigger,
                    body: mail.body,
                    current: mail.trigger.startsWith(`${offer.status} →`),
                  }))}
                />
              </div>
            </DashCard>
          </BentoCard>

          {!isActive && sim !== null ? (
            <BentoCard id="projection" span={4} bare className="scroll-mt-24 self-stretch">
              <DashCard
                className="h-full min-w-0"
                eyebrow="Monte-Carlo"
                title={`Projection at ${offer.lockupMonths} months`}
                subtitle="The same engine the client will see once the vault is open"
              >
                <ProjectionTable
                  projection={sim}
                  leadLabel="Proposed capital"
                  horizons={[...new Set([6, 12, offer.lockupMonths])].filter((m) => m <= offer.lockupMonths).sort((a, b) => a - b)}
                />
              </DashCard>
            </BentoCard>
          ) : null}
        </BentoGrid>
      ) : null}

      {/* ── 3. CE QUI ATTEND UNE DÉCISION (sous l'offre : on lit ce qui a été
          proposé, puis ce qui attend notre geste) ──────────────────────────────── */}
      {decisions.length > 0 ? (
        <BentoGrid>
          <BentoCard span={12} bare id="decisions" className="scroll-mt-24">
            <DashCard
              className="min-w-0"
              eyebrow="Decisions"
              title="Waiting on you"
              subtitle="Each one blocks this client’s money until someone here decides"
            >
              <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
                {decisions.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{DECISION_LABEL[d.kind] ?? d.kind}</p>
                      <p className="text-xs text-fg-tertiary">{d.note ?? '—'}</p>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-fg">{approvalAmount(d)}</p>
                    <p className="text-xs tabular-nums text-fg-tertiary">{d.requestedAt ? formatDate(d.requestedAt) : '—'}</p>
                    {/* Une décision qui a SA section (reward, rééquilibrage, protocole)
                        s'y prend, avec son contexte ; les autres, ici. */}
                    {DECISION_SECTION[d.kind] ? (
                      <a href={DECISION_SECTION[d.kind]} className="ud-detail-btn inline-flex items-center no-underline">
                        Review
                      </a>
                    ) : (
                      <DecisionButtons id={d.id} action={DECISION_ACTION[d.kind] ?? 'Approve'} />
                    )}
                  </li>
                ))}
              </ul>
            </DashCard>
          </BentoCard>
        </BentoGrid>
      ) : null}

      {/* ── 4. LE VAULT ────────────────────────────────────────────────── */}
      {isActive ? (
        <>


          {/* ── CE QUE CHAQUE POCHE A RAPPORTÉ ─────────────────────────────
              Les trois poches du vault, mois par mois : leur gain en dollars,
              sa conversion en bitcoin au cours du mois, et le total qui nourrit
              la réserve (« Bitcoin produced », en tête de fiche). */}
          <BentoGrid>
            <BentoCard span={12} bare id="rewards" className="scroll-mt-24">
              <DashCard
                className="min-w-0 scroll-mt-24"
                eyebrow="Rewards"
                title="Monthly rewards"
                subtitle="What each bucket earned each month, converted into bitcoin — validated here before it reaches the client"
              >
                {distributions.length === 0 ? (
                  <p className="text-sm text-fg-tertiary">No month closed yet.</p>
                ) : (
                  <div className="flex flex-col gap-6">
                  {/* LE REWARD À VALIDER, en tête : le mois, le montant en bitcoin,
                      sa répartition par poche — et la décision. Il n'arrive chez
                      le client qu'une fois approuvé. */}
                  {pendingReward ? (
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--ud-radius-sm)] bg-amber-400/[0.06] px-5 py-4 ring-1 ring-amber-400/25">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs tracking-[0.12em] text-amber-400 uppercase">
                          Reward to approve · {monthName(pendingReward.month)}
                        </p>
                        <p className="text-[28px] leading-none font-medium tabular-nums text-fg">
                          {btcFromSats(pendingReward.btcAmountSats)}
                          <span className="ml-2 text-sm text-fg-tertiary">≈ {usd(pendingReward.yieldUsdc)}</span>
                        </p>
                        <p className="text-xs text-fg-secondary">
                          {BUCKETS.map((b) => {
                            const g = pendingReward.byBucket?.find((x) => x.bucket === b)
                            return `${b} ${g ? btcFromSats(g.btcSats) : '—'}`
                          }).join(' · ')}
                        </p>
                        <p className="text-[11px] text-fg-tertiary">
                          Converted at {usd(pendingReward.btcPriceUsdc)} / BTC · reaches the client’s reserve once approved
                        </p>
                      </div>
                      <DecisionButtons id={`apr_dist_${entry.clientId}`} action="Approve reward" />
                    </div>
                  ) : (
                    <p className="text-sm text-fg-tertiary">
                      No reward waiting — every closed month has been decided.
                    </p>
                  )}

                  <BucketsByMonthChart
                    months={[...distributions]
                      .sort((x, y) => x.month.localeCompare(y.month))
                      .map((d) => ({
                        month: d.month,
                        usd: d.yieldUsdc ?? 0,
                        buckets: Object.fromEntries((d.byBucket ?? []).map((b) => [b.bucket, b.btcSats / 1e8])),
                      }))}
                  />

                  <PaginatedTable
                    className="[&_table]:w-full [&_table]:min-w-[56rem]"
                    noun="months"
                    head={
                      <TableRow>
                        <TableHeader>Month</TableHeader>
                        {BUCKETS.map((b) => (
                          <TableHeader key={b}>{b}</TableHeader>
                        ))}
                        <TableHeader>Total, in bitcoin</TableHeader>
                        <TableHeader>BTC price</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>
                          <span className="sr-only">Validate</span>
                        </TableHeader>
                      </TableRow>
                    }
                    rows={distributions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium text-fg">{monthName(d.month)}</TableCell>
                        {BUCKETS.map((b) => {
                          const g = d.byBucket?.find((x) => x.bucket === b)
                          return (
                            <TableCell key={b}>
                              {g ? (
                                <>
                                  <div className="tabular-nums text-fg">{usd(g.usd)}</div>
                                  <div className="text-[11px] tabular-nums text-fg-tertiary">{btcFmt(g.btcSats / 1e8)}</div>
                                </>
                              ) : (
                                <span className="text-fg-tertiary">—</span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell>
                          <div className="font-medium tabular-nums text-[var(--hearst-green)]">
                            {d.btcAmountSats != null ? btcFmt(d.btcAmountSats / 1e8) : '—'}
                          </div>
                          <div className="text-[11px] tabular-nums text-fg-tertiary">{usd(d.yieldUsdc)}</div>
                        </TableCell>
                        <TableCell className="tabular-nums text-fg-tertiary">{usd(d.btcPriceUsdc)}</TableCell>
                        <TableCell>
                          <Badge color={REWARD_TONE[d.status] ?? 'neutral'}>{REWARD_LABEL[d.status] ?? d.status}</Badge>
                        </TableCell>
                        {/* Le reward du mois arrive chez le client UNIQUEMENT une
                            fois approuvé ici. */}
                        <TableCell className="text-right">
                          {d.status === 'pending' ? (
                            <DecisionButtons id={`apr_dist_${entry.clientId}`} action="Approve" />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    exportData={{
                      filename: `hearst-monthly-rewards-${entry.name}`,
                      title: `Monthly rewards — ${entry.name}`,
                      columns: [
                        'Month',
                        ...BUCKETS.flatMap((b) => [`${b} (USD)`, `${b} (BTC)`]),
                        'Total (BTC)',
                        'Total (USD)',
                        'BTC price (USD)',
                        'Status',
                      ],
                      data: distributions.map((d) => [
                        d.month,
                        ...BUCKETS.flatMap((b) => {
                          const g = d.byBucket?.find((x) => x.bucket === b)
                          return [g?.usd ?? null, g ? g.btcSats / 1e8 : null]
                        }),
                        d.btcAmountSats != null ? d.btcAmountSats / 1e8 : null,
                        d.yieldUsdc,
                        d.btcPriceUsdc,
                        d.status,
                      ]),
                    }}
                  />
                  </div>
                )}
              </DashCard>
            </BentoCard>
          </BentoGrid>

          {/* Son allocation en points, poche par poche, et ses rééquilibrages. */}
          {vault !== null ? (
            <BentoGrid>
              <BentoCard span={12} bare id="allocation" className="scroll-mt-24">
                <AllocationRebalancing
                  vault={vault}
                  buckets={bucketYields}
                  operations={(valueOf(rebalancing) ?? [])
                    .filter((op) => op.vaultId === vault.vaultId)
                    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))}
                  clientName={entry.name}
                  pending={decisions.filter((d) => d.kind === 'rebalance' || d.kind === 'protocol')}
                />
              </BentoCard>
            </BentoGrid>
          ) : null}

          {/* Sa puissance de calcul : ce que le client lit dans « Compute ». */}
          {vault !== null ? <div id="compute" className="scroll-mt-24"><ClientCompute
              vaultId={vault.vaultId}
              clientName={entry.name}
              fleet={vaultCompute}
              networkEhs={compute.networkEhs}
              machines={compute.machines}
              months={compute.months}
            /></div> : null}

          <BentoGrid>
            <BentoCard id="moves" span={12} bare className="scroll-mt-24">
              <DashCard className="min-w-0" eyebrow="Reserve" title="Deposits & withdrawals" subtitle="What entered and left the reserve on-chain — the deposit converted at entry, each bitcoin withdrawal. Monthly rewards are above">
                {cashMoves.length === 0 ? (
                  <p className="text-sm text-fg-tertiary">No movement recorded.</p>
                ) : (
                  <PaginatedTable
                    noun="movements"
                    head={
                      <TableRow>
                        <TableHeader className={tableCol.primary}>Type</TableHeader>
                        <TableHeader className={tableCol.numeric}>Bitcoin</TableHeader>
                        <TableHeader className={tableCol.date}>Date</TableHeader>
                        <TableHeader className={tableCol.hash}>Transaction</TableHeader>
                      </TableRow>
                    }
                    rows={cashMoves.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className={tableCol.primary}>
                          <span className="capitalize">{m.type}</span>
                        </TableCell>
                        <TableCell className={tableCol.numeric}>
                          <div className="tabular-nums text-fg">
                            {m.type === 'withdrawal' ? '−' : '+'}
                            {btcFromSats(m.amountBtcSats)}
                          </div>
                          <div className="text-[11px] tabular-nums text-fg-tertiary">
                            {m.type === 'deposit'
                              ? `${usd(m.amountUsdc)} USDC converted at ${usd(m.btcPriceUsd)}`
                              : `≈ ${usd(m.amountUsdc)} at ${usd(m.btcPriceUsd)}`}
                          </div>
                        </TableCell>
                        <TableCell className={tableCol.date}>{m.occurredAt ? formatDate(m.occurredAt) : '—'}</TableCell>
                        <TableCell className={`${tableCol.hash} text-xs text-fg-tertiary`}>{formatHash(m.txHash) ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    exportData={{
                      filename: `hearst-movements-${entry.name}`,
                      title: `Movements — ${entry.name}`,
                      columns: ['Type', 'BTC', 'USD value', 'BTC price (USD)', 'Date', 'Status', 'Transaction'],
                      data: cashMoves.map((m) => [m.type, m.amountBtcSats != null ? m.amountBtcSats / 1e8 : null, m.amountUsdc, m.btcPriceUsd ?? null, m.occurredAt ? m.occurredAt.slice(0, 10) : null, m.status ?? null, m.txHash ?? null]),
                    }}
                  />
                )}
              </DashCard>
            </BentoCard>
          </BentoGrid>
        </>
      ) : null}

      {/* ── 5. QUI EST-IL ──────────────────────────────────────────────── */}
      <BentoGrid>
        <BentoCard id="kyc" span={12} bare className="scroll-mt-24">
          <DashCard className="min-w-0" tone="accent" eyebrow="Client" title="Qualification and KYC" subtitle="What the client answered, and where Som stands on their KYC">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['KYC (Som)', entry.kycStatus === null ? 'Not started' : kycStatusLabel(entry.kycStatus)],
                ['Contact', offer?.contactEmail ?? '—'],
                ['Platform', questionnaire?.platformKind ?? entry.kind ?? '—'],
                // Ce que le client GÈRE chez lui, déclaré au questionnaire — pas ce qu'il a versé ici.
                ['Their own AUM (declared)', questionnaire?.assetsUnderManagement ?? '—'],
                ['Funds today', questionnaire?.fundsIdleOrEarning ?? '—'],
                ['Product live', questionnaire?.hasProductToday ?? '—'],
                ['Interest', questionnaire?.productInterest ?? '—'],
                ['First vault size', questionnaire?.firstVaultSize ?? '—'],
                ['Timeline', questionnaire?.launchTimeline ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-[var(--ud-line)] pb-2">
                  <dt className="text-sm text-fg-tertiary">{k}</dt>
                  <dd className="text-right text-sm text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </DashCard>
        </BentoCard>
      </BentoGrid>

      {!book.complete ? (
        <Callout tone="warning" title="Part of this file could not be read">
          Not read: {book.missing.join(', ')}.
        </Callout>
      ) : null}
    </DashboardShell>
  )
}
