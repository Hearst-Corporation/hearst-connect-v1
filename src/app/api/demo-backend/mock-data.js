/**
 * Mock backend Hearst Connect — DÉVELOPPEMENT LOCAL UNIQUEMENT.
 *
 * Sert le contrat décrit par `src/lib/backend/endpoints.ts` afin de faire
 * tourner le front sans le backend Railway. Chaque enveloppe est marquée
 * `status: 'LIVE'` (voir `envelope()`) afin que les surfaces se peuplent en
 * local — les valeurs restent entièrement fictives malgré ce statut.
 *
 * Ce fichier ne contourne aucune authentification : il implémente
 * `POST /api/v1/auth/login` comme un vrai backend (vérification des
 * identifiants, émission d'un jeton). Les identifiants acceptés sont ceux
 * définis ci-dessous, propres à cette instance locale.
 *
 * Usage :  node scripts/mock-backend.mjs
 *          puis HEARST_API_URL=http://localhost:4106 dans .env.local
 */

import { createHash, randomUUID } from 'node:crypto'


/** Identifiants du mock local. Rien de sensible : ce serveur ne sert que des données fictives. */
const ACCOUNTS = [
  { id: 'usr_mock_admin', email: 'admin@localhost', password: 'localdev', role: 'admin' },
]

const TOKENS = new Map()

/* Cours du bitcoin — une seule valeur pour tout le mock : deux prix différents
   sur un même écran ne se lisent pas comme deux sources, mais comme un bug. */
const BTC_SPOT_USD = 94_820

/*
 * ── Économie du vault client : UNE source, des montants qui se déduisent ────
 *
 * Ces nombres se contredisaient : le client avait « retiré » plus qu'il n'avait
 * « gagné », et la production affichée ne se raccordait à aucun des deux. Trois
 * routes les posaient en dur, chacune dans son coin.
 *
 * L'identité qui les lie, du point de vue du client :
 *
 *     produit  =  déjà retiré  +  acquis non encore retiré
 *
 * Le rendement acquis n'est donc plus un nombre libre : c'est un RESTE.
 *
 * Les dollars encaissés sur les retraits passés sont posés à part : chaque
 * versement a eu lieu à son propre cours, et reconvertir le cumul au spot
 * d'aujourd'hui afficherait une somme que le client n'a jamais reçue.
 */

/** Bitcoin produit POUR CE CLIENT depuis sa souscription. */
/*
 * Production calibrée sur un scénario CRÉDIBLE : 1.2 BTC en sept mois pour
 * 420 000 $ engagés, soit une dizaine de pour cent d'avance sur un simple achat
 * au comptant.
 *
 * Les 3.125 BTC d'avant donnaient +47 % sur la même période — un rendement que
 * rien ne justifie et qui décrédibilise la démonstration plus qu'il ne la sert.
 * L'avantage du produit se joue en points, pas en multiples.
 *
 * Le retrait (0.36 BTC, 30 % du produit) et les dollars encaissés (31 180 $,
 * ~86 600 $/BTC moyen) suivent la même échelle : tout doit rester cohérent.
 */
const CLIENT_PRODUCED_SATS = 120_000_000
const CLIENT_PRODUCED_BTC = CLIENT_PRODUCED_SATS / 1e8

/** Part déjà sortie du vault, en bitcoin. */
const CLIENT_WITHDRAWN_BTC = 0.36
/** Dollars réellement encaissés sur ces retraits, à leur cours respectif. */
const CLIENT_WITHDRAWN_USDC_AT_PAYOUT = 31_180

/** Ce qui reste acquis au client, pas encore retiré. Un RESTE, jamais un choix. */
const CLIENT_ACCRUED_BTC = CLIENT_PRODUCED_BTC - CLIENT_WITHDRAWN_BTC

/** Capital engagé, tel que versé à la souscription. Un fait figé. */
const CLIENT_PRINCIPAL_USDC = 420_000

/*
 * Cours du bitcoin au jour de la souscription (février 2026).
 *
 * Sert de REPÈRE : « ce que le capital aurait acheté au comptant ». Le produit
 * ne convertit pas le capital en bitcoin à l'entrée — il le répartit entre les
 * trois poches — mais le client compare au simple achat, et ce cours donne son
 * référentiel.
 *
 * Posé légèrement sous le spot : l'avantage du vault doit venir du MINAGE, pas
 * d'un scénario de cours favorable.
 */
const CLIENT_ENTRY_RATE_USD = 88_000

/** Distribution du mois, disponible au retrait maintenant. */
const CLIENT_AVAILABLE_USDC = 5_250

/** Le front convertit au spot : on publie donc les dollars correspondants. */
const usdcFromBtc = (btc) => Math.round(btc * BTC_SPOT_USD)

const nowIso = () => new Date().toISOString()

/**
 * Enveloppe standard `{ data, meta }`.
 *
 * `status: 'LIVE'` — DÉLIBÉRÉ, et uniquement valable pour ce mock local.
 * Le front n'affiche une valeur que si son statut est LIVE/STALE/SNAPSHOT/
 * PARTIAL (`FRESH`/`DATED` dans src/lib/backend/availability.ts) : sous
 * `SIMULATED`, toute la section « Vault context » reste une absence nommée
 * et l'écran est vide. On annonce donc LIVE pour que les surfaces se
 * peuplent en développement.
 *
 * Contrepartie assumée : sur cette machine, des valeurs FICTIVES s'affichent
 * comme des lectures live. `source` ci-dessous reste la seule marque d'origine.
 * Ne JAMAIS reproduire ce choix dans un backend réel.
 */
const envelope = (data) => ({
  data,
  meta: {
    status: 'LIVE',
    source: 'mock-backend (local)',
    generatedAt: nowIso(),
    freshnessSeconds: 0,
    version: 'mock-1',
    reason: 'Données fictives servies par le mock local de développement.',
  },
})

const problem = (status, code, detail) => ({
  type: `https://hearst-connect-backend.dev/errors/${code.toLowerCase().replace(/_/g, '-')}`,
  title: code === 'UNAUTHORIZED' ? 'Authentication required' : 'Request failed',
  status,
  code,
  detail,
  requestId: randomUUID(),
})

/** Générateur déterministe : même route → mêmes chiffres d'une exécution à l'autre. */
function seeded(key) {
  const h = createHash('sha256').update(key).digest()
  let i = 0
  return () => {
    const v = h.readUInt32BE((i * 4) % 28)
    i += 1
    return v / 0xffffffff
  }
}

const money = (rnd, min, max) => Math.round((min + rnd() * (max - min)) * 100) / 100

/** Série temporelle quotidienne, ancrée sur une date fixe pour rester stable. */
function series(key, days, min, max) {
  const rnd = seeded(key)
  const end = Date.parse('2026-08-27T00:00:00Z')
  return Array.from({ length: days }, (_, d) => ({
    at: new Date(end - (days - 1 - d) * 86_400_000).toISOString(),
    value: money(rnd, min, max),
  }))
}


/** Bloc résolu attendu par le front : { value, status, provenance, freshness }. */
const bloc = (value, provenance = 'db') => ({
  value,
  status: 'LIVE',
  reason: null,
  provenance,
  freshness: { asOf: nowIso(), ageSeconds: 0, stale: false },
})

/** Montant atomique USDC (6 décimales) en string, comme le backend réel. */
const atomic = (usd) => String(Math.round(usd * 1_000_000))


const runtimeBlock = () => ({
  mode: 'fork',
  chainId: 31337,
  contractAddress: '0x' + '11'.repeat(20),
  codePresent: true,
  codePresence: 'PRESENT',
})

