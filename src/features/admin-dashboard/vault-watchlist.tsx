import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { CalmState, tableCol } from '@/components/compositions'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import {
  driftThresholdOf,
  isVaultDrifting,
  type AdminVaultRecord,
} from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { clientHref, vaultDisplayName } from '@/lib/clients/vaults'

/**
 * Les vaults, un par ligne — avec SA dérive contre SON seuil.
 *
 * Le tableau de bord montrait jusqu'ici une exposition « across all vaults »,
 * moyenne pondérée par le capital. Le code le reconnaissait lui-même : « chaque
 * client a SA propre allocation — celle-ci est une moyenne, pas un mix que
 * quiconque détiendrait ». C'est le défaut de fond : le produit se vend sur
 * mesure, un vault par client, et une moyenne de mandats sur mesure ne décrit
 * personne. On ne rééquilibre jamais « le portefeuille », on rééquilibre le
 * vault de quelqu'un.
 *
 * Le seuil est porté PAR VAULT : un mandat prudent ne tolère pas la même dérive
 * qu'un mandat offensif. Un vault peut donc alerter à 3,2 pt pendant que son
 * voisin reste calme à 9,6 pt — et c'est correct dans les deux cas.
 */

function pts(bps: number): string {
  return `${formatNumber(bps / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`
}

function usd(amount: number | null): string {
  if (amount === null) return '—'
  return formatCurrency(String(amount), { unit: '$', fromAtomic: 1 })
}

