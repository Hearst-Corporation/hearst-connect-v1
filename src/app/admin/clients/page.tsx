import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Badge } from '@/components/catalyst/badge'
import { Button } from '@/components/catalyst/button'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { ChartFrame } from '@/components/charts'
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { DATA_COVERAGE_ENTRY, VAULT_REGISTRY_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { etatSourceLisible } from '@/lib/mouvements'
import { isAvailable, mapAvailability, measuredCount } from '@/lib/vaults/model'
import type { ClientIssue } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import {
  BuildingLibraryIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

const ISSUE_LABEL: Record<ClientIssue, string> = {
  NO_VAULT_ASSIGNED: 'Aucun coffre attribué',
  COMPLIANCE_REVIEW_PENDING: 'Revue de conformité en attente',
  VAULT_INACTIVE: 'Coffre inactif',
  DEPLOYMENT_BLOCKED: 'Déploiement bloqué',
  MISSING_INVESTOR_RECORD: 'Aucun dossier investisseur',
  NO_ACTIVE_STRATEGY: 'Aucune stratégie active',
}

const MISSING_FROM_SOURCE = [
  'Identifiant client sur chaque coffre (owner non porté par /vault)',
  'État de conformité joint dans la même ligne (voir /admin/conformite)',
] as const

/**
 * Clients — annuaire admin via GET /api/v1/clients.
 * Liste vide LIVE ≠ endpoint manquant.
 */
export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  // KPI dérivés de l'Availability réelle — jamais de valeur inventée, jamais de ?? 0.
  const complianceDirectory = mapAvailability(registry.compliance, (rows) =>
    rows.length === 0 ? 'File vide' : `${rows.length} dossier(s)`,
  )
  const clientExceptionCount = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const clientCount = measuredCount(registry.clients)
  const reachableVaults = mapAvailability(registry.vaults, (rows) => formatNumber(rows.length))

  const clients = isAvailable(registry.clients) ? registry.clients.value : null
  const exceptions = isAvailable(registry.clientExceptions) ? registry.clientExceptions.value : null

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'clients', title: 'Clients recensés', value: clientCount, icon: UsersIcon },
    { id: 'anomalies', title: 'Anomalies', value: clientExceptionCount, icon: ExclamationTriangleIcon },
    { id: 'vaults', title: 'Coffres joignables', value: reachableVaults, icon: BuildingLibraryIcon },
    {
      id: 'compliance',
      title: 'Conformité',
      value: complianceDirectory,
      unit: 'dossiers',
      icon: ClipboardDocumentCheckIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Clients"
        description="Annuaire des investisseurs et signaux clients issus du backend."
        kpis={kpis}
      />

      {/* ── PLACEHOLDER GRAPHIQUE : l'annuaire /api/v1/clients ne porte pas de
          série numérique traçable (id + libellé seulement). Le ChartFrame est
          donc rendu dans son état vide/indisponible selon l'Availability réelle,
          sans jamais fabriquer de série. ──────────────────────────────────── */}
      <ChartFrame
        question="Comment les clients se répartissent-ils dans le temps ?"
        unite="nombre de clients, par période"
        expectedSource={['GET /api/v1/clients']}
        etat={
          clients === null
            ? {
                type: 'indisponible',
                explication: 'La lecture de l’annuaire clients n’a pas abouti — aucune série ne peut être tracée.',
              }
            : {
                type: 'vide',
                explication:
                  'L’annuaire /api/v1/clients ne porte pas de série temporelle — aucune répartition à tracer aujourd’hui.',
              }
        }
      />

      {clients === null ? (
        <DataTableShell
          title="Annuaire"
          description="Source /api/v1/clients uniquement."
          source={{
            quoi: 'Annuaire clients',
            detail: 'La lecture de l’annuaire n’a pas abouti — aucune ligne ne peut être présentée.',
            requis: ['GET /api/v1/clients'],
          }}
        />
      ) : clients.length === 0 ? (
        <DataTableShell
          title="Annuaire"
          description="Source /api/v1/clients uniquement."
          calme="Aucun investisseur en base pour cet annuaire."
        />
      ) : (
        <DataTableShell
          title="Annuaire"
          description="Source /api/v1/clients uniquement."
          count={`${clients.length} client(s)`}
        >
          <TableHead>
            <TableRow>
              <TableHeader>Identifiant</TableHeader>
              <TableHeader>Libellé</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-mono text-sm">{client.id}</TableCell>
                <TableCell className="font-medium">{client.label}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      )}

      {exceptions === null ? (
        <Callout tone="warning" title="Anomalies clients illisibles">
          Les signaux clients n’ont pas pu être lus depuis le back-end.
        </Callout>
      ) : (
        <DataTableShell
          title="Anomalies clients"
          description="Signaux dérivés du dossier investisseur (GET /api/v1/dashboard)."
          count={exceptions.length > 0 ? `${exceptions.length} à traiter` : undefined}
          calme={exceptions.length === 0 ? 'Aucun signal client à traiter pour l’instant.' : undefined}
        >
          {exceptions.length > 0 ? (
            <>
              <TableHead>
                <TableRow>
                  <TableHeader>Client</TableHeader>
                  <TableHeader>Signal</TableHeader>
                  <TableHeader className="text-right">Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {exceptions.map((exception, index) => (
                  <TableRow key={exception.clientId ?? `${exception.issue}-${index}`}>
                    <TableCell className="font-medium">{exception.clientLabel}</TableCell>
                    <TableCell>
                      <Badge color="amber">{ISSUE_LABEL[exception.issue]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button plain href={exception.actionHref}>
                        {exception.actionLabel}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : null}
        </DataTableShell>
      )}

      <Text>
        Propriété des coffres : non portée par /vault — voir{' '}
        <Link href={VAULT_REGISTRY_ENTRY.href} className="underline">
          {VAULT_REGISTRY_ENTRY.libelle}
        </Link>
        {' · '}
        <Link href={DATA_COVERAGE_ENTRY.href} className="underline">
          {DATA_COVERAGE_ENTRY.libelle}
        </Link>
      </Text>

      <SectionCard title="Manquant à la source" tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {MISSING_FROM_SOURCE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <DataTableShell title="Activité des sources" description="Six sources les plus récentes.">
        <TableHead>
          <TableRow>
            <TableHeader>Source</TableHeader>
            <TableHeader>État</TableHeader>
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
    </div>
  )
}
