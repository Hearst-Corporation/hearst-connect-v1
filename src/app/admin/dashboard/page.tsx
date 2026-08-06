import { AdminPageHeader } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { ChartFrame, HearstActivityChart, RichDistributionChart, type PointActivite } from '@/components/charts'
import {
  Callout,
  DataTableShell,
  DashboardGrid,
  KpiGrid,
  ChartGrid,
  DashboardCard,
  FunnelPipeline,
  PriorityQueue,
  SectionCard,
  SourceHealthStrip,
  StatCard,
  Toolbar,
} from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { isAvailable, mapAvailability, measuredCount } from '@/lib/vaults/model'
import {
  buildFunnel,
  buildPriorityQueue,
  complianceDistribution,
  deploymentDistribution,
} from '@/lib/vaults/pilotage'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { MOVEMENT_WINDOW, movementCountTrend } from '@/lib/vaults/overview'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pilotage des souscriptions' }
export const dynamic = 'force-dynamic'

/**
 * Pilotage des souscriptions — le cockpit opérationnel canonique.
 *
 * Lit le même `AdminRegistry` que l’accueil `/admin` et projette le parcours
 * client réel : compte → KYC → wallet → dépôt → souscription → position.
 * Surface distincte du cockpit patrimoine — pas un remplacement d’Accueil.
 * Aucun champ n'est inventé — `src/lib/vaults/pilotage.ts` documente,
 * étape par étape, quand un mapping est un proxy plutôt qu'un champ direct.
 */

