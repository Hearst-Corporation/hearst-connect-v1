import { DashCard, DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { HearstPrimaryAction } from '@/components/actions'
import { Callout } from '@/components/compositions'
import { ClientBookTable, type ClientRow } from '@/features/admin-clients/client-book-table'
import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { isVaultDrifting } from '@/lib/admin-dashboard/contracts'
import { requireSession } from '@/lib/auth'
import { reserveSats } from '@/lib/clients/vaults'
import { loadClientBook, PIPELINE_STAGES, STAGE_LABEL, type ClientEntry } from '@/lib/clients/book'
import { loadAdminOffers } from '@/lib/admin-dashboard/load'
import { PIPELINE_STATUSES } from '@/lib/offers/model'
import { formatCurrency, formatDate } from '@/lib/format'
import { kycStatusLabel } from '@/lib/labels'
import { available, valueOf } from '@/lib/vaults/model'
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  InboxArrowDownIcon,
  PlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — LA page de travail.
 *
 * Elle remplace trois menus (Offers, Clients, Vaults) qui découpaient un même
 * parcours en trois morceaux. Un client y a une ligne, quelle que soit son
 * étape : prospect, offre en cours, fonds attendus, vault actif, clos. Les
 * anciens menus sont devenus des filtres de cette liste.
 *
 * En tête, les quatre chiffres qui pilotent la journée : ce qui tourne, ce qui
 * arrive, ce qui attend NOTRE geste, et ce que le KYC bloque.
 */

const usd = (v: number) => formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 })
const KYC_OK = new Set(['APPROVED', 'VERIFIED'])

function kycTone(status: string | null): ClientRow['kycTone'] {
  const k = (status ?? '').toUpperCase()
  if (KYC_OK.has(k)) return 'lime'
  if (k === 'REJECTED' || k === 'DENIED' || k === 'HIGH_RISK') return 'red'
  if (k === '' || k === 'NOT_STARTED') return 'neutral'
  return 'amber'
}

/** Ce que la colonne « Vault » dit d'un client : l'état de son vault, ou rien. */
function vaultCell(e: ClientEntry): Pick<ClientRow, 'vaultBadge' | 'vaultTone' | 'vaultLine'> {
  const v = e.vault
  if (e.stage !== 'active' || v === null) return { vaultBadge: null, vaultTone: null, vaultLine: null }
  /* Plusieurs vaults (une tranche chacun) : le compte, et l'état du PIRE —
     il suffit qu'une tranche sorte de sa bande pour qu'il y ait un geste. */
  const term =
    e.vaults.length > 1
      ? `${e.vaults.length} vaults · next unlock ${formatDate(
          [...e.vaults].map((x) => x.lockupEndAt).filter((d): d is string => d !== null).sort()[0] ?? null,
        )}`
      : v.lockupMonths !== null && v.lockupElapsedMonths !== null
        ? `Month ${Math.min(v.lockupElapsedMonths, v.lockupMonths)} of ${v.lockupMonths}`
        : v.lockupEndAt !== null
          ? `Unlocks ${formatDate(v.lockupEndAt)}`
          : null
  if (e.vaults.some(isVaultDrifting)) return { vaultBadge: 'Rebalance', vaultTone: 'amber', vaultLine: term }
  if (e.vaults.every((x) => x.worstDriftBps === null)) return { vaultBadge: 'Drift unread', vaultTone: 'neutral', vaultLine: term }
  return { vaultBadge: 'Within band', vaultTone: 'lime', vaultLine: term }
}

function toRow(e: ClientEntry): ClientRow {
  return {
    clientId: e.clientId,
    // Un client que seule une offre connaît (sans identifiant) s'ouvre par son offre.
    href: e.clientId.startsWith('offer:') ? `/admin/offers/${e.clientId.slice(6)}` : `/admin/clients/${e.clientId}`,
    name: e.name,
    kind: e.kind,
    stage: e.stage,
    stageLabel: e.stage === 'closed' && e.closedReason !== null ? (e.closedReason === 'declined' ? 'Declined' : 'Expired') : STAGE_LABEL[e.stage],
    amountUsdc: e.amountUsdc,
    // Toutes ses tranches : la réserve d'un client est la somme de ses vaults.
    reserveBtcSats:
      e.stage === 'active' && e.vaults.some((v) => v.capitalBtcSats != null || v.accruedBtcSats != null)
        ? e.vaults.reduce((t, v) => t + reserveSats(v), 0)
        : null,
    accruedBtcSats:
      e.stage === 'active' && e.vaults.length > 0 ? e.vaults.reduce((t, v) => t + (v.accruedBtcSats ?? 0), 0) : null,
    kycLabel: e.kycStatus === null ? 'Not started' : kycStatusLabel(e.kycStatus),
    kycTone: kycTone(e.kycStatus),
    ...vaultCell(e),
    nextAction: e.nextAction,
    onUs: e.onUs,
    owner: e.owner,
  }
}

