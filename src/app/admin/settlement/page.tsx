import { DashboardHeader } from '@/components/admin/dashboard'
import { DashCard, PanelHeaderLink, PanelState } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { loadAdminApprovals } from '@/lib/admin-dashboard/load'
import { callBackend } from '@/lib/backend/client'
import { formatNumber } from '@/lib/format'
import { requireSession } from '@/lib/auth'
import { valueOf } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import type { Machine } from './fleet-machines'
import { FleetMachineTable } from './fleet-machine-table'
import { MonthlyClose, type CloseMonth } from './monthly-close'
import { TriggerCalculationButton } from './trigger-calculation-button'

export const metadata: Metadata = { title: 'Settlement' }
export const dynamic = 'force-dynamic'

/**
 * LA CLÔTURE MENSUELLE — le seul flux que la console ne fait nulle part ailleurs.
 *
 * Une fois par mois, sur tous les vaults à la fois : calculer ce que le parc a
 * produit, le répartir entre les vaults, valider chaque reward et payer
 * chaque électricité. Puis les exceptions du parc — les machines hors ligne,
 * pas les dix mille.
 *
 * Ce que la page « Mining » portait d'autre vit ailleurs, une seule fois :
 * l'économie du minage et les lectures réseau sur le tableau de bord, la part
 * de chaque vault sur sa fiche client, la déclaration du parc dans Settings ›
 * Keeper.
 */

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type DistributionRecord = {
  readonly month: string
  readonly rwaStrategyId: string
  readonly status: string
  /** Ce que chaque vault a reçu ce mois-là, toutes poches converties en bitcoin. */
  readonly byVault?: readonly { readonly vaultId: string; readonly btcSats: number }[]
}
type RwaPocket = { readonly pocket: string; readonly enabled: boolean }

export default async function SettlementPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ readonly machines?: string }> }>) {
  await requireSession()
  const { machines: machinesView } = await searchParams
  const showAllMachines = machinesView === 'all'

  const [closeRes, machinesRes, distRes, rwaRes, approvals] = await Promise.all([
    callBackend<{ readonly months: Resolved<readonly CloseMonth[]> }>('admin-mining-monthly-close'),
    callBackend<{ readonly machines: Resolved<readonly Machine[]> }>('mining-machines'),
    callBackend<{ readonly distributions: Resolved<readonly DistributionRecord[]> }>('mining-distributions'),
    callBackend<{ readonly pockets: Resolved<readonly RwaPocket[]> }>('rwa-vault'),
    loadAdminApprovals(),
  ])

  const months = closeRes.ok && closeRes.data.months?.value ? closeRes.data.months.value : []
  const machines = machinesRes.ok && machinesRes.data.machines?.value ? machinesRes.data.machines.value : null
  const distributions = distRes.ok && distRes.data.distributions.value ? distRes.data.distributions.value : []
  const pockets = rwaRes.ok && rwaRes.data.pockets.value ? rwaRes.data.pockets.value : []

  /* Le mois à calculer : celui dont la distribution attend, sinon le mois en
     cours. Sans stratégie réelle (distribution en attente ou poche active),
     pas d'identifiant inventé : le déclenchement reste éteint. */
  const next = distributions.find((d) => d.status === 'pending') ?? null
  const nextPeriod = next?.month ?? new Date().toISOString().slice(0, 7)
  const strategyId = next?.rwaStrategyId ?? pockets.find((p) => p.enabled)?.pocket ?? null

  // Le reward de chaque vault, mois par mois — le montant que la ligne fait valider.
  const rewards = Object.fromEntries(
    distributions.map((d) => [d.month, Object.fromEntries((d.byVault ?? []).map((v) => [v.vaultId, v.btcSats]))]),
  )
  // La décision de reward en attente de chaque vault — une par tranche.
  const decisionIds = Object.fromEntries(
    (valueOf(approvals) ?? [])
      .filter((a) => a.kind === 'distribution' && a.vaultId !== null)
      .map((a) => [a.vaultId as string, a.id]),
  )

  /* Les exceptions du parc : les machines hors ligne d'abord — c'est elles
     qu'on vient chercher. La liste entière reste à un clic. */
  const offline = (machines ?? []).filter((m) => m.status !== 'online')
  const shownMachines = showAllMachines
    ? [...(machines ?? [])].sort(
        (a, b) => Number(a.status === 'online') - Number(b.status === 'online') || b.hashrateThs - a.hashrateThs,
      )
    : offline
  const uptime =
    machines !== null && machines.length > 0 ? machines.reduce((t, m) => t + m.uptime30dPct, 0) / machines.length : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Settlement"
        description="Once a month, for every vault: what the fleet mined, its electricity, the reward to approve."
        kpis={[]}
        action={
          strategyId !== null ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-fg-tertiary">Next to compute: {nextPeriod}</span>
              <TriggerCalculationButton period={nextPeriod} rwaStrategyId={strategyId} />
            </div>
          ) : undefined
        }
      />

      <BentoGrid>
        <BentoCard span={12} bare>
          <DashCard
            eyebrow="Month-end"
            title="Split by vault"
            subtitle="The fleet’s output and electricity, split by each vault’s mining capital — approve each reward, pay each electricity"
          >
            <MonthlyClose months={months} decisionIds={decisionIds} rewards={rewards} />
          </DashCard>
        </BentoCard>
      </BentoGrid>

      <BentoGrid>
        <BentoCard span={12} bare>
          <DashCard
            eyebrow="Fleet"
            title={showAllMachines ? 'Machine registry' : 'Fleet exceptions'}
            subtitle={
              machines === null
                ? 'The machine registry could not be read'
                : `${formatNumber(offline.length)} offline of ${formatNumber(machines.length)} machines${
                    uptime !== null ? ` · ${formatNumber(uptime, { maximumFractionDigits: 1 })} % average uptime, 30 days` : ''
                  }`
            }
            action={
              machines !== null ? (
                <PanelHeaderLink href={showAllMachines ? '/admin/settlement' : '/admin/settlement?machines=all'}>
                  {showAllMachines ? 'Offline only' : `All ${formatNumber(machines.length)} machines`}
                </PanelHeaderLink>
              ) : undefined
            }
          >
            {machines === null ? (
              <PanelState title="The machine registry could not be read." />
            ) : shownMachines.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-tertiary">Every machine is online.</p>
            ) : (
              <FleetMachineTable
                machines={shownMachines}
                exportName={showAllMachines ? 'hearst-machines' : 'hearst-machines-offline'}
                exportTitle={showAllMachines ? 'Machine registry' : 'Offline machines'}
              />
            )}
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </div>
  )
}
