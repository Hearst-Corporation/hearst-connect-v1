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
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
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
  libelle,
  valeur,
  satisfait,
}: Readonly<{ libelle: string; valeur: string; satisfait: boolean }>) {
  return (
    <>
      <DescriptionTerm>{libelle}</DescriptionTerm>
      <DescriptionDetails>
        <span
          className={clsx(
            satisfait ? 'text-ink dark:text-fg' : 'text-warning-400',
          )}
        >
          {valeur}
        </span>
      </DescriptionDetails>
    </>
  )
}

/**
 * Actions Keeper — blocs de composition autour des formulaires clients.
 * Les formulaires appellent les routes keeper du backend ; rien n’est signé on-chain.
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
        title="Actions Keeper"
        description="Routes keeper du registre — journalisation seule, sans signature on-chain."
        kpis={kpis}
      />

      <ChartFrame
        question="How many Keeper actions were triggered over time?"
        unite="Keeper requests per day"
        etat={{
          type: 'empty',
          explication:
            'No series to plot — these routes log a request without history usable by this console. Nothing is fabricated to fill the axis.',
        }}
      />

      <SectionCard title="Scope" hint="These routes log a request — they sign nothing.">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge color="neutral">Aucune signature on-chain</Badge>
          <Text className="!mt-0 font-medium text-ink dark:text-fg">
            Aucune de ces routes ne signe une transaction
          </Text>
        </div>
        <Text className="mt-4">
          The backend has no on-chain write assistant — these routes log a request, they do not
          produisent ni signature ni hash de transaction. Trois d’entre elles renvoient actuellement un HTTP 501 avec
          un <span className="font-mono">KeeperActionResult</span>. Cette console n’affichera jamais un hash
          fabricated.
        </Text>
        <Text className="mt-4">
          Two additional backend safeguards: a quota of 5 requests per minute per user, and the
          circuit breaker <span className="font-mono">KEEPER_ENABLED</span> — disabled by default, it returns 503{' '}
          <span className="font-mono">NOT_CONFIGURED</span>.
        </Text>
      </SectionCard>

      <SectionCard title="Can they run now?">
        <DescriptionList>
          <Prerequisite libelle="Your role" valeur={roleLabel(session.role)} satisfait={isAdmin} />
          <Prerequisite
            libelle="Adresse du service"
            valeur={backendConfigured ? 'Configured' : 'Not set'}
            satisfait={backendConfigured}
          />
        </DescriptionList>
        {disabledReason ? (
          <Callout tone="warning" title="Actions inertes" className="mt-4">
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
        fit
        title="Exposed routes"
        description="Backend registry, keeper category. Each route is shown as declared — no invented endpoint."
        count={`${formatNumber(keeperEndpoints.length)} routes`}
      >
        <TableHead>
          <TableRow>
            <TableHeader className="w-[36%]">Action</TableHeader>
            <TableHeader className="w-[34%]">Call</TableHeader>
            <TableHeader className="w-[30%]">Contract reserve</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {keeperEndpoints.map((endpoint) => (
            <TableRow key={endpoint.id}>
              <TableCell className="font-medium">{endpoint.summary}</TableCell>
              <TableCell className="font-mono text-xs text-fg-tertiary dark:text-fg-secondary">
                {endpoint.method} {endpoint.path}
              </TableCell>
              <TableCell className="text-fg-tertiary dark:text-fg-secondary">{endpoint.caveat ?? '—'}</TableCell>
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
