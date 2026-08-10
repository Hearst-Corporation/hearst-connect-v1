'use client'

import { Input, InputGroup } from '@/components/catalyst/input'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Recherche clients du header — champ discret à gauche de l'avatar.
 *
 * Honnête par construction : elle ne « cherche » rien elle-même. Elle route
 * vers `/admin/clients?q=<texte>`, et l'annuaire (`ClientsDirectory`) filtre
 * côté client la donnée réelle qu'il a déjà chargée depuis le backend. Aucun
 * résultat n'est fabriqué ici, aucune requête n'est simulée.
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
