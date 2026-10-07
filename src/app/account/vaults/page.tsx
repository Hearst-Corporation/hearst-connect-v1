import { DashCard, DashboardHeader } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Callout } from '@/components/compositions'
import { EndOfTermChoice } from '@/features/client-portal/controls'
import { loadOverview, loadRewards } from '@/features/client-portal/load'
import { AllocationBar, btc, LockupBar, RewardsTable, usd } from '@/features/client-portal/parts'
import { requireSession } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { editorial } from '@/lib/vaults/model'
import { ArrowTrendingUpIcon, BanknotesIcon, CircleStackIcon, LockClosedIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Vaults' }
export const dynamic = 'force-dynamic'

/**
 * VAULTS — un par versement, chacun avec son prix d'entrée, son blocage et
 * son allocation. Le détail d'un vault : ses chiffres, où est son capital
 * (poches et protocoles), sa part du parc de minage, ses rewards mois par mois,
 * et ce que le client veut à la fin de son blocage.
 */
export default async function VaultsPage({ searchParams }: Readonly<{ searchParams: Promise<{ vault?: string }> }>) {
  await requireSession()
  const { vault: wanted } = await searchParams
  const overview = await loadOverview()
  if (overview === null || overview.vaults.length === 0) {
    return (
      <>
        <DashboardHeader title="Vaults" description="One vault per deposit" kpis={[]} />
        <Callout tone="warning" title="Your vaults could not be read">
          Nothing is shown rather than a guess.
        </Callout>
      </>
    )
  }
  const vault = overview.vaults.find((v) => v.vaultId === wanted) ?? overview.vaults[0]
  const rewards = (await loadRewards(vault.vaultId)) ?? []

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'reserve', title: 'Reserve', value: editorial(btc(vault.reserveBtc)), icon: CircleStackIcon, footnote: `≈ ${usd(vault.reserveBtc * overview.spotUsd)} today` },
    { id: 'produced', title: 'Produced', value: editorial(`+${btc(vault.producedBtc)}`), icon: ArrowTrendingUpIcon, footnote: `+${vault.vsHodlPct} % on ${btc(vault.capitalBtc)} bought at entry` },
    { id: 'available', title: 'Available', value: editorial(btc(vault.availableBtc)), icon: BanknotesIcon, footnote: `${btc(vault.withdrawnBtc)} withdrawn to date` },
    { id: 'lockup', title: 'Lockup', value: editorial(`${vault.elapsedMonths} of ${vault.lockupMonths} mo`), icon: LockClosedIcon, footnote: `Unlocks ${formatDate(vault.lockupEndAt)}` },
  ]

  return (
    <>
      <DashboardHeader
        title={vault.label}
        description={`${usd(vault.principalUsdc)} deposited ${formatDate(vault.lockupStartAt)} · converted at ${usd(vault.entryRateUsd)} / BTC`}
        kpis={kpis}
        beforeKpis={
          overview.vaults.length > 1 ? (
            <nav aria-label="Vaults" className="ud-seg flex-wrap self-start">
              {overview.vaults.map((v) => (
                <Link
                  key={v.vaultId}
                  href={`/account/vaults?vault=${encodeURIComponent(v.vaultId)}`}
                  className={`ud-seg-btn no-underline${v.vaultId === vault.vaultId ? ' active' : ''}`}
                >
                  {v.label}
                  <span className="ml-2 tabular-nums opacity-60">{btc(v.reserveBtc, 2)}</span>
                </Link>
              ))}
            </nav>
          ) : undefined
        }
      />

      <BentoGrid>
        <BentoCard span={8} bare>
          <DashCard eyebrow="Allocation" title="Where your capital works" subtitle="Each pocket, its protocol, its current rate — against the target you signed">
            <div className="flex flex-col gap-6">
              <AllocationBar vault={vault} detailed />
              <ul className="flex flex-col divide-y divide-[var(--ud-line)] border-t border-[var(--ud-line)]">
                {vault.pockets.map((p) => (
                  <li key={p.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_8rem]">
                    <span className="text-sm text-fg">{p.name}</span>
                    <span className="hidden text-sm text-fg-secondary sm:block">{p.protocol}</span>
                    <span className="text-right text-sm tabular-nums text-fg">{p.apyPct.toFixed(1)} %</span>
                    <span className="hidden text-right text-sm tabular-nums text-fg-tertiary sm:block">{usd(p.capitalUsd)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-fg-tertiary">
                When a pocket drifts more than ±{vault.allocation.bandBps / 100} pt from its target, Hearst rebalances it back — every move is approved and recorded.
              </p>
            </div>
          </DashCard>
        </BentoCard>
        <BentoCard span={4} bare>
          <DashCard eyebrow="Compute" title="Your share of the fleet" subtitle="The machines your mining pocket bought">
            <dl className="flex flex-col divide-y divide-[var(--ud-line)]">
              {[
                ['Hashrate', `${(vault.compute.hashrateThs / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} PH/s`],
                ['Machines', String(vault.compute.machines)],
                ['Share of the fleet', `${vault.compute.fleetSharePct} %`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-3 first:pt-0">
                  <dt className="text-sm text-fg-tertiary">{k}</dt>
                  <dd className="text-lg font-medium tabular-nums text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </DashCard>
        </BentoCard>
      </BentoGrid>

      <DashCard eyebrow="Rewards" title="Month by month" subtitle="What each pocket earned, converted into bitcoin at that month’s price">
        <RewardsTable rewards={rewards} />
      </DashCard>

      {vault.status === 'ACTIVE' ? (
        <DashCard eyebrow="Lockup" title="At the end of the lockup" subtitle="Tell us now — you can change your mind until the date">
          <div className="flex flex-col gap-5">
            <LockupBar vault={vault} />
            <EndOfTermChoice vaultId={vault.vaultId} value={vault.endOfTerm} />
            <p className="text-xs text-fg-tertiary">
              Receiving the reserve sends {btc(vault.reserveBtc)} (today) to your whitelisted wallet in bitcoin. Renewing opens a new vault at that day’s entry price.
            </p>
          </div>
        </DashCard>
      ) : (
        <Callout tone="info" title="This vault is closed">
          Its lockup ended and the reserve was returned to you in bitcoin.
        </Callout>
      )}
    </>
  )
}