export function VaultWatchlist({
  vaults,
  showUnlock = true,
}: Readonly<{
  vaults: Availability<readonly AdminVaultRecord[]>
  /** Masquée sur le tableau de bord : « Unlock schedule », à côté, porte déjà les échéances. */
  showUnlock?: boolean
}>) {
  if (!isAvailable(vaults)) {
    return (
      <CalmState message="The vault registry could not be read — no vault is shown rather than an empty list." />
    )
  }

  const rows = vaults.value
  if (rows.length === 0) {
    return <CalmState message="No dedicated vault in the registry yet." />
  }

  /* Les vaults qui dépassent LEUR seuil viennent en tête : c'est là que se
     décide un arbitrage. Le reste suit par capital décroissant. */
  const drifting = rows.filter(isVaultDrifting)
  const calm = rows.filter((v) => !isVaultDrifting(v))
  const ordered = [
    ...drifting.sort((a, b) => Math.abs(b.worstDriftBps ?? 0) - Math.abs(a.worstDriftBps ?? 0)),
    ...calm.sort((a, b) => (b.principalUsdc ?? 0) - (a.principalUsdc ?? 0)),
  ]

  return (
    /* Colonnes aérées (`px-5`), et les bords du tableau calés sur ceux de la
       carte (`pl-0` / `pr-0`) : le bouton « Open » de chaque ligne tombe sous
       le bouton « All vaults » de l'en-tête. */
    <PaginatedTable
      className="[&_table]:w-full [&_table]:min-w-[44rem] [&_td]:px-4 [&_th]:px-4 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0"
      noun="vaults"
      head={
        <TableRow>
          <TableHeader className={tableCol.primary}>Client</TableHeader>
          <TableHeader className={tableCol.numeric}>Bitcoin reserve</TableHeader>
          <TableHeader className={tableCol.numeric}>Accumulated</TableHeader>
          <TableHeader className={tableCol.numeric}>Drift</TableHeader>
          {showUnlock ? <TableHeader className={tableCol.date}>Unlocks</TableHeader> : null}
          <TableHeader className={tableCol.status}>State</TableHeader>
          <TableHeader className={tableCol.action}>
            <span className="sr-only">Open</span>
          </TableHeader>
        </TableRow>
      }
      rows={ordered.map((vault) => {
          const threshold = driftThresholdOf(vault)
          const alerting = isVaultDrifting(vault)
          return (
            <TableRow key={vault.vaultId}>
              <TableCell className={tableCol.primary}>
                <Link href={clientHref(vault.clientId, vault)} className="font-medium">
                  {vaultDisplayName(vault, rows)}
                </Link>
                {/* Plus d'identifiant de 45 caractères sous le nom : il ne se lit
                    pas, et la ligne mène déjà à la page du vault. */}
                {vault.lockupMonths !== null && vault.lockupElapsedMonths !== null ? (
                  <div className="text-xs text-fg-tertiary">
                    Month {Math.min(vault.lockupElapsedMonths, vault.lockupMonths)} of {vault.lockupMonths}
                  </div>
                ) : null}
              </TableCell>
              {/* La réserve : le versement converti à l'entrée + ce qui s'y est ajouté. */}
              <TableCell className={tableCol.numeric}>
                <div className="font-medium">
                  {btcFromSats(vault.accruedBtcSats ?? 0)}
                </div>
                <div className="text-xs text-fg-tertiary">from {usd(vault.principalUsdc)} USDC</div>
              </TableCell>
              {/* Ce que les trois poches ont ajouté depuis l'entrée, en bitcoin. */}
              <TableCell className={tableCol.numeric}>
                <span className={vault.accruedBtcSats == null ? 'text-fg-tertiary' : 'text-[var(--hearst-green-text)]'}>
                  {vault.accruedBtcSats == null ? '—' : `+${btcFromSats(vault.accruedBtcSats)}`}
                </span>
              </TableCell>
              {/* La dérive et, dessous, la bande que CE vault tolère : les deux se
                  lisent ensemble, et une colonne de moins laisse respirer les
                  autres. Une dérive non lue n'est pas une dérive nulle. */}
              <TableCell className={tableCol.numeric}>
                {vault.worstDriftBps === null ? (
                  <span className="text-fg-tertiary">not read</span>
                ) : (
                  pts(vault.worstDriftBps)
                )}
                <div className="text-xs text-fg-tertiary">band {pts(threshold).replace('+', '±')}</div>
              </TableCell>
              {/* La date à laquelle le capital redevient retirable. */}
              {showUnlock ? (
                <TableCell className={tableCol.date}>
                  <span className={vault.lockupEndAt === null ? 'text-fg-tertiary' : undefined}>
                    {formatDate(vault.lockupEndAt)}
                  </span>
                </TableCell>
              ) : null}
              <TableCell className={tableCol.status}>
                {vault.worstDriftBps === null ? (
                  <Badge color="neutral">Unread</Badge>
                ) : alerting ? (
                  <Badge color="amber">Rebalance</Badge>
                ) : (
                  <Badge color="lime">Within band</Badge>
                )}
              </TableCell>
              {/* Le bouton vert de /account : chaque ligne mène à SON vault. */}
              <TableCell className={tableCol.action}>
                <Link
                  href={clientHref(vault.clientId, vault)}
                  className="ud-detail-btn inline-flex items-center no-underline"
                  aria-label={`Open ${vaultDisplayName(vault, rows)}`}
                >
                  Open
                </Link>
              </TableCell>
            </TableRow>
          )
        })}
      exportData={{
        filename: 'hearst-vaults',
        title: 'Client vaults',
        columns: ['Client', 'Vault', 'Deposit (USDC)', 'Deposit (BTC)', 'Accumulated (BTC)', 'Reserve (BTC)', 'Drift (bps)', 'Lockup end'],
        data: ordered.map((v) => [
          vaultDisplayName(v, rows),
          v.vaultId,
          v.principalUsdc,
          v.capitalBtcSats != null ? v.capitalBtcSats / 1e8 : null,
          v.accruedBtcSats != null ? v.accruedBtcSats / 1e8 : null,
          (v.accruedBtcSats ?? 0) / 1e8,
          v.worstDriftBps,
          v.lockupEndAt,
        ]),
      }}
    />
  )
}
