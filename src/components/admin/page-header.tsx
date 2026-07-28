import { AdminPageDescription, AdminPageTitle } from '@/components/admin/typography'

/**
 * Page header — a title, and a description beneath it, nothing more.
 *
 * The list of backend routes feeding the screen was removed: that's
 * developer information, not manager information. The real provenance of a
 * call (resolved path, status, requestId) stays available via
 * `EndpointSection`, at the bottom of pages that have one.
 */
export function PageHeader({
  title,
  description,
  compact = false,
}: Readonly<{
  title: string
  description?: string
  compact?: boolean
}>) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {compact ? (
        <AdminPageTitle className="text-xl/7 sm:text-2xl/8">{title}</AdminPageTitle>
      ) : (
        <AdminPageTitle>{title}</AdminPageTitle>
      )}
      {description ? <AdminPageDescription className="max-w-3xl text-balance">{description}</AdminPageDescription> : null}
    </div>
  )
}
