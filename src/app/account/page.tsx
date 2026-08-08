import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account' }

/**
 * Empty user workspace — shell only.
 * Business content is intentionally absent until confirmed needs land.
 */
export default function AccountPage() {
  return (
    <div className="min-w-0">
      <h1 className="sr-only">Account</h1>
    </div>
  )
}
