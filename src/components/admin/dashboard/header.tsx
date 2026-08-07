import { HearstIconAction, HearstPrimaryAction } from '@/components/actions'
import { Heading } from '@/components/catalyst/heading'
import { Input, InputGroup } from '@/components/catalyst/input'
import { Text } from '@/components/catalyst/text'
import {
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'

/**
 * Header pilotage — Heading Catalyst + Input officiel + frontière d'actions Hearst.
 *
 * Les actions passent par `@/components/actions` (Catalyst `<Button>` + Motion),
 * jamais par un exemple Aceternity importé dans une route. Une action sans
 * endpoint reste visible mais `disabled` + tooltip (doctrine véracité, brief §8).
 * Accent primaire = mint Hearst (token), pas orange.
 */
export function DashboardHeader({ userName }: Readonly<{ userName: string }>) {
  const firstName = userName.trim().split(/\s+/)[0] || userName

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <Heading>Bonjour, {firstName}</Heading>
        <Text className="mt-2">Voici l’état des opérations de souscription aujourd’hui.</Text>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1 sm:max-w-xs">
          <InputGroup>
            <MagnifyingGlassIcon data-slot="icon" />
            <Input
              type="search"
              name="q"
              placeholder="Client, wallet, transaction…"
              disabled
              title="Recherche non branchée sur le backend"
              aria-label="Rechercher client, wallet ou transaction"
            />
          </InputGroup>
        </div>

        <HearstIconAction
          icon={<BellIcon />}
          disabledReason="Notifications non exposées"
          aria-label="Notifications"
        />

        <HearstIconAction icon={<UserCircleIcon />} href="/admin/profile" aria-label="Votre compte" />

        <HearstPrimaryAction
          icon={<PlusIcon />}
          disabledReason="Création client non disponible côté backend"
        >
          Ajouter un client
        </HearstPrimaryAction>
      </div>
    </header>
  )
}
