import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { TracedRow } from '@/components/admin/traced-value'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Callout, DataTableShell, tableCol } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { driftThresholdOf, isVaultDrifting } from '@/lib/admin-dashboard/contracts'
import { loadClientDossier } from '@/lib/clients/dossier'
import { OFFER_STATUS_LABEL, RISK_PROFILE_LABEL } from '@/lib/offers/model'
import {
  available,
  isAvailable,
  unavailable,
  type Availability,
} from '@/lib/vaults/model'
import {
  BanknotesIcon,
  CircleStackIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Client' }
export const dynamic = 'force-dynamic'

/**
 * LA FICHE CLIENT — l'écran qui répond à « d'où vient ce chiffre ? ».
 *
 * L'inventaire de `/account` a montré que sept familles de chiffres montrés au
 * client n'étaient vérifiables nulle part côté console. On les affichait sans
 * pouvoir les recouper.
 *
 * Cette fiche reprend donc les libellés EXACTS que lit le client, et porte pour
 * chacun sa valeur, son endpoint et sa dérivation. Quand un client appelle en
 * disant « je ne comprends pas ce nombre », la réponse est sur cet écran.
 *
 * Ce qui manque encore est dit comme tel, endpoint par endpoint : voir
 * `DETTE-ADMIN.md`. Une ligne « not read » est une information — elle nomme
 * précisément ce que la chaîne ne publie pas encore.
 */

function usd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return formatCurrency(String(amount), { unit: '$', fromAtomic: 1 })
}

function pts(bps: number): string {
  return `${formatNumber(bps / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`
}

/** Une valeur présente, portant la provenance de la lecture dont elle sort. */
function from<T>(source: Availability<T>, text: string): Availability<string> {
  return isAvailable(source)
    ? available(text, { provenance: source.provenance, asOf: source.asOf, stale: source.stale })
    : unavailable({ endpoint: source.endpoint, status: source.status, reason: source.reason })
}

/** Ce que la chaîne ne publie pas encore — nommé, jamais deviné. */
function missing(endpoint: string, reason: string): Availability<string> {
  return unavailable({ endpoint, status: 'EMPTY', reason })
}

