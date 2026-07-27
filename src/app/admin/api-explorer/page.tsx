import { PageHeader } from '@/components/admin/page-header'
import { BACKEND_ENDPOINTS, type EndpointCategory } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import type { Metadata } from 'next'
import { ExplorerRow } from './explorer-row'

export const metadata: Metadata = { title: 'API Explorer' }
export const dynamic = 'force-dynamic'

const CATEGORY_TITLES: Record<EndpointCategory, string> = {
  probe: 'Sondes opérationnelles publiques',
  business: 'Données métier',
  'ai-context': 'Contexte IA — généré par le backend, jamais un fait de premier plan',
  keeper: 'Actions Keeper — exécutables uniquement depuis la page Keeper',
}

/** cURL d'exemple, jeton systématiquement expurgé. */
function curlFor(method: string, path: string, auth: string): string {
  const base = backendUrl() ?? '$HEARST_API_URL'
  const lines = [`curl -X ${method} '${base}${path}'`, `  -H 'Accept: application/json'`, `  -H 'X-Request-Id: <uuid>'`]
  if (auth !== 'public') lines.push(`  -H 'Authorization: Bearer <REDACTED>'`)
  return lines.join(' \\\n')
}

export default function ApiExplorerPage() {
  const categories = Object.keys(CATEGORY_TITLES) as EndpointCategory[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Explorer"
        description={`Registre complet des ${BACKEND_ENDPOINTS.length} endpoints du backend. Chaque lecture est appelable individuellement : aucun exemple statique n’est présenté comme une réponse exécutée.`}
      />

      {categories.map((category) => {
        const endpoints = BACKEND_ENDPOINTS.filter((endpoint) => endpoint.category === category)
        return (
          <section key={category} className="rounded-xl border border-white/10 bg-cockpit-card">
            <header className="flex items-baseline justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">{CATEGORY_TITLES[category]}</h2>
              <span className="text-xs text-zinc-500">{endpoints.length}</span>
            </header>
            {endpoints.map((endpoint) => (
              <ExplorerRow
                key={endpoint.id}
                endpoint={endpoint}
                curl={curlFor(endpoint.method, endpoint.path, endpoint.auth)}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}
