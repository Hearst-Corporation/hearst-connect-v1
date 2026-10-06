import { Link } from '@/components/catalyst/link'
import { formatNumber } from '@/lib/format'
import type { VaultComputeRow } from '@/lib/mining/compute'

/**
 * La répartition du parc entre les vaults — et ce qui reste libre.
 *
 * Une barre empilée dit d'un coup d'œil la part affectée et la capacité
 * disponible ; la liste dessous donne, vault par vault, la puissance, les
 * machines et la part du parc. La capacité libre ferme la liste : c'est ce
 * qu'on peut encore vendre.
 */

const power = (ths: number) =>
  ths >= 1_000_000
    ? `${formatNumber(ths / 1_000_000, { maximumFractionDigits: 2 })} EH/s`
    : ths >= 1_000
      ? `${formatNumber(ths / 1_000, { maximumFractionDigits: 1 })} PH/s`
      : `${formatNumber(ths, { maximumFractionDigits: 0 })} TH/s`

export function ComputeByVault({ rows }: Readonly<{ rows: readonly VaultComputeRow[] }>) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">The machine registry could not be read.</p>
  }
  const max = Math.max(...rows.map((r) => r.sharePct), 1)
  const free = rows.find((r) => r.vaultId === null)
  const allocatedPct = 100 - (free?.sharePct ?? 0)

  return (
    <div className="flex flex-col gap-1.5">
      {/* Le parc entier : la phrase au-dessus, puis la barre empilée (un
          segment par vault) qui part du bord gauche et s'arrête au MÊME endroit
          que les barres des vaults — la capacité libre tombe dans la colonne de
          droite, alignée sur leurs chiffres. */}
      <div className="mb-3 flex flex-col gap-1.5">
        <span className="text-xs text-fg-tertiary">
          <span className="font-medium text-fg">{formatNumber(allocatedPct, { maximumFractionDigits: 1 })} %</span> of
          the fleet allocated to client vaults
        </span>
        <div className="grid h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <span className="flex h-2.5 overflow-hidden rounded-full bg-[var(--ud-inset)]" aria-hidden="true">
            {rows
              .filter((r) => r.vaultId !== null)
              .map((r, i) => (
                <span
                  key={r.vaultId}
                  className="h-full bg-[var(--hearst-green)]"
                  style={{ width: `${r.sharePct}%`, opacity: 1 - i * 0.15, marginRight: 1 }}
                />
              ))}
          </span>
          <span className="text-right text-xs whitespace-nowrap tabular-nums text-fg-tertiary">
            {free ? (
              <>
                <span className="font-medium text-fg">{power(free.ths)}</span> available
              </>
            ) : null}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          // Sur téléphone, la barre passe sous le nom et les chiffres : trois
          // colonnes fixes (13 + 14 rem) ne tiennent pas dans 390px.
          <li
            key={r.vaultId ?? 'free'}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-1 sm:h-8 sm:grid-cols-[13rem_minmax(0,1fr)_14rem] sm:py-0"
          >
            {r.clientId ? (
              <Link href={`/admin/clients/${r.clientId}`} className="truncate text-sm font-medium text-fg">
                {r.label}
              </Link>
            ) : (
              <span className="truncate text-sm text-fg-tertiary">{r.label}</span>
            )}
            <span className="col-span-2 row-start-2 h-2 rounded-full bg-[var(--ud-inset)] sm:col-span-1 sm:row-start-auto">
              <span
                className={`block h-full rounded-full ${r.vaultId === null ? 'bg-white/25' : 'bg-[var(--hearst-green)]'}`}
                style={{ width: `${Math.max((r.sharePct / max) * 100, 1.5)}%` }}
              />
            </span>
            <span className="text-right text-xs whitespace-nowrap tabular-nums text-fg-tertiary">
              <span className="font-medium text-fg">{power(r.ths)}</span> · {formatNumber(r.machines)} machines ·{' '}
              {formatNumber(r.sharePct, { maximumFractionDigits: 1 })} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
