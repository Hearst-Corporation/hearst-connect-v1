/**
 * En-tête page cockpit — structure HTML Qatar (h1 + méta snapshot, sans description).
 */
export function PageHeader({
  title,
  meta,
}: Readonly<{
  title: string
  meta?: string
  /** Conservé pour compatibilité — non affiché (forme Qatar). */
  description?: string
  endpointIds?: string[]
}>) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h1 className="truncate text-xl/7 font-semibold tracking-tight text-zinc-950 dark:text-white">{title}</h1>
      </div>
      {meta ? (
        <div className="flex min-w-0 items-center gap-3">
          <p className="text-xs text-balance text-zinc-500 dark:text-zinc-400">{meta}</p>
        </div>
      ) : null}
    </div>
  )
}
