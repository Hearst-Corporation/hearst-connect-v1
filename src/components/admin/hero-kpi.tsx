import type { ComponentType, SVGProps } from 'react'
import type { Availability } from '@/lib/vaults/model'

/**
 * KPI contract for the cockpit command bar (`DashboardHeader`).
 * The glow-era hero renderer is gone — this type is the remaining contract.
 */
export type AdminHeroKpi = Readonly<{
  id: string
  title: string
  value: Availability<string>
  /** Short unit / precision to the right of the value (optional). */
  unit?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Ratio 0–1 → jauge sous la valeur. Seulement quand la mesure EST une
   *  proportion réelle (déployé / géré, coût / cours…), jamais décorative. */
  meter?: number | null
  /** Ligne de contexte sous la valeur, posée au rang de la jauge. */
  footnote?: string | null
}>
