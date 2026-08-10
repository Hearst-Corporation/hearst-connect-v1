'use client'

import { Input, InputGroup } from '@/components/catalyst/input'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Header client search — an unobtrusive field to the left of the avatar.
 *
 * Honest by construction: it never "searches" anything itself. It routes to
 * `/admin/clients?q=<text>`, and the directory (`ClientsDirectory`) filters,
 * client-side, the real data it has already loaded from the backend. No result
 * is fabricated here, no request is simulated.
 */
export function HeaderClientSearch() {
  const router = useRouter()
  const [value, setValue] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const q = value.trim()
    router.push(q === '' ? '/admin/clients' : `/admin/clients?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={submit} role="search" className="w-full">
      <InputGroup>
        <MagnifyingGlassIcon />
        <Input
          type="search"
          name="header-client-search"
          placeholder="Search clients…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Search clients"
        />
      </InputGroup>
    </form>
  )
}
