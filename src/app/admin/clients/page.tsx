import { AdminPageHeader } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import {
  StatCard,
  StatGrid,
  SectionCard,
  DataTableShell,
} from '@/components/compositions'
import { DATA_COVERAGE_ENTRY, VAULT_REGISTRY_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { etatSourceLisible } from '@/lib/mouvements'
import { editorial, isAvailable, mapAvailability, measuredCount } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

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

  const clientDirectory = mapAvailability(registry.clients, (rows) =>
    rows.length === 0 ? 'Annuaire vide' : `${rows.length} client(s)`,
  )
  const complianceDirectory = mapAvailability(registry.compliance, (rows) =>
    rows.length === 0 ? 'File vide' : `${rows.length} dossier(s)`,
  )
  const clientExceptions = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const clientCount = measuredCount(registry.clients)
  const reachableVaults = mapAvailability(registry.vaults, (rows) => formatNumber(rows.length))
  const clients = isAvailable(registry.clients) ? registry.clients.value : null

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Clients"
        description="Annuaire issu de GET /api/v1/clients (rôle admin). Une liste vide reste vide — aucune ligne inventée."
      />

      <StatGrid label="Indicateurs clients" columns={3}>
        <StatCard titre="Annuaire des clients" valeur={clientDirectory} showRoute />
        <StatCard titre="Clients recensés" valeur={clientCount} showRoute />
        <StatCard titre="Source de conformité" valeur={complianceDirectory} showRoute />
        <StatCard titre="Anomalies clients" valeur={clientExceptions} showRoute />
        <StatCard titre="Coffres joignables" valeur={reachableVaults} showRoute />
        <StatCard titre="Surface de couverture" valeur={editorial('Couverture des données')} />
      </StatGrid>

      {clients === null ? (
        <SectionCard title="Annuaire" hint="Source /api/v1/clients uniquement.">
          <Text>L’annuaire n’a pas pu être lu.</Text>
        </SectionCard>
      ) : clients.length === 0 ? (
        <DataTableShell
          title="Annuaire"
          description="Source /api/v1/clients uniquement."
          calme="Aucun investisseur en base pour cet annuaire."
        />
      ) : (
        <DataTableShell title="Annuaire" description="Source /api/v1/clients uniquement.">
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

      <SectionCard title="Manquant à la source">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {MISSING_FROM_SOURCE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Activité des sources">
        <DescriptionList>
          {registry.sources.slice(0, 6).map((source) => (
            <div key={source.endpointId} className="contents">
              <DescriptionTerm>{source.label}</DescriptionTerm>
              <DescriptionDetails>{etatSourceLisible(source.status)}</DescriptionDetails>
            </div>
          ))}
        </DescriptionList>
      </SectionCard>
    </div>
  )
}
