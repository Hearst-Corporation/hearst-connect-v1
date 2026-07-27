import { BACKEND_ENDPOINTS } from '@/lib/backend/endpoints'

/**
 * En-tête de page admin : titre, contexte, et les endpoints réellement
 * consultés par la page — la provenance est annoncée avant la donnée.
 */
export function PageHeader({
  title,
  description,
  endpointIds = [],
}: Readonly<{ title: string; description: string; endpointIds?: string[] }>) {
  const endpoints = BACKEND_ENDPOINTS.filter((endpoint) => endpointIds.includes(endpoint.id))

  return (
    <header className="border-b border-white/10 pb-5">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-zinc-400">{description}</p>
      {endpoints.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {endpoints.map((endpoint) => (
            <li
              key={endpoint.id}
              className="rounded border border-white/10 bg-cockpit-inset px-2 py-0.5 font-mono text-xs text-zinc-400"
            >
              {endpoint.method} {endpoint.path}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  )
}
