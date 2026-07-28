import { callBackend, type BackendResult } from '@/lib/backend/client'
import { endpointById } from '@/lib/backend/endpoints'
import { surfaceRaised } from '@/components/admin/surface'
import { AdminSurfaceTitle } from '@/components/admin/typography'
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
    return <EmptyState reason="The backend responded with no content for this resource." />
  }

  return (
    <>
      {children ? children(result.data) : null}
      <RawJsonPanel data={result.data} />
    </>
  )
}

/**
 * One endpoint from the registry, rendered as ONE card.
 *
 * It calls the backend server-side and renders, in order: the envelope's real
 * status, the call trace, then the data — or the state that explains its
 * absence. No page reinterprets the contract on its own: everything goes
 * through here, so only one reading of the contract exists in the app.
 *
 * ── Why a card and not a section ──────────────────────────────────────────
 * This used to render an `AdminSection` — an H2 with a rule above it —
 * wrapping a raised panel. Pages already group their endpoints under a
 * section of their own ("Raw Responses" on Runtime), so every probe arrived
 * as a section inside a section inside a panel, three frames deep before any
 * payload. It is now a single surface with a card title, which is what it
 * always was: one card the page places wherever its grid says.
 *
 * The caveat is a hairline note rather than a ringed callout for the same
 * reason — a box inside a box adds a border, not a warning.
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
  /** Business rendering of the received data. Absent → only the raw JSON is shown. */
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
    <section className={`${surfaceRaised} p-5`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <AdminSurfaceTitle>{title ?? endpoint.summary}</AdminSurfaceTitle>
          <p className="mt-1 font-mono text-xs/5 break-all text-zinc-500 dark:text-zinc-400">
            {endpoint.method} {result.trace.path}
          </p>
        </div>
        {result.ok ? (
          <div className="shrink-0">
            <EnvelopeMetaLine meta={result.meta} />
          </div>
        ) : null}
      </div>

      {endpoint.caveat ? (
        <p className="mb-4 border-l-2 border-warning-500/50 pl-3 text-xs/5 text-warning-700 dark:text-warning-300">
          {endpoint.caveat}
        </p>
      ) : null}

      <EndpointBody result={result} isEmpty={isEmpty}>
        {children}
      </EndpointBody>

      {/* The call trace closes the card as a caption, separated by space
          rather than by yet another rule. */}
      <div className="mt-4">
        <RequestMetadata trace={result.trace} />
      </div>
    </section>
  )
}
