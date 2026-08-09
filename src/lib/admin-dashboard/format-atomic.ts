import { formatCurrency } from '@/lib/format'

/** Portfolio asset scale from backend overview / vault contract. */
export type AdminAssetScale = Readonly<{ asset: string; decimals: number }>

export function atomicDivisor(decimals: number): number {
  return 10 ** decimals
}

export function formatAdminAtomic(
  atomic: string | number | null | undefined,
  scale: AdminAssetScale,
): string {
  return formatCurrency(atomic, {
    fromAtomic: atomicDivisor(scale.decimals),
    unit: scale.asset === 'USDC' ? '$' : undefined,
    // `scale.decimals` (6 pour USDC, 8…) pilote la CONVERSION atomique, pas
    // l'affichage : un montant monétaire à l'écran se lit à 2 décimales, jamais
    // « $259,281.36291 ». `maximumFractionDigits` n'ajoute pas de zéro superflu,
    // donc les valeurs rondes restent courtes ($1.5, $100,000).
    decimals: 2,
  })
}

/** Format an event amount using portfolio scale when asset matches; never assumes USD 6dp blindly. */
export function formatEventAtomic(
  atomic: string | null,
  asset: string | null,
  portfolioScale: AdminAssetScale | null,
): string {
  if (atomic === null) return '—'
  if (portfolioScale !== null && (asset === null || asset === portfolioScale.asset)) {
    return formatAdminAtomic(atomic, portfolioScale)
  }
  if (asset !== null) {
    return `${atomic} ${asset}`
  }
  return atomic
}
