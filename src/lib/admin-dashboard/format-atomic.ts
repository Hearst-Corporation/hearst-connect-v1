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
    decimals: Math.min(scale.decimals, 6),
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
