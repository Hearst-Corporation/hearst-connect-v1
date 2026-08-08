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
    return 'No readable monthly bill on either route.'
  }
  if (coutAgregat === null) {
    return 'Only the dedicated route exposes a monthly bill.'
  }
  if (coutDedie === null) {
    return 'Only the aggregate exposes a monthly bill.'
  }
  if (coutAgregat === coutDedie) {
    return 'Monthly bill matches.'
  }
  return 'Mismatch between aggregate and dedicated route.'
}

/** Compare le hashrate entre `mining` et `mining/metrics/onchain`. */
export function reconcilierHashrate(
  agregat: Bloc<{ readonly reportedHashrateTh?: string | null }> | undefined,
  dedie: Bloc<{ readonly reportedHashrateTh?: string | null }> | undefined,
): string {
  const hAgregat = agregat?.value ? valeurAtomique(agregat.value.reportedHashrateTh) : null
  const hDedie = dedie?.value ? valeurAtomique(dedie.value.reportedHashrateTh) : null

  if (hAgregat === null && hDedie === null) {
    return 'No readable hashrate on either route.'
  }
  if (hAgregat === null) {
    return 'Only the on-chain route exposes hashrate.'
  }
  if (hDedie === null) {
    return 'Only the aggregate exposes hashrate.'
  }
  if (hAgregat === hDedie) {
    return 'Reported hashrate matches.'
  }
  return 'Mismatch between aggregate and on-chain read.'
}
