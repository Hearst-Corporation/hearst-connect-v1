import { callBackend, type BackendResult } from '@/lib/backend/client'
import { endpointById } from '@/lib/backend/endpoints'
import { AdminSection } from '@/components/admin/surfaces'
import { surfaceRaised } from '@/components/admin/surface'
import {
  EmptyState,
  EnvelopeMetaLine,
  ProblemState,
  RawJsonPanel,
  RequestMetadata,
  UnavailableState,
} from './truthful'

function EndpointBody({
  result,
  isEmpty,
  children,
}: Readonly<{
  result: BackendResult<unknown>
  isEmpty: boolean
  children?: (data: unknown) => React.ReactNode
}>) {
  if (!result.ok) {
    return (
      <>
        <UnavailableState state={result.state} />
        <ProblemState problem={result.problem} keeper={result.keeper} />
      </>
    )
  }

  if (isEmpty) {
    return <EmptyState reason="Le backend a répondu sans contenu pour cette ressource." />
  }

  return (
    <>
      {children ? children(result.data) : null}
      <RawJsonPanel data={result.data} />
    </>
  )
}

/**
 * Section de page adossée à UN endpoint du registre.
 *
 * Elle appelle le backend côté serveur et rend, dans l'ordre : le statut réel
 * de l'enveloppe, la trace d'appel, puis la donnée — ou l'état qui explique son
 * absence. Aucune page ne réinterprète le contrat pour son compte : tout passe
 * par ici, donc une seule lecture du contrat existe dans l'application.
 */
export async function EndpointSection({
  endpointId,
  title,
  params,
  children,
}: Readonly<{
  endpointId: string
  title?: string
  params?: Record<string, string | number>
  /** Rendu métier de la donnée reçue. Absent → seul le JSON brut est proposé. */
  children?: (data: unknown) => React.ReactNode
}>) {
  const endpoint = endpointById(endpointId)
  const result = await callBackend(endpointId, { params })

  const isEmpty =
    result.ok &&
    (result.data === null ||
      (Array.isArray(result.data) && result.data.length === 0) ||
      (typeof result.data === 'object' && result.data !== null && Object.keys(result.data).length === 0))

  return (
    <AdminSection
      title={title ?? endpoint.summary}
      description={`${endpoint.method} ${result.trace.path}`}
      actions={result.ok ? <EnvelopeMetaLine meta={result.meta} /> : undefined}
    >
      <div className={`${surfaceRaised} p-5`}>
        {endpoint.caveat ? (
          <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
            {endpoint.caveat}
          </p>
        ) : null}

        <EndpointBody result={result} isEmpty={isEmpty}>
          {children}
        </EndpointBody>

        <div className="mt-4 border-t border-zinc-950/5 pt-3 dark:border-white/5">
          <RequestMetadata trace={result.trace} />
        </div>
      </div>
    </AdminSection>
  )
}
