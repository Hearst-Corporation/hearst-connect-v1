import { PageHeader } from '@/components/admin/page-header'
import { AdminSection, AdminSurface } from '@/components/admin/surfaces'
import { BACKEND_ENDPOINTS, type BackendEndpoint } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import type { Metadata } from 'next'
import { ExplorerRow } from './explorer-row'

export const metadata: Metadata = { title: 'API Explorer' }
export const dynamic = 'force-dynamic'

type ExplorerGroup = {
  id: string
  title: string
  description: string
  filter: (endpoint: BackendEndpoint) => boolean
}

const GROUPS: ExplorerGroup[] = [
  {
    id: 'safe-reads',
    title: 'Lectures sûres',
    description: 'GET métier et sondes — sans effet de bord',
    filter: (e) => e.method === 'GET' && e.category !== 'ai-context',
  },
  {
    id: 'ai-context',
    title: 'Contexte IA',
    description: 'Généré par le backend — jamais un fait métier de premier plan',
    filter: (e) => e.category === 'ai-context',
  },
  {
    id: 'financial-actions',
    title: 'Actions financières',
    description: 'POST keeper avec impact opérationnel — exécution depuis Keeper',
    filter: (e) =>
      e.category === 'keeper' &&
      ['keeper-mining-report', 'keeper-electricity-pay', 'keeper-rebalancing-execute', 'keeper-btc-deposit-initiate', 'keeper-btc-deposit-complete'].includes(e.id),
  },
  {
    id: 'admin-actions',
    title: 'Actions administratives',
    description: 'POST keeper administratif — confirmation explicite requise',
    filter: (e) => e.category === 'keeper' && e.id === 'keeper-rwa-vault',
  },
]

/**
 * Une route dont le chemin porte un paramètre `:nom` ne peut pas être appelée
 * depuis l'Explorer : la valeur légitime vient d'une réponse backend, jamais
 * d'une saisie. La lire ici évite de proposer un bouton qui ne peut aboutir.
 */
function pathParamsOf(path: string): string[] {
  return [...path.matchAll(/:(\w+)/g)].map(([, name]) => name)
}

function curlFor(method: string, path: string, auth: string): string {
  const base = backendUrl() ?? '$HEARST_API_URL'
  const lines = [`curl -X ${method} '${base}${path}'`, `  -H 'Accept: application/json'`, `  -H 'X-Request-Id: <uuid>'`]
  if (auth !== 'public') lines.push(`  -H 'Authorization: Bearer <REDACTED>'`)
  return lines.join(' \\\n')
}

export default function ApiExplorerPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="API Explorer"
        description={`Registre des ${BACKEND_ENDPOINTS.length} endpoints. Lectures et actions classées — aucun secret affiché.`}
      />

      {GROUPS.map((group) => {
        const endpoints = BACKEND_ENDPOINTS.filter(group.filter)
        if (endpoints.length === 0) return null

        return (
          <AdminSection key={group.id} title={group.title} description={group.description}>
            <AdminSurface>
              {endpoints.map((endpoint) => (
                <ExplorerRow
                  key={endpoint.id}
                  endpoint={endpoint}
                  curl={curlFor(endpoint.method, endpoint.path, endpoint.auth)}
                  pathParams={pathParamsOf(endpoint.path)}
                />
              ))}
            </AdminSurface>
          </AdminSection>
        )
      })}
    </div>
  )
}
