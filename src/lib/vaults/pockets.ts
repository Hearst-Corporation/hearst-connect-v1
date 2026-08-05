import { availabilityFromResolu, type BlocResolu } from '@/lib/backend/availability'
import { mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'

/**
 * Le compte des poches d'allocation, sans jamais fabriquer un zéro.
 *
 * ── Pourquoi cette fonction existe ────────────────────────────────────────
 * La règle vivait inline dans `/admin/product`, et elle était fausse : le
 * garde testait la présence de `pockets` mais comptait la liste FILTRÉE sur
 * les allocations lisibles. Quand le service répondait avec des poches dont
 * aucune n'avait de `targetBps` exploitable, le compte valait 0 et partait en
 * `available('0')` — la carte affichait « Poches → 0 » badgé comme mesure,
 * pendant que la même page disait « Aucune poche lisible » deux blocs plus bas.
 *
 * Un zéro affiché doit être un zéro MESURÉ. Celui-là venait d'un filtre qui
 * n'avait rien retenu, ce qui n'est pas la même chose et ne se lit pas
 * pareil : « 0 poche » dit que le fonds n'en a aucune, « Indisponible » dit
 * qu'on ne sait pas.
 *
 * Sortie en fonction pure pour être exerçable par un test — la règle est trop
 * facile à casser pour rester dans un composant de 500 lignes.
 */

/** Ce qu'une poche doit porter pour que son allocation soit lisible. */
export type PocheAllocationSource = {
  readonly targetBps?: number | null
}

type TermsAllocation = {
  readonly allocation?: { readonly pockets?: readonly PocheAllocationSource[] | null } | null
}

/** Une allocation n'est lisible que si sa cible est un nombre fini. */
export function allocationLisible(poche: PocheAllocationSource): boolean {
  return poche.targetBps !== null && poche.targetBps !== undefined && Number.isFinite(poche.targetBps)
}

const ENDPOINT = '/api/v1/product/factsheet'

/**
 * Quatre situations, quatre réponses distinctes :
 *
 *  1. l'appel a échoué           → indisponible (la fiche n'a pas répondu)
 *  2. l'allocation est absente   → indisponible (la fiche répond, pas ce champ)
 *  3. des poches, aucune lisible → indisponible (on a des poches, pas leurs
 *                                  allocations — surtout pas « 0 »)
 *  4. des poches lisibles        → le compte, y compris 0 si la liste est
 *                                  réellement vide : un zéro mesuré est une
 *                                  information, et il doit s'afficher.
 */
export function comptePoches(
  reponseOk: boolean,
  termsBloc: BlocResolu<TermsAllocation> | null | undefined,
): Availability<string> {
  if (!reponseOk) {
    return unavailable({ endpoint: ENDPOINT, status: 'UNAVAILABLE', reason: 'product_factsheet_unreachable' })
  }
  const poches = termsBloc?.value?.allocation?.pockets
  if (poches === null || poches === undefined) {
    return unavailable({ endpoint: ENDPOINT, status: 'PARTIAL', reason: 'allocation_absent' })
  }
  const lisibles = poches.filter(allocationLisible)
  if (poches.length > 0 && lisibles.length === 0) {
    return unavailable({ endpoint: ENDPOINT, status: 'PARTIAL', reason: 'pocket_allocation_unreadable' })
  }
  return mapAvailability(availabilityFromResolu(termsBloc, ENDPOINT), () => String(lisibles.length))
}
