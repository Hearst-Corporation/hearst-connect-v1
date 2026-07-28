/**
 * En-tête page cockpit — structure HTML Qatar (h1 + méta snapshot).
 * `description` est accepté comme alias de `meta` pour les pages migrées.
 */
export function PageHeader({
  title,
  meta,
  description,
}: Readonly<{
  title: string
  meta?: string
  description?: string
  endpointIds?: string[]
}>) {
  const snapshot = meta ?? description

  return (
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
  )
}
