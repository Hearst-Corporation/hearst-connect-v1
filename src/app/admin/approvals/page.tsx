import { BtcReserveBalance } from '@/components/admin/btc-reserve-balance'
import { DashCard, DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { ApprovalsQueue } from '@/features/admin-approvals/approvals-queue'
import { requireSession } from '@/lib/auth'
import {
  loadAdminApprovals,
  loadAdminBtcReserve,
  loadAdminVaultRegistry,
} from '@/lib/admin-dashboard/load'
import { available, unavailable, valueOf } from '@/lib/vaults/model'
import { BanknotesIcon, ClockIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Decisions' }
export const dynamic = 'force-dynamic'

/**
 * Décisions — la contrepartie opérateur de l'écran client.
 *
 * Trois choses que le client demande et que seul l'admin accorde : agrandir son
 * vault, recevoir sa distribution, retirer ses fonds. Aucune n'avait d'écran en
 * face jusqu'ici — le produit laissait des boutons sans destinataire.
 *
 * La page porte aussi le registre des vaults dédiés (un par client, avec son
 * échéance de blocage) et le bilan de la réserve bitcoin, qui dit ce que le
 * minage retient réellement : rien.
 */
export default async function Page() {
  await requireSession()

  const [approvals, vaults, reserve] = await Promise.all([
    loadAdminApprovals(),
    loadAdminVaultRegistry(),
    loadAdminBtcReserve(),
  ])

  const pending = valueOf(approvals)
  const registry = valueOf(vaults)

  /** Vaults dont le terme tombe dans les trois mois — à relancer. */
  const dueSoon =
    registry === null
      ? null
      : registry.filter(
          (v) =>
            v.lockupMonths !== null &&
            v.lockupElapsedMonths !== null &&
            v.lockupMonths - v.lockupElapsedMonths <= 3,
        ).length

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'pending',
      title: 'Awaiting a decision',
      value: pending === null ? unavailable({ endpoint: '/api/v1/admin/approvals' }) : available(String(pending.length), { provenance: 'db', stale: false, asOf: null }),
      icon: ClockIcon,
    },
    {
      id: 'vaults',
      title: 'Dedicated vaults',
      value: registry === null ? unavailable({ endpoint: '/api/v1/admin/vaults/registry' }) : available(String(registry.length), { provenance: 'db', stale: false, asOf: null }),
      icon: BanknotesIcon,
    },
    {
      id: 'due',
      title: 'Lockups ending soon',
      value: dueSoon === null ? unavailable({ endpoint: '/api/v1/admin/vaults/registry' }) : available(String(dueSoon), { provenance: 'db', stale: false, asOf: null }),
      icon: CpuChipIcon,
    },
  ]

  const reserveValue = valueOf(reserve)

  return (
    <DashboardShell>
      <DashboardHeader
        title="Decisions"
        description="What clients are waiting on: deposit authorisations, distribution sign-offs, withdrawal requests. One vault per client — nothing is pooled."
        kpis={kpis}
      />

      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            className="min-w-0"
            title="Waiting on you"
            subtitle="Each kind carries its own commitment — they are never merged into one queue."
          >
            <ApprovalsQueue approvals={approvals} />
          </DashCard>
        </BentoCard>

        <BentoCard span={12}>
          <DashCard
            className="min-w-0"
            title="What happens to the bitcoin we mine?"
            subtitle="The product is sold as a strategic reserve. This is what the balance sheet holds."
          >
            <BtcReserveBalance
              balance={
                reserveValue === null ||
                reserveValue.producedSats === null ||
                reserveValue.retainedSats === null
                  ? null
                  : {
                      producedSats: reserveValue.producedSats,
                      retainedSats: reserveValue.retainedSats,
                      producedUsd: reserveValue.producedUsd,
                      electricityUsd: reserveValue.electricityUsd,
                    }
              }
            />
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
