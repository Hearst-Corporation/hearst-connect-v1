import { Text } from '@/components/catalyst/text'

/**
 * Status de chargement admin — slot contenu du SidebarLayout Catalyst.
 * Status nommé « loading », distinct de vide / indisponible / erreur :
 * aucune figure placeholder.
 */
export default function AdminLoading() {
  return (
    <div
      className="flex min-h-36 items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <Text className="animate-pulse !mt-0 text-sm/6 tracking-wide text-fg-tertiary uppercase dark:text-fg-secondary">
        Loading…
      </Text>
    </div>
  )
}