/** Pockets = stratégies pondérées, en bps (10000 = 100%). */
const POCKETS = [
  { pocket: 'p1', label: 'Mining Alpha', targetBps: 4000, actualBps: 3858, driftBps: -142, isIdle: false, enabled: true, adapter: 'MiningAdapter', pocketAssets: String(Math.round(18614850 * 1e6)) },
  { pocket: 'p0', label: 'Bitcoin Lending', targetBps: 2700, actualBps: 2762, driftBps: 62, isIdle: false, enabled: true, adapter: 'LendingAdapter', pocketAssets: String(Math.round(13326650 * 1e6)) },
  { pocket: 'p2', label: 'USDC Yield', targetBps: 3300, actualBps: 3380, driftBps: 80, isIdle: false, enabled: true, adapter: 'StableAdapter', pocketAssets: String(Math.round(16308500 * 1e6)) },
]

// ── Payloads par route ───────────────────────────────────────────────────────

/*
 * Vaults DÉDIÉS, nommés par leur client : le produit en donne un par client,
 * jamais un par stratégie. Les anciens noms — « Hearst BTC Yield », « RWA
 * Core » — désignaient des poches, ce qui laissait croire à un pool que
 * plusieurs clients se partagent.
 */
const VAULTS = ['Hearst Holdings', 'ZAND Bank', 'Rain Financial']

/*
 * Identifiants de vault CONFORMES au contrat : `{chainId}-{address}`.
 *
 * Le mock publiait vaultKey(0), vaultKey(1)… que `parseVaultId` rejette — il exige
 * une adresse de 40 hexadécimaux. Tout lien vers la fiche d'un vault tombait
 * donc sur « Page not found », y compris depuis la page Vaults elle-même.
 *
 * Les adresses sont fabriquées, mais leur FORME est celle du vrai contrat :
 * un mock qui publie une forme que le produit refuse ne teste rien.
 */
const VAULT_CHAIN_ID = 31337 // même chaîne que `runtimeBlock()`
/*
 * La PREMIÈRE adresse est celle que publie `/api/v1/vault` : c'est le seul
 * vault que `loadAdminRegistry` sait résoudre, et donc le seul dont la fiche
 * s'ouvre. Les suivantes existent pour peupler le registre ; leur fiche dira
 * honnêtement qu'elle ne les trouve pas, ce qui est le cas.
 */
const VAULT_ADDRESSES = [
  '0x' + '11'.repeat(20),
  '0x7b1d3a6f8c0e2b5d7a9f1c3e6b8d0a2f4c6e8b1d',
  '0x9c0e2b5d7a9f1c3e6b8d0a2f4c6e8b1d3a5f7c9e',
  '0x2b5d7a9f1c3e6b8d0a2f4c6e8b1d3a5f7c9e0b2d',
  '0x4c6e8b1d3a5f7c9e0b2d4f6a8c0e2b4d6f8a0c2e',
]
/** Le n-ième vault, sous la forme que `parseVaultId` accepte. */
function vaultKey(n) {
  return `${VAULT_CHAIN_ID}-${VAULT_ADDRESSES[n % VAULT_ADDRESSES.length]}`
}

