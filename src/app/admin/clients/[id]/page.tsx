import { Link } from '@/components/catalyst/link'
import { DashCard, DashboardHeader, DashboardShell, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Badge } from '@/components/catalyst/badge'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { Callout, tableCol } from '@/components/compositions'
import { Journey } from '@/features/admin-clients/journey'
import { ClientCompute } from '@/features/admin-clients/client-compute'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { approvalAmount, btcFromSats, formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { allocatedTo, loadFleetCompute } from '@/lib/mining/compute'
import { EmailComposer } from '@/features/admin-offers/email-composer'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { ProjectionTable } from '@/features/user-dashboard/projection-table'
import { loadOfferSimulation } from '@/lib/admin-dashboard/load'
import { TrancheSwitcher } from '@/features/admin-clients/tranche-switcher'
import { OfferSteps } from '@/features/admin-offers/offer-steps'
import { loadTransactions } from '@/features/fireblocks/load'
import { FireblocksTransactions } from '@/features/fireblocks/transactions-list'
import { ClientTabs } from '@/features/admin-clients/client-tabs'
import { FireblocksLogo, HubSpotLogo, SumsubLogo } from '@/components/brand-logos'
import { AuditList } from '@/features/settings/audit-list'
import { loadAudit } from '@/lib/settings/load'
import { ReleaseVaultButton } from '@/features/admin-offers/release-vault-button'
import { DecisionButtons } from '@/features/admin-approvals/decision-buttons'
import { requireSession } from '@/lib/auth'
import { loadClientBook, STAGE_LABEL } from '@/lib/clients/book'
import { loadClientDossier } from '@/lib/clients/dossier'
import { clientHref, parseClientPath, reserveSats, trancheOf } from '@/lib/clients/vaults'
import { formatCurrency, formatDate, formatHash, formatNumber } from '@/lib/format'
import { kycStatusLabel } from '@/lib/labels'
import { emailsFor } from '@/lib/offers/emails'
import { OFFER_STATUS_LABEL, isTerminal } from '@/lib/offers/model'
import { available, isAvailable, unavailable, valueOf, type Availability } from '@/lib/vaults/model'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BoltIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

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

const monthName = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

const DECISION_LABEL: Record<string, string> = {
  deposit: 'Deposit to authorise',
  withdrawal: 'Withdrawal to process',
  distribution: 'Distribution to sign off',
}
/** L'état d'un reward mensuel, dit pour l'admin. */
const REWARD_LABEL: Record<string, string> = {
  pending: 'To approve',
  distributed: 'In the reserve',
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
  distribution: 'rewards',
}

const DECISION_ACTION: Record<string, string> = {
  deposit: 'Authorise',
  withdrawal: 'Process',
  distribution: 'Approve',
}

export default async function ClientPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ id: string; slug?: string[] }>; searchParams: Promise<{ vault?: string; tab?: string }> }>) {
  await requireSession()
  const { id, slug } = await params
  /* Le vault affiché (un client détient un vault par tranche) et l'onglet,
     dans le chemin : `/admin/clients/cli_2/vault-2/rewards`. */
  const path = parseClientPath(slug)
  const legacy = await searchParams
  const vaultParam = legacy.vault ?? path.vault
  const tabParam = legacy.tab ?? path.tab

  const book = await loadClientBook()
  const owner = book.entries.find((e) => e.clientId === id)
  const wantedVault =
    vaultParam === undefined ? undefined : owner?.vaults.find((v) => String(trancheOf(v)) === vaultParam || v.vaultId === vaultParam)
  /* Un ancien lien (`?vault=31337-0x…&tab=…`) ou un vault inconnu : réécrit
     dans la forme propre — la barre d'adresse reste lisible. */
  if (legacy.vault !== undefined || legacy.tab !== undefined || (vaultParam !== undefined && !wantedVault)) {
    redirect(clientHref(id, wantedVault, tabParam))
  }

  const [dossier, compute, transactions, audit] = await Promise.all([
    loadClientDossier(id, wantedVault?.vaultId ?? null),
    loadFleetCompute(),
    loadTransactions(id),
    loadAudit(500),
  ])
  const entry = owner
  if (entry === undefined) notFound()

  const { decisions } = entry
  const vaults = entry.vaults
  const multi = vaults.length > 1
  /* Le vault dont les sections détaillées parlent (rendements, allocation,
     compute, mouvements) — le premier tant qu'on n'en a pas choisi un autre. */
  const vault = valueOf(dossier.vault) ?? entry.vault
  /* L'offre montrée : une offre EN COURS d'abord (une nouvelle tranche qui se
     prépare, c'est le geste attendu) ; sinon celle qui a ouvert le vault
     affiché — la tranche 1 ne se raconte pas avec l'offre de la tranche 2. */
  const openOffer = entry.offer !== null && !isTerminal(entry.offer.status) ? entry.offer : null
  const offerOfVault = vault !== null ? (valueOf(dossier.offers) ?? []).find((o) => o.vaultId === vault.vaultId) ?? null : null
  const offer = openOffer ?? offerOfVault ?? entry.offer
  const tranche = vault !== null ? trancheOf(vault) : 1
  /* Le suffixe des sections d'un vault : sans lui, deux tranches afficheraient
     deux sections « Monthly rewards » indiscernables. */
  const ofTranche = multi ? ` · Vault ${tranche}` : ''
  // Les décisions qui portent sur CE vault.
  const vaultDecisions = decisions.filter((d) => vault !== null && d.vaultId === vault.vaultId)
  /* « Waiting on you » : celles de la tranche affichée, plus celles qui ne
     visent aucun vault existant (un dépôt qui ouvrira une nouvelle tranche). */
  const shownDecisions = multi ? decisions.filter((d) => d.vaultId === null || d.vaultId === vault?.vaultId) : decisions
  const trancheLabel = (vaultId: string | null) => {
    const v = vaults.find((x) => x.vaultId === vaultId)
    return multi && v ? `Vault ${trancheOf(v)}` : null
  }
  const isActive = entry.stage === 'active'
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
  // La décision du reward en attente pour CE vault (une par tranche).
  const rewardDecisionId =
    vaultDecisions.find((d) => d.kind === 'distribution')?.id ?? `apr_dist_${entry.clientId}`

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

  /* Le bandeau parle de LA TRANCHE affichée : chaque versement a son vault —
     son prix d'entrée, son blocage, sa dérive. Le total du client est écrit
     dans le sélecteur de tranche, juste au-dessus. */
  const vCapital = (vault?.capitalBtcSats ?? 0) / 1e8
  const vAccrued = (vault?.accruedBtcSats ?? 0) / 1e8
  const sumReserve = vaults.reduce((t, v) => t + reserveSats(v), 0) / 1e8
  const sumDeposits = vaults.reduce((t, v) => t + (v.principalUsdc ?? 0), 0)

  const kpis: readonly AdminHeroKpi[] = isActive
    ? [
        {
          id: 'reserve-total',
          title: 'Bitcoin reserve',
          value: shown(vault !== null ? btcFmt(vCapital + vAccrued) : totalReserveBtc !== null ? btcFmt(totalReserveBtc) : null),
          icon: BitcoinIcon,
          footnote:
            vault !== null
              ? `${btcFmt(vCapital)} from the ${usd(vault.principalUsdc)} USDC deposit + ${btcFmt(vAccrued)} accumulated`
              : null,
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
          value: shown(vCapital > 0 ? `+${formatNumber((vAccrued / vCapital) * 100, { maximumFractionDigits: 1 })} %` : null),
          icon: ArrowTrendingUpIcon,
          footnote: vCapital > 0 ? `+${btcFmt(vAccrued)} more than the deposit bought at entry` : null,
        },
        {
          /* V2 : plus de dérive à surveiller — le buffer qui paie l'électricité. */
          id: 'buffer',
          title: 'Electricity buffer',
          value: shown(vault?.buffer ? usd(vault.buffer.balanceUsd) : 'Not read'),
          icon: BoltIcon,
          footnote: vault?.buffer
            ? `${vault.buffer.monthsCovered === null ? '—' : formatNumber(vault.buffer.monthsCovered, { maximumFractionDigits: 1 })} months of bills · started at ${usd(vault.buffer.startUsd)}`
            : null,
        },
      ]
    : [
        {
          id: 'amount',
          title: 'Amount proposed',
          value: shown(offer ? usd(offer.amountUsdc) : null),
          icon: BanknotesIcon,
          // Le seul montant en USDC : il sera converti en bitcoin à l'entrée.
          footnote: offer
            ? sim
              ? `USDC · ≈ ${btcFmt(sim.hodlBtc)} at entry · ${offer.lockupMonths}-month lockup`
              : `USDC · ${offer.lockupMonths}-month lockup`
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
              : null,
        },
        {
          id: 'kyc',
          title: 'KYC',
          value: available(entry.kycStatus === null ? 'Not started' : kycStatusLabel(entry.kycStatus)),
          icon: ShieldCheckIcon,
          footnote: 'Decided by Sumsub, the KYC partner',
        },
      ]


  /* Les sections présentes sur CETTE fiche, dans l'ordre de la page — avec le
     nombre de décisions qui attendent dans chacune. */
  const waitingIn = (kinds: readonly string[]) => vaultDecisions.filter((d) => kinds.includes(d.kind)).length
  /* L'électricité du dernier mois clos de CE vault : due tant qu'elle n'est pas payée. */
  const latestClose = [...compute.months].sort((x, y) => y.month.localeCompare(x.month))[0]
  const electricityDue =
    vault !== null && latestClose?.lines.some((l) => l.vaultId === vault.vaultId && l.electricityStatus !== 'paid') ? 1 : 0
  const tabs = [
    { id: 'overview', label: 'Overview', badge: shownDecisions.length },
    offer !== null ? { id: 'offer', label: 'Offer & emails', badge: 0 } : null,
    isActive ? { id: 'rewards', label: 'Rewards', badge: waitingIn(['distribution']) } : null,
    { id: 'payments', label: 'Payments', badge: 0 },
    isActive && vault !== null ? { id: 'compute', label: 'Compute', badge: electricityDue } : null,
    { id: 'kyc', label: 'KYC', badge: 0 },
    { id: 'activity', label: 'Activity', badge: 0 },
  ].filter((x): x is { id: string; label: string; badge: number } => x !== null)
  /* L'onglet ouvert : celui de l'URL, sinon l'offre pour un prospect, la vue d'ensemble pour un client actif. */
  const tab = tabs.some((t) => t.id === tabParam) ? (tabParam as string) : !isActive && offer !== null ? 'offer' : 'overview'
  const show = (id: string) => tab === id
  const tabBase = clientHref(entry.clientId, wantedVault)

  /* « New tranche » ouvre une offre pré-remplie avec l'allocation de la tranche
     la plus récente (lue par la page elle-même) : un nouveau versement ouvrira un NOUVEAU vault. */
  const offerHref = `/admin/clients/${encodeURIComponent(entry.clientId)}/new-offer`

  return (
    <DashboardShell>
      <DashboardHeader
        title={entry.name}
        description={`${entry.kind ?? 'Kind not recorded'} · ${entry.stage === 'closed' ? 'Closed' : STAGE_LABEL[entry.stage]}${multi ? ` · vault ${tranche} of ${vaults.length}` : ''}`}
        titleAddon={
          <Link href="/admin/clients" className="text-xs text-fg-tertiary hover:text-fg">
            ← All clients
          </Link>
        }
        kpis={kpis}
        beforeKpis={
          multi && vault !== null ? (
            <TrancheSwitcher
              active={vault.vaultId}
              tabs={vaults.map((v) => ({
                vaultId: v.vaultId,
                label: `Vault ${trancheOf(v)}`,
                detail: `${usd(v.principalUsdc)} · ${formatDate(v.lockupStartAt)}`,
                href: clientHref(entry.clientId, v),
              }))}
              total={`Client total · ${vaults.length} vaults · ${btcFmt(sumReserve)} from ${usd(sumDeposits)} USDC`}
            />
          ) : undefined
        }
        action={
          <span className="flex flex-wrap items-center justify-end gap-2">
            {/* Le même client chez les trois partenaires : un clic, pas une recherche. */}
            <span className="flex items-center gap-1">
              {(() => {
                const sumsub = valueOf(dossier.identity)?.sumsub ?? null
                const fb = (offerOfVault ?? offer)?.fireblocks ?? null
                const deal = (offerOfVault ?? offer)?.hubspotDealUrl ?? null
                // Fireblocks d'abord : c'est là qu'est l'argent. Puis la conformité, puis le CRM.
                // Les trois, toujours, à la même place et du même rendu : tant
                // que le dossier n'existe pas chez le partenaire, le lien ouvre
                // sa console plutôt qu'une fiche.
                const links = [
                  { href: fb ? `https://console.fireblocks.io/v2/accounts/vault/${encodeURIComponent(fb.vaultAccountId)}` : 'https://console.fireblocks.io/v2/', label: 'Fireblocks', Logo: FireblocksLogo },
                  { href: sumsub ? `https://cockpit.sumsub.com/checkus#/applicant/${encodeURIComponent(sumsub.applicantId)}/basicInfo` : 'https://cockpit.sumsub.com/checkus#/applicants', label: 'Sumsub', Logo: SumsubLogo },
                  { href: deal ?? 'https://app.hubspot.com/', label: 'HubSpot', Logo: HubSpotLogo },
                ]
                return links.map(({ href, label, Logo }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open in ${label}`}
                    aria-label={`Open in ${label}`}
                    className="flex size-9 items-center justify-center rounded-full text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
                  >
                    <Logo className="size-4" />
                  </a>
                ))
              })()}
            </span>
            <Link href={offerHref} className="ud-cta">
              {isActive ? 'New vault' : offer === null || entry.stage === 'closed' ? 'New offer' : 'New version'}
            </Link>
          </span>
        }
      />

      {/* Les onglets de la fiche : une vue à la fois, chacune avec son URL. */}
      <ClientTabs tabs={tabs} active={tab} base={tabBase} />

      {/* ── OVERVIEW : le parcours, la fin du blocage, ce qui attend ───── */}
      {show('overview') ? (
      <>
      {/* ── 1. LE PARCOURS ─────────────────────────────────────────────── */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashCard
            className="min-w-0"
            eyebrow="Journey"
            title={multi ? `Where vault ${tranche} stands` : 'Where this client stands'}
            subtitle="From the first offer to a live vault"
          >
            <Journey
              entry={{
                ...entry,
                offer: offerOfVault ?? entry.offer,
                vault,
                // Le décompte de LA tranche affichée, comme le sommaire au-dessus.
                ...(multi && shownDecisions.length > 0
                  ? { nextAction: `${shownDecisions.length} decision${shownDecisions.length > 1 ? 's' : ''} waiting on you`, onUs: true }
                  : {}),
              }}
            />
          </DashCard>
        </BentoCard>
      </BentoGrid>

      {/* ── LA FIN DU BLOCAGE de la tranche affichée ──────────────────────
          Deux issues : rendre la réserve au client (en bitcoin), ou la
          renouveler — ce qui est une NOUVELLE tranche, donc un nouveau vault. */}
      {vault !== null && vault.lockupMonths !== null && vault.lockupElapsedMonths !== null &&
      vault.lockupElapsedMonths >= vault.lockupMonths ? (
        <BentoGrid>
          <BentoCard span={12} bare>
            {vault.status === 'RELEASED' ? (
              <Callout tone="info" title={`Vault ${tranche} — released`}>
                The lockup ended and the reserve ({btcFmt(vCapital + vAccrued)}) was returned to the client
                {vault.releasedAt ? ` on ${formatDate(vault.releasedAt)}` : ''}. This vault is closed.
              </Callout>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--ud-radius)] bg-amber-400/[0.06] px-5 py-4 ring-1 ring-amber-400/30">
                <div className="flex max-w-xl flex-col gap-1">
                  <p className="text-xs tracking-[0.12em] text-amber-400 uppercase">
                    Lockup ended{multi ? ` · vault ${tranche}` : ''} · {formatDate(vault.lockupEndAt)}
                  </p>
                  <p className="text-base font-medium text-fg">Release the reserve, or renew as a new vault</p>
                  <p className="text-xs text-fg-secondary">
                    Releasing returns {btcFmt(vCapital + vAccrued)} to the client in bitcoin and closes this vault. Renewing
                    is a new offer — a new vault, at today’s entry price, with its own lockup.
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap items-start justify-end gap-2">
                  <Link href={offerHref} className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] no-underline hover:bg-white/5">
                    Renew as a new vault
                  </Link>
                  <ReleaseVaultButton vaultId={vault.vaultId} />
                </div>
              </div>
            )}
          </BentoCard>
        </BentoGrid>
      ) : null}

      {/* ── 3. CE QUI ATTEND UNE DÉCISION (sous l'offre : on lit ce qui a été
          proposé, puis ce qui attend notre geste) ──────────────────────────────── */}
      {shownDecisions.length > 0 ? (
        <BentoGrid>
          <BentoCard span={12} bare id="decisions" className="scroll-mt-24">
            <DashCard
              className="min-w-0"
              eyebrow="Decisions"
              title="Waiting on you"
              subtitle="Each one blocks this client’s money until someone here decides"
            >
              <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
                {shownDecisions.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 first:pt-0 last:pb-0">
                    {/* Sur téléphone le libellé prend la ligne ; montant, date et
                        action passent dessous, l'action calée à droite. */}
                    <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                      <p className="text-sm font-medium text-fg">
                        {DECISION_LABEL[d.kind] ?? d.kind}
                        {trancheLabel(d.vaultId) ? <span className="ml-2 text-xs text-fg-tertiary">{trancheLabel(d.vaultId)}</span> : null}
                      </p>
                      <p className="text-xs text-fg-tertiary">{d.note ?? '—'}</p>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-fg">{approvalAmount(d)}</p>
                    <p className="text-xs tabular-nums text-fg-tertiary">{d.requestedAt ? formatDate(d.requestedAt) : '—'}</p>
                    {/* Une décision qui a SA section (reward, rééquilibrage, protocole)
                        s'y prend, avec son contexte ; les autres, ici. */}
                    <span className="ml-auto sm:ml-0">
                      {DECISION_SECTION[d.kind] ? (
                        <a
                          href={clientHref(entry.clientId, vaults.find((v) => v.vaultId === d.vaultId), DECISION_SECTION[d.kind])}
                          className="ud-detail-btn inline-flex items-center no-underline"
                        >
                          Review
                        </a>
                      ) : (
                        <DecisionButtons id={d.id} action={DECISION_ACTION[d.kind] ?? 'Approve'} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </DashCard>
          </BentoCard>
        </BentoGrid>
      ) : null}

      </>
      ) : null}

      {/* ── 2. L'OFFRE ─────────────────────────────────────────────────── */}
      {show('offer') && offer !== null ? (
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
              {/* Le geste suivant du parcours, avec son bouton. */}
              <div className="mb-5 empty:hidden">
                <OfferSteps
                  offer={offer}
                  kyc={entry.kycStatus}
                  aml={valueOf(dossier.identity)?.amlStatus ?? null}
                  depositDecisionId={decisions.find((d) => d.id === `apr_dep_${offer.id}`)?.id ?? null}
                />
              </div>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)] sm:grid-cols-4">
                {[
                  ['Amount', usd(offer.amountUsdc)],
                  ['Lockup', `${offer.lockupMonths} months`],
                  // V2 : le dépôt se partage toujours ainsi — puissance de calcul, buffer d'électricité.
                  ['Computing power', offer.amountUsdc !== null ? `90 % · ${usd(offer.amountUsdc * 0.9)}` : '90 %'],
                  ['Electricity buffer', offer.amountUsdc !== null ? `10 % · ${usd(offer.amountUsdc * 0.1)}` : '10 %'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3">
                    <dt className="text-xs text-fg-tertiary">{k}</dt>
                    <dd className="text-sm font-medium tabular-nums text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
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
                    // Le dernier envoi de ce courriel (Gmail), consigné dans HubSpot.
                    sent: offer.sentEmails?.filter((e) => e.emailId === mail.id).at(-1) ?? null,
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

      {/* ── 4. LE VAULT ────────────────────────────────────────────────── */}
      {isActive ? (
        <>


          {/* ── CE QUE CHAQUE POCHE A RAPPORTÉ ─────────────────────────────
              Les trois poches du vault, mois par mois : leur gain en dollars,
              sa conversion en bitcoin au cours du mois, et le total qui nourrit
              la réserve (« Bitcoin produced », en tête de fiche). */}
          {show('rewards') ? (
          <BentoGrid>
            <BentoCard span={12} bare id="rewards" className="scroll-mt-24">
              <DashCard
                className="min-w-0 scroll-mt-24"
                eyebrow="Rewards"
                title={`Monthly rewards${ofTranche}`}
                subtitle="What the vault mined each month, what was sold to refill the electricity buffer, and what reaches the reserve — validated here first"
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
                          Mined {pendingReward.minedSats != null ? btcFromSats(pendingReward.minedSats) : '—'}
                          {pendingReward.refillSats ? ` · ${btcFromSats(pendingReward.refillSats)} sold to refill the buffer` : ''}
                          {pendingReward.electricityUsd != null ? ` · ${usd(pendingReward.electricityUsd)} electricity paid from the buffer` : ''}
                        </p>
                        <p className="text-[11px] text-fg-tertiary">
                          Converted at {usd(pendingReward.btcPriceUsdc)} / BTC · reaches the client’s reserve once approved
                        </p>
                      </div>
                      <DecisionButtons id={rewardDecisionId} action="Approve reward" />
                    </div>
                  ) : (
                    <p className="text-sm text-fg-tertiary">
                      No reward waiting — every closed month has been decided.
                    </p>
                  )}

                  <PaginatedTable
                    className="[&_table]:w-full [&_table]:min-w-[60rem]"
                    noun="months"
                    head={
                      <TableRow>
                        <TableHeader>Month</TableHeader>
                        <TableHeader>Mined</TableHeader>
                        <TableHeader>Buffer refill</TableHeader>
                        <TableHeader>Electricity</TableHeader>
                        <TableHeader>Added</TableHeader>
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
                        <TableCell className="tabular-nums text-fg">{d.minedSats != null ? btcFmt(d.minedSats / 1e8) : '—'}</TableCell>
                        <TableCell className="tabular-nums text-fg-secondary">{d.refillSats ? `−${btcFmt(d.refillSats / 1e8)}` : '—'}</TableCell>
                        <TableCell>
                          <div className="tabular-nums text-fg-secondary">{d.electricityUsd != null ? usd(d.electricityUsd) : '—'}</div>
                          {d.bufferUsd != null ? <div className="text-[11px] tabular-nums text-fg-tertiary">buffer {usd(d.bufferUsd)}</div> : null}
                        </TableCell>
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
                        <TableCell className="text-right whitespace-nowrap">
                          {d.status === 'pending' ? (
                            <DecisionButtons id={rewardDecisionId} action="Approve" />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    exportData={{
                      filename: `hearst-monthly-rewards-${entry.name}`,
                      title: `Monthly rewards — ${entry.name}`,
                      columns: [
                        'Month',
                        'Mined (BTC)',
                        'Sold to refill the buffer (BTC)',
                        'Electricity from the buffer (USD)',
                        'Buffer after (USD)',
                        'Added to the reserve (BTC)',
                        'Total (USD)',
                        'BTC price (USD)',
                        'Status',
                      ],
                      data: distributions.map((d) => [
                        d.month,
                        d.minedSats != null ? d.minedSats / 1e8 : null,
                        d.refillSats != null ? d.refillSats / 1e8 : null,
                        d.electricityUsd ?? null,
                        d.bufferUsd ?? null,
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
          ) : null}

          {/* Sa puissance de calcul : ce que le client lit dans « Compute ». */}
          {show('compute') && vault !== null ? <div id="compute" className="scroll-mt-24"><ClientCompute
              vaultId={vault.vaultId}
              clientName={`${entry.name}${ofTranche}`}
              fleet={vaultCompute}
              networkEhs={compute.networkEhs}
              machines={compute.machines}
              months={compute.months}
            /></div> : null}

          {show('payments') ? (
          <BentoGrid>
            <BentoCard id="moves" span={12} bare className="scroll-mt-24">
              <DashCard className="min-w-0" eyebrow="Reserve" title={`Deposits & withdrawals${ofTranche}`} subtitle="What entered and left the reserve on-chain — the deposit converted at entry, each bitcoin withdrawal. Monthly rewards are in Rewards">
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
          ) : null}
        </>
      ) : null}

      {/* ── LES MOUVEMENTS D'ARGENT ─────────────────────────────────────
          La console décide ; Fireblocks exécute et signe. Chaque geste qui
          déplace de l'argent pour ce client a sa ligne ici, avec le statut
          de Fireblocks. */}
      {show('payments') && (transactions === null || transactions.length > 0 || !isActive) ? (
        <BentoGrid>
          <BentoCard id="transactions" span={12} bare className="scroll-mt-24">
            <DashCard
              className="min-w-0"
              eyebrow="Payments"
              title="Transactions · Fireblocks"
              subtitle="Decided here, executed and signed in Fireblocks — status relayed as Fireblocks reports it"
            >
              <FireblocksTransactions transactions={transactions} />
            </DashCard>
          </BentoCard>
        </BentoGrid>
      ) : null}

      {/* ── 5. QUI EST-IL ──────────────────────────────────────────────── */}
      {show('kyc') ? (
      <BentoGrid>
        <BentoCard id="kyc" span={12} bare className="scroll-mt-24">
          <DashCard className="min-w-0" eyebrow="Client" title="Qualification and KYC" subtitle="What the client answered, and where Sumsub stands on their KYC">
            {/* Trois colonnes thématiques, séparées d'un trait : la conformité,
                le contact, ce que le client a déclaré au questionnaire. */}
            <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-3 lg:divide-x lg:divide-[var(--ud-line)]">
              {(
                [
                  [
                    'Compliance',
                    [
                      ['KYC (Sumsub)', entry.kycStatus === null ? 'Not started' : kycStatusLabel(entry.kycStatus)],
                      ['AML (Sumsub)', (() => {
                        const aml = valueOf(dossier.identity)?.amlStatus ?? null
                        return aml === null ? 'Not run' : aml === 'CLEAR' ? 'Clear' : aml === 'FLAGGED' ? 'Flagged' : aml
                      })()],
                      ['Sumsub file', (() => {
                        const file = valueOf(dossier.identity)?.sumsub ?? null
                        if (file === null) return 'Not opened yet'
                        return (
                          <a
                            href={`https://cockpit.sumsub.com/checkus#/applicant/${encodeURIComponent(file.applicantId)}/basicInfo`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--hearst-green)] no-underline hover:underline"
                          >
                            Open in Sumsub ↗
                          </a>
                        )
                      })()],
                      ['Level', (() => {
                        const file = valueOf(dossier.identity)?.sumsub ?? null
                        return file === null ? '—' : `${file.levelName ?? 'Applicant'}${file.reviewedAt ? ` · ${formatDate(file.reviewedAt)}` : ''}`
                      })()],
                    ],
                  ],
                  [
                    'Contact',
                    [
                      ['Email', offer?.contactEmail ?? '—'],
                      ['Platform', questionnaire?.platformKind ?? entry.kind ?? '—'],
                      ['Owner', entry.owner ?? '—'],
                      // Ce que le client GÈRE chez lui, déclaré au questionnaire — pas ce qu'il a versé ici.
                      ['Their own AUM (declared)', questionnaire?.assetsUnderManagement ?? '—'],
                    ],
                  ],
                  [
                    'Qualification',
                    [
                      ['Funds today', questionnaire?.fundsIdleOrEarning ?? '—'],
                      ['Product live', questionnaire?.hasProductToday ?? '—'],
                      ['Interest', questionnaire?.productInterest ?? '—'],
                      ['First vault size', questionnaire?.firstVaultSize ?? '—'],
                      ['Timeline', questionnaire?.launchTimeline ?? '—'],
                    ],
                  ],
                ] as const
              ).map(([title, rows], ci) => (
                <dl key={title} className={`flex flex-col ${ci > 0 ? 'lg:pl-8' : ''} ${ci < 2 ? 'lg:pr-8' : ''}`}>
                  <p className="mb-1 text-[11px] tracking-[0.12em] text-fg-tertiary uppercase">{title}</p>
                  {rows.map(([k, v]) => (
                    <div key={String(k)} className="flex items-baseline justify-between gap-4 border-b border-[var(--ud-line)] py-2.5 last:border-b-0">
                      <dt className="shrink-0 text-sm text-fg-tertiary">{k}</dt>
                      <dd className="min-w-0 truncate text-right text-sm text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
              ))}
            </div>
          </DashCard>
        </BentoCard>
      </BentoGrid>
      ) : null}

      {/* ── ACTIVITY : le journal d'audit de CE client ─────────────────── */}
      {show('activity') ? (
        <DashCard
          className="min-w-0"
          eyebrow="Audit"
          title="Activity"
          subtitle="Everything that happened for this client — who, what, when"
          action={<PanelHeaderLink href="/admin/settings/audit">Full audit log</PanelHeaderLink>}
        >
          <AuditList
            entries={
              audit === null
                ? null
                : audit.filter((e) => {
                    const hay = `${e.actor} ${e.target} ${e.detail ?? ''}`.toLowerCase()
                    const refs = [entry.name, ...(valueOf(dossier.offers) ?? []).map((o) => o.reference)].filter(Boolean)
                    return refs.some((r) => hay.includes(String(r).toLowerCase()))
                  })
            }
          />
        </DashCard>
      ) : null}

      {!book.complete ? (
        <Callout tone="warning" title="Part of this file could not be read">
          Not read: {book.missing.join(', ')}.
        </Callout>
      ) : null}
    </DashboardShell>
  )
}
