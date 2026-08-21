import { DashCard, DashboardHeader, DashboardShell, PanelHeaderLink, PanelState } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { AdminToneBadge, toneForKycStatus } from '@/components/admin/status-tone'
import { Badge } from '@/components/catalyst/badge'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { AdminTable, tableCol } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { kycStatusLabel, kycStepLabel } from '@/lib/labels'
import { dateLisible } from '@/lib/movements'
import { isAvailable, mapAvailability, measuredCount } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { DocumentTextIcon, QueueListIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance' }
export const dynamic = 'force-dynamic'

/**
 * Compliance — Som KYC status exceptions (read-only).
 * Hearst does not perform KYC and does not approve/reject files here.
 *
 * Cockpit shape: compact command bar (title + KPI strip), then ONE frozen
 * band for the queue — the box keeps its height whether the source is
 * unavailable, calm, or listing records; overflow scrolls inside.
 */

/**
 * Fixed panel slot (content area, px) — the box is FROZEN whether data is
 * loading, absent, or listed; taller queues scroll inside the box.
 */
const QUEUE_SLOT_CLASS = 'h-[592px] overflow-y-auto scrollbar-none'

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  const dossierCount = measuredCount(registry.compliance)
  const stages = mapAvailability(registry.compliance, (rows) =>
    formatNumber(new Set(rows.map((row) => row.stage)).size),
  )
  const reviews = isAvailable(registry.compliance) ? registry.compliance.value : null

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'files', title: 'Som KYC records', value: dossierCount, icon: DocumentTextIcon },
    { id: 'stages', title: 'Distinct stages', value: stages, icon: QueueListIcon },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title="Compliance"
        description="Partner KYC status from Som — read only. Hearst does not review or decide KYC here."
        kpis={kpis}
      />

      {/* Single band — the queue IS the page; links live on the title row. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            className="min-w-0"
            contentClassName={QUEUE_SLOT_CLASS}
            title="Som KYC status"
            subtitle="Provider: Som. No Hearst approval actions. Opened date is on the Updated title when relevant."
            action={
              <div className="flex shrink-0 items-center gap-4">
                {reviews !== null && reviews.length > 0 ? (
                  <Badge color="neutral">{`${reviews.length} record(s)`}</Badge>
                ) : null}
                <PanelHeaderLink href="/admin/clients">Client directory</PanelHeaderLink>
                <PanelHeaderLink href="/admin/runtime">Source health</PanelHeaderLink>
              </div>
            }
          >
            {reviews === null ? (
              <PanelState
                title="KYC status unavailable"
                detail="Som KYC records could not be read. Technical detail lives under Service."
              />
            ) : reviews.length === 0 ? (
              <PanelState title="No Som KYC exceptions in queue." />
            ) : (
              <AdminTable>
                <TableHead>
                  <TableRow>
                    <TableHeader className={tableCol.primary}>Client</TableHeader>
                    <TableHeader className={tableCol.primary}>Stage</TableHeader>
                    <TableHeader className={tableCol.status}>KYC</TableHeader>
                    <TableHeader className={tableCol.date}>Updated</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id} title={review.openedAt ? `Opened ${dateLisible(review.openedAt)}` : undefined}>
                      <TableCell className={tableCol.primary}>
                        <div className="truncate font-medium">{review.clientLabel}</div>
                      </TableCell>
                      <TableCell className={tableCol.primary}>
                        <div className="truncate">{kycStepLabel(review.stage)}</div>
                      </TableCell>
                      <TableCell className={tableCol.status}>
                        <AdminToneBadge tone={toneForKycStatus(review.kycStatus)}>
                          {kycStatusLabel(review.kycStatus)}
                        </AdminToneBadge>
                      </TableCell>
                      <TableCell className={tableCol.date}>{dateLisible(review.lastEventAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AdminTable>
            )}
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
