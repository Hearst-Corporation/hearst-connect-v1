/**
 * Registre des endpoints du backend Hearst Connect — SOURCE UNIQUE DE VÉRITÉ.
 *
 * Toute surface qui parle du backend (navigation, API Explorer, pages métier)
 * lit ce registre. Aucune liste d'endpoints codée en dur ailleurs : une route
 * qui n'est pas ici n'existe pas pour ce frontend.
 *
 * Contrat de référence : `docs/api.md` de `Hearst-Corporation/hearst-connect-backend`.
 * Ce fichier ne DÉCRIT que le contrat ; il ne produit aucune donnée métier.
 */

export type EndpointCategory = 'probe' | 'business' | 'ai-context' | 'keeper'

export type EndpointAuth =
  /** Route publique : ni session ni jeton. */
  | 'public'
  /** Session investisseur ou admin (jeton Bearer signé). */
  | 'session'
  /** Session dont le rôle backend est `admin`. */
  | 'admin'

export type BackendEndpoint = {
  /** Identifiant stable, utilisé comme clé d'UI et de test. */
  id: string
  method: 'GET' | 'POST'
  /** Chemin tel que servi par le backend. `:index` est un paramètre réel. */
  path: string
  category: EndpointCategory
  auth: EndpointAuth
  /** Page d'admin qui expose cet endpoint. */
  surface: string
  /**
   * `enveloped: false` → la réponse est le payload nu (probes, runtime,
   * ai/context, résultats keeper). Sinon `{ data, meta }`.
   */
  enveloped: boolean
  /** Ce que la route rend, en une ligne, pour l'API Explorer. */
  summary: string
  /**
   * Réserve documentée du contrat backend, affichée telle quelle dans l'UI.
   * `null` quand la route n'en porte aucune.
   */
  caveat: string | null
}

