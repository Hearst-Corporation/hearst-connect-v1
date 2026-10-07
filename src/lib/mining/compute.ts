import 'server-only'

import type { Machine } from '@/app/admin/settlement/fleet-machines'
import type { CloseMonth } from '@/app/admin/settlement/monthly-close'
import type { BackendResolved } from '@/lib/admin-dashboard/cache'
import { callBackend } from '@/lib/backend/client'
import type { ComputeFleet } from '@/lib/product/readings'

/**
 * LE COMPUTE, CÔTÉ CONSOLE — le même panneau que /account, lu par l'admin.
 *
 * Le client voit le parc (capacité, production, uptime) et la part de SON
 * vault. La console doit voir la même chose, pour chaque vault, et pour le
 * parc entier : combien est affecté aux vaults, combien reste libre.
 *
 * Le parc vient de `mining/fleet` (la lecture de /account). La part d'un vault
 * n'est pas une règle de trois sur son capital : c'est la SOMME des machines
 * que le registre lui affecte, et la production de ses lignes de clôture.
 */

export type FleetCompute = Readonly<{
  /** Le parc entier, tel que /account le lit. */
  fleet: ComputeFleet | null
  machines: readonly Machine[] | null
  months: readonly CloseMonth[]
  /** Hashrate du réseau bitcoin, en EH/s — l'échelle de la capacité. */
  networkEhs: number | null
}>

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export async function loadFleetCompute(): Promise<FleetCompute> {
  const [fleetRes, machinesRes, closeRes, costRes] = await Promise.all([
    callBackend<{ readonly fleet: BackendResolved<Record<string, unknown>> }>('mining-fleet'),
    callBackend<{ readonly machines: BackendResolved<readonly Machine[]> }>('mining-machines'),
    callBackend<{ readonly months: BackendResolved<readonly CloseMonth[]> }>('admin-mining-monthly-close'),
    callBackend<{ readonly productionCost: BackendResolved<Record<string, unknown>> }>('mining-production-cost'),
  ])
  const raw = fleetRes.ok ? (fleetRes.data.fleet?.value ?? null) : null
  const fleet: ComputeFleet | null =
    raw === null
      ? null
      : {
          minersManaged: num(raw.minersManaged),
          hashrateEhs: num(raw.hashrateEhs),
          btcProducedTotal: num(raw.btcProducedTotal),
          countries: num(raw.countries),
          uptimePct: num(raw.uptimePct),
          asOf: typeof raw.asOf === 'string' ? raw.asOf : null,
          allocatedHashrateThs: null,
          allocatedMiners: null,
          allocatedBtcProduced: null,
          allocatedSharePct: null,
        }
  return {
    fleet,
    machines: machinesRes.ok ? (machinesRes.data.machines?.value ?? null) : null,
    months: closeRes.ok ? (closeRes.data.months?.value ?? []) : [],
    networkEhs: costRes.ok ? num(costRes.data.productionCost?.value?.hashrateEhs) : null,
  }
}

/** Ce qui revient aux vaults retenus — un seul, ou tous (`'all'`). */
export function allocatedTo(fc: FleetCompute, vaults: string | 'all'): ComputeFleet | null {
  if (fc.fleet === null) return null
  const hit = (vaultId: string | null | undefined) =>
    vaultId !== null && vaultId !== undefined && (vaults === 'all' || vaultId === vaults)
  const machines = fc.machines ?? []
  const fleetThs = machines.reduce((s, m) => s + m.hashrateThs, 0)
  const mine = machines.filter((m) => hit(m.vaultId))
  const ths = mine.reduce((s, m) => s + m.hashrateThs, 0)
  const sats = fc.months.reduce((s, m) => s + m.lines.filter((l) => hit(l.vaultId)).reduce((a, l) => a + l.btcSats, 0), 0)
  return {
    ...fc.fleet,
    allocatedHashrateThs: fc.machines === null ? null : ths,
    allocatedMiners: fc.machines === null ? null : mine.length,
    allocatedBtcProduced: fc.months.length > 0 ? sats / 1e8 : null,
    allocatedSharePct: fleetThs > 0 ? (ths / fleetThs) * 100 : null,
  }
}

export type VaultComputeRow = Readonly<{
  vaultId: string | null
  clientId: string | null
  label: string
  machines: number
  ths: number
  sharePct: number
}>

/** La répartition du parc : un rang par vault, et la capacité LIBRE en dernier. */
export function computeByVault(fc: FleetCompute): readonly VaultComputeRow[] {
  const machines = fc.machines ?? []
  const fleetThs = machines.reduce((s, m) => s + m.hashrateThs, 0)
  const who = new Map<string, { clientId: string; label: string }>()
  for (const m of fc.months) for (const l of m.lines) who.set(l.vaultId, { clientId: l.clientId, label: l.clientLabel })

  const acc = new Map<string | null, { machines: number; ths: number }>()
  for (const m of machines) {
    const key = m.vaultId ?? null
    const cur = acc.get(key) ?? { machines: 0, ths: 0 }
    acc.set(key, { machines: cur.machines + 1, ths: cur.ths + m.hashrateThs })
  }
  const rows = [...acc.entries()].map(([vaultId, v]) => ({
    vaultId,
    clientId: vaultId === null ? null : (who.get(vaultId)?.clientId ?? null),
    label: vaultId === null ? 'Available capacity' : (who.get(vaultId)?.label ?? vaultId),
    machines: v.machines,
    ths: v.ths,
    sharePct: fleetThs > 0 ? (v.ths / fleetThs) * 100 : 0,
  }))
  return [
    ...rows.filter((r) => r.vaultId !== null).sort((a, b) => b.ths - a.ths),
    ...rows.filter((r) => r.vaultId === null),
  ]
}
