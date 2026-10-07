import { DashCard, PanelState } from '@/components/admin/dashboard'
import { Link } from '@/components/catalyst/link'
import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'
import { formatNumber } from '@/lib/format'
import { totalActiveCapital } from '@/lib/mining/allocation'
import { vaultDisplayName } from '@/lib/clients/vaults'

/**
 * Le rendement minier, vault par vault.
 *
 * Il n'y a pas UN vault avec des poches communes : chaque client a son vault,
 * taillé pour lui, avec sa propre allocation. Un bloc qui additionnait « les
 * poches » de tous les vaults décrivait un portefeuille que personne ne
 * détient. Ici, chaque vault actif reçoit sa part du parc — son capital sur le
 * capital de tous les vaults actifs, la même clé que la fiche client — et le
 * bitcoin miné qui lui revient à ce titre.
 */

export function MiningByVault({
  vaults,
  fleetThs,
  distributedSats,
}: Readonly<{
  vaults: readonly AdminVaultRecord[] | null
  /** Puissance du parc, en TH/s — la somme des machines en ligne. */
  fleetThs: number | null
  /** Bitcoin miné déjà versé aux vaults, toutes distributions confondues. */
  distributedSats: number
}>) {
  const total = vaults === null ? null : totalActiveCapital(vaults)
  if (vaults === null || total === null || total <= 0) {
    return (
      <DashCard eyebrow="Allocation" title="Mining yield by vault" subtitle="Each client vault’s share of the fleet">
        <PanelState title="The vault registry could not be read." />
      </DashCard>
    )
  }

  const rows = vaults
    .filter((v) => v.status === 'ACTIVE' && v.principalUsdc !== null)
    .map((v) => {
      const share = (v.principalUsdc as number) / total
      return { v, share, ths: fleetThs === null ? null : fleetThs * share, btc: (distributedSats / 1e8) * share }
    })
    .sort((a, b) => b.share - a.share)
  const max = Math.max(...rows.map((r) => r.share), 0.0001)

  return (
    <DashCard
      eyebrow="Allocation"
      title="Mining yield by vault"
      subtitle="Each client vault’s share of the fleet, and the bitcoin it was paid"
      className="h-full"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums text-fg">
            {formatNumber(distributedSats / 1e8, { maximumFractionDigits: 2 })} BTC
          </p>
          <p className="mt-1.5 text-xs text-fg-tertiary">paid out to {rows.length} vaults</p>
        </div>
        <ul className="flex flex-col divide-y divide-[var(--ud-line)] border-t border-[var(--ud-line)]">
          {rows.map(({ v, share, ths, btc }) => (
            <li key={v.vaultId} className="flex flex-col gap-2 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/admin/clients/${v.clientId}?vault=${encodeURIComponent(v.vaultId)}`}
                  className="truncate text-sm font-medium text-fg"
                >
                  {vaultDisplayName(v, vaults)}
                </Link>
                <span className="text-sm tabular-nums text-fg">{formatNumber(btc, { maximumFractionDigits: 3 })} BTC</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--ud-inset)]">
                <div className="h-full rounded-full bg-[var(--hearst-green)]" style={{ width: `${(share / max) * 100}%` }} />
              </div>
              <p className="text-xs tabular-nums text-fg-tertiary">
                {formatNumber(share * 100, { maximumFractionDigits: 1 })} % of the fleet
                {ths !== null ? ` · ${formatNumber(ths / 1000, { maximumFractionDigits: 2 })} PH/s` : ''}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-fg-tertiary">
          Share = the vault’s capital over the capital of all active vaults — the key applied to hashrate and to the
          bitcoin mined. Each vault then splits it according to its own allocation.
        </p>
      </div>
    </DashCard>
  )
}
