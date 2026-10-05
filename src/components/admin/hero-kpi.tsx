import type { Availability } from '@/lib/vaults/model'

/** One figure of a page's KPI band (`DashboardHeader`). */
export type AdminHeroKpi = Readonly<{
  id: string
  title: string
  value: Availability<string>
  /** The line under the figure: its unit or scope. */
  unit?: string
}>
