import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Panel, Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { AdminSurfaceTitle } from '@/components/admin/typography'
import { requireSession } from '@/lib/auth'
import { BACKEND_ENDPOINTS, type BackendEndpoint, type EndpointAuth } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import { publicUser } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ExplorerRow } from './explorer-row'

export const metadata: Metadata = { title: 'Explorateur d’API' }
export const dynamic = 'force-dynamic'


function Card({ children, className = '' }: Readonly<{ children: ReactNode; className?: string }>) {
  return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
}

/**
 * API Explorer — the whole registry, as three lists.
 *
 * This is an inventory screen, and an inventory reads as a list. The rejected
 * version broke the twenty-six routes into four framed panels, one of which
 * held a single row: four boxes to say what one list says better. The
 * grouping that survives is the one a reader acts on — can I call this
 * safely, is this generated context, does this write something — and each
 * group is one card holding its rows, never one card per route.
 *
 * The reading key sits at the top on a declared 8 / 4 row: what a row lets
 * you do on the left, what each authorization level means on the right. Both
 * are read from the registry itself, which is this frontend's single source
 * of truth about the backend surface.
 */

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

/** The three authorization levels the registry declares, in ascending order. */
const AUTH_LEVELS: readonly { auth: EndpointAuth; libelle: string; detail: string }[] = [
  { auth: 'public', libelle: 'Public', detail: 'Ni session ni jeton n’est nécessaire.' },
  { auth: 'session', libelle: 'Session', detail: 'Un investisseur ou administrateur connecté.' },
  { auth: 'admin', libelle: 'Administrateur', detail: 'Une session dont le rôle backend est admin.' },
]

/**
 * A route whose path carries a `:name` parameter can't be called from the
 * Explorer: the legitimate value comes from a backend response, never from
 * user input. Reading it here avoids offering a button that can never succeed.
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

export default async function ApiExplorerPage() {
  const session = await requireSession()
  const user = publicUser(session)

  return (
    <ConsoleShell
      label="Poste de pilotage explorateur d’API Hearst Connect"
      rail={<ConsoleRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé explorateur d’API">
        <Panel className={gcc.metricCard}><h2>Total des points d’accès</h2><div className={gcc.metricText}><Reading value={editorial(String(BACKEND_ENDPOINTS.length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Lectures sûres</h2><div className={gcc.metricText}><Reading value={editorial(String(BACKEND_ENDPOINTS.filter((e) => e.method === 'GET' && e.category !== 'ai-context').length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Contexte IA</h2><div className={gcc.metricText}><Reading value={editorial(String(BACKEND_ENDPOINTS.filter((e) => e.category === 'ai-context').length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Actions</h2><div className={gcc.metricText}><Reading value={editorial(String(BACKEND_ENDPOINTS.filter((e) => e.category === 'keeper').length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>URL de base</h2><div className={gcc.metricText}><Reading value={editorial(backendUrl() ?? 'HEARST_API_URL non défini')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Explorateur <span>d’API</span></p>
          <p className={gcc.decisionMeta}>Registre groupé par type d’action</p>
          <p className={gcc.decisionActionMuted}>Aucun secret rendu</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Usage et autorisation de l’explorateur">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Explorateur d’API</h2></div>
          <div className={gcc.heroBody}>
      <AdminGrid>
        <AdminCol span={8}>
          <Card className="p-6">
            <AdminSurfaceTitle as="p">Ce qu’une ligne vous permet de faire</AdminSurfaceTitle>
            <p className="mt-3 max-w-prose text-sm/6 text-zinc-600 dark:text-zinc-300">
              Une lecture sûre peut être appelée en direct depuis sa propre ligne. La réponse arrive avec son statut
              HTTP, sa durée et son identifiant de requête, et elle est affichée telle que le backend l’a renvoyée — rien n’est mis en cache,
              arrondi ni réécrit au retour.
            </p>
            <p className="mt-2 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">
              Deux types de ligne ne portent aucun bouton, et le disent plutôt que d’en offrir un qui ne pourrait jamais aboutir : un
              POST, qui relève des Actions Keeper et de son étape de confirmation, et un chemin contenant un{' '}
              <span className="font-mono">:parameter</span>, dont la valeur légitime provient d’une réponse
              antérieure plutôt que d’un champ de texte.
            </p>
          </Card>
        </AdminCol>

        <AdminCol span={4} as="aside">
          <Card className="p-5">
            <AdminSurfaceTitle as="p">Autorisation</AdminSurfaceTitle>
            <dl className="mt-4 space-y-4">
              {AUTH_LEVELS.map((level) => (
                <div key={level.auth}>
                  <dt className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-zinc-950 dark:text-white">{level.libelle}</span>
                    <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                      {BACKEND_ENDPOINTS.filter((e) => e.auth === level.auth).length}
                    </span>
                  </dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {level.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </AdminCol>
      </AdminGrid>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Rôle de session</h3><p className={gcc.signalValue}>{session.role}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Source du registre</h3><p className={gcc.cellText}>`src/lib/backend/endpoints.ts`</p></Panel>
          <Panel className={gcc.signalCard}><h3>Exécution</h3><p className={gcc.cellText}>Les actions POST s’exécutent uniquement depuis les Actions Keeper.</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Groupes de points d’accès">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Groupes de points d’accès</h3></div>
          <div className={gcc.heroBody}>
      {GROUPS.map((group) => {
        const endpoints = BACKEND_ENDPOINTS.filter(group.filter)
        if (endpoints.length === 0) return null

        return (
          <AdminSection
            key={group.id}
            title={`${group.title} — ${endpoints.length}`}
            description={group.description}
          >
            {/* One card, one list. The rows already carry their own separator,
                so the card only clips them — it adds no second frame. */}
            <Card className="overflow-hidden">
              {endpoints.map((endpoint) => (
                <ExplorerRow
                  key={endpoint.id}
                  endpoint={endpoint}
                  curl={curlFor(endpoint.method, endpoint.path, endpoint.auth)}
                  pathParams={pathParamsOf(endpoint.path)}
                />
              ))}
            </Card>
          </AdminSection>
        )
      })}
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          {AUTH_LEVELS.map((level) => (
            <article key={level.auth} className={gcc.infoCell}>
              <h3>{level.libelle}</h3>
              <p className={gcc.cellText}>{level.detail}</p>
            </article>
          ))}
          <article className={gcc.infoCell}>
            <h3>Paramètres de chemin</h3>
            <p className={gcc.cellText}>Les lignes avec `:param` sont documentées mais pas appelables directement.</p>
          </article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Usage</h3>
          <p className={gcc.cellText}>Les lectures en direct affichent le statut, la durée et l’identifiant de requête de la réponse du backend.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
