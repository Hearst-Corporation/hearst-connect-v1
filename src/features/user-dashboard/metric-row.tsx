import type { ComponentType, SVGProps } from 'react'
import { formatNumber } from '@/lib/format'

/**
 * Ligne de métrique — picto cerclé, libellé, valeur.
 *
 * Partagée entre le flanc « BTC context » et le panneau d'économie du minage :
 * une seule définition, donc les deux blocs ne peuvent pas diverger d'un padding
 * ou d'une taille d'icône.
 *
 * La valeur arrive DÉJÀ formatée, `—` compris : le formatage dépend de l'unité
 * (dollars, EH/s, BTC), qui n'est pas l'affaire de la ligne.
 */
export function MetricRow({
  icon: Icon,
  label,
  value,
}: Readonly<{ icon: ComponentType<SVGProps<SVGSVGElement>>; label: string; value: string }>) {
  return (
    <div className="term-row">
      <span className="term-icon">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="term-label">{label}</span>
      <span className="term-value mono">{value}</span>
    </div>
  )
}

/* ── Formatage des métriques réseau ────────────────────────────────────────
   Ces trois unités se lisent par convention : la difficulté en trillions, le
   hashprice au dollar près, la production en BTC à quatre décimales. Elles
   vivent ici plutôt que dans un bloc, pour que le flanc et le panneau de minage
   affichent la même valeur de la même façon. */

/** La difficulté du réseau bitcoin se lit conventionnellement en trillions. */
export function difficultyLabel(raw: number | null): string {
  if (raw === null) return '—'
  return `${formatNumber(raw / 1_000_000_000_000, { maximumFractionDigits: 2 })} T`
}

export function hashpriceLabel(raw: number | null): string {
  return raw !== null ? `$${formatNumber(raw, { maximumFractionDigits: 3 })}` : '—'
}

export function producedLabel(raw: number | null): string {
  return raw !== null ? `${formatNumber(raw, { maximumFractionDigits: 4 })} BTC` : '—'
}
