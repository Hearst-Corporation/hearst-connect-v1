import { callBackend } from '@/lib/backend/client'
import { endpointById } from '@/lib/backend/endpoints'
import {
  EmptyState,
  EnvelopeMetaLine,
  ProblemState,
  RawJsonPanel,
  RequestMetadata,
  UnavailableState,
} from './truthful'

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
    <section className="rounded-xl border border-white/10 bg-cockpit-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title ?? endpoint.summary}</h2>
          <p className="mt-0.5 font-mono text-xs text-zinc-500">
            {endpoint.method} {result.trace.path}
          </p>
        </div>
        {result.ok ? <EnvelopeMetaLine meta={result.meta} /> : null}
      </div>

      {endpoint.caveat ? (
        <p className="mt-3 rounded border border-hearst-warn/25 bg-hearst-warn/5 px-3 py-2 text-xs text-hearst-warn">
          {endpoint.caveat}
        </p>
      ) : null}

      <div className="mt-4">
        {!result.ok ? (
          <>
            <UnavailableState state={result.state} />
            <ProblemState problem={result.problem} keeper={result.keeper} />
          </>
        ) : isEmpty ? (
          <EmptyState reason="Le backend a répondu sans contenu pour cette ressource." />
        ) : (
          <>
            {children ? children(result.data) : null}
            <RawJsonPanel data={result.data} />
          </>
        )}
      </div>

      <div className="mt-4 border-t border-white/5 pt-3">
        <RequestMetadata trace={result.trace} />
      </div>
    </section>
  )
}
