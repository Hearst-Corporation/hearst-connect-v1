import { Badge } from '@/components/catalyst/badge'
import { TableCell, TableRow } from '@/components/catalyst/table'
import { tableCol } from '@/components/compositions'
import { isAvailable, type Availability } from '@/lib/vaults/model'

/**
 * Un chiffre du client, avec SA SOURCE en clair.
 *
 * L'inventaire de `/account` a montré que sept familles de chiffres montrés au
 * client n'étaient vérifiables nulle part côté console : le rendement par
 * poche, les distributions, la comparaison au HODL, les mouvements d'un
 * client… On les affichait, sans pouvoir répondre à « d'où vient ce nombre ? ».
 *
 * Chaque ligne porte donc quatre choses : ce que le client lit, la valeur,
 * l'endpoint qui la fournit, et la façon dont elle est obtenue — lue telle
 * quelle, ou calculée, et alors avec quelle formule.
 *
 * La distinction LU / CALCULÉ n'est pas cosmétique. Un chiffre lu se vérifie en
 * interrogeant le backend ; un chiffre calculé dans le front ne se vérifie que
 * si sa formule est écrite quelque part. Sans cette colonne, un écart entre ce
 * que voit le client et ce que dit la chaîne resterait introuvable.
 */

export type Derivation =
  | { readonly kind: 'raw' }
  | { readonly kind: 'computed'; readonly formula: string }

export function TracedRow({
  label,
  value,
  endpoint,
  derivation,
  note,
}: Readonly<{
  /** Le libellé EXACT que lit le client, pour que les deux surfaces se recoupent. */
  label: string
  value: Availability<string>
  endpoint: string
  derivation: Derivation
  note?: string
}>) {
  const computed = derivation.kind === 'computed'

  return (
    <TableRow>
      <TableCell className={tableCol.primary}>
        <div className="truncate font-medium">{label}</div>
        {note !== undefined ? <div className="text-xs text-fg-tertiary">{note}</div> : null}
      </TableCell>

      <TableCell className={tableCol.numeric}>
        {/* Une absence se dit, elle ne tombe pas à zéro. */}
        {isAvailable(value) ? (
          value.value
        ) : (
          <span className="text-fg-tertiary">{value.reason ?? 'not read'}</span>
        )}
      </TableCell>

      <TableCell>
        <code className="text-xs text-fg-tertiary">{endpoint}</code>
      </TableCell>

      <TableCell>
        {computed ? (
          <div className="flex flex-col gap-0.5">
            <Badge color="amber">computed</Badge>
            <code className="text-xs text-fg-tertiary">{derivation.formula}</code>
          </div>
        ) : (
          <Badge color="neutral">as reported</Badge>
        )}
      </TableCell>
    </TableRow>
  )
}
