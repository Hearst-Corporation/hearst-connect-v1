import 'server-only'

import {
  loadAdminOffers,
  loadAdminVaultRegistry,
  loadAdminRecentClients,
  loadClientBucketYields,
  loadClientDistributions,
  loadClientMovements,
  loadClientVault,
} from '@/lib/admin-dashboard/load'
import type {
  AdminBucketYield,
  AdminClientDistribution,
  AdminClientMovement,
  AdminClientVault,
  AdminRecentClient,
  AdminVaultRecord,
} from '@/lib/admin-dashboard/contracts'
import type { Offer } from '@/lib/offers/model'
import { isAvailable, type Availability } from '@/lib/vaults/model'

/**
 * Le DOSSIER d'un client — tout ce que la console sait de lui, en un objet.
 *
 * L'information d'un client était éparpillée : son identité dans un registre,
 * son vault dans un autre, ses offres nulle part, ses mouvements dans un flux
 * global non filtrable. Répondre à « où en est ce client ? » demandait
 * d'ouvrir quatre écrans et de recouper à la main.
 *
 * Le dossier rassemble ces lectures autour d'une seule clé — l'identifiant du
 * client — et laisse chaque partie dire son absence pour son propre compte :
 * un client sans vault reste un client, une offre illisible n'efface pas son
 * identité.
 */

export type ClientDossier = Readonly<{
  clientId: string
  /** Identité, telle que le registre la publie. */
  identity: Availability<AdminRecentClient>
  /** Son vault dédié — un seul par client, par construction du produit. */
  vault: Availability<AdminVaultRecord>
  /** Ses offres, de la plus récente à la plus ancienne. */
  offers: Availability<readonly Offer[]>
  /** Son vault au complet — les champs que le front client ne peut pas recalculer. */
  vaultDetail: Availability<AdminClientVault>
  /** Le rendement de chaque poche, que le client lit dans « Strategy Exposure ». */
  bucketYields: Availability<readonly AdminBucketYield[]>
  /** Ses distributions : versées, approuvées, en attente. */
  distributions: Availability<readonly AdminClientDistribution[]>
  /** Son journal — dépôts, retraits, distributions. */
  movements: Availability<readonly AdminClientMovement[]>
}>

/** Repli nommé : une lecture globale disponible mais sans cette clé. */
function notInRegistry<T>(endpoint: string, what: string): Availability<T> {
  return {
    kind: 'unavailable',
    endpoint,
    status: 'EMPTY',
    reason: `${what}_not_found_for_client`,
  } as Availability<T>
}

export async function loadClientDossier(clientId: string): Promise<ClientDossier> {
  /* Sept lectures en parallèle. Chacune dit son absence pour son propre
     compte : un client dont on ne lit pas les distributions garde son vault,
     et son identité reste affichable. */
  const [clients, vaults, offers, vaultDetail, bucketYields, distributions, movements] =
    await Promise.all([
      loadAdminRecentClients(50),
      loadAdminVaultRegistry(),
      loadAdminOffers(),
      loadClientVault(clientId),
      loadClientBucketYields(clientId),
      loadClientDistributions(clientId),
      loadClientMovements(clientId),
    ])

  /* L'identité : on cherche CE client dans le registre. Une liste lue mais qui
     ne le contient pas n'est pas la même chose qu'une liste illisible — la
     première dit « inconnu ici », la seconde « je ne sais pas ». */
  const identity: Availability<AdminRecentClient> = isAvailable(clients)
    ? (() => {
        const found = clients.value.find((c) => c.id === clientId)
        return found !== undefined
          ? ({ ...clients, value: found } as Availability<AdminRecentClient>)
          : notInRegistry<AdminRecentClient>('/api/v1/admin/clients/recent', 'client')
      })()
    : (clients as unknown as Availability<AdminRecentClient>)

  const vault: Availability<AdminVaultRecord> = isAvailable(vaults)
    ? (() => {
        const found = vaults.value.find((v) => v.clientId === clientId)
        return found !== undefined
          ? ({ ...vaults, value: found } as Availability<AdminVaultRecord>)
          : notInRegistry<AdminVaultRecord>('/api/v1/admin/vaults/registry', 'vault')
      })()
    : (vaults as unknown as Availability<AdminVaultRecord>)

  /* Les offres se rattachent au client par le vault qu'elles ont ouvert, ou —
     tant qu'aucun vault n'existe — par le nom. Le rapprochement par nom est
     FAIBLE et le restera tant que l'offre ne portera pas d'identifiant client :
     c'est une limite du modèle actuel, pas une heuristique à étendre. */
  const clientLabel = isAvailable(identity) ? identity.value.label : null
  const vaultId = isAvailable(vault) ? vault.value.vaultId : null

  const clientOffers: Availability<readonly Offer[]> = isAvailable(offers)
    ? ({
        ...offers,
        value: offers.value
          .filter(
            (o) =>
              (vaultId !== null && o.vaultId === vaultId) ||
              (clientLabel !== null && o.clientName === clientLabel),
          )
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
      } as Availability<readonly Offer[]>)
    : offers

  return {
    clientId,
    identity,
    vault,
    offers: clientOffers,
    vaultDetail,
    bucketYields,
    distributions,
    movements,
  }
}