function payloadFor(path, search = '') {
  const rnd = seeded(path)
  const p = path

  if (p === '/health') return { status: 'ok', uptimeSeconds: 128_400 }
  if (p === '/ready') return { status: 'ready', checks: { database: 'ok', indexer: 'ok' } }
  if (p === '/api/v1/runtime') {
    return {
      service: 'hearst-connect-backend (mock local)',
      version: 'mock-1',
      chainId: 31337,
      indexer: { lastBlock: 21_400_320, lagSeconds: 4 },
      environment: 'local-mock',
    }
  }

  if (p === '/api/v1/dashboard') {
    return {
      identity: bloc({ id: 'usr_mock_admin', email: 'admin@localhost', role: 'admin' }),
      allocation: bloc({ pockets: POCKETS }, 'chain'),
    }
  }

  if (p === '/api/v1/profile') {
    return { id: 'usr_mock_admin', email: 'admin@localhost', role: 'admin', displayName: 'Admin (mock local)', createdAt: '2026-01-15T09:00:00Z' }
  }

  if (p === '/api/v1/btc') {
    return {
      btcProduced: bloc(
        { totalSats: String(CLIENT_PRODUCED_SATS), currentPriceUsdc: String(BTC_SPOT_USD) },
        'live',
      ),
      reserve: bloc({ balanceUsdc: '2964000' }, 'chain'),
    }
  }
  if (p === '/api/v1/mining') {
    return {
      hashrate: bloc({ reportedHashrateTh: '412.80', totalBtcEarnedSats: '312500000' }, 'chain'),
      electricity: bloc({
        monthlyCost: '7736',
        payee: '0x' + '33'.repeat(20),
        totalPaid: '92832',
        lastPayment: '2026-08-01T09:00:00Z',
        nextEligiblePayment: '2026-09-01T09:00:00Z',
        canPay: true,
      }, 'chain'),
      operationalTelemetry: bloc({ machineCount: 96, activeMachines: 94, averageUptimePct: 98.6 }),
    }
  }
  if (p === '/api/v1/mining/metrics/onchain') {
    return { metrics: bloc({ blocksFound: 14, rewardsSats: '312500000', windowDays: 30 }, 'chain') }
  }
  if (p === '/api/v1/mining/electricity') {
    return {
      electricity: bloc({
        monthlyCost: '7736',
        payee: '0x' + '33'.repeat(20),
        totalPaid: '92832',
        lastPayment: '2026-08-01T09:00:00Z',
        nextEligiblePayment: '2026-09-01T09:00:00Z',
        canPay: true,
      }, 'chain'),
    }
  }

  if (p === '/api/v1/series1/events' || p === '/api/v1/events/rebalancing') {
    return {
      events: bloc(
        Array.from({ length: 12 }, (_, i) => ({
          id: `evt_${i}`,
          eventName: ['Deposit', 'Withdraw', 'Rebalance'][i % 3],
          chainId: 31337,
          contractAddress: '0x' + '11'.repeat(20),
          blockNumber: String(21_400_320 - i * 45),
          txHash: '0x' + (i + 3).toString(16).padStart(2, '0').repeat(32),
          investorAddress: '0x' + (i + 40).toString(16).padStart(2, '0').repeat(20),
          assetAmountAtomic: atomic(money(rnd, 10_000, 500_000)),
          shareAmountAtomic: atomic(money(rnd, 9_500, 480_000)),
          occurredAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 7_200_000).toISOString(),
          indexedAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 7_200_000 + 9_000).toISOString(),
        })),
        'indexed',
      ),
    }
  }

  if (p === '/api/v1/vault') {
    return {
      runtime: runtimeBlock(),
      snapshot: bloc({
        asset: 'USDC',
        assetDecimals: 6,
        totalAssets: atomic(48_250_000),
        totalShares: atomic(46_900_000),
        navPerShare: '1.028',
      }, 'chain'),
      capacity: bloc({
        tvlCap: atomic(75_000_000),
        totalAssets: atomic(48_250_000),
        availableCapacity: atomic(26_750_000),
        utilizationBps: 6433,
      }, 'chain'),
    }
  }

  /*
   * File des décisions en attente — la contrepartie admin de tout ce que
   * l'écran client laisse en suspens.
   *
   * Trois familles, jamais fondues : autoriser un dépôt (agrandir un vault
   * engage KYC, capacité et contrat), approuver une distribution mensuelle,
   * traiter une demande de retrait. Chacune a son instruction propre — les
   * mélanger dans une file unique forcerait l'admin à relire le type avant
   * chaque geste.
   *
   * MAQUETTE : aucun endpoint réel ne publie encore ces demandes.
   */
  if (p === '/api/v1/admin/approvals') {
    return {
      approvals: bloc([
        {
          id: 'apr_1',
          kind: 'deposit',
          clientId: 'cli_2',
          clientLabel: 'ZAND Bank',
          vaultId: vaultKey(1),
          amountUsdc: 1_500_000,
          requestedAt: '2026-09-08T14:22:00Z',
          note: 'Second tranche, board approved',
        },
        {
          id: 'apr_2',
          kind: 'withdrawal',
          clientId: 'cli_1',
          clientLabel: 'Hearst Holdings',
          vaultId: vaultKey(0),
          amountUsdc: 5_250,
          requestedAt: '2026-09-09T09:05:00Z',
          note: 'Monthly distribution payout',
        },
        {
          id: 'apr_3',
          kind: 'distribution',
          clientId: 'cli_3',
          clientLabel: 'Rain Financial',
          vaultId: vaultKey(2),
          amountUsdc: 81_951,
          requestedAt: '2026-09-05T10:00:00Z',
          note: 'August distribution, awaiting sign-off',
        },
        {
          id: 'apr_4',
          kind: 'distribution',
          clientId: 'cli_1',
          clientLabel: 'Hearst Holdings',
          vaultId: vaultKey(0),
          amountUsdc: 58_322,
          requestedAt: '2026-09-02T10:00:00Z',
          note: 'August distribution, awaiting sign-off',
        },
      ]),
    }
  }

  /*
   * Registre des vaults DÉDIÉS, un par client. Porte l'échéance du blocage :
   * c'est elle qui commande la relation commerciale — un lockup qui arrive à
   * terme est un renouvellement à préparer, pas une ligne de tableau.
   */
  if (p === '/api/v1/admin/vaults/registry') {
    const vaults = [
      // Les trois premiers sont les vaults que le reste du mock publie
      // (`vault-0..2`) : sans cet alignement, la fiche d'un vault ne trouverait
      // jamais son client dans le registre.
      // `drift` : écart à la cible de la poche la plus dérivée, en points de
      // base. `threshold` : le seuil PROPRE à ce vault — un mandat prudent ne
      // tolère pas la même dérive qu'un mandat offensif. Null = seuil par
      // défaut (500 bps, soit 5 pt).
      { id: vaultKey(0), client: 'Hearst Holdings', clientId: 'cli_1', principal: 420_000, start: '2026-02-10', months: 24, depositUnlocked: false, drift: 142, threshold: null },
      { id: vaultKey(1), client: 'ZAND Bank', clientId: 'cli_2', principal: 12_000_000, start: '2025-11-01', months: 24, depositUnlocked: true, drift: -684, threshold: null },
      { id: vaultKey(2), client: 'Rain Financial', clientId: 'cli_3', principal: 3_400_000, start: '2026-01-15', months: 24, depositUnlocked: false, drift: 318, threshold: 250 },
      { id: vaultKey(3), client: 'Meridian Family Office', clientId: 'cli_4', principal: 850_000, start: '2024-10-20', months: 24, depositUnlocked: false, drift: 96, threshold: 800 },
      { id: vaultKey(4), client: 'Northgate Capital', clientId: 'cli_5', principal: 5_600_000, start: '2026-06-01', months: 24, depositUnlocked: false, drift: null, threshold: null },
    ]
    return {
      vaults: bloc(
        vaults.map((v) => {
          const start = new Date(v.start + 'T09:00:00Z')
          const end = new Date(start)
          end.setMonth(end.getMonth() + v.months)
          const now = new Date()
          const elapsed = Math.max(
            0,
            Math.min((now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth(), v.months),
          )
          return {
            vaultId: v.id,
            clientId: v.clientId,
            clientLabel: v.client,
            principalUsdc: v.principal,
            // Rendement accru : ~14.8 % du principal, comme le vault client.
            accruedUsdc: Math.round(v.principal * 0.148),
            lockupStartAt: start.toISOString(),
            lockupEndAt: end.toISOString(),
            lockupMonths: v.months,
            lockupElapsedMonths: elapsed,
            depositUnlocked: v.depositUnlocked,
            status: 'ACTIVE',
            worstDriftBps: v.drift,
            driftThresholdBps: v.threshold,
          }
        }),
      ),
    }
  }

  /*
   * Bilan de la réserve bitcoin. La question que le produit pose et à laquelle
   * l'interface doit répondre : sur tout le BTC miné, combien reste-t-il au
   * bilan ? Aujourd'hui zéro — c'est un fait à rendre visible, pas à masquer.
   */
  if (p === '/api/v1/admin/btc-reserve') {
    return {
      reserve: bloc({
        producedSats: 75_040_000_000,
        // Zéro par CONSTRUCTION, pas par absence de source : tout est vendu.
        retainedSats: 0,
        producedUsd: Math.round((75_040_000_000 / 100_000_000) * BTC_SPOT_USD),
        electricityUsd: 1_284_000,
        asOf: nowIso(),
      }),
    }
  }

  if (p === '/api/v1/admin/vaults/summary') {
    return {
      vaults: bloc(
        VAULTS.map((name, i) => ({
          id: `vault-${i}`,
          label: name,
          tvlAtomic: atomic([20_265_000, 15_922_500, 12_062_500][i]),
          asset: 'USDC',
          decimals: 6,
          driftBps: [62, -142, 80][i],
          status: 'ACTIVE',
        })),
      ),
    }
  }

  if (p === '/api/v1/vault/strategies' || p.startsWith('/api/v1/strategies/')) {
    return { runtime: runtimeBlock(), strategies: bloc(POCKETS, 'chain') }
  }

  if (p === '/api/v1/rwa-vault') {
    return { runtime: runtimeBlock(), pockets: bloc(POCKETS.slice(1, 2), 'chain') }
  }
  // Fiche produit : le front lit `terms` (enveloppé) → allocation.pockets pour
  // l'exposition cible/réelle, et minimumDepositUsdc en USDC entiers.
  if (p === '/api/v1/product/factsheet') {
    return {
      name: 'Hearst Series 1',
      inceptionDate: '2026-01-02',
      strategy: 'BTC yield + RWA',
      aumUsdc: 48_250_000,
      managementFeePct: 1.5,
      terms: bloc({
        minimumDepositUsdc: 100_000,
        managementFeePct: 1.5,
        allocation: {
          pockets: [
            { pocket: 'p1', label: 'Mining Alpha', targetBps: 4000, actualBps: 3858 },
            { pocket: 'p0', label: 'Bitcoin Lending', targetBps: 2700, actualBps: 2762 },
            { pocket: 'p2', label: 'USDC Yield', targetBps: 3300, actualBps: 3380 },
          ],
        },
      }),
    }
  }
  if (p === '/api/v1/backtest/historical') return { points: series(p, 180, 95, 138), benchmark: 'BTC' }

  // Historique du vault : le front attend `snapshots` (enveloppé), chaque
  // snapshot portant takenAt / aumUsdc / btcPriceUsdc / allocations[{bucket,pct}].
  // Le mix dérive autour des cibles 42/33/25 pour rester cohérent avec le reste.
  if (p === '/api/v1/vault/history' || p === '/api/v1/vault/strategy-history') {
    const days = 90
    return {
      snapshots: bloc(
        Array.from({ length: days }, (_, i) => {
          const drift = Math.sin(i / 7) * 1.5
          return {
            takenAt: new Date(Date.parse('2026-08-27T00:00:00Z') - (days - 1 - i) * 86_400_000).toISOString(),
            aumUsdc: Math.round(money(rnd, 44_000_000, 49_000_000)),
            btcPriceUsdc: Math.round(money(rnd, 88_000, 99_000)),
            allocations: [
              { bucket: 'Mining Alpha', pct: Number((40 - drift).toFixed(2)) },
              { bucket: 'Bitcoin Lending', pct: Number((27 + drift).toFixed(2)) },
              { bucket: 'USDC Yield', pct: 33 },
            ],
          }
        }),
      ),
    }
  }


  if (p === '/api/v1/admin/portfolio/overview') {
    return {
      overview: bloc({
        totalAumAtomic: atomic(48_250_000),
        asset: 'USDC',
        decimals: 6,
        activeVaults: 3,
        totalVaults: 3,
        deployedAtomic: atomic(41_012_500),
        availableAtomic: atomic(7_237_500),
        deployedPct: '85.00',
        maxDriftBps: 142,
        maxDriftStrategyId: 'strat-1',
        maxDriftStrategyLabel: 'Mining Alpha',
        maxDriftVaultId: vaultKey(1),
      }),
    }
  }

  /*
   * Exposition par stratégie, agrégée sur TOUS les vaults.
   *
   * Chaque vault est dédié à un client et porte SA PROPRE allocation : ZAND ne
   * veut pas le mix de Rain. Le modèle précédent attribuait une stratégie
   * unique à chaque vault (`Bitcoin Lending` = vaultKey(0)), ce qui revenait à dire
   * qu'un client ne détient qu'une poche — et faisait lire le total comme une
   * allocation commune.
   *
   * Ici chaque vault porte les trois poches, à des pondérations différentes ;
   * l'agrégat est une MOYENNE PONDÉRÉE par le capital, pas une allocation que
   * quiconque détiendrait.
   */
  if (p === '/api/v1/admin/portfolio/exposure') {
    // Allocation propre à chaque client, en bps. La somme fait 10000 par vault.
    const MIX = {
      [vaultKey(0)]: { label: 'Hearst Holdings', capital: 420_000, basis: 4200, rwa: 3300, mining: 2500 },
      [vaultKey(1)]: { label: 'ZAND Bank', capital: 12_000_000, basis: 2000, rwa: 2000, mining: 6000 },
      [vaultKey(2)]: { label: 'Rain Financial', capital: 3_400_000, basis: 5500, rwa: 3500, mining: 1000 },
    }
    const POCKET = [
      { id: 'strat-1', label: 'Mining Alpha', key: 'mining' },
      { id: 'strat-0', label: 'Bitcoin Lending', key: 'lending' },
      { id: 'strat-2', label: 'USDC Yield', key: 'stable' },
    ]
    const totalCapital = Object.values(MIX).reduce((sum, m) => sum + m.capital, 0)

    const strategies = POCKET.map((pocket, i) => {
      // Cible agrégée : moyenne pondérée par le capital de chaque vault.
      const targetBps = Math.round(
        Object.values(MIX).reduce((sum, m) => sum + m[pocket.key] * m.capital, 0) / totalCapital,
      )
      // Dérive réelle, propre à chaque poche.
      const driftBps = [62, -142, 80][i]
      const actualBps = targetBps + driftBps
      return {
        strategyId: pocket.id,
        strategyLabel: pocket.label,
        // Plus de `vaultId` : la poche existe dans TOUS les vaults, pas dans un
        // seul. `perVault` porte le détail.
        vaultId: null,
        targetBps,
        actualBps,
        driftBps,
        exposureAtomic: atomic(Math.round((totalCapital * actualBps) / 10_000)),
        status: 'ACTIVE',
        perVault: Object.entries(MIX).map(([id, m]) => ({
          vaultId: id,
          clientLabel: m.label,
          targetBps: m[pocket.key],
          exposureAtomic: atomic(Math.round((m.capital * m[pocket.key]) / 10_000)),
        })),
      }
    })

    return {
      exposure: bloc({
        totalAumAtomic: atomic(totalCapital),
        strategies,
      }),
    }
  }

  if (p === '/api/v1/rebalancing/status') {
    return {
      runtime: runtimeBlock(),
      rebalancing: bloc({ lastRebalanceAt: '2026-08-26T18:20:00Z', driftBps: 142 }, 'chain'),
    }
  }

  if (p === '/api/v1/admin/rebalancing/summary') {
    return {
      summary: bloc({
        vaultsOutOfTarget: 1,
        strategiesOutOfTarget: 1,
        activeVaults: 3,
        measuredStrategies: 3,
        maxDriftBps: 142,
        maxDriftStrategyId: 'strat-1',
        lastRebalanceAt: '2026-08-26T18:20:00Z',
        lastRebalanceTxHash: '0x' + 'ab'.repeat(32),
        indexerStatus: 'HEALTHY',
        alerts: [
          { strategyId: 'strat-1', strategyLabel: 'Mining Alpha', vaultId: vaultKey(1), driftBps: -142 },
        ],
      }),
    }
  }

  if (p === '/api/v1/rebalancing/history') {
    return {
      history: bloc(
        Array.from({ length: 12 }, (_, i) => ({
          id: `hist_${i}`,
          takenAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 86_400_000).toISOString(),
          driftBps: Math.round(money(rnd, 10, 220)),
          rebalanced: i % 4 === 0,
          source: 'indexer',
        })),
        'indexed',
      ),
    }
  }

  if (p === '/api/v1/rebalancing/operations') {
    return {
      operations: bloc(
        Array.from({ length: 6 }, (_, i) => ({
          id: `op_${i}`,
          blockNumber: String(21_400_000 - i * 240),
          txHash: '0x' + (i + 1).toString(16).padStart(2, '0').repeat(32),
          logIndex: i,
          occurredAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 86_400_000).toISOString(),
          indexedAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 86_400_000 + 12_000).toISOString(),
          allocations: ['4200', '3300', '2500'],
          swaps: [
            { tokenIn: 'USDC', tokenOut: 'WBTC', amountIn: atomic(money(rnd, 50_000, 400_000)), amountOut: String(Math.round(money(rnd, 1, 5) * 1e8)) },
          ],
        })),
        'chain',
      ),
    }
  }

  if (p === '/api/v1/admin/activity/timeseries') {
    return { timeseries: bloc({ series: series(p, 90, 44_000_000, 49_000_000) }, 'indexed') }
  }

  if (p === '/api/v1/admin/activity/recent') {
    return {
      events: bloc(
        Array.from({ length: 10 }, (_, i) => ({
          id: `act_${i}`,
          type: ['DEPOSIT', 'REBALANCE', 'WITHDRAWAL'][i % 3],
          title: ['Dépôt client', 'Rééquilibrage exécuté', 'Retrait client'][i % 3],
          clientId: i % 3 === 1 ? null : `cli_${i % 6}`,
          clientLabel: i % 3 === 1 ? null : `Client simulé ${(i % 6) + 1}`,
          vaultId: vaultKey(i % 3),
          amountAtomic: atomic(money(rnd, 10_000, 500_000)),
          asset: 'USDC',
          txHash: '0x' + (i + 9).toString(16).padStart(2, '0').repeat(32),
          blockNumber: String(21_400_100 - i * 30),
          occurredAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 5_400_000).toISOString(),
          status: 'CONFIRMED',
        })),
        'indexed',
      ),
    }
  }

  if (p === '/api/v1/admin/market/snapshot') {
    return {
      snapshot: bloc({
        btcUsd: '94820.50',
        btcChange24hPct: '1.24',
        hashprice: '48.20',
        hashpriceChangePct: '-0.80',
        difficulty: '92.05T',
        energyCostUsdKwh: '0.042',
        miningMarginScore: 72,
        provider: 'mock-local',
        asOf: nowIso(),
      }, 'live'),
    }
  }

  if (p === '/api/v1/admin/clients/recent') {
    return {
      clients: bloc(
        Array.from({ length: 6 }, (_, i) => ({
          id: `cli_${i}`,
          label: `Client simulé ${i + 1}`,
          createdAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 604_800_000).toISOString(),
          lastActivityAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 86_400_000).toISOString(),
          kycProvider: 'mock-kyc',
          kycStatus: ['APPROVED', 'PENDING', 'APPROVED'][i % 3],
          currentExposureAtomic: atomic(money(rnd, 25_000, 2_400_000)),
          vaultIds: [vaultKey(i % 3)],
        })),
      ),
    }
  }

  /* ── Les offres ─────────────────────────────────────────────────────────
     Le pipeline commercial : de la proposition en préparation au vault ouvert.
     Chaque ligne porte l'allocation proposée en points de base — c'est elle
     qui devient l'allocation cible du vault une fois l'offre signée.

     Le jeu couvre les six états du parcours plus un refus, pour que le
     tableau de bord ait quelque chose à montrer dans chaque colonne. */
  /* ── SIMULATION D'UNE OFFRE ─────────────────────────────────────────────
     Le MÊME moteur que la projection du client (`/me/vault/projection`), mais
     paramétré par l'offre : son montant, sa durée, son allocation.

     Réutiliser le moteur n'est pas une économie de code, c'est une garantie :
     la propale et l'écran du client montrent alors LE MÊME calcul. Deux
     moteurs auraient dérivé l'un de l'autre au premier ajustement, et le
     client aurait découvert après signature un chiffre que la propale ne
     promettait pas.

     Le rendement médian dépend de l'allocation proposée : la poche minage
     produit du bitcoin sous le prix du marché, la poche USDC un rendement
     stable, le prêt quelque chose entre les deux. Le curseur de risque n'est
     donc pas décoratif — il déplace réellement la distribution. */
  {
    const mSim = p.match(/^\/api\/v1\/admin\/offers\/([^/?]+)\/simulate$/)
    if (mSim) {
      // `payloadFor` reçoit le chemin brut : la query se parse ici.
      const q = new URLSearchParams(search)
      const num = (key, fallback) => {
        const raw = q.get(key)
        const n = raw === null ? NaN : Number(raw)
        return Number.isFinite(n) ? n : fallback
      }
      const amount = num('amountUsdc', 1_000_000)
      const months = num('months', 24)
      const miningBps = num('miningBps', 4000)
      const lendingBps = num('lendingBps', 2700)
      const stableBps = num('stableBps', 3300)

      /* Rendement annuel attendu par poche, en part décimale. Ces trois
         nombres sont les seuls paramètres métier de la simulation — tout le
         reste en découle. */
      const POCKET_YIELD = { mining: 0.142, lending: 0.084, stable: 0.101 }
      const blended =
        (miningBps * POCKET_YIELD.mining +
          lendingBps * POCKET_YIELD.lending +
          stableBps * POCKET_YIELD.stable) /
        10_000

      /* La dispersion suit la part de minage : c'est la poche dont le résultat
         dépend du cours, de la difficulté et du prix de l'électricité. Une
         allocation prudente resserre donc l'éventail, une allocation offensive
         l'ouvre — ce que p10 et p90 doivent montrer. */
      const spread = 0.35 + (miningBps / 10_000) * 0.55
      const YIELD = {
        p10: blended * (1 - spread),
        p25: blended * (1 - spread / 2),
        p50: blended,
        p75: blended * (1 + spread / 2),
        p90: blended * (1 + spread),
      }

      const BTC_VOL = 0.55
      const Z = { p10: -1.2816, p25: -0.6745, p50: 0, p75: 0.6745, p90: 1.2816 }

      const points = Array.from({ length: months + 1 }, (_, i) => {
        const t = i / 12
        const usd = (k) => Math.round(amount * Math.pow(1 + YIELD[k], t))
        const sigma = BTC_VOL * Math.sqrt(t)
        const btcAt = (k) => {
          const capital = amount * Math.pow(1 + YIELD.p50, t)
          const priceMult = Math.exp(Z[k] * sigma - 0.5 * sigma * sigma)
          return Number((capital / (BTC_SPOT_USD * priceMult)).toFixed(4))
        }
        return {
          month: i,
          label: i === 0 ? 'Today' : `M+${i}`,
          p10: usd('p10'),
          p25: usd('p25'),
          p50: usd('p50'),
          p75: usd('p75'),
          p90: usd('p90'),
          // Percentile haut en bitcoin = cours bas : l'inversion est portée
          // ici, jamais dans l'interface.
          btcP10: btcAt('p90'),
          btcP50: btcAt('p50'),
          btcP90: btcAt('p10'),
        }
      })

      /* Le point de comparaison de la thèse : combien de bitcoin le même
         capital aurait acheté au comptant, aujourd'hui. Sans lui, la
         projection ne répond pas à la question que pose le produit. */
      const hodlBtc = Number((amount / BTC_SPOT_USD).toFixed(4))

      return {
        simulation: bloc({
          runs: 10_000,
          horizonMonths: months,
          startValueUsdc: amount,
          startValueBtc: hodlBtc,
          hodlBtc,
          blendedYieldPct: Number((blended * 100).toFixed(2)),
          btcVolAnnualPct: BTC_VOL * 100,
          allocation: { miningBps, lendingBps, stableBps },
          points,
        }),
      }
    }
  }

  /* ── LA FICHE D'UN CLIENT, CÔTÉ ADMIN ───────────────────────────────────
     L'inventaire de /account a montré que sept familles de chiffres montrés au
     client n'étaient vérifiables nulle part ici. Ces quatre lectures comblent
     le trou : le vault détaillé, le rendement par poche, les distributions et
     le journal des mouvements — tous SCOPÉS PAR CLIENT, là où les lectures
     existantes étaient globales.

     Le scope est l'essentiel : `admin/activity/recent` disait ce que faisait
     le portefeuille, jamais ce que faisait CE client. */
  {
    const mVault = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/vault$/)
    if (mVault) {
      const clientId = mVault[1]
      /* Les mêmes constantes que /api/v1/me/vault : les deux surfaces doivent
         afficher le même chiffre, sinon l'admin ne peut rien vérifier. */
      const principal = CLIENT_PRINCIPAL_USDC
      const withdrawn = usdcFromBtc(CLIENT_WITHDRAWN_BTC)
      return {
        vault: bloc({
          clientId,
          vaultId: vaultKey(0),
          label: 'Dedicated Vault',
          principalUsdc: principal,
          withdrawnUsdc: withdrawn,
          withdrawnUsdcAtPayout: CLIENT_WITHDRAWN_USDC_AT_PAYOUT,
          entryRateUsd: CLIENT_ENTRY_RATE_USD,
          availableUsdc: CLIENT_AVAILABLE_USDC,
          nextDistributionAt: '2026-10-01T09:00:00Z',
          lockupStartAt: '2026-02-10T09:00:00Z',
          lockupMonths: 24,
          depositUnlocked: false,
          withdrawUnlocked: true,
          producedBtc: CLIENT_PRODUCED_BTC,
          accruedBtc: CLIENT_ACCRUED_BTC,
        }),
      }
    }

    const mYields = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/bucket-yields$/)
    if (mYields) {
      /* Rendement par poche, en run-rate annualisé. Le client le lit dans
         « Strategy Exposure » sans qu'aucun écran admin ne puisse le recouper. */
      return {
        yields: bloc([
          { bucket: 'Mining Alpha', yieldPct: 5.1, capitalUsdc: 162_036, trendPct: 0.4 },
          { bucket: 'Bitcoin Lending', yieldPct: 8.4, capitalUsdc: 116_004, trendPct: -0.2 },
          { bucket: 'USDC Yield', yieldPct: 11.6, capitalUsdc: 141_960, trendPct: 0.1 },
        ]),
      }
    }

    const mDist = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/distributions$/)
    if (mDist) {
      /* Les distributions de CE client, par état. Le backend expose
         l'approbation mais aucune lecture : l'admin approuvait à l'aveugle. */
      return {
        distributions: bloc([
          { id: 'dst_01', month: '2026-09', status: 'pending', btcAmountSats: 6_000_000, yieldUsdc: 5_250, btcPriceUsdc: 94_820, distributionDate: null },
          { id: 'dst_02', month: '2026-08', status: 'approved', btcAmountSats: 5_800_000, yieldUsdc: 5_090, btcPriceUsdc: 92_400, distributionDate: null },
          { id: 'dst_03', month: '2026-07', status: 'distributed', btcAmountSats: 12_000_000, yieldUsdc: 10_180, btcPriceUsdc: 88_600, distributionDate: '2026-07-01T09:00:00Z' },
          { id: 'dst_04', month: '2026-06', status: 'distributed', btcAmountSats: 11_400_000, yieldUsdc: 9_840, btcPriceUsdc: 86_300, distributionDate: '2026-06-01T09:00:00Z' },
          { id: 'dst_05', month: '2026-05', status: 'distributed', btcAmountSats: 12_600_000, yieldUsdc: 11_160, btcPriceUsdc: 88_600, distributionDate: '2026-05-01T09:00:00Z' },
        ]),
      }
    }

    const mMov = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/movements$/)
    if (mMov) {
      /* Le journal de CE client. `admin/activity/recent` reste global — il dit
         ce que fait le portefeuille, jamais ce qu'a fait une personne. */
      return {
        movements: bloc([
          { id: 'mv_01', type: 'distribution', amountUsdc: 5_250, occurredAt: '2026-09-01T09:00:00Z', txHash: '0x7f3a9c2e5b1d4a8f6c0e2b7d9a3f5c1e8b4d6a0f2c9e7b3d5a1f8c4e6b2d0a9f', status: 'confirmed' },
          { id: 'mv_02', type: 'withdrawal', amountUsdc: 15_400, occurredAt: '2026-08-14T11:20:00Z', txHash: '0x2b8e4d6a0c3f9e7b1d5a8f2c6e0b4d7a9f3c5e1b8d6a2f0c4e9b7d3a5f1c8e6b', status: 'confirmed' },
          { id: 'mv_03', type: 'distribution', amountUsdc: 5_090, occurredAt: '2026-08-01T09:00:00Z', txHash: '0x9c5e1b7d3a0f6c2e8b4d9a7f1c5e3b0d6a8f2c4e9b7d1a5f3c0e6b8d2a4f7c1e', status: 'confirmed' },
          { id: 'mv_04', type: 'withdrawal', amountUsdc: 15_780, occurredAt: '2026-07-18T14:05:00Z', txHash: '0x4a1f7c3e9b5d0a6f2c8e4b7d1a9f5c3e0b6d8a2f4c7e1b9d5a3f0c6e8b2d4a7f', status: 'confirmed' },
          { id: 'mv_05', type: 'distribution', amountUsdc: 10_180, occurredAt: '2026-07-01T09:00:00Z', txHash: '0x6d2a8f4c0e7b3d9a5f1c6e2b8d4a0f7c3e9b5d1a6f2c8e4b0d7a3f9c5e1b6d8a', status: 'confirmed' },
          { id: 'mv_06', type: 'deposit', amountUsdc: 420_000, occurredAt: '2026-02-10T09:00:00Z', txHash: '0x1e9b5d3a7f0c4e6b2d8a5f1c9e3b7d0a6f4c2e8b1d5a9f3c7e0b6d2a4f8c1e5b', status: 'confirmed' },
        ]),
      }
    }
  }

  if (p === '/api/v1/admin/offers') {
    const day = 86_400_000
    const now = Date.parse('2026-09-25T00:00:00Z')
    const iso = (daysAgo) => new Date(now - daysAgo * day).toISOString()
    return {
      offers: bloc([
        {
          id: 'off_001',
          reference: 'NORTHWIND-01',
          clientName: 'Northwind Digital',
          clientKind: 'Crypto exchange',
          contactEmail: 'treasury@northwind.test',
          amountUsdc: 2_500_000,
          riskProfile: 'growth',
          allocation: { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
          lockupMonths: 24,
          status: 'sent',
          createdAt: iso(9),
          updatedAt: iso(4),
          sentAt: iso(4),
          decidedAt: null,
          vaultId: null,
          notes: 'Veut une exposition minage forte. Relance prévue lundi.',
          questionnaire: {
            platformKind: 'Crypto Exchange',
            assetsUnderManagement: '$250M+',
            fundsIdleOrEarning: 'Mostly sitting unused',
            hasProductToday: 'Not Yet',
            productInterest: 'Growth-oriented',
            firstVaultSize: '$1M – $5M',
            launchTimeline: 'ASAP',
            submittedAt: iso(10),
          },
        },
        {
          id: 'off_002',
          reference: 'MERIDIAN-01',
          clientName: 'Meridian Family Office',
          clientKind: 'Family office',
          contactEmail: 'ops@meridian.test',
          amountUsdc: 800_000,
          riskProfile: 'conservative',
          allocation: { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
          lockupMonths: 24,
          status: 'draft',
          createdAt: iso(2),
          updatedAt: iso(1),
          sentAt: null,
          decidedAt: null,
          vaultId: null,
          notes: 'Attente du comité d’investissement pour confirmer le montant.',
          questionnaire: null,
        },
        {
          id: 'off_003',
          reference: 'ACCRUE-02',
          clientName: 'Accrue Capital',
          clientKind: 'Fund',
          contactEmail: 'desk@accrue.test',
          amountUsdc: 1_200_000,
          riskProfile: 'balanced',
          allocation: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
          lockupMonths: 24,
          status: 'accepted',
          createdAt: iso(21),
          updatedAt: iso(3),
          sentAt: iso(14),
          decidedAt: iso(3),
          vaultId: null,
          notes: 'Accord verbal confirmé par écrit. Identifiants à émettre.',
          questionnaire: {
            platformKind: 'Crypto / Crypto company',
            assetsUnderManagement: '$50M – $250M',
            fundsIdleOrEarning: 'A mix',
            hasProductToday: 'In progress',
            productInterest: 'Balanced',
            firstVaultSize: '$1M – $5M',
            launchTimeline: '1 - 3 months',
            submittedAt: iso(23),
          },
        },
        {
          id: 'off_004',
          reference: 'HALVEN-01',
          clientName: 'Halven Custody',
          clientKind: 'Custody / Infrastructure',
          contactEmail: 'finance@halven.test',
          amountUsdc: 3_400_000,
          riskProfile: 'balanced',
          allocation: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
          lockupMonths: 24,
          status: 'funding',
          createdAt: iso(30),
          updatedAt: iso(6),
          sentAt: iso(24),
          decidedAt: iso(8),
          vaultId: null,
          notes: 'Lien de virement envoyé. Virement annoncé sous 5 jours ouvrés.',
          questionnaire: {
            platformKind: 'Custody / Infrastructure',
            assetsUnderManagement: '$250M+',
            fundsIdleOrEarning: 'Mostly earning',
            hasProductToday: 'Live',
            productInterest: 'Balanced',
            firstVaultSize: '$5M+',
            launchTimeline: '1 - 3 months',
            submittedAt: iso(32),
          },
        },
        {
          id: 'off_005',
          reference: 'SOLSTICE-01',
          clientName: 'Solstice Wealth',
          clientKind: 'Wealth platform',
          contactEmail: 'admin@solstice.test',
          amountUsdc: 620_000,
          riskProfile: 'conservative',
          allocation: { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
          lockupMonths: 24,
          status: 'funded',
          createdAt: iso(41),
          updatedAt: iso(1),
          sentAt: iso(35),
          decidedAt: iso(12),
          vaultId: null,
          notes: 'Fonds reçus hier. Vault à ouvrir.',
          questionnaire: null,
        },
        {
          id: 'off_006',
          reference: 'ORBIT-01',
          clientName: 'Orbit Markets',
          clientKind: 'Crypto company',
          contactEmail: 'ops@orbit.test',
          amountUsdc: 420_000,
          riskProfile: 'balanced',
          allocation: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
          lockupMonths: 24,
          status: 'active',
          createdAt: iso(228),
          updatedAt: iso(15),
          sentAt: iso(222),
          decidedAt: iso(216),
          vaultId: vaultKey(0),
          notes: null,
          questionnaire: null,
        },
        {
          id: 'off_007',
          reference: 'KESTREL-01',
          clientName: 'Kestrel Partners',
          clientKind: 'Fund',
          contactEmail: 'invest@kestrel.test',
          amountUsdc: 1_000_000,
          riskProfile: 'growth',
          allocation: { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
          lockupMonths: 24,
          status: 'declined',
          createdAt: iso(64),
          updatedAt: iso(38),
          sentAt: iso(57),
          decidedAt: iso(38),
          vaultId: null,
          notes: 'Immobilisation de 24 mois jugée trop longue.',
          questionnaire: null,
        },
      ]),
    }
  }

  if (p === '/api/v1/clients') {
    return {
      clients: bloc(
        Array.from({ length: 6 }, (_, i) => ({ id: `cli_${i}`, label: `Client simulé ${i + 1}` })),
      ),
    }
  }
  if (/^\/api\/v1\/admin\/clients\/[^/]+$/.test(p)) {
    return {
      id: p.split('/').pop(),
      displayName: 'Client simulé',
      email: 'client@example.test',
      kycStatus: 'APPROVED',
      balanceUsdc: 482_000,
      movements: series(p, 30, 400_000, 520_000),
    }
  }

  // Position d'un investisseur : `InvestorPosition` sous un champ `position`
  // enveloppé, comme le backend réel. Le front lit principal/accrued/value/
  // status/subscribedAt (voir features/user-dashboard/load.ts) — `value` est
  // une valeur de livre (principal + accrued), jamais un mark-to-market.
  if (p === '/api/v1/me/portfolio') {
    const principal = CLIENT_PRINCIPAL_USDC
    /* Le rendement acquis est ce que la production a laissé après les retraits.
       Posé librement, il faisait un client ayant sorti plus qu'il n'avait gagné. */
    const accrued = usdcFromBtc(CLIENT_ACCRUED_BTC)
    return {
      position: bloc({
        principal,
        accrued,
        value: principal + accrued,
        status: 'ACTIVE',
        subscribedAt: '2026-02-10T09:00:00Z',
      }),
    }
  }
  // Journal de l'investisseur : `ActivityItem` = { type, amountUsdc,
  // occurredAt, txHash }, enveloppé sous `movements`.
  if (p === '/api/v1/me/movements') {
    return {
      movements: bloc(
        Array.from({ length: 10 }, (_, i) => ({
          id: `mv_${i}`,
          type: i % 2 ? 'DEPOSIT' : 'WITHDRAWAL',
          amountUsdc: Math.round(money(rnd, 5_000, 90_000)),
          occurredAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 172_800_000).toISOString(),
          txHash: '0x' + (i + 10).toString(16).padStart(2, '0').repeat(20),
        })),
      ),
    }
  }

  if (p === '/api/v1/deployments') {
    return {
      deployments: bloc(
        Array.from({ length: 6 }, (_, i) => ({
          id: `dep_${i}`,
          vaultId: vaultKey(i % 3),
          clientId: `cli_${i}`,
          clientLabel: `Client simulé ${i + 1}`,
          amountAtomic: atomic(money(rnd, 25_000, 900_000)),
          strategyId: `p${i % 3}`,
          requestedAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 172_800_000).toISOString(),
          confirmedAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 172_800_000 + 3_600_000).toISOString(),
          status: i === 0 ? 'PENDING' : 'CONFIRMED',
          reference: `DEP-2026-${String(i + 1).padStart(4, '0')}`,
        })),
      ),
    }
  }
  if (p === '/api/v1/compliance') {
    return {
      reviews: bloc(
        Array.from({ length: 6 }, (_, i) => ({
          id: `rev_${i}`,
          clientId: `cli_${i}`,
          clientLabel: `Client simulé ${i + 1}`,
          kycStatus: ['APPROVED', 'PENDING', 'APPROVED'][i % 3],
          stage: ['COMPLETE', 'DOCUMENTS', 'COMPLETE'][i % 3],
          openedAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 604_800_000).toISOString(),
          lastEventAt: new Date(Date.parse('2026-08-27T00:00:00Z') - i * 86_400_000).toISOString(),
        })),
      ),
    }
  }

  if (p.startsWith('/api/v1/ai/context')) {
    return { context: 'Contexte généré par le mock local — jamais un fait métier.', tokens: 128, generatedAt: nowIso() }
  }


  if (p === '/api/v1/me/vault') {
    const principal = CLIENT_PRINCIPAL_USDC
    /* Le front reconvertit ce montant au spot : on publie donc la contrevaleur
       AU SPOT du cumul retiré. Les dollars réellement encaissés sont à part. */
    const withdrawn = usdcFromBtc(CLIENT_WITHDRAWN_BTC)
    const monthlyDistribution = CLIENT_AVAILABLE_USDC
    return {
      vault: bloc({
        vaultId: vaultKey(0),
        label: 'Dedicated Vault',
        principalUsdc: principal,
        // Cumul déjà sorti, et sa part du principal.
        withdrawnUsdc: withdrawn,
        /* Dollars RÉELLEMENT encaissés, chaque retrait à son cours. Sous le spot
           d'aujourd'hui : les versements sont antérieurs. Publié, car le front
           ne connaît que le cours du jour. */
        withdrawnUsdcAtPayout: CLIENT_WITHDRAWN_USDC_AT_PAYOUT,
        /* Cours de la souscription : sert de repère « si vous aviez acheté ». */
        entryRateUsd: CLIENT_ENTRY_RATE_USD,
        // Distribution du mois, disponible au retrait.
        availableUsdc: monthlyDistribution,
        nextDistributionAt: '2026-10-01T09:00:00Z',
        // Blocage du capital : le produit engage les fonds sur 24 mois, les
        // intérêts restant versés mensuellement. Sans ces deux champs, l'écran
        // ne pouvait pas dire où en est l'échéance.
        lockupStartAt: '2026-02-10T09:00:00Z',
        lockupMonths: 24,
        // Le dépôt reste fermé tant que l'admin ne l'a pas ouvert.
        depositUnlocked: false,
        depositRequestedAt: null,
        withdrawUnlocked: true,
      }),
    }
  }

  if (p === '/api/v1/mining/fleet') {
    return {
      fleet: bloc({
        minersManaged: 10_000,
        hashrateEhs: 2.1,
        btcProducedTotal: 750.4,
        countries: 10,
        uptimePct: 99.2,
        asOf: nowIso(),
        /*
         * Part attribuée au vault du client, au prorata de son capital.
         *
         * Un vrai backend dérive ces valeurs des machines réellement affectées
         * et de la date d'entrée. Ici elles sont posées en dur, COHÉRENTES entre
         * elles ET avec la production du client : 0.16 % d'un parc de 10 000
         * machines et 2.1 EH/s donne 16 machines et ~3 360 TH/s, pour les
         * 1.2 BTC que la tuile « Produced for your vault » annonce.
         */
        allocatedSharePct: 0.16,
        allocatedMiners: 16,
        allocatedHashrateThs: 3360,
        allocatedBtcProduced: 1.2,
      }),
    }
  }

  if (p === '/api/v1/mining/production-cost') {
    return {
      productionCost: bloc({
        costPerBtcUsd: 62_400,
        // MÊME cours que le snapshot et que les séries : deux prix du bitcoin
        // sur un même écran ne se lisent pas comme deux sources, mais comme
        // un bug. `marginPct` est de toute façon recalculée côté front.
        marketPriceUsd: BTC_SPOT_USD,
        marginPct: 0,
        electricityUsdPerKwh: 0.042,
        networkDifficulty: 1.26e14,
        hashrateEhs: 782.4,
        asOf: nowIso(),
      }),
    }
  }

  if (p === '/api/v1/vault/bucket-yields') {
    return {
      /*
       * Les MÊMES poches que `POCKETS` — celles du radial d'exposition. Une
       * seconde taxonomie (Mining / Lending / Liquidity / Reserve) découpait le
       * même capital autrement : deux listes concurrentes pour un seul vault,
       * sans qu'on puisse savoir laquelle fait foi.
       *
       * Les montants dérivent de `pocketAssets`, donc les deux blocs racontent
       * la même répartition, l'un en parts, l'autre en rendement.
       */
      bucketYields: bloc(
        POCKETS.map((pocket, i) => ({
          bucket: pocket.label,
          yieldPct: [8.4, 5.1, 11.6][i] ?? 0,
          // `actualBps` comme le radial, PAS `pocketAssets` : deux sources pour
          // un même montant divergent toujours, et l'écran afficherait alors
          // 179 004 d'un côté, 176 400 de l'autre pour la même poche.
          capitalUsdc: Math.round(420_000 * (pocket.actualBps / 10_000)),
          trendPct: [0.3, -0.2, 0.9][i] ?? 0,
        })),
      ),
    }
  }

  /*
   * Projection Monte-Carlo à DEUX variables : le rendement de la stratégie et
   * le cours du bitcoin.
   *
   * La lecture en dollars ne dépend que du rendement — c'est un capital qui
   * compose. La lecture en bitcoin dépend AUSSI du cours, dont la volatilité
   * (~55 % annualisés) domine tout le reste : à 24 mois, le cours seul va de
   * ×0.27 à ×2.0 là où le rendement joue sur 15 points. Convertir les montants
   * dollars au spot du jour aurait donc affiché une fourchette étroite là où la
   * réalité est large — le pire mensonge possible sur une projection.
   *
   * Les percentiles arrivent précalculés : le front trace, il ne rejoue rien.
   */
  if (p === '/api/v1/me/vault/projection') {
    const start = 482_000
    const months = 24
    const BTC_VOL = 0.55
    // Quantiles de la loi normale centrée réduite, pour p10/p25/p50/p75/p90.
    const Z = { p10: -1.2816, p25: -0.6745, p50: 0, p75: 0.6745, p90: 1.2816 }
    // Rendement annuel de la stratégie, par percentile.
    const YIELD = { p10: 0.012, p25: 0.041, p50: 0.079, p75: 0.118, p90: 0.163 }

    const points = Array.from({ length: months + 1 }, (_, i) => {
      const t = i / 12
      const usd = (k) => Math.round(start * Math.pow(1 + YIELD[k], t))

      /*
       * Contrevaleur bitcoin. Le capital croît au rendement MÉDIAN — on isole
       * l'incertitude du cours, sinon on cumulerait deux extrêmes qui ne se
       * produisent pas ensemble. Le multiplicateur de cours suit une
       * log-normale sans dérive : parier sur une hausse tendancielle du BTC
       * dans une projection produit serait une prise de position, pas une
       * mesure.
       */
      const sigma = BTC_VOL * Math.sqrt(t)
      const btcAt = (k) => {
        const capital = start * Math.pow(1 + YIELD.p50, t)
        const priceMult = Math.exp(Z[k] * sigma - 0.5 * sigma * sigma)
        // Percentile HAUT en bitcoin = cours BAS : moins cher le bitcoin, plus
        // le même capital en achète. D'où le signe inversé sur `Z`.
        return Number((capital / (BTC_SPOT_USD * priceMult)).toFixed(4))
      }

      return {
        month: i,
        label: i === 0 ? 'Today' : `M+${i}`,
        p10: usd('p10'),
        p25: usd('p25'),
        p50: usd('p50'),
        p75: usd('p75'),
        p90: usd('p90'),
        // Lecture bitcoin : `p10` = scénario défavorable pour le détenteur,
        // c'est-à-dire un cours qui MONTE (le capital en dollars en achète
        // moins). L'inversion est portée ici, pas dans l'interface.
        btcP10: btcAt('p90'),
        btcP50: btcAt('p50'),
        btcP90: btcAt('p10'),
      }
    })

    return {
      projection: bloc({
        runs: 10_000,
        horizonMonths: months,
        startValueUsdc: start,
        startValueBtc: Number((start / BTC_SPOT_USD).toFixed(4)),
        btcVolAnnualPct: BTC_VOL * 100,
        points,
      }),
    }
  }

  if (p === '/api/v1/mining/distributions') {
    return {
      distributions: bloc(
        ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'].map((month, i) => ({
          id: `dist_${i}`,
          month,
          distributionDate: `${month}-05T10:00:00Z`,
          btcAmountSats: String(Math.round(money(rnd, 0.4, 0.9) * 1e8)),
          btcPriceUsdc: String(Math.round(money(rnd, 88_000, 98_000))),
          yieldUsdc: String(Math.round(money(rnd, 38_000, 82_000))),
          rwaStrategyId: 'p1',
          status: i < 4 ? 'distributed' : i === 4 ? 'approved' : 'pending',
          approvedAt: i < 5 ? `${month}-04T16:00:00Z` : null,
          approvedBy: i < 5 ? 'admin@localhost' : null,
        })),
      ),
    }
  }

  if (p === '/api/v1/mining/calculations' || /^\/api\/v1\/mining\/calculations\/[^/]+$/.test(p)) {
    const rows = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'].map((period, i) => ({
      id: `calc_${i}`,
      period,
      totalBtcMinedSats: String(Math.round(money(rnd, 0.4, 0.9) * 1e8)),
      avgBtcPrice: String(Math.round(money(rnd, 88_000, 98_000))),
      grossRevenueUsdc: String(Math.round(money(rnd, 52_000, 96_000))),
      opexUsdc: String(Math.round(money(rnd, 8_000, 14_000))),
      netYieldUsdc: String(Math.round(money(rnd, 38_000, 82_000))),
      rwaStrategyId: 'p1',
      createdAt: `${period}-02T08:00:00Z`,
    }))
    if (p !== '/api/v1/mining/calculations') {
      const period = p.split('/').pop()
      return { calculation: bloc(rows.find((r) => r.period === period) ?? rows[rows.length - 1]) }
    }
    return { calculations: bloc(rows) }
  }

  if (p === '/api/v1/admin/data-health') {
    return {
      health: bloc({
        indexerLagSeconds: 4,
        lastIndexedBlock: '21400320',
        staleEndpoints: [],
        checkedAt: nowIso(),
        status: 'HEALTHY',
      }),
    }
  }

  return { note: 'Route servie par le mock local sans payload dédié.', path: p }
}

// ── Routage ──────────────────────────────────────────────────────────────────

const ENVELOPE_EXEMPT = new Set(['/health', '/ready', '/api/v1/runtime'])

export { ACCOUNTS, ENVELOPE_EXEMPT, envelope, problem, bloc, payloadFor, nowIso, randomUUID }
