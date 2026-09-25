import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { AdminTable, CalmState, tableCol } from '@/components/compositions'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  driftThresholdOf,
  isVaultDrifting,
  type AdminVaultRecord,
} from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'

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
}: Readonly<{ vaults: Availability<readonly AdminVaultRecord[]> }>) {
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
    <AdminTable className="[&_table]:min-w-[44rem]">
      <TableHead>
        <TableRow>
          <TableHeader className={tableCol.primary}>Client</TableHeader>
          <TableHeader className={tableCol.numeric}>Capital</TableHeader>
          <TableHeader className={tableCol.numeric}>Drift</TableHeader>
          <TableHeader className={tableCol.numeric}>Threshold</TableHeader>
          <TableHeader className={tableCol.status}>State</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {ordered.map((vault) => {
          const threshold = driftThresholdOf(vault)
          const alerting = isVaultDrifting(vault)
          return (
            <TableRow key={vault.vaultId}>
              <TableCell className={tableCol.primary}>
                <Link href={`/admin/vaults/${vault.vaultId}`} className="font-medium">
                  {vault.clientLabel}
                </Link>
                <div className="text-xs text-fg-tertiary">{vault.vaultId}</div>
              </TableCell>
              <TableCell className={tableCol.numeric}>{usd(vault.principalUsdc)}</TableCell>
              <TableCell className={tableCol.numeric}>
                {/* Une dérive non lue n'est pas une dérive nulle : elle se dit
                    absente plutôt que de s'afficher à zéro. */}
                {vault.worstDriftBps === null ? (
                  <span className="text-fg-tertiary">not read</span>
                ) : (
                  pts(vault.worstDriftBps)
                )}
              </TableCell>
              <TableCell className={tableCol.numeric}>
                <span className={vault.driftThresholdBps === null ? 'text-fg-tertiary' : undefined}>
                  {pts(threshold).replace('+', '±')}
                </span>
              </TableCell>
              <TableCell className={tableCol.status}>
                {vault.worstDriftBps === null ? (
                  <Badge color="neutral">Unread</Badge>
                ) : alerting ? (
                  <Badge color="amber">Rebalance</Badge>
                ) : (
                  <Badge color="lime">Within band</Badge>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </AdminTable>
  )
}
