import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { formatDate, formatNumber, formatPercent } from '@/lib/format'
import { valueOf, type Availability } from '@/lib/vaults/model'
import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'

/**
 * Le client derrière le vault : son capital, son échéance, l'état de ses
 * dépôts.
 *
 * La fiche vault parlait allocation et opérations — la mécanique — sans jamais
 * dire À QUI le vault appartient ni sur quel terme il est engagé. C'est
 * pourtant ce que l'opérateur cherche en l'ouvrant.
 */

const usd = (v: number | null) =>
  v === null ? '—' : `$${formatNumber(v, { maximumFractionDigits: 0 })}`

/** Un terme à moins de trois mois demande une action commerciale. */
const DUE_SOON_MONTHS = 3

export function VaultClientPanel({
  vaultId,
  vaults,
}: Readonly<{ vaultId: string; vaults: Availability<readonly AdminVaultRecord[]> }>) {
  const registry = valueOf(vaults)
  const record = registry?.find((v) => v.vaultId === vaultId) ?? null

  if (record === null) {
    return (
      <p className="text-sm text-fg-tertiary">
        No client record is linked to this vault — nothing is shown rather than a guess.
      </p>
    )
  }

  const remaining =
    record.lockupMonths !== null && record.lockupElapsedMonths !== null
      ? Math.max(0, record.lockupMonths - record.lockupElapsedMonths)
      : null

  const progress =
    record.lockupElapsedMonths !== null && record.lockupMonths !== null && record.lockupMonths > 0
      ? (record.lockupElapsedMonths / record.lockupMonths) * 100
      : null

  const dueSoon = remaining !== null && remaining <= DUE_SOON_MONTHS

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Figure label="Client" value={record.clientLabel} />
        <Figure
          label="Bitcoin reserve"
          value={btcFromSats((record.capitalBtcSats ?? 0) + (record.accruedBtcSats ?? 0))}
          numeric
        />
        <Figure label="Accumulated since entry" value={`+${btcFromSats(record.accruedBtcSats)}`} numeric />
      </div>

      {/* Le blocage : c'est lui qui commande la relation commerciale. */}
      <div className="flex flex-col gap-2.5 rounded-lg px-4 py-3.5 ring-1 ring-console-line-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-xs text-fg-tertiary">
            Capital locked{' '}
            {record.lockupMonths !== null ? `for ${record.lockupMonths} months` : ''}
          </p>
          {remaining !== null ? (
            <p
              className={`text-xs font-semibold tabular-nums ${
                dueSoon ? 'text-warning-400' : 'text-fg-secondary'
              }`}
            >
              {remaining} {remaining === 1 ? 'month' : 'months'} remaining
            </p>
          ) : null}
        </div>

        {progress !== null ? (
          <span className="h-2 overflow-hidden rounded-full bg-console-inset ring-1 ring-console-line-soft">
            <span
              className="block h-full rounded-full bg-accent-400"
              style={{ width: `${progress}%` }}
            />
          </span>
        ) : null}

        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-fg-tertiary">
          <span>
            {record.lockupStartAt !== null ? `Started ${formatDate(record.lockupStartAt)}` : '—'}
          </span>
          <span>
            {record.lockupEndAt !== null ? `Ends ${formatDate(record.lockupEndAt)}` : '—'}
          </span>
        </div>

        {progress !== null ? (
          <p className="text-xs text-fg-tertiary">
            {formatPercent(progress, { maximumFractionDigits: 0 })} of the term elapsed. Yield is
            paid out monthly — only the capital is held.
          </p>
        ) : null}
      </div>

      {/* L'état des dépôts REFLÈTE une décision prise ailleurs : la file
          d'approbations l'accorde, cette fiche la lit. */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            record.depositUnlocked
              ? 'text-[var(--accent-text)] ring-1 ring-accent-400/40'
              : 'text-fg-tertiary ring-1 ring-console-line-soft'
          }`}
        >
          Deposits {record.depositUnlocked ? 'open' : 'locked'}
        </span>
        <p className="text-xs text-fg-tertiary">
          {record.depositUnlocked
            ? 'The client can add capital to this vault.'
            : 'The client cannot add capital until a deposit window is authorised.'}
        </p>
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  numeric = false,
}: Readonly<{ label: string; value: string; numeric?: boolean }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-fg-tertiary">{label}</p>
      <p
        className={`truncate text-lg font-semibold text-fg ${numeric ? 'tabular-nums' : ''}`}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}
