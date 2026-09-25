/**
 * LA QUOTE-PART DE PARC — combien de puissance revient à chaque client.
 *
 * La règle du produit, telle qu'elle se dit : un client qui apporte un million
 * sur dix millions de capital total reçoit un dixième du parc. Pas un dixième
 * arbitraire — le même dixième pour sa puissance de calcul, son électricité,
 * son bitcoin produit et son coût de production. Une seule clé, appliquée à
 * tout, sinon les chiffres du client cessent de se recouper entre eux.
 *
 * Cette clé n'est pas une lecture du backend : elle se CALCULE, et c'est
 * précisément pourquoi elle doit vivre au même endroit pour les deux surfaces.
 * Le client lit sa part sans savoir d'où elle vient ; l'admin doit pouvoir la
 * refaire.
 */

export type FleetCapacity = Readonly<{
  /** Puissance totale du parc, en EH/s. */
  hashrateEhs: number | null
  /** Bitcoin produit par le parc depuis l'origine. */
  btcProducedTotal: number | null
  /** Dépense électrique du parc sur la période, en dollars. */
  electricityUsd: number | null
}>

export type ClientShare = Readonly<{
  /** Part du capital total, en pourcentage. LA clé de tout le reste. */
  sharePct: number
  /** Sa puissance, en TH/s — l'unité dans laquelle un client lit la sienne. */
  hashrateThs: number | null
  /** Le bitcoin que le parc a produit pour lui. */
  btcProduced: number | null
  /** Sa part de la facture d'électricité. */
  electricityUsd: number | null
}>

/**
 * La part d'un client, de son capital jusqu'à sa puissance.
 *
 * Renvoie `null` quand le capital total est nul ou illisible : une part de
 * rien n'est pas zéro pour cent, c'est une part qu'on ne sait pas calculer. Un
 * client verrait sinon « 0 % du parc » là où la vraie réponse est « on ne sait
 * pas encore ».
 */
export function clientShareOfFleet(
  clientCapitalUsdc: number | null,
  totalCapitalUsdc: number | null,
  fleet: FleetCapacity,
): ClientShare | null {
  if (clientCapitalUsdc === null || totalCapitalUsdc === null) return null
  if (!Number.isFinite(clientCapitalUsdc) || !Number.isFinite(totalCapitalUsdc)) return null
  if (totalCapitalUsdc <= 0) return null

  const sharePct = (clientCapitalUsdc / totalCapitalUsdc) * 100
  const share = sharePct / 100

  /* Chaque dérivée garde sa propre absence : un parc dont on connaît la
     puissance mais pas la facture d'électricité donne une part de puissance
     lisible et une part de facture absente. Rabattre l'ensemble sur null
     perdrait ce qu'on sait. */
  return {
    sharePct,
    // EH/s → TH/s : le client lit sa part en téra, le parc se compte en exa.
    hashrateThs: fleet.hashrateEhs === null ? null : fleet.hashrateEhs * 1_000_000 * share,
    btcProduced: fleet.btcProducedTotal === null ? null : fleet.btcProducedTotal * share,
    electricityUsd: fleet.electricityUsd === null ? null : fleet.electricityUsd * share,
  }
}

/**
 * Le capital total sur lequel la clé se calcule : la somme des vaults ACTIFS.
 *
 * Un vault clos ou en attente de fonds ne consomme pas de puissance ; l'inclure
 * diluerait la part de tous les autres. Une somme sur zéro vault lisible
 * renvoie `null` plutôt que zéro, pour la même raison que ci-dessus.
 */
export function totalActiveCapital(
  vaults: readonly { readonly principalUsdc: number | null; readonly status: string }[],
): number | null {
  const active = vaults.filter((v) => v.status === 'ACTIVE' && v.principalUsdc !== null)
  if (active.length === 0) return null
  return active.reduce((sum, v) => sum + (v.principalUsdc ?? 0), 0)
}
