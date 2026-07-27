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
    <header className="grid gap-6 border-b border-zinc-300 pb-8 md:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)] md:items-end md:pb-10">
      <h1 className="text-headline text-black">{title}</h1>
      <p className="text-body max-w-xl text-zinc-600 md:justify-self-end">{description}</p>
      {endpoints.length > 0 ? (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 md:col-span-2">
          {endpoints.map((endpoint) => (
            <li key={endpoint.id} className="text-metadata border-t border-zinc-300 pt-2 font-mono text-zinc-600">
              {endpoint.method} {endpoint.path}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  )
}
