import { AdminPageHeader } from '@/components/admin/page-header'
import { Badge } from '@/components/catalyst/badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame } from '@/components/charts'
import { Callout, DataTableShell, SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { formatNumber } from '@/lib/format'
import { libelleRole } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
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
            satisfait ? 'text-zinc-950 dark:text-white' : 'text-amber-600 dark:text-amber-400',
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
    disabledReason = `Le rôle ${libelleRole(session.role)} ne donne pas accès aux actions Keeper.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL n’est pas défini : aucune requête ne peut être émise.'
  }

  const actionsDisponibles = disabledReason === null

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Actions Keeper" />

      <StatGrid label="État des actions Keeper" columns={4}>
        <StatCard
          titre="Actions exposées"
          valeur={editorial(formatNumber(keeperEndpoints.length))}
          hint="Routes keeper du registre backend"
        />
        <StatCard
          titre="Votre rôle"
          valeur={editorial(libelleRole(session.role))}
          hint={isAdmin ? 'Accès administrateur' : 'Rôle restreint'}
        />
        <StatCard
          titre="Adresse du service"
          valeur={editorial(backendConfigured ? 'Configuré' : 'Non défini')}
          hint="HEARST_API_URL"
        />
        <StatCard
          titre="Disponibilité"
          valeur={editorial(actionsDisponibles ? 'Actions disponibles' : 'Actions inertes')}
          hint="Rôle et service réunis"
        />
      </StatGrid>

      <ChartFrame
        question="Combien d’actions Keeper ont-elles été déclenchées dans le temps ?"
        unite="requêtes Keeper par jour"
        etat={{
          type: 'vide',
          explication:
            'Aucune série à tracer : ces routes journalisent une requête sans historique exploitable par cette console. Rien n’est fabriqué pour combler l’axe.',
        }}
      />

      <SectionCard title="Périmètre" hint="Ces routes journalisent une requête — elles ne signent rien.">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge color="zinc">Aucune signature on-chain</Badge>
          <Text className="!mt-0 font-medium text-zinc-950 dark:text-white">
            Aucune de ces routes ne signe une transaction
          </Text>
        </div>
        <Text className="mt-4">
          Le backend n’a aucun assistant d’écriture on-chain : ces routes journalisent une requête, elles ne
          produisent ni signature ni hash de transaction. Trois d’entre elles renvoient actuellement un HTTP 501 avec
          un <span className="font-mono">KeeperActionResult</span>. Cette console n’affichera jamais un hash
          fabriqué.
        </Text>
        <Text className="mt-4">
          Deux garde-fous supplémentaires côté backend : un quota de 5 requêtes par minute et par utilisateur, et le
          disjoncteur <span className="font-mono">KEEPER_ENABLED</span> — désactivé par défaut, il renvoie 503{' '}
          <span className="font-mono">NOT_CONFIGURED</span>.
        </Text>
      </SectionCard>

      <SectionCard title="Peuvent-elles s’exécuter maintenant ?">
        <DescriptionList>
          <Prerequisite libelle="Votre rôle" valeur={libelleRole(session.role)} satisfait={isAdmin} />
          <Prerequisite
            libelle="Adresse du service"
            valeur={backendConfigured ? 'Configuré' : 'Non défini'}
            satisfait={backendConfigured}
          />
        </DescriptionList>
        {disabledReason ? (
          <Callout tone="warning" title="Actions inertes" className="mt-4">
            {disabledReason}
          </Callout>
        ) : (
          <Text className="mt-4">
            Les deux prérequis sont satisfaits. Le service peut tout de même refuser un appel — son disjoncteur et son
            quota sont vérifiés de son côté, et sa réponse est affichée sous l’action qui l’a déclenché.
          </Text>
        )}
      </SectionCard>

      <DataTableShell
        title="Routes exposées"
        description="Registre backend, catégorie keeper. Chaque route est présentée telle qu’elle est déclarée — aucun endpoint inventé."
        count={`${formatNumber(keeperEndpoints.length)} routes`}
      >
        <TableHead>
          <TableRow>
            <TableHeader>Action</TableHeader>
            <TableHeader>Appel</TableHeader>
            <TableHeader>Réserve du contrat</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {keeperEndpoints.map((endpoint) => (
            <TableRow key={endpoint.id}>
              <TableCell className="font-medium">{endpoint.summary}</TableCell>
              <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {endpoint.method} {endpoint.path}
              </TableCell>
              <TableCell className="text-zinc-500 dark:text-zinc-400">{endpoint.caveat ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <SectionCard
        title="Actions"
        hint={`${formatNumber(keeperEndpoints.length)} routes exposées par le service. Rien ne quitte cette page tant que le mot CONFIRM n’a pas été saisi dans le champ propre à l’action.`}
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
