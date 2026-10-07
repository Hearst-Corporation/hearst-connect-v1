import 'server-only'

import {
  loadAdminOffers,
  loadAdminVaultRegistry,
  loadAdminRecentClients,
  loadClientBucketYields,
  loadClientDistributions,
  loadClientMovements,
  loadClientVault,
  loadAdminFleet,
} from '@/lib/admin-dashboard/load'
import type {
  AdminBucketYield,
  AdminClientDistribution,
  AdminClientMovement,
  AdminClientVault,
  AdminRecentClient,
  AdminVaultRecord,
} from '@/lib/admin-dashboard/contracts'
import type { ComputeFleet } from '@/lib/product/readings'
import { clientShareOfFleet, totalActiveCapital, type ClientShare } from '@/lib/mining/allocation'
import { clientVaults } from '@/lib/clients/vaults'
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
  /** Tous ses vaults, un par tranche, du premier versement au plus récent. */
  vaults: readonly AdminVaultRecord[]
  /** Le vault affiché — celui demandé, sinon la première tranche. Les lectures
   *  détaillées (rendements, distributions, mouvements) portent sur lui. */
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
  /** Le parc entier, dont sa part se déduit. */
  fleet: Availability<ComputeFleet>
  /**
   * Sa quote-part de parc, CALCULÉE : son capital sur le capital total des
   * vaults actifs, appliqué à la puissance, au bitcoin produit et à
   * l'électricité. Absente quand le capital total ne se lit pas — une part de
   * rien n'est pas zéro pour cent.
   */
  share: ClientShare | null
  /** Le dénominateur de cette part, affiché pour que le calcul se refasse. */
  totalActiveCapitalUsdc: number | null
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

export async function loadClientDossier(clientId: string, vaultId?: string | null): Promise<ClientDossier> {
  /* Sept lectures en parallèle. Chacune dit son absence pour son propre
     compte : un client dont on ne lit pas les distributions garde son vault,
     et son identité reste affichable. Les lectures détaillées portent sur le
     vault demandé (`vaultId`) — sans lui, sur la première tranche. */
  const [clients, vaults, offers, vaultDetail, bucketYields, distributions, movements, fleet] =
    await Promise.all([
      loadAdminRecentClients(50),
      loadAdminVaultRegistry(),
      loadAdminOffers(),
      loadClientVault(clientId, vaultId),
      loadClientBucketYields(clientId, vaultId),
      loadClientDistributions(clientId, vaultId),
      loadClientMovements(clientId, vaultId),
      loadAdminFleet(),
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

  const own = isAvailable(vaults) ? clientVaults(vaults.value, clientId) : []
  const vault: Availability<AdminVaultRecord> = isAvailable(vaults)
    ? (() => {
        const found = own.find((v) => v.vaultId === vaultId) ?? own[0]
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
  const ownIds = new Set(own.map((v) => v.vaultId))

  const clientOffers: Availability<readonly Offer[]> = isAvailable(offers)
    ? ({
        ...offers,
        value: offers.value
          .filter((o) =>
            // L'identifiant client d'abord ; le vault, puis le nom, en repli.
            o.clientId != null
              ? o.clientId === clientId
              : (o.vaultId != null && ownIds.has(o.vaultId)) ||
                (clientLabel !== null && o.clientName === clientLabel),
          )
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
      } as Availability<readonly Offer[]>)
    : offers

  /* La quote-part : son capital sur celui de TOUS les vaults actifs. Un vault
     clos ou en attente de fonds ne consomme pas de puissance — l'inclure
     diluerait la part de tous les autres. */
  const totalCapital = isAvailable(vaults) ? totalActiveCapital(vaults.value) : null
  // La part du CLIENT : tous ses vaults.
  const clientCapital = own.length > 0 ? own.reduce((t, v) => t + (v.principalUsdc ?? 0), 0) : null
  const share = isAvailable(fleet)
    ? clientShareOfFleet(clientCapital, totalCapital, {
        hashrateEhs: fleet.value.hashrateEhs,
        btcProducedTotal: fleet.value.btcProducedTotal,
        electricityUsd: null,
      })
    : null

  return {
    clientId,
    identity,
    vaults: own,
    vault,
    offers: clientOffers,
    vaultDetail,
    bucketYields,
    distributions,
    movements,
    fleet,
    share,
    totalActiveCapitalUsdc: totalCapital,
  }
}
