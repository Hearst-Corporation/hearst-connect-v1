import { AdminPageHeader } from '@/components/admin/page-header'
import { Badge } from '@/components/catalyst/badge'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame, HearstDonutChart, type DonutSlice } from '@/components/charts'
import { DataTableShell, SectionCard, StatCard, StatGrid } from '@/components/compositions'
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

// Répartition du registre par catégorie : chaque point d'accès porte réellement
// ce champ (regroupement d'une donnée par ligne, pas un compteur inventé), et le
// total est réel (= nombre de points d'accès du registre).
const CATEGORY_LABELS: Record<BackendEndpoint['category'], string> = {
  probe: 'Sondes',
  business: 'Métier',
  'ai-context': 'Contexte IA',
  keeper: 'Actions Keeper',
}

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

function countBy(filter: (e: BackendEndpoint) => boolean): number {
  return BACKEND_ENDPOINTS.filter(filter).length
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

  // Parts d'un tout : les points d'accès regroupés par catégorie réelle.
  const parCategorie = new Map<BackendEndpoint['category'], number>()
  for (const endpoint of BACKEND_ENDPOINTS) {
    const vu = parCategorie.get(endpoint.category)
    parCategorie.set(endpoint.category, vu === undefined ? 1 : vu + 1)
  }
  const categorySlices: readonly DonutSlice[] = [...parCategorie.entries()]
    .map(([category, value]) => ({ label: CATEGORY_LABELS[category], value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Explorateur d’API"
        description="Inventaire du registre backend, groupé par type d’action. Les lectures sûres peuvent être appelées en direct ; aucun secret n’est rendu."
      />

      <StatGrid label="Inventaire du registre backend" columns={4}>
        <StatCard
          titre="Total des points d’accès"
          valeur={editorial(formatNumber(BACKEND_ENDPOINTS.length))}
          hint="Registre BACKEND_ENDPOINTS"
        />
        <StatCard
          titre="Lectures sûres"
          valeur={editorial(formatNumber(safeReadsCount))}
          hint="GET sans effet de bord"
        />
        <StatCard
          titre="Actions à effet de bord"
          valeur={editorial(formatNumber(actionsCount))}
          hint="POST Keeper, page Keeper"
        />
        <StatCard
          titre="Contexte IA"
          valeur={editorial(formatNumber(aiContextCount))}
          hint="Jamais un fait métier"
        />
        <StatCard titre="URL de base" valeur={editorial(baseUrlLabel)} hint="Cible HEARST_API_URL" />
        <StatCard titre="Rôle de session" valeur={editorial(libelleRole(session.role))} hint="Session courante" />
      </StatGrid>

      <ChartFrame
        question="Comment le registre se répartit-il par type d’action ?"
        unite="nombre de points d’accès, par catégorie"
        etat={{ type: 'tracee' }}
      >
        <HearstDonutChart slices={categorySlices} unit="points d’accès" />
      </ChartFrame>

      <SectionCard title="Ce qu’une ligne vous permet de faire" tone="plain">
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

      <DataTableShell
        title="Autorisation"
        description="Niveaux d’accès du registre, avec le nombre de points d’accès à chacun."
      >
        <TableHead>
          <TableRow>
            <TableHeader>Niveau</TableHeader>
            <TableHeader>Points d’accès</TableHeader>
            <TableHeader>Ce qu’il exige</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {AUTH_LEVELS.map((level) => (
            <TableRow key={level.auth}>
              <TableCell className="font-medium">{level.libelle}</TableCell>
              <TableCell className="tabular-nums">
                {formatNumber(countBy((e) => e.auth === level.auth))}
              </TableCell>
              <TableCell>{level.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      {GROUPS.map((group) => {
        const endpoints = BACKEND_ENDPOINTS.filter(group.filter)
        if (endpoints.length === 0) return null

        return (
          <SectionCard
            key={group.id}
            title={group.title}
            hint={group.description}
            actions={<Badge color="zinc">{formatNumber(endpoints.length)}</Badge>}
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

      <SectionCard title="Paramètres de chemin" tone="plain">
        <Text>
          Les lignes avec <span className="font-mono">:param</span> sont documentées mais pas appelables directement —
          la valeur légitime provient d’une réponse antérieure du backend.
        </Text>
      </SectionCard>
    </div>
  )
}
