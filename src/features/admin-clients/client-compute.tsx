import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { DashCard } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { Badge } from '@/components/catalyst/badge'
import { FleetMachineTable } from '@/app/admin/settlement/fleet-machine-table'
import { PayElectricityButton } from '@/app/admin/settlement/pay-electricity-button'
import { ComputeFleetPanel } from '@/features/user-dashboard/compute-fleet-panel'
import type { ComputeFleet } from '@/lib/product/readings'
import type { Machine } from '@/app/admin/settlement/fleet-machines'
import type { CloseMonth } from '@/app/admin/settlement/monthly-close'
import { formatCurrency, formatNumber } from '@/lib/format'

/**
 * LE COMPUTE D'UN CLIENT — la puissance que son capital lui achète.
 *
 * En tête, le panneau EXACT que le client voit sur /account : la capacité du
 * parc, la part allouée à son vault, la production et l'uptime. Dessous, ce
 * que lui ne voit pas : les machines qui lui sont affectées et sa clôture mois
 * par mois — la même ligne que la clôture mensuelle de la page Mining.
 */

const usd = (v: number) => formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 })
const btc = (sats: number) => btcFromSats(sats)
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function ClientCompute({
  vaultId,
  clientName,
  fleet,
  networkEhs,
  machines,
  months,
}: Readonly<{
  vaultId: string
  clientName?: string
  fleet: ComputeFleet | null
  networkEhs: number | null
  machines: readonly Machine[] | null
  months: readonly CloseMonth[]
}>) {
  const mine = (machines ?? []).filter((m) => m.vaultId === vaultId)
  const lines = months
    .flatMap((m) =>
      m.lines
        .filter((l) => l.vaultId === vaultId)
        .map((l) => {
          // L'électricité se déduit du bitcoin miné, au cours du mois.
          const elecSats = m.btcPriceUsd > 0 ? Math.round((l.electricityUsd / m.btcPriceUsd) * 1e8) : 0
          return { ...l, month: m.month, price: m.btcPriceUsd, elecSats, netSats: l.btcSats - elecSats }
        }),
    )
    .sort((a, b) => b.month.localeCompare(a.month))
  const ordered = [...mine].sort(
    (a, b) => Number(a.status === 'online') - Number(b.status === 'online') || b.hashrateThs - a.hashrateThs,
  )

  return (
    <BentoGrid>
      <BentoCard span={12} bare>
        <DashCard
          className="min-w-0"
          eyebrow="Compute"
          title="Computing power allocated"
          subtitle="The same panel the client sees — then this vault’s electricity and the machines it owns"
        >
          <div className="flex flex-col gap-6">
            {fleet !== null ? (
              <ComputeFleetPanel
                fleet={fleet}
                networkHashrateEhs={networkEhs}
                copy={{
                  eyebrow: 'Allocated to this vault',
                  hashrate: 'Vault hashrate',
                  produced: 'Produced for the vault',
                  note: 'Bought by this vault.',
                }}
              />
            ) : (
              <p className="rounded-lg bg-[var(--ud-inset)] px-4 py-6 text-center text-sm text-fg-tertiary">
                The fleet could not be read.
              </p>
            )}

            <div>
              <p className="mb-3 text-xs text-fg-tertiary">Machines allocated to this vault</p>
              {ordered.length > 0 ? (
                <FleetMachineTable
                  machines={ordered}
                  exportName={`hearst-machines-${clientName ?? vaultId}`}
                  exportTitle={`Machines allocated — ${clientName ?? vaultId}`}
                />
              ) : (
                <p className="rounded-lg bg-[var(--ud-inset)] px-4 py-6 text-center text-sm text-fg-tertiary">
                  No machine is allocated to this vault yet.
                </p>
              )}
            </div>

            {/* L'électricité de CE vault, pour le dernier mois clos : c'est ici
                qu'elle se paie — la page Mining y renvoie, ligne par ligne. */}
            {lines[0] ? (
              <div
                id="electricity"
                className="flex scroll-mt-24 flex-wrap items-center justify-between gap-4 rounded-[var(--ud-radius-sm)] bg-[var(--ud-inset)] px-5 py-4 ring-1 ring-[var(--ud-line)]"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-fg-tertiary">Electricity · {monthLabel(lines[0].month)}</p>
                  <p className="text-2xl font-medium tabular-nums text-fg">
                    {usd(lines[0].electricityUsd)}
                    <span className="ml-2 text-sm text-fg-tertiary">≈ {btc(lines[0].elecSats)}</span>
                  </p>
                  <p className="text-xs text-fg-tertiary">
                    The electricity of this vault’s {formatNumber((lines[0].hashrateThs ?? 0) / 1000, { maximumFractionDigits: 1 })} PH/s, deducted from what it mined
                  </p>
                </div>
                {lines[0].electricityStatus === 'paid' ? (
                  <Badge color="lime">Paid</Badge>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge color="amber">Due</Badge>
                    <PayElectricityButton
                      amount={String(Math.round(lines[0].electricityUsd * 1e6))}
                      vaultId={vaultId}
                      month={lines[0].month}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DashCard>
      </BentoCard>
    </BentoGrid>
  )
}
