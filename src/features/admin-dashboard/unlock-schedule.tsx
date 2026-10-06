import { formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { Link } from '@/components/catalyst/link'
import { CalmState } from '@/components/compositions'
import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'
import { formatNumber } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'

/**
 * Calendrier des déblocages : quand chaque vault redevient retirable, et pour
 * combien.
 *
 * Remplace un donut « par échéance » qui écrasait le book en deux parts (96 % /
 * 4 %) sans dire QUI ni QUAND. Ici, une ligne par vault, dans l'ordre des
 * dates : la barre donne le poids du capital, la date dit l'urgence, et un
 * terme à moins de trois mois passe à l'ambre — c'est un renouvellement à
 * préparer. En tête, le seul chiffre qui commande l'action : ce qui peut
 * sortir dans les douze prochains mois.
 */

const DUE_SOON_MONTHS = 3
const HORIZON_MONTHS = 12

/* En bitcoin : ce qui peut sortir à l'échéance, c'est la RÉSERVE du client —
   son versement converti plus ce qui s'y est accumulé. */
const btcShort = (v: number) => `${formatBtcValue(v)} BTC`

/** Mois restants, au jour près : un terme le 20 du mois n'est pas échu le 2. */
function monthsUntil(iso: string, now: Date): number {
  return (Date.parse(iso) - now.getTime()) / (30.44 * 86_400_000)
}

export function UnlockSchedule({
  vaults,
}: Readonly<{ vaults: Availability<readonly AdminVaultRecord[]> }>) {
  if (!isAvailable(vaults)) {
    return <CalmState message="The vault registry could not be read." />
  }

  const now = new Date()
  const rows = vaults.value
    .filter((v) => v.lockupEndAt !== null && ((v.capitalBtcSats ?? 0) + (v.accruedBtcSats ?? 0)) > 0)
    .map((v) => ({
      vault: v,
      capital: ((v.capitalBtcSats ?? 0) + (v.accruedBtcSats ?? 0)) / 1e8,
      left: monthsUntil(v.lockupEndAt as string, now),
    }))
    .sort((a, b) => (a.vault.lockupEndAt as string).localeCompare(b.vault.lockupEndAt as string))

  if (rows.length === 0) {
    return <CalmState message="No lockup term recorded yet." />
  }

  const max = Math.max(...rows.map((r) => r.capital))
  const withinHorizon = rows.filter((r) => r.left <= HORIZON_MONTHS)
  const unlocking = withinHorizon.reduce((sum, r) => sum + r.capital, 0)
  const total = rows.reduce((sum, r) => sum + r.capital, 0)

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <p className="text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums text-fg">
          {btcShort(unlocking)}
        </p>
        <p className="mt-1.5 text-xs text-fg-tertiary">
          can leave in the next {HORIZON_MONTHS} months ·{' '}
          {formatNumber(total > 0 ? (unlocking / total) * 100 : 0, { maximumFractionDigits: 0 })}% of
          client reserves
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-[var(--ud-line)] border-t border-[var(--ud-line)]">
        {rows.map(({ vault, capital, left }) => {
          const soon = left <= DUE_SOON_MONTHS
          const date = new Date(vault.lockupEndAt as string).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          })
          return (
            <li key={vault.vaultId} className="flex flex-col gap-1.5 py-3">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link href={`/admin/clients/${vault.clientId}`} className="min-w-0 truncate font-medium text-fg">
                  {vault.clientLabel}
                </Link>
                <span className="shrink-0 tabular-nums text-fg">{btcShort(capital)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 min-w-0 flex-1 rounded-full bg-[var(--ud-inset)]">
                  <div
                    className={`h-full rounded-full ${soon ? 'bg-amber-400' : 'bg-[var(--hearst-green)]'}`}
                    style={{ width: `${Math.max(4, (capital / max) * 100)}%` }}
                  />
                </div>
                <span
                  className={`w-20 shrink-0 text-right text-xs tabular-nums ${soon ? 'font-medium text-amber-400' : 'text-fg-tertiary'}`}
                >
                  {left <= 0 ? 'Unlocked' : soon ? `In ${Math.max(1, Math.round(left * 30.44))} days` : date}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
