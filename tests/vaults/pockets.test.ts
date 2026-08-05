import { allocationLisible, comptePoches } from '@/lib/vaults/pockets'
import { isAvailable } from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

/**
 * Non-régression du faux zéro de `/admin/product` (audit des 22 routes,
 * 2026-08-04).
 *
 * ── Le défaut ─────────────────────────────────────────────────────────────
 * La carte affichait « Poches → 0 », badgée comme une mesure, pendant que la
 * même page disait « Aucune poche lisible » deux blocs plus bas. Le garde
 * testait la présence de `pockets` mais comptait la liste FILTRÉE sur les
 * allocations lisibles : une source répondant avec des poches sans `targetBps`
 * exploitable donnait `readablePockets.length === 0`, stringifié en
 * `available('0')`.
 *
 * ── Ce que ces tests protègent ────────────────────────────────────────────
 * La distinction entre « zéro mesuré » et « on ne sait pas ». Les deux se
 * ressemblent à l'écran et ne disent pas la même chose : « 0 poche » affirme
 * que le fonds n'en a aucune, « Indisponible » dit qu'on ne peut pas le lire.
 * C'est la garantie centrale du produit, et elle avait cédé ici.
 */

const termsLive = <T,>(value: T) => ({ status: 'LIVE' as const, value })

describe('allocationLisible', () => {
  it('accepte une cible numérique finie, y compris zéro', () => {
    // Une poche à 0 bps est une allocation VOLONTAIRE de zéro : elle est
    // lisible, et elle compte.
    expect(allocationLisible({ targetBps: 0 })).toBe(true)
    expect(allocationLisible({ targetBps: 5000 })).toBe(true)
  })

  it('refuse une cible absente ou non finie', () => {
    expect(allocationLisible({ targetBps: null })).toBe(false)
    expect(allocationLisible({ targetBps: undefined })).toBe(false)
    expect(allocationLisible({})).toBe(false)
    expect(allocationLisible({ targetBps: Number.NaN })).toBe(false)
    expect(allocationLisible({ targetBps: Number.POSITIVE_INFINITY })).toBe(false)
  })
})

describe('comptePoches — une absence ne devient jamais un zéro', () => {
  it('LE DÉFAUT CORRIGÉ : des poches sans allocation lisible ne comptent pas « 0 »', () => {
    /*
     * Le cas exact mesuré en production : le service répond, il renvoie des
     * poches, mais aucune ne porte de `targetBps` exploitable. Avant
     * correction, cette entrée produisait « 0 » badgé « en direct ».
     */
    const resultat = comptePoches(
      true,
      termsLive({ allocation: { pockets: [{ targetBps: null }, { targetBps: undefined }, {}] } }),
    )

    expect(isAvailable(resultat)).toBe(false)
    expect(resultat).toMatchObject({ kind: 'unavailable', reason: 'pocket_allocation_unreadable' })
    // Le point qui compte : aucun « 0 » n'a été fabriqué.
    if (!isAvailable(resultat)) expect(JSON.stringify(resultat)).not.toContain('"value":"0"')
  })

  it('un zéro RÉELLEMENT mesuré s’affiche — une liste vide est une information', () => {
    // La source a répondu et déclare zéro poche. Ce n'est pas une absence :
    // c'est une mesure, et elle doit se voir.
    const resultat = comptePoches(true, termsLive({ allocation: { pockets: [] } }))
    expect(isAvailable(resultat)).toBe(true)
    if (isAvailable(resultat)) expect(resultat.value).toBe('0')
  })

  it('compte les poches lisibles et ignore celles qui ne le sont pas', () => {
    const resultat = comptePoches(
      true,
      termsLive({ allocation: { pockets: [{ targetBps: 4000 }, { targetBps: null }, { targetBps: 6000 }] } }),
    )
    expect(isAvailable(resultat)).toBe(true)
    if (isAvailable(resultat)) expect(resultat.value).toBe('2')
  })

  it('l’appel en échec rend une indisponibilité nommée, pas un compte', () => {
    const resultat = comptePoches(false, termsLive({ allocation: { pockets: [{ targetBps: 4000 }] } }))
    expect(isAvailable(resultat)).toBe(false)
    expect(resultat).toMatchObject({ kind: 'unavailable', reason: 'product_factsheet_unreachable' })
  })

  it('l’allocation absente se distingue d’une allocation illisible', () => {
    /*
     * Deux absences différentes, deux motifs différents : la fiche répond mais
     * ne porte pas le champ (`allocation_absent`), ou elle le porte sans
     * qu'aucune valeur soit lisible (`pocket_allocation_unreadable`). Les
     * confondre ferait lire la même chose deux situations opposées.
     */
    expect(comptePoches(true, termsLive({ allocation: { pockets: null } }))).toMatchObject({
      reason: 'allocation_absent',
    })
    expect(comptePoches(true, termsLive({ allocation: { pockets: undefined } }))).toMatchObject({
      reason: 'allocation_absent',
    })
    expect(comptePoches(true, termsLive({ allocation: { pockets: [{ targetBps: null }] } }))).toMatchObject({
      reason: 'pocket_allocation_unreadable',
    })
  })

  it('propage STALE sur un compte mesuré (F-05)', () => {
    const resultat = comptePoches(true, {
      status: 'STALE',
      value: { allocation: { pockets: [{ targetBps: 5000 }] } },
    })
    expect(isAvailable(resultat)).toBe(true)
    if (isAvailable(resultat)) expect(resultat.stale).toBe(true)
  })
})