function firstAsOf(sources: readonly { asOf: string | null }[]): string | null {
  for (const source of sources) {
    if (source.asOf !== null) return source.asOf
  }
  return null
}

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  const funnel = buildFunnel(registry)
  const priorityQueue = buildPriorityQueue(registry)
  const priorityRows = mapAvailability(priorityQueue, (rows) => rows)

  const criticalCount = isAvailable(priorityQueue)
    ? priorityQueue.value.filter((r) => r.severity === 'critique').length
    : null
  const liveSources = registry.sources.filter((s) => s.status === 'LIVE').length
  const lastSync = firstAsOf(registry.sources)

  const clientsCount = measuredCount(registry.clients)
  const kycCount = mapAvailability(registry.compliance, (rows) => String(rows.filter((r) => r.stage !== 'termine').length))
  const walletsToCreate = mapAvailability(registry.clientExceptions, (rows) =>
    String(rows.filter((r) => r.issue === 'NO_VAULT_ASSIGNED').length),
  )
  const depositsCount = measuredCount(registry.movements)
  const subscriptionsAwaiting = mapAvailability(registry.deployments, (rows) =>
    String(rows.filter((d) => d.status === 'REQUESTED' || d.status === 'PENDING').length),
  )
  const transactionsFailed = mapAvailability(registry.deployments, (rows) =>
    String(rows.filter((d) => d.status === 'FAILED').length),
  )

  const trend = movementCountTrend(registry.movements)
  const trendPoints: PointActivite[] = isAvailable(trend)
    ? trend.value.map((p) => ({ label: p.label, value: p.value, detail: p.detail }))
    : []
  const trendEtat =
    !isAvailable(trend)
      ? ({ type: 'indisponible' as const, explication: 'Le journal des mouvements n\'est pas lisible - aucune courbe a tracer.' })
      : trendPoints.length < 2
        ? ({
            type: 'attendue' as const,
            explication: 'Moins de deux points ordonnes : une tendance n\'est pas encore lisible.',
          })
        : ({ type: 'tracee' as const })

  const complianceDist = complianceDistribution(registry.compliance)
  const deploymentDist = deploymentDistribution(registry.deployments)
  const distributionItems = [...complianceDist, ...deploymentDist]
  const distributionEtat =
    !isAvailable(registry.compliance) && !isAvailable(registry.deployments)
      ? ({
          type: 'indisponible' as const,
          explication: 'Ni la conformite ni les deploiements ne sont lisibles - aucune repartition a tracer.',
        })
      : distributionItems.length < 2
        ? ({
            type: 'attendue' as const,
            explication: 'Moins de deux etats distincts : la repartition n\'est pas encore lisible.',
          })
        : ({ type: 'tracee' as const })

  return (
    <DashboardGrid>
      <AdminPageHeader
        title="Pilotage des souscriptions"
        description="Vue opérationnelle des clients, KYC, wallets, dépôts et souscriptions."
      />

      <Toolbar label="État du cockpit">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatNumber(liveSources)}/{formatNumber(registry.sources.length)} sources en direct
          {lastSync !== null ? ` · dernière synchronisation ${lastSync}` : ''}
        </span>
        {criticalCount !== null ? (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {criticalCount > 0 ? `${formatNumber(criticalCount)} alerte(s) critique(s)` : 'Aucune alerte critique'}
          </span>
        ) : null}
        <Link
          href="/admin/client-simulator/new"
          className="rounded-md bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
        >
          Ajouter un client
        </Link>
      </Toolbar>

      <KpiGrid>
        <StatCard titre="Clients actifs" valeur={clientsCount} showRoute hint="GET /api/v1/clients" />
        <StatCard titre="KYC à traiter" valeur={kycCount} showRoute hint="GET /api/v1/compliance" />
        <StatCard titre="Wallets à créer" valeur={walletsToCreate} showRoute hint="Coffres non assignés" />
        <StatCard titre="Dépôts enregistrés" valeur={depositsCount} showRoute hint="GET /api/v1/series1/events" />
      </KpiGrid>

      <KpiGrid>
        <StatCard titre="Souscriptions en attente" valeur={subscriptionsAwaiting} showRoute hint="GET /api/v1/deployments" />
        <StatCard titre="Transactions en erreur" valeur={transactionsFailed} showRoute hint="Déploiements FAILED" />
      </KpiGrid>

      <SectionCard
        title="Funnel client"
        hint="Compte - KYC - wallet - depot - souscription - position. Chaque barre lit sa propre source ; une etape sans endpoint dedie le dit."
        tone="plain"
      >
        <FunnelPipeline steps={funnel} />
      </SectionCard>

      <SectionCard
        title="À traiter maintenant"
        hint="File classee par severite, derivee des dossiers de conformite et des deploiements reels."
        tone="plain"
      >
        <PriorityQueue
          rows={priorityRows}
          source={{
            quoi: 'Actions prioritaires',
            detail: 'Ni la conformite ni les deploiements ne repondent - aucune priorite ne peut etre calculee.',
            requis: ['GET /api/v1/compliance', 'GET /api/v1/deployments'],
          }}
          seeAllHref="/admin/conformite"
        />
      </SectionCard>

      <ChartGrid>
        <DashboardCard>
          <ChartFrame
            question="Activite 30 jours"
            unite="mouvements indexes par jour"
            etat={trendEtat}
          >
            {trendPoints.length >= 2 ? <HearstActivityChart points={trendPoints} unite="mouvements" /> : null}
          </ChartFrame>
        </DashboardCard>

        <DashboardCard>
          <ChartFrame
            question="Repartition des dossiers"
            unite="KYC et deploiements, par etat"
            etat={distributionEtat}
          >
            {distributionItems.length >= 2 ? <RichDistributionChart items={distributionItems} /> : null}
          </ChartFrame>
        </DashboardCard>
      </ChartGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Alertes critiques" tone="plain" hint="Transactions en echec et dossiers KYC les plus anciens.">
          {isAvailable(priorityQueue) && priorityQueue.value.some((r) => r.severity === 'critique') ? (
            <div className="space-y-3">
              {priorityQueue.value
                .filter((r) => r.severity === 'critique')
                .slice(0, 5)
                .map((row) => (
                  <Callout key={row.id} tone="danger" title={`${row.clientLabel} - ${row.status}`}>
                    {row.ageLabel}{' · '}
                    <Link href={row.actionHref} className="underline">
                      {row.actionLabel}
                    </Link>
                  </Callout>
                ))}
            </div>
          ) : (
            <Callout tone="success">Aucune alerte critique en file.</Callout>
          )}
        </SectionCard>

        <SectionCard title="État des sources" tone="plain" hint="Chaque source du registre, telle que rapportée.">
          <SourceHealthStrip
            sources={registry.sources.map((s) => ({ id: s.endpointId, label: s.label, status: s.status }))}
          />
        </SectionCard>
      </div>

      <DataTableShell
        title="File KYC"
        description="Client, anciennete, statut - cinq dossiers les plus anciens."
        calme={isAvailable(registry.compliance) && registry.compliance.value.length === 0 ? 'Aucun dossier KYC en file.' : undefined}
        source={
          !isAvailable(registry.compliance)
            ? { quoi: 'File KYC', detail: 'La conformite n\'est pas lisible.', requis: ['GET /api/v1/compliance'] }
            : undefined
        }
      >
        {isAvailable(registry.compliance) && registry.compliance.value.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Client</TableHeader>
                <TableHeader>Etape</TableHeader>
                <TableHeader>KYC</TableHeader>
                <TableHeader>Ouvert</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {registry.compliance.value.slice(0, 8).map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">{review.clientLabel}</TableCell>
                  <TableCell>{review.stage}</TableCell>
                  <TableCell>{review.kycStatus}</TableCell>
                  <TableCell className="text-zinc-500">{review.openedAt ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      <DataTableShell
        title="Wallets et coffres"
        description="Coffre, statut, derniere activite - registre complet des coffres assignes."
        calme={isAvailable(registry.vaults) && registry.vaults.value.length === 0 ? 'Aucun coffre enregistré.' : undefined}
        source={
          !isAvailable(registry.vaults)
            ? { quoi: 'Wallets et coffres', detail: 'Le registre des coffres n\'est pas lisible.', requis: ['GET /api/v1/vault'] }
            : undefined
        }
      >
        {isAvailable(registry.vaults) && registry.vaults.value.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Coffre</TableHeader>
                <TableHeader>Statut</TableHeader>
                <TableHeader>Derniere activite</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {registry.vaults.value.slice(0, 8).map((vault) => (
                <TableRow key={vault.id} href={`/admin/vaults/${encodeURIComponent(vault.id)}`}>
                  <TableCell className="font-medium">{vault.label}</TableCell>
                  <TableCell>{vault.status}</TableCell>
                  <TableCell className="text-zinc-500">
                    <AdminReading value={mapAvailability(vault.lastActivityAt, (v) => v)} emptyLabel="Inconnue" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      <DataTableShell
        title="Souscriptions et transactions"
        description="Client, statut, reference - huit deploiements les plus recents."
        calme={isAvailable(registry.deployments) && registry.deployments.value.length === 0 ? 'Aucune souscription enregistrée.' : undefined}
        source={
          !isAvailable(registry.deployments)
            ? { quoi: 'Souscriptions et transactions', detail: 'Le registre des deploiements n\'est pas lisible.', requis: ['GET /api/v1/deployments'] }
            : undefined
        }
      >
        {isAvailable(registry.deployments) && registry.deployments.value.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Client</TableHeader>
                <TableHeader>Statut</TableHeader>
                <TableHeader>Reference</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {registry.deployments.value.slice(0, 8).map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell className="font-medium">
                    <AdminReading value={deployment.clientLabel} emptyLabel="Client non identifié" />
                  </TableCell>
                  <TableCell>{deployment.status}</TableCell>
                  <TableCell className="text-zinc-500">{deployment.reference ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      <SectionCard title="Navigation rapide" tone="plain">
        <Text>
          <Link href="/admin/clients" className="underline">Clients</Link>
          {' · '}
          <Link href="/admin/conformite" className="underline">Ouvrir la file KYC</Link>
          {' · '}
          <Link href="/admin/vaults" className="underline">Coffres</Link>
          {' · '}
          <Link href="/admin/operations" className="underline">Opérations</Link>
          {' · '}
          <Link href="/admin/client-simulator/new" className="underline">Ajouter un client</Link>
        </Text>
      </SectionCard>
    </DashboardGrid>
  )
}
