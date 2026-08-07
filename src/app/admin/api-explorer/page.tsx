import { AdminPageHeader } from '@/components/admin/page-header'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import { SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { BACKEND_ENDPOINTS, type BackendEndpoint, type EndpointAuth } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import { formatNumber } from '@/lib/format'
import { libelleRole } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import { ExplorerRow } from './explorer-row'

export const metadata: Metadata = { title: 'Explorateur d’API' }
export const dynamic = 'force-dynamic'

type ExplorerGroup = {
  id: string
  title: string
  description: string
  filter: (endpoint: BackendEndpoint) => boolean
}

const GROUPS: readonly ExplorerGroup[] = [
  {
    id: 'safe-reads',
    title: 'Lectures sûres',
    description: 'GET métier et sondes de santé — appeler l’une d’elles n’a aucun effet de bord.',
    filter: (e) => e.method === 'GET' && e.category !== 'ai-context',
  },
  {
    id: 'ai-context',
    title: 'Contexte IA',
    description: 'Généré par le backend — jamais un fait métier primaire.',
    filter: (e) => e.category === 'ai-context',
  },
  {
    id: 'actions',
    title: 'Actions à effet de bord',
    description:
      'POST Keeper, financiers comme administratifs. Ils sont listés ici pour référence et s’exécutent depuis les Actions Keeper, où chacun exige une confirmation explicite.',
    filter: (e) => e.category === 'keeper',
  },
]

const AUTH_LEVELS: readonly { auth: EndpointAuth; libelle: string; detail: string }[] = [
  { auth: 'public', libelle: 'Public', detail: 'Ni session ni jeton n’est nécessaire.' },
  { auth: 'session', libelle: 'Session', detail: 'Un investisseur ou administrateur connecté.' },
  { auth: 'admin', libelle: 'Administrateur', detail: 'Une session dont le rôle backend est admin.' },
]

function pathParamsOf(path: string): string[] {
  return [...path.matchAll(/:(\w+)/g)].map(([, name]) => name)
}

function curlFor(method: string, path: string, auth: string): string {
  const base = backendUrl() ?? '$HEARST_API_URL'
  const lines = [
    `curl -X ${method} '${base}${path}'`,
    `  -H 'Accept: application/json'`,
    `  -H 'X-Request-Id: <uuid>'`,
  ]
  if (auth !== 'public') lines.push(`  -H 'Authorization: Bearer <REDACTED>'`)
  return lines.join(' \\\n')
}

function countBy(filter: (e: BackendEndpoint) => boolean): string {
  return formatNumber(BACKEND_ENDPOINTS.filter(filter).length)
}

/**
 * Explorateur d’API — blocs de composition autour des lignes clientes.
 * Registre BACKEND_ENDPOINTS, sondes en direct via ExplorerRow.
 */
export default async function ApiExplorerPage() {
  const session = await requireSession()

  const safeReadsCount = countBy((e) => e.method === 'GET' && e.category !== 'ai-context')
  const aiContextCount = countBy((e) => e.category === 'ai-context')
  const actionsCount = countBy((e) => e.category === 'keeper')
  const baseUrlLabel = backendUrl() ?? 'HEARST_API_URL non défini'

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Explorateur d’API"
        description="Inventaire du registre backend, groupé par type d’action. Les lectures sûres peuvent être appelées en direct ; aucun secret n’est rendu."
      />

      <StatGrid label="Inventaire du registre backend" columns={3}>
        <StatCard titre="Total des points d’accès" valeur={editorial(formatNumber(BACKEND_ENDPOINTS.length))} />
        <StatCard titre="Lectures sûres" valeur={editorial(safeReadsCount)} />
        <StatCard titre="Contexte IA" valeur={editorial(aiContextCount)} />
        <StatCard titre="Actions" valeur={editorial(actionsCount)} />
        <StatCard titre="URL de base" valeur={editorial(baseUrlLabel)} />
        <StatCard titre="Rôle de session" valeur={editorial(libelleRole(session.role))} />
      </StatGrid>

      <SectionCard title="Ce qu’une ligne vous permet de faire">
        <Text>
          Une lecture sûre peut être appelée en direct depuis sa propre ligne. La réponse arrive avec son statut HTTP,
          sa durée et son identifiant de requête, et elle est affichée telle que le backend l’a renvoyée — rien n’est
          mis en cache, arrondi ni réécrit au retour.
        </Text>
        <Text className="mt-4">
          Deux types de ligne ne portent aucun bouton, et le disent plutôt que d’en offrir un qui ne pourrait jamais
          aboutir : un POST, qui relève des Actions Keeper et de son étape de confirmation, et un chemin contenant un{' '}
          <span className="font-mono">:parameter</span>, dont la valeur légitime provient d’une réponse antérieure
          plutôt que d’un champ de texte.
        </Text>
      </SectionCard>

      <SectionCard title="Autorisation">
        <DescriptionList>
          {AUTH_LEVELS.map((level) => (
            <div key={level.auth} className="contents">
              <DescriptionTerm>
                {level.libelle}{' '}
                <span className="font-normal text-zinc-500">
                  ({formatNumber(BACKEND_ENDPOINTS.filter((e) => e.auth === level.auth).length)})
                </span>
              </DescriptionTerm>
              <DescriptionDetails>{level.detail}</DescriptionDetails>
            </div>
          ))}
        </DescriptionList>
      </SectionCard>

      {GROUPS.map((group) => {
        const endpoints = BACKEND_ENDPOINTS.filter(group.filter)
        if (endpoints.length === 0) return null

        return (
          <SectionCard
            key={group.id}
            title={`${group.title} — ${formatNumber(endpoints.length)}`}
            hint={group.description}
          >
            <div className="overflow-hidden rounded-lg ring-1 ring-zinc-950/5 dark:ring-white/10">
              {endpoints.map((endpoint) => (
                <ExplorerRow
                  key={endpoint.id}
                  endpoint={endpoint}
                  curl={curlFor(endpoint.method, endpoint.path, endpoint.auth)}
                  pathParams={pathParamsOf(endpoint.path)}
                />
              ))}
            </div>
          </SectionCard>
        )
      })}

      <SectionCard title="Paramètres de chemin">
        <Text>
          Les lignes avec <span className="font-mono">:param</span> sont documentées mais pas appelables directement —
          la valeur légitime provient d’une réponse antérieure du backend.
        </Text>
      </SectionCard>
    </div>
  )
}
