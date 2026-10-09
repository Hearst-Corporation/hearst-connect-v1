/**
 * Types PARTAGÉS entre l'espace client et l'admin.
 *
 * Les mêmes faits sont lus des deux côtés : ce que coûte un bitcoin à produire,
 * où un vault peut aller, ce que le parc a miné, ce qui a été distribué. Les
 * définir une fois évite qu'une des deux surfaces dérive — un champ renommé
 * côté client casserait alors l'admin en silence.
 *
 * Ce module ne porte que des TYPES : aucune lecture, aucun `server-only`, donc
 * il traverse la frontière client/serveur sans contrainte.
 */

/**
 * Une distribution mensuelle.
 *
 * `status` sépare ce qui est PAYÉ de ce qui est seulement annoncé : une ligne
 * `pending` n'est pas de l'argent reçu, et l'écran ne doit jamais les confondre.
 */
export type Distribution = {
  readonly id: string
  readonly month: string
  readonly paidAt: string | null
  readonly amountUsdc: number | null
  readonly btcAmount: number | null
  readonly btcPriceUsd: number | null
  readonly status: 'distributed' | 'approved' | 'pending'
}

/**
 * Parc de calcul. Mesures à l'échelle de TOUTE l'infrastructure : c'est la
 * capacité industrielle à laquelle le vault donne accès, pas une quote-part.
 */
export type ComputeFleet = {
  readonly minersManaged: number | null
  readonly hashrateEhs: number | null
  /** BTC produits depuis l'origine, à l'échelle du parc. */
  readonly btcProducedTotal: number | null
  readonly countries: number | null
  readonly uptimePct: number | null
  readonly asOf: string | null

  /*
   * ── Part attribuée AU CLIENT ──────────────────────────────────────────
   *
   * Les champs ci-dessus décrivent le parc entier ; ceux-ci disent ce qui
   * revient à CE vault, au prorata de son capital.
   *
   * La part est PUBLIÉE, jamais calculée ici. Une règle de trois entre le
   * capital du client et un encours global serait fausse : l'attribution
   * dépend de la date d'entrée, des machines réellement affectées et des
   * mois de production déjà écoulés — une décision métier, pas une division.
   * Tant que la source ne les publie pas, ces champs restent `null` et le
   * front affiche une absence nommée plutôt qu'un chiffre flatteur.
   */

  /** Puissance attribuée au vault du client, en TH/s. */
  readonly allocatedHashrateThs: number | null
  /** Machines attribuées au vault du client. */
  readonly allocatedMiners: number | null
  /** BTC produits POUR ce vault depuis son entrée. */
  readonly allocatedBtcProduced: number | null
  /** Part du parc revenant au vault, en pourcentage. */
  readonly allocatedSharePct: number | null
}

/** Un point de la projection : la médiane et ses bandes. */
export type ProjectionPoint = {
  readonly label: string
  readonly p10: number
  readonly p25: number
  readonly p50: number
  readonly p75: number
  readonly p90: number
  /** Contrevaleur bitcoin — dépend AUSSI du cours, d'où une fourchette bien
   *  plus large que celle en dollars. Absente si la source ne la publie pas. */
  readonly btcP10: number | null
  readonly btcP50: number | null
  readonly btcP90: number | null
}

export type VaultProjection = {
  readonly runs: number
  readonly horizonMonths: number
  readonly startValueUsdc: number
  readonly startValueBtc: number | null
  /** Volatilité annualisée retenue pour le cours, en points de pourcentage. */
  readonly btcVolAnnualPct: number | null
  readonly points: readonly ProjectionPoint[]
}

/**
 * Coût de production d'un bitcoin, contre son prix de marché. L'écart entre les
 * deux est la marge : c'est LUI qui dit si le minage crée de la valeur.
 */
export type ProductionCost = {
  readonly costPerBtcUsd: number
  readonly marketPriceUsd: number
  readonly marginPct: number
  readonly electricityUsdPerKwh: number | null
  readonly networkDifficulty: number | null
  readonly hashrateEhs: number | null
  readonly asOf: string | null
  /** Électricité seule pour miner un bitcoin (sans les machines). */
  readonly energyCostPerBtcUsd?: number
  /** Cours − coût, en dollars par bitcoin. */
  readonly marginPerBtcUsd?: number
  /** Revenu d'un PH/s pendant un jour, en dollars. */
  readonly hashpriceUsdPerPhDay?: number
  readonly blockHeight?: number
  /** Présent quand la lecture vient de HearstMiningOracle. */
  readonly onChain?: {
    readonly address: string
    readonly chainId: number
    readonly explorerUrl: string | null
    readonly priceFromFeed: boolean
  }
}
