import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { AdminToneBadge, toneForKycStatus } from '@/components/admin/status-tone'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Callout, DataTableShell, tableCol } from '@/components/compositions'
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
 */

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
    <div className="space-y-8">
      <AdminPageHeader
        title="Compliance"
        description="Partner KYC status from Som — read only. Hearst does not review or decide KYC here."
        kpis={kpis}
      />

      {reviews === null ? (
        <Callout tone="warning" title="KYC status unavailable">
          Som KYC records could not be read. Technical detail lives under{' '}
          <Link href="/admin/runtime" className="underline">
            Service
          </Link>
          .
        </Callout>
      ) : (
        <DataTableShell
          title="Som KYC status"
          description="Provider: Som. No Hearst approval actions. Opened date is on the Updated title when relevant."
          count={reviews.length > 0 ? `${reviews.length} record(s)` : undefined}
          calme={reviews.length === 0 ? 'No Som KYC exceptions in queue.' : undefined}
        >
          {reviews.length > 0 ? (
            <>
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
            </>
          ) : null}
        </DataTableShell>
      )}

      <Text className="text-sm text-fg-secondary">
        Client directory:{' '}
        <Link href="/admin/clients" className="underline">
          Clients
        </Link>
        {' · '}
        Source health:{' '}
        <Link href="/admin/runtime" className="underline">
          Service
        </Link>
        .
      </Text>
    </div>
  )
}
