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
}>
