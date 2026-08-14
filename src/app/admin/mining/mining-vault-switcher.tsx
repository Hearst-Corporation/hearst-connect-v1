'use client'

import { Select } from '@/components/catalyst/select'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

export type MiningVaultOption = {
  readonly id: string
  readonly label: string
}

export function MiningVaultSwitcher({
  options,
  selectedId,
}: Readonly<{ options: readonly MiningVaultOption[]; selectedId: string | null }>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === '' || value === 'all') {
        params.delete('strategy')
      } else {
        params.set('strategy', value)
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [pathname, router, searchParams],
  )

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="mining-vault-switcher" className="text-sm font-medium text-fg-tertiary">
        RWA strategy
      </label>
      <Select
        id="mining-vault-switcher"
        disabled={isPending}
        value={selectedId ?? 'all'}
        onChange={(e) => handleChange(e.target.value)}
        className="w-auto min-w-[12rem]"
      >
        <option value="all">All strategies</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
