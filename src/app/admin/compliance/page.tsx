import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame, HearstDonutChart, type DonutSlice } from '@/components/charts'
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { DATA_COVERAGE_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { kycStatusLabel, kycStepLabel } from '@/lib/labels'
import { dateLisible, etatSourceLisible } from '@/lib/mouvements'
import { isAvailable, mapAvailability, measuredCount } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  SignalIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance' }
export const dynamic = 'force-dynamic'

const SEGMENTS = [
  { id: 'to-review', label: 'To review', hint: 'File received, review not started' },
  { id: 'pending', label: 'Pending', hint: 'Document or response awaited from client' },
  { id: 'high-risk', label: 'High risk', hint: 'Sanctions, PEP, or adverse media signal' },
  { id: 'to-renew', label: 'To renew', hint: 'Verification has reached its expiry' },
  { id: 'completed', label: 'Completed', hint: 'Decision rendered and logged' },
] as const

const MISSING_FROM_SOURCE = [
  'Detail: beneficial owners, documents, sanctions and PEP checks',
  'Decision actions only if exposed by the backend',
  'Analyst assignment and decision log',
] as const

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  const queueSource = mapAvailability(registry.compliance, (rows) =>
    rows.length === 0 ? 'Empty queue' : `${rows.length} file(s) in queue`,
  )
  const clientExceptions = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const dossierCount = measuredCount(registry.compliance)
  const stages = mapAvailability(registry.compliance, (rows) =>
    formatNumber(new Set(rows.map((row) => row.stage)).size),
  )
  const reviews = isAvailable(registry.compliance) ? registry.compliance.value : null

  const parKyc = new Map<string, number>()
  for (const review of reviews ?? []) {
    const vu = parKyc.get(review.kycStatus)
    parKyc.set(review.kycStatus, vu === undefined ? 1 : vu + 1)
  }
  const kycSlices: readonly DonutSlice[] = [...parKyc.entries()]
    .map(([code, value]) => ({ label: kycStatusLabel(code), value }))
    .sort((a, b) => b.value - a.value)

  const reviewCount = isAvailable(dossierCount) ? `${dossierCount.value} file(s)` : undefined
  const sourceCount = `${formatNumber(registry.sources.length)} source(s)`

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'files', title: 'Files', value: dossierCount, icon: DocumentTextIcon },
    { id: 'stages', title: 'Stages', value: stages, icon: QueueListIcon },
    { id: 'anomalies', title: 'Anomalies', value: clientExceptions, icon: ExclamationTriangleIcon },
    { id: 'source', title: 'Source', value: queueSource, icon: SignalIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Compliance"
        description="KYC review queue and file journeys from the backend."
        kpis={kpis}
      />

      <ChartFrame
        question="How is the queue split by KYC status?"
        unite="file count, by status"
        expectedSource={['GET /api/v1/compliance']}
        etat={
          reviews === null
            ? { type: 'unavailable', explication: 'Compliance files could not be read.' }
            : reviews.length === 0
              ? { type: 'empty', explication: 'The review queue is empty — nothing to split for now.' }
              : kycSlices.length < 2
                ? {
                    type: 'empty',
                    explication:
                      'Only one KYC status in queue: a split only makes sense from two onward. See the table below.',
                  }
                : { type: 'plotted' }
        }
      >
        {reviews !== null && kycSlices.length >= 2 ? (
          <HearstDonutChart slices={kycSlices} unit="files" />
        ) : null}
      </ChartFrame>

      {reviews === null ? (
        <Callout tone="warning" title="Review queue unreadable">
          The compliance queue could not be read.
        </Callout>
      ) : (
        <DataTableShell
          title="Review queue"
          description="Source /api/v1/compliance only."
          count={reviewCount}
          calme={reviews.length === 0 ? 'No KYC files in queue for now.' : undefined}
        >
          {reviews.length > 0 ? (
            <>
              <TableHead>
                <TableRow>
                  <TableHeader>Client</TableHeader>
                  <TableHeader>Stage</TableHeader>
                  <TableHeader>KYC</TableHeader>
                  <TableHeader>Opened</TableHeader>
                  <TableHeader>Last event</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.clientLabel}</TableCell>
                    <TableCell>{kycStepLabel(review.stage)}</TableCell>
                    <TableCell>{kycStatusLabel(review.kycStatus)}</TableCell>
                    <TableCell>{dateLisible(review.openedAt)}</TableCell>
                    <TableCell>{dateLisible(review.lastEventAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : null}
        </DataTableShell>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="File journey" hint="UI definition — not counters." tone="plain">
          <ul className="list-disc space-y-1 pl-5 text-sm/6 text-fg-tertiary">
            {SEGMENTS.map((segment, index) => (
              <li key={segment.id}>
                {index + 1}. {segment.label} · {segment.hint}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Missing at source" hint="What /api/v1/compliance does not expose yet." tone="plain">
          <ul className="list-disc space-y-1 pl-5 text-sm/6 text-fg-tertiary">
            {MISSING_FROM_SOURCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <DataTableShell
        title="Source activity"
        description="Six most recent sources."
        count={sourceCount}
      >
        <TableHead>
          <TableRow>
            <TableHeader>Source</TableHeader>
            <TableHeader>State</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {registry.sources.slice(0, 6).map((source) => (
            <TableRow key={source.endpointId}>
              <TableCell className="font-medium">{source.label}</TableCell>
              <TableCell>{etatSourceLisible(source.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <Text>
        <Link href={DATA_COVERAGE_ENTRY.href} className="underline">
          {DATA_COVERAGE_ENTRY.label}
        </Link>
        {' · '}
        <Link href="/admin/operations" className="underline">
          Operations
        </Link>
        {' · '}
        <Link href="/admin/clients" className="underline">
          Clients
        </Link>
      </Text>
    </div>
  )
}