export default async function ClientDossierPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession()
  const { id } = await params

  const dossier = await loadClientDossier(id)
  const { identity, vault, offers } = dossier

  const label = isAvailable(identity) ? identity.value.label : id
  const offerRows = isAvailable(offers) ? offers.value : []
  const activeOffer = offerRows.find((o) => o.status === 'active') ?? offerRows[0]

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'capital',
      title: 'Capital',
      value: from(vault, usd(isAvailable(vault) ? vault.value.principalUsdc : null)),
      icon: BanknotesIcon,
    },
    {
      id: 'vault',
      title: 'Vault',
      value: from(vault, isAvailable(vault) ? vault.value.vaultId : '—'),
      icon: CircleStackIcon,
    },
    {
      id: 'offers',
      title: 'Offers',
      value: from(offers, String(offerRows.length)),
      icon: DocumentTextIcon,
    },
    {
      id: 'kyc',
      title: 'KYC',
      value: from(identity, isAvailable(identity) ? identity.value.kycStatus : '—'),
      icon: ShieldCheckIcon,
    },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title={label}
        description="Every figure this client sees, with the endpoint behind it and how it is derived."
        kpis={kpis}
      />

      <BentoGrid>
        {/* ── IDENTITÉ ET CONTRAT ───────────────────────────────────────── */}
        <BentoCard span={12}>
          <DataTableShell
            title="Identity and contract"
            description="The facts that do not move — who they are, and on what terms."
          >
            <TableHead>
              <TableRow>
                <TableHeader className={tableCol.primary}>What the client sees</TableHeader>
                <TableHeader className={tableCol.numeric}>Value</TableHeader>
                <TableHeader>Endpoint</TableHeader>
                <TableHeader>Derivation</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TracedRow
                label="Client"
                value={from(identity, label)}
                endpoint="/api/v1/admin/clients/recent"
                derivation={{ kind: 'raw' }}
              />
              <TracedRow
                label="Principal"
                value={from(vault, usd(isAvailable(vault) ? vault.value.principalUsdc : null))}
                endpoint="/api/v1/admin/vaults/registry"
                derivation={{ kind: 'raw' }}
                note="Shown as « Principal » in the client banner"
              />
              <TracedRow
                label="Subscribed at"
                value={from(
                  vault,
                  isAvailable(vault) ? formatDate(vault.value.lockupStartAt) : '—',
                )}
                endpoint="/api/v1/admin/vaults/registry"
                derivation={{ kind: 'raw' }}
              />
              <TracedRow
                label="Capital locked"
                value={from(
                  vault,
                  isAvailable(vault) && vault.value.lockupMonths !== null
                    ? `${(vault.value.lockupMonths ?? 0) - (vault.value.lockupElapsedMonths ?? 0)} of ${vault.value.lockupMonths} months`
                    : '—',
                )}
                endpoint="/api/v1/admin/vaults/registry"
                derivation={{
                  kind: 'computed',
                  formula: 'lockupMonths − lockupElapsedMonths',
                }}
                note="The client sees the months remaining"
              />
              <TracedRow
                label="KYC status"
                value={from(identity, isAvailable(identity) ? identity.value.kycStatus : '—')}
                endpoint="/api/v1/admin/clients/recent"
                derivation={{ kind: 'raw' }}
                note="Decided by the KYC partner — never here"
              />
            </TableBody>
          </DataTableShell>
        </BentoCard>

        {/* ── LE VAULT ──────────────────────────────────────────────────── */}
        <BentoCard span={12}>
          <DataTableShell
            title="Vault"
            description="The five tiles of the client's vault banner, and what stands behind each."
          >
            <TableHead>
              <TableRow>
                <TableHeader className={tableCol.primary}>What the client sees</TableHeader>
                <TableHeader className={tableCol.numeric}>Value</TableHeader>
                <TableHeader>Endpoint</TableHeader>
                <TableHeader>Derivation</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TracedRow
                label="Produced for your vault"
                value={missing('/api/v1/btc', 'not scoped per client')}
                endpoint="/api/v1/btc"
                derivation={{ kind: 'computed', formula: 'btcProduced.totalSats ÷ 1e8' }}
                note="The client reads a per-vault figure; the chain publishes a fleet total"
              />
              <TracedRow
                label="Available to withdraw"
                value={missing('/api/v1/me/vault', 'no admin read of this vault field')}
                endpoint="/api/v1/me/vault"
                derivation={{ kind: 'computed', formula: 'availableUsdc ÷ btcSpotUsd' }}
              />
              <TracedRow
                label="Withdrawn to date"
                value={missing('/api/v1/me/vault', 'no admin read of this vault field')}
                endpoint="/api/v1/me/vault"
                derivation={{ kind: 'computed', formula: 'withdrawnUsdc ÷ btcSpotUsd' }}
                note="The ≈ USDC figure uses the rate AT PAYOUT, never today's spot"
              />
              <TracedRow
                label="Earned to date"
                value={from(vault, usd(isAvailable(vault) ? vault.value.accruedUsdc : null))}
                endpoint="/api/v1/admin/vaults/registry"
                derivation={{ kind: 'computed', formula: 'accrued ÷ btcSpotUsd' }}
                note="Admin holds the USDC figure; the client reads it converted to BTC"
              />
              <TracedRow
                label="Allocation drift"
                value={from(
                  vault,
                  isAvailable(vault) && vault.value.worstDriftBps !== null
                    ? pts(vault.value.worstDriftBps)
                    : 'not read',
                )}
                endpoint="/api/v1/admin/vaults/registry"
                derivation={{ kind: 'raw' }}
                note={
                  isAvailable(vault)
                    ? `Threshold for this vault: ${pts(driftThresholdOf(vault.value)).replace('+', '±')}`
                    : undefined
                }
              />
            </TableBody>
          </DataTableShell>
        </BentoCard>

        {/* ── LES OFFRES ────────────────────────────────────────────────── */}
        <BentoCard span={12}>
          {offerRows.length === 0 ? (
            <Callout tone="info" title="No offer on file">
              Nothing links an offer to this client yet. Offers are matched by the vault they
              opened, or by name until a vault exists.
            </Callout>
          ) : (
            <DataTableShell
              title="Offers"
              description="The commercial history — and the allocation that became this vault's target."
            >
              <TableHead>
                <TableRow>
                  <TableHeader className={tableCol.primary}>Reference</TableHeader>
                  <TableHeader>Profile</TableHeader>
                  <TableHeader className={tableCol.numeric}>Amount</TableHeader>
                  <TableHeader className={tableCol.status}>Status</TableHeader>
                  <TableHeader className={tableCol.date}>Updated</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {offerRows.map((offer) => (
                  <TableRow key={offer.id}>
                    <td className={tableCol.primary}>
                      <Link href={`/admin/offers/${offer.id}`} className="font-medium">
                        {offer.reference}
                      </Link>
                    </td>
                    <td>{RISK_PROFILE_LABEL[offer.riskProfile]}</td>
                    <td className={tableCol.numeric}>{usd(offer.amountUsdc)}</td>
                    <td className={tableCol.status}>
                      <Badge color={offer.status === 'active' ? 'lime' : 'neutral'}>
                        {OFFER_STATUS_LABEL[offer.status]}
                      </Badge>
                    </td>
                    <td className={tableCol.date}>{formatDate(offer.updatedAt)}</td>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          )}
        </BentoCard>

        {/* ── CE QUE LA CHAÎNE NE PUBLIE PAS ENCORE ─────────────────────── */}
        <BentoCard span={12}>
          <Callout tone="warning" title="Not yet verifiable from the console">
            Four figures this client sees have no admin read at all: their movements ledger
            (admin/activity/recent is global, not per client), the yield per pocket, their
            distributions, and the Monte-Carlo projection. They are listed in{' '}
            <code className="text-xs">DETTE-ADMIN.md</code> with the endpoint each would need.
          </Callout>
        </BentoCard>
      </BentoGrid>

      {activeOffer !== undefined ? null : null}
    </DashboardShell>
  )
}
