import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Badge } from '@/components/catalyst/badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame } from '@/components/charts'
import { Callout, DataTableShell, SectionCard, tableCol } from '@/components/compositions'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { formatNumber } from '@/lib/format'
import { roleLabel } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import {
  CheckCircleIcon,
  CommandLineIcon,
  ServerIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { Metadata } from 'next'
import { KeeperForm } from './keeper-form'

export const metadata: Metadata = { title: 'Actions Keeper' }
export const dynamic = 'force-dynamic'

function Prerequisite({
  label,
  value,
  satisfait,
}: Readonly<{ label: string; value: string; satisfait: boolean }>) {
  return (
    <>
      <DescriptionTerm>{label}</DescriptionTerm>
      <DescriptionDetails>
        <span
          className={clsx(
            satisfait ? 'text-ink dark:text-fg' : 'text-warning-400',
          )}
        >
          {value}
        </span>
      </DescriptionDetails>
    </>
  )
}

/**
 * Keeper actions — composition blocks around the client forms.
 * The forms call the backend keeper routes; nothing is signed on-chain.
 */
export default async function KeeperPage() {
  const session = await requireSession()
  const keeperEndpoints = endpointsByCategory('keeper')

  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Role ${roleLabel(session.role)} does not grant access to Keeper actions.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL is not set — no request can be sent.'
  }

  const actionsDisponibles = disabledReason === null

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'actions',
      title: 'Exposed actions',
      value: editorial(formatNumber(keeperEndpoints.length)),
      icon: CommandLineIcon,
    },
    {
      id: 'role',
      title: 'Role',
      value: editorial(roleLabel(session.role)),
      icon: UserIcon,
    },
    {
      id: 'service',
      title: 'Service address',
      value: editorial(backendConfigured ? 'Configured' : 'Not set'),
      icon: ServerIcon,
    },
    {
      id: 'disponibilite',
      title: 'Availability',
      value: editorial(actionsDisponibles ? 'Actions available' : 'Actions inactive'),
      icon: CheckCircleIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Keeper actions"
        description="Keeper routes from the registry — logging only, no on-chain signature."
        kpis={kpis}
      />

      <ChartFrame
        question="How many Keeper actions were triggered over time?"
        unit="Keeper requests per day"
        state={{
          type: 'empty',
          explanation:
            'No series to plot — these routes log a request without history usable by this console. Nothing is fabricated to fill the axis.',
        }}
      />

      <SectionCard title="Scope" hint="These routes log a request — they sign nothing.">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge color="neutral">No on-chain signature</Badge>
          <Text className="!mt-0 font-medium text-ink dark:text-fg">
            None of these routes signs a transaction
          </Text>
        </div>
        <Text className="mt-4">
          The backend has no on-chain write assistant — these routes log a request, they produce
          neither a signature nor a transaction hash. Three of them currently return an HTTP 501 with
          a <span className="font-mono">KeeperActionResult</span>. This console will never display a
          fabricated hash.
        </Text>
        <Text className="mt-4">
          Two additional backend safeguards: a quota of 5 requests per minute per user, and the
          circuit breaker <span className="font-mono">KEEPER_ENABLED</span> — disabled by default, it returns 503{' '}
          <span className="font-mono">NOT_CONFIGURED</span>.
        </Text>
      </SectionCard>

      <SectionCard title="Can they run now?">
        <DescriptionList>
          <Prerequisite label="Your role" value={roleLabel(session.role)} satisfait={isAdmin} />
          <Prerequisite
            label="Service address"
            value={backendConfigured ? 'Configured' : 'Not set'}
            satisfait={backendConfigured}
          />
        </DescriptionList>
        {disabledReason ? (
          <Callout tone="warning" title="Inert actions" className="mt-4">
            {disabledReason}
          </Callout>
        ) : (
          <Text className="mt-4">
            Both prerequisites are met. The service may still refuse a call — its circuit breaker and its
            quota are checked on its side, and its response is shown under the action that triggered it.
          </Text>
        )}
      </SectionCard>

      <DataTableShell
        title="Exposed routes"
        description="Backend registry, keeper category. Each route is shown as declared — no invented endpoint."
        count={`${formatNumber(keeperEndpoints.length)} routes`}
      >
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.primary}>Action</TableHeader>
            <TableHeader className={tableCol.hash}>Call</TableHeader>
            <TableHeader className={tableCol.primary}>Contract reserve</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {keeperEndpoints.map((endpoint) => (
            <TableRow key={endpoint.id}>
              <TableCell className={tableCol.primary}>
                <div className="truncate font-medium">{endpoint.summary}</div>
              </TableCell>
              <TableCell className={`${tableCol.hash} text-xs text-fg-tertiary dark:text-fg-secondary`}>
                {endpoint.method} {endpoint.path}
              </TableCell>
              <TableCell className={`${tableCol.primary} text-fg-tertiary dark:text-fg-secondary`}>{endpoint.caveat ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <SectionCard
        title="Actions"
        hint={`${formatNumber(keeperEndpoints.length)} routes exposed by the service. Nothing leaves this page until CONFIRM is typed in the action-specific field.`}
      >
        <div className="grid gap-6 md:grid-cols-2">
          {keeperEndpoints.map((endpoint) => (
            <KeeperForm
              key={endpoint.id}
              endpoint={endpoint}
              disabled={Boolean(disabledReason)}
              disabledReason={disabledReason}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