export default async function ClientsPage() {
  await requireSession()
  const [book, offers] = await Promise.all([loadClientBook(), loadAdminOffers()])
  /* Le pipeline : les offres OUVERTES — la même règle que le tableau de bord,
     nouvelles tranches de clients actifs comprises. */
  const openOffers = (valueOf(offers) ?? []).filter((o) => PIPELINE_STATUSES.includes(o.status))
  const entries = book.entries

  const active = entries.filter((e) => e.stage === 'active')
  const pipeline = entries.filter((e) => PIPELINE_STAGES.includes(e.stage))
  const onUs = entries.filter((e) => e.onUs)
  const decisions = entries.reduce((n, e) => n + e.decisions.length, 0)
  const kycBlocking = pipeline.filter(
    (e) => ['accepted', 'funding', 'funded'].includes(e.stage) && !KYC_OK.has((e.kycStatus ?? '').toUpperCase()),
  )
  const kycOpen = entries.filter((e) => e.stage !== 'closed' && !KYC_OK.has((e.kycStatus ?? '').toUpperCase()))

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'active',
      title: 'Active vaults',
      // Un vault par tranche : le compte des vaults, pas des clients.
      value: available(String(active.reduce((n, e) => n + e.vaults.length, 0))),
      icon: ArchiveBoxIcon,
      footnote: `${active.length} client${active.length === 1 ? '' : 's'} · ${btcFromSats(active.reduce((s, e) => s + e.vaults.reduce((t, v) => t + reserveSats(v), 0), 0))} in reserves · from ${usd(active.reduce((s, e) => s + (e.amountUsdc ?? 0), 0))} USDC`,
    },
    {
      id: 'pipeline',
      title: 'Pipeline',
      value: available(usd(openOffers.reduce((s, o) => s + (o.amountUsdc ?? 0), 0))),
      icon: BanknotesIcon,
      footnote: `USDC proposed · ${openOffers.length} open offer${openOffers.length === 1 ? '' : 's'}`,
    },
    {
      id: 'onus',
      title: 'Waiting on you',
      value: available(String(onUs.length)),
      icon: InboxArrowDownIcon,
      footnote: `${decisions} decision${decisions === 1 ? '' : 's'} · ${onUs.length - entries.filter((e) => e.decisions.length > 0).length} journey step${onUs.length === 1 ? '' : 's'}`,
    },
    {
      id: 'kyc',
      title: 'KYC open',
      value: available(String(kycOpen.length)),
      icon: ShieldCheckIcon,
      footnote:
        kycBlocking.length > 0
          ? `${kycBlocking.length} blocking a funding call`
          : 'None blocking a funding call',
    },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title="Clients"
        description="Every client on one page — the offers on the way in (Pipeline), the live vaults and their bitcoin reserves (Active), and the next move."
        kpis={kpis}
        action={
          <HearstPrimaryAction icon={<PlusIcon />} href="/admin/offers/new">
            New offer
          </HearstPrimaryAction>
        }
      />

      {!book.complete ? (
        <Callout tone="warning" title="Part of the book could not be read">
          Not read: {book.missing.join(', ')}. The list below shows what the other sources returned — a client may
          appear without its offer, its vault or its KYC.
        </Callout>
      ) : null}

      <BentoGrid>
        <BentoCard span={12} bare>
          <DashCard
            className="min-w-0"
            eyebrow="Book"
            title="All clients"
            subtitle="Sorted by what needs us first, then by how far each client has come"
          >
            <ClientBookTable rows={entries.map(toRow)} />
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