export const BACKEND_ENDPOINTS: readonly BackendEndpoint[] = [
  // ── Sondes opérationnelles publiques ──────────────────────────────────────
  {
    id: 'health',
    method: 'GET',
    path: '/health',
    category: 'probe',
    auth: 'public',
    surface: '/admin/runtime',
    enveloped: false,
    summary: 'Vivacité du service.',
    caveat: null,
  },
  {
    id: 'ready',
    method: 'GET',
    path: '/ready',
    category: 'probe',
    auth: 'public',
    surface: '/admin/runtime',
    enveloped: false,
    summary: 'Disponibilité, base de données comprise.',
    caveat:
      "En 503, le corps est `{ ready: false, db: \"unreachable\" }` — charge utile d'orchestrateur, pas un Problem.",
  },
  {
    id: 'runtime',
    method: 'GET',
    path: '/api/v1/runtime',
    category: 'probe',
    auth: 'public',
    surface: '/admin/runtime',
    enveloped: false,
    summary: 'Mode de contrat, chaîne, retard d’indexeur, version.',
    caveat: 'Réponse non enveloppée : payload au premier niveau.',
  },

  // ── Données métier ────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    method: 'GET',
    path: '/api/v1/dashboard',
    category: 'business',
    auth: 'session',
    surface: '/admin/dashboard',
    enveloped: true,
    summary: 'Agrégat investisseur : identité, position, souscription, runtime.',
    caveat: '`meta.status` est calculé pire-champ-d’abord : un seul champ dégradé abaisse tout l’agrégat.',
  },
  {
    id: 'profile',
    method: 'GET',
    path: '/api/v1/profile',
    category: 'business',
    auth: 'session',
    surface: '/admin/profile',
    enveloped: true,
    summary: 'Profil investisseur — un fait, une route.',
    caveat: null,
  },
  {
    id: 'series1-events',
    method: 'GET',
    path: '/api/v1/series1/events',
    category: 'business',
    auth: 'session',
    surface: '/admin/series-1',
    enveloped: true,
    summary: 'Événements indexés de la Series 1.',
    caveat: null,
  },
  {
    id: 'vault',
    method: 'GET',
    path: '/api/v1/vault',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    enveloped: true,
    summary: 'État du DynaVault.',
    caveat: null,
  },
  {
    id: 'vault-strategies',
    method: 'GET',
    path: '/api/v1/vault/strategies',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    enveloped: true,
    summary: 'Liste des stratégies du vault.',
    caveat: "Fournit les index réels du sélecteur de détail — aucun index n'est inventé côté frontend.",
  },
  {
    id: 'strategy-detail',
    method: 'GET',
    path: '/api/v1/strategies/:index',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    enveloped: true,
    summary: 'Détail d’une stratégie par index.',
    caveat: '`:index` provient exclusivement de la réponse `vault/strategies`.',
  },
  {
    id: 'rwa-vault',
    method: 'GET',
    path: '/api/v1/rwa-vault',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    enveloped: true,
    summary: 'Allocation cible du RWA vault.',
    caveat: 'Allocation CIBLE via `strategies()` — jamais un solde par poche.',
  },
  {
    id: 'rebalancing-status',
    method: 'GET',
    path: '/api/v1/rebalancing/status',
    category: 'business',
    auth: 'admin',
    surface: '/admin/vault',
    enveloped: true,
    summary: 'État du rééquilibrage.',
    caveat: 'Rôle admin requis : une session non-admin reçoit un HTTP 403 dont le corps annonce 401.',
  },
  {
    id: 'mining',
    method: 'GET',
    path: '/api/v1/mining',
    category: 'business',
    auth: 'session',
    surface: '/admin/mining',
    enveloped: true,
    summary: 'Agrégat minage.',
    caveat: null,
  },
  {
    id: 'mining-onchain',
    method: 'GET',
    path: '/api/v1/mining/metrics/onchain',
    category: 'business',
    auth: 'session',
    surface: '/admin/mining',
    enveloped: true,
    summary: 'Métriques de minage lues on-chain.',
    caveat: null,
  },
  {
    id: 'mining-electricity',
    method: 'GET',
    path: '/api/v1/mining/electricity',
    category: 'business',
    auth: 'session',
    surface: '/admin/mining',
    enveloped: true,
    summary: 'Poste électricité du minage.',
    caveat: null,
  },
  {
    id: 'btc',
    method: 'GET',
    path: '/api/v1/btc',
    category: 'business',
    auth: 'session',
    surface: '/admin/btc',
    enveloped: true,
    summary: 'Agrégat BTC.',
    caveat: null,
  },
  {
    id: 'product-factsheet',
    method: 'GET',
    path: '/api/v1/product/factsheet',
    category: 'business',
    auth: 'session',
    surface: '/admin/product',
    enveloped: true,
    summary: 'Fiche produit et conditions.',
    caveat:
      '`minimumDepositUsdc` est en USDC entiers ici, à ne pas confondre avec `subscription.minimumDeposit` du dashboard.',
  },
  {
    id: 'backtest-historical',
    method: 'GET',
    path: '/api/v1/backtest/historical',
    category: 'business',
    auth: 'session',
    surface: '/admin/backtest',
    enveloped: true,
    summary: 'Séries historiques de backtest calculées par le backend.',
    caveat: 'Données produites par le backend : le frontend n’en dérive aucune projection.',
  },

  // ── Contexte IA ───────────────────────────────────────────────────────────
  {
    id: 'ai-context-dashboard',
    method: 'GET',
    path: '/api/v1/ai/context/dashboard',
    category: 'ai-context',
    auth: 'session',
    surface: '/admin/api-explorer',
    enveloped: false,
    summary: 'Contexte IA du dashboard.',
    caveat: 'Contexte généré par le backend — jamais un fait métier de premier plan.',
  },
  {
    id: 'ai-context-btc',
    method: 'GET',
    path: '/api/v1/ai/context/btc',
    category: 'ai-context',
    auth: 'session',
    surface: '/admin/api-explorer',
    enveloped: false,
    summary: 'Contexte IA du domaine BTC.',
    caveat: 'Contexte généré par le backend — jamais un fait métier de premier plan.',
  },
  {
    id: 'ai-context-mining',
    method: 'GET',
    path: '/api/v1/ai/context/mining',
    category: 'ai-context',
    auth: 'session',
    surface: '/admin/api-explorer',
    enveloped: false,
    summary: 'Contexte IA du domaine minage.',
    caveat: 'Contexte généré par le backend — jamais un fait métier de premier plan.',
  },

  // ── Actions Keeper ────────────────────────────────────────────────────────
  // Aucune de ces routes ne signe de transaction : le service ne dispose
  // d'aucun helper d'écriture on-chain (docs/architecture.md du backend).
  {
    id: 'keeper-mining-report',
    method: 'POST',
    path: '/api/v1/mining/metrics/report',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Déclare des métriques de minage.',
    caveat: 'Corps `{ hashrateTh, btcEarnedSats }`, entiers bornés non négatifs, validation `.strict()`.',
  },
  {
    id: 'keeper-electricity-pay',
    method: 'POST',
    path: '/api/v1/mining/electricity/pay',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Enregistre un paiement d’électricité.',
    caveat: 'Ne signe aucune transaction.',
  },
  {
    id: 'keeper-rebalancing-execute',
    method: 'POST',
    path: '/api/v1/rebalancing/execute',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Demande l’exécution d’un rééquilibrage.',
    caveat: 'Ne signe aucune transaction.',
  },
  {
    id: 'keeper-rwa-vault',
    method: 'POST',
    path: '/api/v1/rwa-vault',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Écriture RWA vault.',
    caveat: 'Répond 501 avec un `KeeperActionResult` (sans champ `code`) : lire `reason`.',
  },
  {
    id: 'keeper-btc-deposit-initiate',
    method: 'POST',
    path: '/api/v1/btc-deposit/initiate',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Ouvre un dépôt BTC.',
    caveat: 'Répond 501 avec un `KeeperActionResult` (sans champ `code`) : lire `reason`.',
  },
  {
    id: 'keeper-btc-deposit-complete',
    method: 'POST',
    path: '/api/v1/btc-deposit/complete',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Clôt un dépôt BTC.',
    caveat: 'Répond 501 avec un `KeeperActionResult` (sans champ `code`) : lire `reason`.',
  },
] as const

/** Recherche par identifiant — lève si l'id n'existe pas au registre. */
export function endpointById(id: string): BackendEndpoint {
  const found = BACKEND_ENDPOINTS.find((endpoint) => endpoint.id === id)
  if (!found) throw new Error(`Endpoint inconnu du registre : "${id}".`)
  return found
}

export function endpointsByCategory(category: EndpointCategory): BackendEndpoint[] {
  return BACKEND_ENDPOINTS.filter((endpoint) => endpoint.category === category)
}

/** Substitue les paramètres de chemin. Refuse tout paramètre manquant. */
export function resolvePath(endpoint: BackendEndpoint, params: Record<string, string | number> = {}): string {
  return endpoint.path.replace(/:(\w+)/g, (_, name: string) => {
    const value = params[name]
    if (value === undefined) {
      throw new Error(`Paramètre "${name}" requis par ${endpoint.path} et non fourni.`)
    }
    return String(value)
  })
}
