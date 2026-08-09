import { Text } from '@/components/catalyst/text'

/**
 * Account loading — named status inside the shared shell slot.
 * No placeholder figures, no fabricated content.
 */
export default function AccountLoading() {
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
