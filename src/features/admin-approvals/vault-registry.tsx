import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { formatDate, formatNumber, formatPercent } from '@/lib/format'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'
import { vaultDisplayName } from '@/lib/clients/vaults'

/**
 * Registre des vaults dédiés — un par client.
 *
 * L'échéance du blocage porte la lecture : un lockup qui arrive à terme est un
 * renouvellement à préparer, pas une ligne de tableau. Les vaults sont donc
 * triés par échéance la plus proche, et ceux à moins de trois mois sont
 * signalés.
 *
 * Le capital est le montant ENGAGÉ par le client, jamais une quote-part d'un
 * pool : le produit ne mutualise rien.
 */

const usd = (v: number | null) =>
  v === null ? '—' : `$${formatNumber(v, { maximumFractionDigits: 0 })}`

/** Un terme à moins de trois mois demande une action commerciale. */
const DUE_SOON_MONTHS = 3

export function VaultRegistry({
  vaults,
}: Readonly<{ vaults: Availability<readonly AdminVaultRecord[]> }>) {
  const rows = valueOf(vaults)

  if (rows === null) {
    return (
      <p className="text-sm text-fg-tertiary">
        {isAvailable(vaults)
          ? 'No dedicated vault is registered.'
          : 'The vault registry could not be read — nothing is shown rather than a guess.'}
      </p>
    )
  }

  // Tri par échéance la plus proche : ce qui expire bientôt vient en tête.
  const ordered = [...rows].sort((a, b) => {
    const ra = remaining(a)
    const rb = remaining(b)
    if (ra === null) return 1
    if (rb === null) return -1
    return ra - rb
  })

  const totalPrincipal = rows.reduce((sum, r) => sum + (r.principalUsdc ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-fg-tertiary">
        {rows.length} dedicated {rows.length === 1 ? 'vault' : 'vaults'} ·{' '}
        {usd(totalPrincipal)} committed. Each client holds their own vault — nothing is pooled.
      </p>

      <div className="overflow-x-auto">
        <table suppressHydrationWarning className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-tertiary">
              <th scope="col" className="py-2.5 pr-4 font-medium">Client</th>
              <th scope="col" className="py-2.5 pr-4 text-right font-medium">Bitcoin reserve</th>
              <th scope="col" className="py-2.5 pr-4 text-right font-medium">Accumulated</th>
              <th scope="col" className="py-2.5 pr-4 font-medium">Lockup</th>
              <th scope="col" className="py-2.5 pr-4 text-right font-medium">Term ends</th>
              <th scope="col" className="py-2.5 text-right font-medium">Deposits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-console-line-soft">
            {ordered.map((v) => {
              const left = remaining(v)
              const dueSoon = left !== null && left <= DUE_SOON_MONTHS
              const progress =
                v.lockupElapsedMonths !== null && v.lockupMonths !== null && v.lockupMonths > 0
                  ? (v.lockupElapsedMonths / v.lockupMonths) * 100
                  : null

              return (
                <tr key={v.vaultId}>
                  <td suppressHydrationWarning className="py-3 pr-4">
                    <p className="font-medium text-fg">{vaultDisplayName(v, rows)}</p>
                    {/* Le mois de blocage plutôt que l'identifiant de 45 caractères,
                        qui ne se lisait pas. */}
                    {v.lockupMonths !== null && v.lockupElapsedMonths !== null ? (
                      <p className="text-xs text-fg-tertiary">
                        Month {Math.min(v.lockupElapsedMonths, v.lockupMonths)} of {v.lockupMonths}
                      </p>
                    ) : null}
                  </td>
                  <td suppressHydrationWarning className="py-3 pr-4 text-right tabular-nums text-fg">
                    <p className="font-semibold">{btcFromSats(v.accruedBtcSats ?? 0)}</p>
                    <p className="text-xs text-fg-tertiary">from {usd(v.principalUsdc)} USDC</p>
                  </td>
                  <td suppressHydrationWarning className="py-3 pr-4 text-right tabular-nums text-[var(--hearst-green-text)]">
                    +{btcFromSats(v.accruedBtcSats)}
                  </td>
                  <td suppressHydrationWarning className="py-3 pr-4">
                    {progress !== null ? (
                      <div className="flex min-w-[8rem] items-center gap-2.5">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-console-inset ring-1 ring-console-line-soft">
                          <span
                            className="block h-full rounded-full bg-accent-400"
                            style={{ width: `${progress}%` }}
                          />
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-fg-tertiary">
                          {formatPercent(progress, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-fg-tertiary">—</span>
                    )}
                  </td>
                  <td suppressHydrationWarning className="py-3 pr-4 text-right">
                    <p className="text-xs tabular-nums text-fg-secondary">
                      {v.lockupEndAt !== null ? formatDate(v.lockupEndAt) : '—'}
                    </p>
                    {left !== null ? (
                      <p
                        className={`text-xs tabular-nums ${
                          dueSoon ? 'font-semibold text-warning-400' : 'text-fg-tertiary'
                        }`}
                      >
                        {left} {left === 1 ? 'month' : 'months'} left
                      </p>
                    ) : null}
                  </td>
                  <td suppressHydrationWarning className="py-3 text-right">
                    {/* Le drapeau REFLÈTE la décision de l'admin, il ne la prend
                        pas : c'est la file d'approbations qui l'accorde. */}
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        v.depositUnlocked
                          ? 'text-[var(--accent-text)] ring-1 ring-accent-400/40'
                          : 'text-fg-tertiary ring-1 ring-console-line-soft'
                      }`}
                    >
                      {v.depositUnlocked ? 'Open' : 'Locked'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Mois restants avant le terme. `null` quand la source ne permet pas de dire. */
function remaining(v: AdminVaultRecord): number | null {
  if (v.lockupMonths === null || v.lockupElapsedMonths === null) return null
  return Math.max(0, v.lockupMonths - v.lockupElapsedMonths)
}
