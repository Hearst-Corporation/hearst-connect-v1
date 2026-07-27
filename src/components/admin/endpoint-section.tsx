import { callBackend, type BackendResult } from '@/lib/backend/client'
import { endpointById } from '@/lib/backend/endpoints'
import { EmptyState, EnvelopeMetaLine, ProblemState, RawJsonPanel, RequestMetadata, UnavailableState } from './truthful'

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
    <section className="border-t border-zinc-300 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-normal tracking-[-0.02em] text-black">{title ?? endpoint.summary}</h2>
          <p className="text-metadata mt-1 font-mono text-zinc-600">
            {endpoint.method} {result.trace.path}
          </p>
        </div>
        {result.ok ? <EnvelopeMetaLine meta={result.meta} /> : null}
      </div>

      {endpoint.caveat ? (
        <p className="border-warning-600 bg-warning-50 text-metadata text-warning-700 mt-4 border-l-2 px-4 py-3">
          {endpoint.caveat}
        </p>
      ) : null}

      <div className="mt-4">
        <EndpointBody result={result} isEmpty={isEmpty}>
          {children}
        </EndpointBody>
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-3">
        <RequestMetadata trace={result.trace} />
      </div>
    </section>
  )
}
