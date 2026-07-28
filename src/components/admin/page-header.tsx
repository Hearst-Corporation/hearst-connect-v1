import { BACKEND_ENDPOINTS } from '@/lib/backend/endpoints'
import { AdminBody, AdminCaption, AdminH1, adminTypography } from '@/components/admin/typography'
import clsx from 'clsx'

/**
 * En-tête de page admin : titre H1, contexte, endpoints consultés.
 */
export function PageHeader({
  title,
  description,
  endpointIds = [],
}: Readonly<{ title: string; description: string; endpointIds?: string[] }>) {
  const endpoints = BACKEND_ENDPOINTS.filter((endpoint) => endpointIds.includes(endpoint.id))

  return (
    <header className="border-b border-white/5 pb-6">
      <AdminH1>{title}</AdminH1>
      <AdminBody className="mt-2 max-w-3xl">{description}</AdminBody>
      {endpoints.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {endpoints.map((endpoint) => (
            <li
              key={endpoint.id}
              className={clsx(
                'rounded-md border border-white/10 bg-brand-surface-raised px-2.5 py-1',
                adminTypography.endpoint,
              )}
            >
              {endpoint.method} {endpoint.path}
            </li>
          ))}
        </ul>
      ) : null}
      {endpoints.length > 0 ? (
        <AdminCaption className="mt-2">Sources consultées par cette page</AdminCaption>
      ) : null}
    </header>
  )
}
