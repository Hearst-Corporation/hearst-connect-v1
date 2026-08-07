import { HearstIconAction, HearstPrimaryAction } from '@/components/actions'
import {
  DashboardKpiMetrics,
  type DashboardKpi,
} from '@/components/admin/dashboard/kpi-grid'
import { Heading } from '@/components/catalyst/heading'
import { Input, InputGroup } from '@/components/catalyst/input'
import { Text } from '@/components/catalyst/text'
import { LogoMark } from '@/components/logo'
import { CONSOLE_GLOW_SRC } from '@/lib/brand'
import {
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'

/**
 * Header pilotage unifié — pattern Tailwind UI « profile header » :
 * bandeau · cercle logo · greeting + actions · KPI intégrés (plus de 4 boxes).
 */
export function DashboardHeader({
  userName,
  kpis,
}: Readonly<{ userName: string; kpis: readonly DashboardKpi[] }>) {
  const firstName = userName.trim().split(/\s+/)[0] || userName

  return (
    <header data-dashboard="header">
      {/* Bandeau — fond lumineux de marque. */}
      <div className="overflow-hidden rounded-xl ring-1 ring-console-line-soft">
        <img
          alt=""
          src={CONSOLE_GLOW_SRC}
          className="h-28 w-full object-cover lg:h-40"
        />
      </div>

      <div className="px-1 sm:px-2">
        {/* Cercle logo qui chevauche le bandeau + titre + actions. */}
        <div className="-mt-12 sm:-mt-16 sm:flex sm:items-end sm:gap-5">
          <div className="flex">
            <span className="inline-flex size-24 items-center justify-center rounded-full bg-console-card ring-4 ring-console-app backdrop-blur-xl sm:size-32">
              <LogoMark className="size-12 sm:size-16" />
              <span className="sr-only">Hearst Connect</span>
            </span>
          </div>

          <div className="mt-6 min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:pb-1">
            <div className="min-w-0">
              <Heading className="truncate">Bonjour, {firstName}</Heading>
              <Text className="mt-1">
                Voici l’état des opérations de souscription aujourd’hui.
              </Text>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0">
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

              <HearstIconAction
                icon={<UserCircleIcon />}
                href="/admin/profile"
                aria-label="Votre compte"
              />

              <HearstPrimaryAction
                icon={<PlusIcon />}
                disabledReason="Création client non disponible côté backend"
              >
                Ajouter un client
              </HearstPrimaryAction>
            </div>
          </div>
        </div>

        {/* KPI — dans le même header, plus de rangée de boxes. */}
        <div className="mt-6 border-t border-console-line pt-6">
          <DashboardKpiMetrics items={kpis} />
        </div>
      </div>
    </header>
  )
}
