import { Text } from '@/components/catalyst/text'

/**
 * Admin loading status — content slot of the Catalyst SidebarLayout.
 * Named "loading" status, distinct from empty / unavailable / error:
 * no placeholder figure.
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
