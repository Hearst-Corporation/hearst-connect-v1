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

type EndpointDraft = {
  id: string
  method?: 'GET' | 'POST'
  path: string
  category: EndpointCategory
  auth: EndpointAuth
  surface: string
  enveloped?: boolean
  summary: string
  caveat?: string | null
}

function defineEndpoint(draft: EndpointDraft): BackendEndpoint {
  return {
    id: draft.id,
    method: draft.method ?? 'GET',
    path: draft.path,
    category: draft.category,
    auth: draft.auth,
    surface: draft.surface,
    enveloped: draft.enveloped ?? true,
    summary: draft.summary,
    caveat: draft.caveat ?? null,
  }
}

const CAVEAT_AI = 'Contexte généré par le backend — jamais un fait métier de premier plan.'
const CAVEAT_KEEPER_501 = 'Répond 501 avec un `KeeperActionResult` (sans champ `code`) : lire `reason`.'

export const BACKEND_ENDPOINTS: readonly BackendEndpoint[] = [
  // ── Sondes opérationnelles publiques ──────────────────────────────────────
  defineEndpoint({
    id: 'health',
    path: '/health',
    category: 'probe',
    auth: 'public',
    surface: '/admin/runtime',
    enveloped: false,
    summary: 'Vivacité du service.',
  }),
  defineEndpoint({
    id: 'ready',
    path: '/ready',
    category: 'probe',
    auth: 'public',
    surface: '/admin/runtime',
    enveloped: false,
    summary: 'Disponibilité, base de données comprise.',
    caveat:
      "En 503, le corps est `{ ready: false, db: \"unreachable\" }` — charge utile d'orchestrateur, pas un Problem.",
  }),
  defineEndpoint({
    id: 'runtime',
    path: '/api/v1/runtime',
    category: 'probe',
    auth: 'public',
    surface: '/admin/runtime',
    enveloped: false,
    summary: 'Mode de contrat, chaîne, retard d’indexeur, version.',
    caveat: 'Réponse non enveloppée : payload au premier niveau.',
  }),

  // ── Données métier ────────────────────────────────────────────────────────
  defineEndpoint({
    id: 'dashboard',
    path: '/api/v1/dashboard',
    category: 'business',
    auth: 'session',
    surface: '/admin/dashboard',
    summary: 'Agrégat investisseur : identité, position, souscription, runtime.',
    caveat: '`meta.status` est calculé pire-champ-d’abord : un seul champ dégradé abaisse tout l’agrégat.',
  }),
  defineEndpoint({
    id: 'profile',
    path: '/api/v1/profile',
    category: 'business',
    auth: 'session',
    surface: '/admin/profile',
    summary: 'Profil investisseur — un fait, une route.',
  }),
  defineEndpoint({
    id: 'series1-events',
    path: '/api/v1/series1/events',
    category: 'business',
    auth: 'session',
    surface: '/admin/series-1',
    summary: 'Événements indexés de la Series 1.',
  }),
  defineEndpoint({
    id: 'vault',
    path: '/api/v1/vault',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    summary: 'État du DynaVault.',
  }),
  defineEndpoint({
    id: 'vault-strategies',
    path: '/api/v1/vault/strategies',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    summary: 'Liste des stratégies du vault.',
    caveat: "Fournit les index réels du sélecteur de détail — aucun index n'est inventé côté frontend.",
  }),
  defineEndpoint({
    id: 'strategy-detail',
    path: '/api/v1/strategies/:index',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    summary: 'Détail d’une stratégie par index.',
    caveat: '`:index` provient exclusivement de la réponse `vault/strategies`.',
  }),
  defineEndpoint({
    id: 'rwa-vault',
    path: '/api/v1/rwa-vault',
    category: 'business',
    auth: 'session',
    surface: '/admin/vault',
    summary: 'Allocation cible du RWA vault.',
    caveat: 'Allocation CIBLE via `strategies()` — jamais un solde par poche.',
  }),
  defineEndpoint({
    id: 'rebalancing-status',
    path: '/api/v1/rebalancing/status',
    category: 'business',
    auth: 'admin',
    surface: '/admin/vault',
    summary: 'État du rééquilibrage.',
    caveat: 'Rôle admin requis : une session non-admin reçoit un HTTP 403 dont le corps annonce 401.',
  }),
  defineEndpoint({
    id: 'mining',
    path: '/api/v1/mining',
    category: 'business',
    auth: 'session',
    surface: '/admin/mining',
    summary: 'Agrégat minage.',
  }),
  defineEndpoint({
    id: 'mining-onchain',
    path: '/api/v1/mining/metrics/onchain',
    category: 'business',
    auth: 'session',
    surface: '/admin/mining',
    summary: 'Métriques de minage lues on-chain.',
  }),
  defineEndpoint({
    id: 'mining-electricity',
    path: '/api/v1/mining/electricity',
    category: 'business',
    auth: 'session',
    surface: '/admin/mining',
    summary: 'Poste électricité du minage.',
  }),
  defineEndpoint({
    id: 'btc',
    path: '/api/v1/btc',
    category: 'business',
    auth: 'session',
    surface: '/admin/btc',
    summary: 'Agrégat BTC.',
  }),
  defineEndpoint({
    id: 'product-factsheet',
    path: '/api/v1/product/factsheet',
    category: 'business',
    auth: 'session',
    surface: '/admin/product',
    summary: 'Fiche produit et conditions.',
    caveat:
      '`minimumDepositUsdc` est en USDC entiers ici, à ne pas confondre avec `subscription.minimumDeposit` du dashboard.',
  }),
  defineEndpoint({
    id: 'backtest-historical',
    path: '/api/v1/backtest/historical',
    category: 'business',
    auth: 'session',
    surface: '/admin/backtest',
    summary: 'Séries historiques de backtest calculées par le backend.',
    caveat: 'Données produites par le backend : le frontend n’en dérive aucune projection.',
  }),

  // ── Contexte IA ───────────────────────────────────────────────────────────
  defineEndpoint({
    id: 'ai-context-dashboard',
    path: '/api/v1/ai/context/dashboard',
    category: 'ai-context',
    auth: 'session',
    surface: '/admin/api-explorer',
    enveloped: false,
    summary: 'Contexte IA du dashboard.',
    caveat: CAVEAT_AI,
  }),
  defineEndpoint({
    id: 'ai-context-btc',
    path: '/api/v1/ai/context/btc',
    category: 'ai-context',
    auth: 'session',
    surface: '/admin/api-explorer',
    enveloped: false,
    summary: 'Contexte IA du domaine BTC.',
    caveat: CAVEAT_AI,
  }),
  defineEndpoint({
    id: 'ai-context-mining',
    path: '/api/v1/ai/context/mining',
    category: 'ai-context',
    auth: 'session',
    surface: '/admin/api-explorer',
    enveloped: false,
    summary: 'Contexte IA du domaine minage.',
    caveat: CAVEAT_AI,
  }),

  // ── Actions Keeper ────────────────────────────────────────────────────────
  // Aucune de ces routes ne signe de transaction : le service ne dispose
  // d'aucun helper d'écriture on-chain (docs/architecture.md du backend).
  defineEndpoint({
    id: 'keeper-mining-report',
    method: 'POST',
    path: '/api/v1/mining/metrics/report',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Déclare des métriques de minage.',
    caveat: 'Corps `{ hashrateTh, btcEarnedSats }`, entiers bornés non négatifs, validation `.strict()`.',
  }),
  defineEndpoint({
    id: 'keeper-electricity-pay',
    method: 'POST',
    path: '/api/v1/mining/electricity/pay',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Enregistre un paiement d’électricité.',
    caveat: 'Ne signe aucune transaction.',
  }),
  defineEndpoint({
    id: 'keeper-rebalancing-execute',
    method: 'POST',
    path: '/api/v1/rebalancing/execute',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Demande l’exécution d’un rééquilibrage.',
    caveat: 'Ne signe aucune transaction.',
  }),
  defineEndpoint({
    id: 'keeper-rwa-vault',
    method: 'POST',
    path: '/api/v1/rwa-vault',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Écriture RWA vault.',
    caveat: CAVEAT_KEEPER_501,
  }),
  defineEndpoint({
    id: 'keeper-btc-deposit-initiate',
    method: 'POST',
    path: '/api/v1/btc-deposit/initiate',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Ouvre un dépôt BTC.',
    caveat: CAVEAT_KEEPER_501,
  }),
  defineEndpoint({
    id: 'keeper-btc-deposit-complete',
    method: 'POST',
    path: '/api/v1/btc-deposit/complete',
    category: 'keeper',
    auth: 'admin',
    surface: '/admin/keeper',
    enveloped: false,
    summary: 'Clôt un dépôt BTC.',
    caveat: CAVEAT_KEEPER_501,
  }),
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
