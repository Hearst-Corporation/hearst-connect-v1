import { BACKEND_ENDPOINTS, type BackendEndpoint } from '@/lib/backend/endpoints'
import { adminTypography } from '@/components/admin/typography'

/**
 * En-tête page cockpit — structure HTML Qatar (h1 + méta snapshot + sources).
 * `description` est accepté comme alias de `meta` pour les pages migrées.
 *
 * POURQUOI les endpoints ici : l'en-tête doit annoncer d'où vient l'écran —
 * quelles routes backend l'alimentent — avant même que la donnée arrive. C'est
 * une déclaration de provenance, pas un détail d'appel : la trace réelle
 * (chemin résolu, statut, requestId) reste le travail d'`EndpointSection`, en
 * bas de page. On ne rend donc que `méthode + chemin du registre`.
 *
 * POURQUOI ne pas passer par `endpointById` : cette fonction LÈVE sur un id
 * inconnu. Une faute de frappe dans une page ferait exploser toute la console
 * au rendu serveur. Un id absent du registre est ici silencieusement ignoré :
 * l'en-tête est un affichage secondaire, il ne doit jamais casser un écran.
 */
function knownEndpoints(ids: readonly string[]): BackendEndpoint[] {
  return ids
    .map((id) => BACKEND_ENDPOINTS.find((endpoint) => endpoint.id === id))
    .filter((endpoint): endpoint is BackendEndpoint => endpoint !== undefined)
}

export function PageHeader({
  title,
  meta,
  description,
  endpointIds,
}: Readonly<{
  title: string
  meta?: string
  description?: string
  endpointIds?: readonly string[]
}>) {
  const snapshot = meta ?? description
  const endpoints = endpointIds ? knownEndpoints(endpointIds) : []

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl/7 font-semibold tracking-tight text-zinc-950 dark:text-white">{title}</h1>
        </div>
        {snapshot ? (
          <div className="flex min-w-0 items-center gap-3">
            <p className="text-xs text-balance text-zinc-500 dark:text-zinc-400">{snapshot}</p>
          </div>
        ) : null}
      </div>

      {endpoints.length > 0 ? (
        <ul className={`${adminTypography.endpoint} flex flex-wrap items-baseline gap-x-3 gap-y-1`}>
          {endpoints.map((endpoint) => (
            <li key={endpoint.id} className="min-w-0 break-all" title={endpoint.summary}>
              <span className="text-zinc-600 dark:text-zinc-300">{endpoint.method}</span> {endpoint.path}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
