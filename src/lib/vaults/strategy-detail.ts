import 'server-only'

import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { etatSourceLisible } from '@/lib/mouvements'
import { statutAffichage } from '@/lib/statut-affichage'
import { editorial, mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'

type Resolu<T> = Readonly<{
  status?: string
  value: T | null
  reason?: string | null
}>

function blocNormalise<T>(field: Resolu<T> | undefined): { status: string; value: T | null; reason?: string | null } | undefined {
  if (field === undefined) return undefined
  return { status: field.status ?? 'UNAVAILABLE', value: field.value, reason: field.reason }
}

export type StrategyDetailReponse = Readonly<{
  strategy?: Resolu<Record<string, unknown>>
}>

const ENDPOINT = '/api/v1/strategies/:index'

/** Index contractuel : première stratégie du registre coffre (position 0). */
export function indexStrategiePrimaire(strategiesCount: number): number | null {
  return strategiesCount > 0 ? 0 : null
}

export async function loadStrategyDetail(index: number) {
  return callBackend<StrategyDetailReponse>('strategy-detail', { params: { index } })
}

/** Absence nommée quand le service n'a pas répondu — même raison partout. */
const STRATEGY_DETAIL_UNREACHABLE = unavailable({
  endpoint: ENDPOINT,
  status: 'UNAVAILABLE' as const,
  reason: 'strategy_detail_unreachable',
})

export function lectureStrategieDetail(
  index: number | null,
  reponse: Awaited<ReturnType<typeof loadStrategyDetail>> | null,
): Availability<string> {
  if (index === null) {
    return unavailable({ endpoint: ENDPOINT, status: 'EMPTY', reason: 'no_strategy_in_register' })
  }
  if (reponse === null || !reponse.ok) {
    return STRATEGY_DETAIL_UNREACHABLE
  }
  const bloc = blocNormalise(reponse.data.strategy)
  return mapAvailability(availabilityFromResolu(bloc, ENDPOINT), () =>
    etatSourceLisible(statutAffichage(bloc?.status)),
  )
}

export function libelleStrategieDetail(
  reponse: Awaited<ReturnType<typeof loadStrategyDetail>> | null,
): Availability<string> {
  if (reponse === null || !reponse.ok) {
    return STRATEGY_DETAIL_UNREACHABLE
  }
  const bloc = blocNormalise(reponse.data.strategy)
  return mapAvailability(availabilityFromResolu(bloc, ENDPOINT), (value) => {
    const pocket = typeof value.pocket === 'string' ? value.pocket : null
    const label = typeof value.label === 'string' ? value.label : null
    return pocket ?? label ?? `Stratégie ${String(value.index ?? '—')}`
  })
}

/** Libellé éditorial quand seul le statut HTTP est pertinent. */
export function statutHttpStrategieDetail(
  reponse: Awaited<ReturnType<typeof loadStrategyDetail>> | null,
): Availability<string> {
  if (reponse === null) return editorial('Not queried')
  return reponse.ok ? editorial('Response received') : editorial('Service unreachable')
}
