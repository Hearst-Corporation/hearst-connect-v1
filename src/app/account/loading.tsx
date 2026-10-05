import { Text } from '@hearst/ui/catalyst/text'

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
      <Text className="animate-pulse !mt-0 text-sm/6 tracking-wide uppercase text-(--ds-text-subtle)">
        Loading…
      </Text>
    </div>
  )
}
