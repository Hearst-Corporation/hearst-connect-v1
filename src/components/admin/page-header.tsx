
/**
 * En-tête de page — un titre, et rien de plus qu'une ligne de contexte.
 *
 * La liste des routes backend qui alimentaient l'écran a été retirée : c'est
 * une information de développeur, pas de gestionnaire. La provenance réelle
 * d'un appel (chemin résolu, statut, requestId) reste consultable via
 * `EndpointSection`, en bas des pages qui en ont une.
 */
export function PageHeader({
  title,
  meta,
  description,
}: Readonly<{
  title: string
  meta?: string
  description?: string
}>) {
  const snapshot = meta ?? description

  return (
    <div className="space-y-2">
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

    </div>
  )
}
