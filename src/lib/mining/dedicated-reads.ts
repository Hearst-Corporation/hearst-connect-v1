import { etatSourceLisible } from '@/lib/mouvements'
import { statutAffichage } from '@/lib/statut-affichage'

type Bloc<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

function valeurAtomique(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null
  return v
}

/** Libellé d’état pour un champ résolu backend. */
export function etiquetteChampResolu(bloc: Bloc<unknown> | null | undefined): string {
  if (bloc === null || bloc === undefined) return '—'
  return etatSourceLisible(statutAffichage(bloc.status))
}

/** Compare la facture mensuelle entre `mining` et `mining/electricity`. */
export function reconcilierFactureMensuelle(
  agregat: Bloc<{ readonly monthlyCost?: string | null }> | undefined,
  dedie: Bloc<{ readonly monthlyCost?: string | null }> | undefined,
): string {
  const coutAgregat = agregat?.value ? valeurAtomique(agregat.value.monthlyCost) : null
  const coutDedie = dedie?.value ? valeurAtomique(dedie.value.monthlyCost) : null

  if (coutAgregat === null && coutDedie === null) {
    return 'Aucune facture mensuelle lisible sur les deux routes.'
  }
  if (coutAgregat === null) {
    return 'Seule la route dédiée expose une facture mensuelle.'
  }
  if (coutDedie === null) {
    return 'Seul l’agrégat expose une facture mensuelle.'
  }
  if (coutAgregat === coutDedie) {
    return 'Concordance sur la facture mensuelle.'
  }
  return 'Écart signalé entre l’agrégat et la route dédiée.'
}

/** Compare le hashrate entre `mining` et `mining/metrics/onchain`. */
export function reconcilierHashrate(
  agregat: Bloc<{ readonly reportedHashrateTh?: string | null }> | undefined,
  dedie: Bloc<{ readonly reportedHashrateTh?: string | null }> | undefined,
): string {
  const hAgregat = agregat?.value ? valeurAtomique(agregat.value.reportedHashrateTh) : null
  const hDedie = dedie?.value ? valeurAtomique(dedie.value.reportedHashrateTh) : null

  if (hAgregat === null && hDedie === null) {
    return 'Aucun hashrate lisible sur les deux routes.'
  }
  if (hAgregat === null) {
    return 'Seule la route on-chain expose un hashrate.'
  }
  if (hDedie === null) {
    return 'Seul l’agrégat expose un hashrate.'
  }
  if (hAgregat === hDedie) {
    return 'Concordance sur le hashrate rapporté.'
  }
  return 'Écart signalé entre l’agrégat et la lecture on-chain.'
}
