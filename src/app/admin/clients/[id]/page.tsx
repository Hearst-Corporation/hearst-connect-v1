import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { TracedRow } from '@/components/admin/traced-value'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Callout, DataTableShell, tableCol } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatDate, formatHash, formatNumber } from '@/lib/format'
import { driftThresholdOf, isVaultDrifting } from '@/lib/admin-dashboard/contracts'
import { loadClientDossier } from '@/lib/clients/dossier'
import { OFFER_STATUS_LABEL, RISK_PROFILE_LABEL } from '@/lib/offers/model'
import {
  available,
  isAvailable,
  unavailable,
  valueOf,
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
  const {
    identity,
    vault,
    offers,
    vaultDetail,
    bucketYields,
    distributions,
    movements,
    fleet,
    share,
    totalActiveCapitalUsdc,
  } = dossier

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
                value={from(
                  vaultDetail,
                  isAvailable(vaultDetail) && vaultDetail.value.producedBtc !== null
                    ? `${formatNumber(vaultDetail.value.producedBtc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BTC`
                    : '—',
                )}
                endpoint="/api/v1/admin/clients/:id/vault"
                derivation={{ kind: 'raw' }}
                note="Mined for this client since subscription"
              />
              <TracedRow
                label="Available to withdraw"
                value={from(
                  vaultDetail,
                  usd(isAvailable(vaultDetail) ? vaultDetail.value.availableUsdc : null),
                )}
                endpoint="/api/v1/admin/clients/:id/vault"
                derivation={{ kind: 'raw' }}
                note="The client reads this converted to BTC at today's spot"
              />
              <TracedRow
                label="Withdrawn to date"
                value={from(
                  vaultDetail,
                  usd(isAvailable(vaultDetail) ? vaultDetail.value.withdrawnUsdcAtPayout : null),
                )}
                endpoint="/api/v1/admin/clients/:id/vault"
                derivation={{ kind: 'raw' }}
                note="Dollars ACTUALLY paid, each withdrawal at its own rate — never reconverted at today's spot"
              />
              <TracedRow
                label="Entry rate"
                value={from(
                  vaultDetail,
                  usd(isAvailable(vaultDetail) ? vaultDetail.value.entryRateUsd : null),
                )}
                endpoint="/api/v1/admin/clients/:id/vault"
                derivation={{ kind: 'raw' }}
                note="The reference behind « Against simply holding bitcoin »"
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

        {/* ── SA PART DU PARC ───────────────────────────────────────────
            La règle du produit : un client qui apporte un million sur dix
            millions reçoit un dixième du parc. Une seule clé, appliquée à la
            puissance, au bitcoin produit et à l'électricité — sinon les
            chiffres du client cessent de se recouper entre eux.

            Cette part se CALCULE, elle ne se lit pas. D'où le dénominateur en
            clair : sans lui, le chiffre serait invérifiable. */}
        <BentoCard span={12}>
          {share === null ? (
            <Callout tone="warning" title="Fleet share not computable">
              {totalActiveCapitalUsdc === null
                ? 'The total capital across active vaults could not be read — a share of nothing is not zero per cent.'
                : 'The fleet reading is unavailable.'}
            </Callout>
          ) : (
            <DataTableShell
              title="Fleet share"
              description={`This client's capital over ${usd(totalActiveCapitalUsdc)} across active vaults.`}
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
                  label="% of the fleet"
                  value={available(
                    `${formatNumber(share.sharePct, { maximumFractionDigits: 2 })} %`,
                  )}
                  endpoint="/api/v1/admin/vaults/registry"
                  derivation={{
                    kind: 'computed',
                    formula: 'clientPrincipal ÷ Σ principal of ACTIVE vaults',
                  }}
                  note="The single key behind every figure below"
                />
                <TracedRow
                  label="Your hashrate"
                  value={
                    share.hashrateThs === null
                      ? missing('/api/v1/mining/fleet', 'fleet hashrate not read')
                      : available(
                          `${formatNumber(share.hashrateThs, { maximumFractionDigits: 0 })} TH/s`,
                        )
                  }
                  endpoint="/api/v1/mining/fleet"
                  derivation={{ kind: 'computed', formula: 'fleet EH/s × 1e6 × share' }}
                />
                <TracedRow
                  label="Produced for you"
                  value={
                    share.btcProduced === null
                      ? missing('/api/v1/mining/fleet', 'fleet production not read')
                      : available(
                          `${formatNumber(share.btcProduced, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BTC`,
                        )
                  }
                  endpoint="/api/v1/mining/fleet"
                  derivation={{ kind: 'computed', formula: 'fleet BTC produced × share' }}
                  note="Pro rata to capital — compare with the figure the vault reports above"
                />
                <TracedRow
                  label="Operational capacity"
                  value={from(
                    fleet,
                    isAvailable(fleet) && fleet.value.hashrateEhs !== null
                      ? `${formatNumber(fleet.value.hashrateEhs, { maximumFractionDigits: 1 })} EH/s`
                      : '—',
                  )}
                  endpoint="/api/v1/mining/fleet"
                  derivation={{ kind: 'raw' }}
                  note="The whole fleet — not this client's share"
                />
              </TableBody>
            </DataTableShell>
          )}
        </BentoCard>

        {/* Le rapprochement qui manquait : deux chemins vers le même fait.
            Quand ils divergent, c'est une question à poser au backend, pas un
            détail d'affichage — l'un des deux est faux, et c'est le client qui
            lit le premier. */}
        {share !== null &&
        share.btcProduced !== null &&
        isAvailable(vaultDetail) &&
        vaultDetail.value.producedBtc !== null &&
        Math.abs(share.btcProduced - vaultDetail.value.producedBtc) > 0.01 ? (
          <BentoCard span={12}>
            <Callout tone="warning" title="Two figures disagree on what this client produced">
              The vault reports{' '}
              {formatNumber(vaultDetail.value.producedBtc, { maximumFractionDigits: 2 })} BTC, while
              the fleet share ({formatNumber(share.sharePct, { maximumFractionDigits: 2 })} % of{' '}
              {formatNumber(valueOf(fleet)?.btcProducedTotal ?? 0, { maximumFractionDigits: 1 })}{' '}
              BTC) works out at{' '}
              {formatNumber(share.btcProduced, { maximumFractionDigits: 2 })} BTC. The client reads
              the first. Either the vault figure covers a shorter period than the fleet total, or
              the share key differs from the one used upstream — worth settling before the next
              statement goes out.
            </Callout>
          </BentoCard>
        ) : null}

        {/* ── RENDEMENT PAR POCHE ───────────────────────────────────────
            Le client le lit dans « Strategy Exposure ». Aucune surface admin
            ne pouvait le recouper jusqu'ici. */}
        <BentoCard span={6}>
          {!isAvailable(bucketYields) ? (
            <Callout tone="warning" title="Yields not available">
              {bucketYields.reason ?? 'not read'} — nothing is shown rather than a guess.
            </Callout>
          ) : (
            <DataTableShell
              title="Yield per pocket"
              description="Annualised run-rate, as the client reads it in Strategy Exposure."
            >
              <TableHead>
                <TableRow>
                  <TableHeader className={tableCol.primary}>Pocket</TableHeader>
                  <TableHeader className={tableCol.numeric}>Yield</TableHeader>
                  <TableHeader className={tableCol.numeric}>Capital</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {bucketYields.value.map((y) => (
                  <TableRow key={y.bucket}>
                    <td className={tableCol.primary}>{y.bucket}</td>
                    <td className={tableCol.numeric}>
                      {y.yieldPct === null
                        ? '—'
                        : `${formatNumber(y.yieldPct, { maximumFractionDigits: 1 })} %`}
                    </td>
                    <td className={tableCol.numeric}>{usd(y.capitalUsdc)}</td>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          )}
        </BentoCard>

        {/* ── DISTRIBUTIONS ─────────────────────────────────────────────
            La chaîne exposait l'approbation mais aucune lecture : on signait
            sans voir le registre. */}
        <BentoCard span={6}>
          {!isAvailable(distributions) ? (
            <Callout tone="warning" title="Distributions not available">
              {distributions.reason ?? 'not read'}
            </Callout>
          ) : (
            <DataTableShell
              title="Distributions"
              description="Paid, approved and pending — each at the rate retained for that month."
            >
              <TableHead>
                <TableRow>
                  <TableHeader className={tableCol.primary}>Month</TableHeader>
                  <TableHeader className={tableCol.numeric}>BTC</TableHeader>
                  <TableHeader className={tableCol.numeric}>USDC</TableHeader>
                  <TableHeader className={tableCol.status}>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {distributions.value.map((d) => (
                  <TableRow key={d.id}>
                    <td className={tableCol.primary}>{d.month}</td>
                    <td className={tableCol.numeric}>
                      {/* Une ligne sans montant se dit absente, jamais zéro —
                          c'est l'entorse relevée côté client dans le donut. */}
                      {d.btcAmountSats === null
                        ? '—'
                        : formatNumber(d.btcAmountSats / 1e8, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                    </td>
                    <td className={tableCol.numeric}>{usd(d.yieldUsdc)}</td>
                    <td className={tableCol.status}>
                      <Badge
                        color={
                          d.status === 'distributed'
                            ? 'lime'
                            : d.status === 'approved'
                              ? 'sky'
                              : 'amber'
                        }
                      >
                        {d.status}
                      </Badge>
                    </td>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          )}
        </BentoCard>

        {/* ── LE JOURNAL ────────────────────────────────────────────────
            `admin/activity/recent` reste global : il dit ce que fait le
            portefeuille, jamais ce qu'a fait une personne. */}
        <BentoCard span={12}>
          {!isAvailable(movements) ? (
            <Callout tone="warning" title="Ledger not available">
              {movements.reason ?? 'not read'}
            </Callout>
          ) : (
            <DataTableShell
              title="Movements"
              description="This client's ledger — deposits, withdrawals, distributions."
            >
              <TableHead>
                <TableRow>
                  <TableHeader className={tableCol.primary}>Type</TableHeader>
                  <TableHeader className={tableCol.numeric}>Amount</TableHeader>
                  <TableHeader className={tableCol.date}>Date</TableHeader>
                  <TableHeader className={tableCol.hash}>Transaction</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.value.map((m) => (
                  <TableRow key={m.id}>
                    <td className={tableCol.primary}>{m.type}</td>
                    <td className={tableCol.numeric}>{usd(m.amountUsdc)}</td>
                    <td className={tableCol.date}>{formatDate(m.occurredAt)}</td>
                    <td className={tableCol.hash}>
                      <code className="text-xs text-fg-tertiary">
                        {m.txHash === null ? 'not reported' : formatHash(m.txHash)}
                      </code>
                    </td>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          )}
        </BentoCard>
      </BentoGrid>

      {activeOffer !== undefined ? null : null}
    </DashboardShell>
  )
}
