import { DashCard, DashboardHeader, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Callout } from '@/components/compositions'
import { ReserveCompositionChart, type ReserveSplitPoint } from '@/features/admin-dashboard/book-charts'
import { InvestMoreButton, WithdrawButton } from '@/features/client-portal/controls'
import { loadActivity, loadOverview, loadRewards, loadWallets } from '@/features/client-portal/load'
import { ActivityRow, btc, monthLabel, OwnerCard, usd, VaultCard } from '@/features/client-portal/parts'
import { requireSession } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { editorial } from '@/lib/vaults/model'
import { ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, CircleStackIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

/**
 * OVERVIEW — ce qu'un client vient voir, dans l'ordre où il le cherche.
 *
 *   1. Sa réserve en bitcoin (tous ses vaults), sa valeur, son avance sur un
 *      simple achat, ce qu'il peut retirer — et ses deux gestes.
 *   2. Comment sa réserve s'est construite, mois après mois.
 *   3. Ce qui arrive (prochain reward, fins de blocage, retrait en cours) et
 *      la personne à appeler.
 *   4. Ses vaults, puis ses derniers mouvements.
 *
 * Un seul jeu de chiffres : le livre de chaque vault, le même que lit l'admin.
 */
export default async function OverviewPage() {
  await requireSession()
  const [overview, rewards, activity, wallets] = await Promise.all([loadOverview(), loadRewards(), loadActivity(), loadWallets()])

  if (overview === null) {
    return (
      <>
        <DashboardHeader title="Overview" description="Your Bitcoin Strategic Reserve" kpis={[]} />
        <Callout tone="warning" title="Your position could not be read">
          Nothing is shown rather than a guess. Your relationship manager can help in the meantime.
        </Callout>
      </>
    )
  }

  const { totals, vaults, owner, spotUsd } = overview
  const live = vaults.filter((v) => v.status === 'ACTIVE')
  const nextReward = live.map((v) => v.nextRewardAt).filter((x): x is string => x !== null).sort()[0] ?? null

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'reserve',
      title: 'Your bitcoin reserve',
      value: editorial(btc(totals.reserveBtc)),
      icon: CircleStackIcon,
      footnote: `≈ ${usd(totals.valueUsd)} at ${usd(spotUsd)} / BTC · ${live.length} vault${live.length === 1 ? '' : 's'}`,
    },
    {
      id: 'hodl',
      title: 'Ahead of buying bitcoin',
      value: editorial(`+${totals.vsHodlPct} %`),
      icon: ArrowTrendingUpIcon,
      footnote: `+${btc(totals.producedBtc)} produced on ${btc(totals.capitalBtc)} bought at entry`,
    },
    {
      id: 'available',
      title: 'Available to withdraw',
      value: editorial(btc(totals.availableBtc)),
      icon: BanknotesIcon,
      footnote:
        totals.pendingWithdrawalBtc > 0
          ? `${btc(totals.pendingWithdrawalBtc)} being withdrawn`
          : `${btc(totals.withdrawnBtc)} withdrawn to date`,
    },
    {
      id: 'next',
      title: 'Next reward',
      value: editorial(nextReward ? formatDate(nextReward) : '—'),
      icon: CalendarDaysIcon,
      footnote: overview.lastReward
        ? `Last: ${btc(overview.lastReward.btc)} for ${monthLabel(overview.lastReward.month)}`
        : 'After your first full month',
    },
  ]

  /* La réserve dans le temps : chaque versement converti à son entrée, plus les
     rewards crédités, mois après mois — par vault au survol. */
  const credited = (rewards ?? []).filter((r) => r.status !== 'pending' && r.status !== 'declined')
  const months = [...new Set([...vaults.map((v) => v.lockupStartAt.slice(0, 7)), ...credited.map((r) => r.month)])].sort()
  const all: string[] = []
  if (months.length > 0) {
    const d = new Date(`${months[0]}-01T00:00:00Z`)
    while (true) {
      const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      all.push(m)
      if (m >= months[months.length - 1]) break
      d.setUTCMonth(d.getUTCMonth() + 1)
    }
  }
  const points: ReserveSplitPoint[] = all.map((m) => {
    const open = vaults.filter((v) => v.lockupStartAt.slice(0, 7) <= m)
    const byVault = open.map((v) => ({
      label: v.label,
      value: v.capitalBtc + credited.filter((r) => r.vaultId === v.vaultId && r.month <= m).reduce((t, r) => t + r.btc, 0),
    }))
    return {
      month: m,
      deposits: open.reduce((t, v) => t + v.capitalBtc, 0),
      accumulated: credited.filter((r) => r.month <= m).reduce((t, r) => t + r.btc, 0),
      byClient: byVault,
    }
  })

  const coming = [
    ...(nextReward ? [{ at: nextReward, text: 'Monthly reward credited to your reserve' }] : []),
    ...live.map((v) => ({ at: v.lockupEndAt, text: `${v.label} — end of lockup` })),
  ].sort((a, b) => a.at.localeCompare(b.at))
  const inFlight = (activity ?? []).filter((a) => a.type === 'withdrawal' && (a.status === 'pending' || a.status === 'processing'))

  return (
    <>
      <DashboardHeader
        title={overview.client.name}
        description="Your Bitcoin Strategic Reserve — everything in bitcoin, one vault per deposit."
        kpis={kpis}
        action={
          <span className="flex flex-wrap gap-2">
            <InvestMoreButton ownerName={owner.name} />
            <WithdrawButton
              vaults={live.map((v) => ({ vaultId: v.vaultId, label: v.label, availableBtc: v.availableBtc }))}
              wallets={wallets ?? []}
              spotUsd={spotUsd}
            />
          </span>
        }
      />

      {/* Un retrait en cours se suit d'ici, étape par étape. */}
      {inFlight.length > 0 ? (
        <DashCard title="Withdrawal in progress" subtitle="Approved by Hearst, co-signed in Fireblocks, then confirmed on-chain">
          <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
            {inFlight.map((a) => (
              <ActivityRow key={a.id} item={a} withSteps />
            ))}
          </ul>
        </DashCard>
      ) : null}

      <BentoGrid>
        <BentoCard span={8} bare>
          <DashCard eyebrow="Reserve" title="How your reserve was built" subtitle="What your deposits bought at entry, and what the vaults have added since — in bitcoin">
            <ReserveCompositionChart points={points} />
          </DashCard>
        </BentoCard>
        <BentoCard span={4} bare>
          <DashCard eyebrow="Your contact" title="Relationship manager" subtitle="One person, who knows your vaults">
            <div className="flex h-full flex-col gap-6">
              <OwnerCard owner={owner} />
              <div className="flex flex-col gap-2 border-t border-[var(--ud-line)] pt-5">
                <p className="text-[11px] tracking-[0.12em] text-fg-tertiary uppercase">Coming up</p>
                <ul className="flex flex-col gap-2.5">
                  {coming.slice(0, 4).map((c) => (
                    <li key={c.text} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-fg-secondary">{c.text}</span>
                      <span className="shrink-0 text-xs tabular-nums text-fg-tertiary">{formatDate(c.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DashCard>
        </BentoCard>
      </BentoGrid>

      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <p className="text-[17px] font-medium text-fg">Your vaults</p>
          <PanelHeaderLink href="/account/vaults">All details</PanelHeaderLink>
        </div>
        <div className={`grid gap-4 ${vaults.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {vaults.map((v) => (
            <VaultCard key={v.vaultId} vault={v} href={`/account/vaults?vault=${encodeURIComponent(v.vaultId)}`} />
          ))}
        </div>
      </div>

      <DashCard
        eyebrow="Activity"
        title="Latest movements"
        subtitle="Deposits, monthly rewards and withdrawals"
        action={<PanelHeaderLink href="/account/activity">Full ledger</PanelHeaderLink>}
      >
        {activity === null ? (
          <p className="text-sm text-fg-tertiary">Your activity could not be read.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
            {activity.slice(0, 6).map((a) => (
              <ActivityRow key={a.id} item={a} />
            ))}
          </ul>
        )}
      </DashCard>
    </>
  )
}
