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
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = Number(process.env.MOCK_PORT ?? 4106)

/** Identifiants du mock local. Rien de sensible : ce serveur ne sert que des données fictives. */
const ACCOUNTS = [
  { id: 'usr_mock_admin', email: 'admin@localhost', password: 'localdev', role: 'admin' },
]

/*
 * Jetons émis, persistés sur disque.
 *
 * En mémoire seule, chaque redémarrage du mock déconnectait le navigateur : le
 * cookie de session pointait vers un jeton disparu, et TOUS les appels
 * retombaient en 401 — un symptôme qui ressemble à un bug de l'application
 * alors que rien ne l'est. Le fichier survit au redémarrage, la session aussi.
 *
 * Mock de développement local : ce fichier n'a aucune valeur de sécurité et ne
 * quitte jamais la machine. Il vit dans le dossier temporaire du système, pas
 * dans le dépôt.
 */
const TOKEN_STORE = join(tmpdir(), 'hearst-mock-tokens.json')

const TOKENS = new Map(
  (() => {
    try {
      const raw = JSON.parse(readFileSync(TOKEN_STORE, 'utf8'))
      return Array.isArray(raw) ? raw : []
    } catch {
      // Premier lancement, fichier illisible ou effacé : on repart à vide.
      return []
    }
  })(),
)

function persistTokens() {
  try {
    /*
     * FUSION et non écrasement : deux instances du mock, ou deux démarrages
     * successifs, se volaient mutuellement leurs jetons — le dernier à écrire
     * effaçait les sessions de l'autre, et le navigateur retombait en 401 sur
     * TOUS les appels alors que rien n'était cassé côté application.
     *
     * On relit le fichier avant d'écrire, et les jetons en mémoire priment sur
     * ceux du disque pour une même clé.
     */
    let onDisk = []
    try {
      const raw = JSON.parse(readFileSync(TOKEN_STORE, 'utf8'))
      if (Array.isArray(raw)) onDisk = raw
    } catch {
      // Fichier absent ou illisible : la mémoire fait foi.
    }
    const merged = new Map([...onDisk, ...TOKENS])
    writeFileSync(TOKEN_STORE, JSON.stringify([...merged]))
  } catch {
    // La persistance est un confort : son échec ne doit pas casser le login.
  }
}

const nowIso = () => new Date().toISOString()

/*
 * Cours du bitcoin — UNE seule valeur pour tout le mock.
 *
 * Trois définitions cohabitaient (94 820 dans le snapshot, 94 680 dans le coût
 * de production, un aléatoire dans les séries) : l'écran affichait deux prix
 * différents côte à côte, ce qui ne se lit pas comme deux sources mais comme un
 * bug. Les séries oscillent AUTOUR de ce point et y reviennent sur leur dernier
 * échantillon, pour que « dernier point de la courbe » et « prix courant »
 * disent la même chose.
 */
const BTC_SPOT_USD = 94_820

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
  { pocket: 'p0', label: 'Basis carry', targetBps: 4200, actualBps: 4262, driftBps: 62, isIdle: false, enabled: true, adapter: 'BasisAdapter', pocketAssets: String(Math.round(20_265_000 * 1e6)) },
  { pocket: 'p1', label: 'RWA T-bills', targetBps: 3300, actualBps: 3158, driftBps: -142, isIdle: false, enabled: true, adapter: 'RwaAdapter', pocketAssets: String(Math.round(15_922_500 * 1e6)) },
  { pocket: 'p2', label: 'Mining alpha', targetBps: 2500, actualBps: 2580, driftBps: 80, isIdle: false, enabled: true, adapter: 'MiningAdapter', pocketAssets: String(Math.round(12_062_500 * 1e6)) },
]

/*
 * ── Économie du vault client : UNE source, des montants qui se déduisent ────
 *
 * Ces cinq nombres se contredisaient : le client avait « retiré » 1.0177 BTC
 * pour 0.6539 « gagné », et la production affichée ne se raccordait à aucun des
 * deux. Trois routes les posaient en dur, chacune dans son coin.
 *
 * L'identité qui les lie, du point de vue du client :
 *
 *     produit  =  déjà retiré  +  acquis non encore retiré
 *
 * Tout descend donc de `CLIENT_PRODUCED_SATS` et de ce qui a été versé. Le
 * rendement acquis n'est plus un nombre libre : c'est un RESTE.
 *
 * Les dollars encaissés sur les retraits passés sont posés à part
 * (`CLIENT_WITHDRAWN_USDC_AT_PAYOUT`) : chaque versement a eu lieu à son propre
 * cours, et reconvertir le cumul au spot d'aujourd'hui afficherait une somme que
 * le client n'a jamais reçue. Le cours moyen implicite (~86 600 $) est
 * volontairement sous le spot — les retraits sont antérieurs.
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
 * Légèrement sous le spot (94 820 $) : le bitcoin a monté de ~8 % depuis, une
 * dérive de marché ordinaire. L'avantage du vault sur un simple achat vient
 * alors du MINAGE — acquérir du bitcoin sous son prix de marché — et non d'un
 * scénario de cours favorable.
 *
 * Un cours d'entrée très bas (60 000 $, soit +58 % de hausse depuis) faisait
 * l'inverse : le simple achat devenait imbattable et le vault ressortait en
 * retard, ce que le produit ne raconte pas.
 */
const CLIENT_ENTRY_RATE_USD = 88_000

/** Distribution du mois, disponible au retrait maintenant. */
const CLIENT_AVAILABLE_USDC = 5_250

/** Le front convertit au spot : on publie donc les dollars correspondants. */
const usdcFromBtc = (btc) => Math.round(btc * BTC_SPOT_USD)

// ── Payloads par route ───────────────────────────────────────────────────────

/*
 * Vaults DÉDIÉS, nommés par leur client : le produit en donne un par client,
 * jamais un par stratégie. Les anciens noms — « Hearst BTC Yield », « RWA
 * Core » — désignaient des poches, ce qui laissait croire à un pool que
 * plusieurs clients se partagent.
 */
const VAULTS = ['Hearst Holdings', 'ZAND Bank', 'Rain Financial']

function payloadFor(path) {
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
          vaultId: 'vault-1',
          amountUsdc: 1_500_000,
          requestedAt: '2026-09-08T14:22:00Z',
          note: 'Second tranche, board approved',
        },
        {
          id: 'apr_2',
          kind: 'withdrawal',
          clientId: 'cli_1',
          clientLabel: 'Hearst Holdings',
          vaultId: 'vault-0',
          amountUsdc: 5_250,
          requestedAt: '2026-09-09T09:05:00Z',
          note: 'Monthly distribution payout',
        },
        {
          id: 'apr_3',
          kind: 'distribution',
          clientId: 'cli_3',
          clientLabel: 'Rain Financial',
          vaultId: 'vault-2',
          amountUsdc: 81_951,
          requestedAt: '2026-09-05T10:00:00Z',
          note: 'August distribution, awaiting sign-off',
        },
        {
          id: 'apr_4',
          kind: 'distribution',
          clientId: 'cli_1',
          clientLabel: 'Hearst Holdings',
          vaultId: 'vault-0',
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
      { id: 'vault-0', client: 'Hearst Holdings', clientId: 'cli_1', principal: 420_000, start: '2026-02-10', months: 24, depositUnlocked: false },
      { id: 'vault-1', client: 'ZAND Bank', clientId: 'cli_2', principal: 12_000_000, start: '2025-11-01', months: 24, depositUnlocked: true },
      { id: 'vault-2', client: 'Rain Financial', clientId: 'cli_3', principal: 3_400_000, start: '2026-01-15', months: 24, depositUnlocked: false },
      { id: 'vault-3', client: 'Meridian Family Office', clientId: 'cli_4', principal: 850_000, start: '2024-10-20', months: 24, depositUnlocked: false },
      { id: 'vault-4', client: 'Northgate Capital', clientId: 'cli_5', principal: 5_600_000, start: '2026-06-01', months: 24, depositUnlocked: false },
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
            { pocket: 'p0', label: 'Basis carry', targetBps: 4200, actualBps: 4262 },
            { pocket: 'p1', label: 'RWA T-bills', targetBps: 3300, actualBps: 3158 },
            { pocket: 'p2', label: 'Mining alpha', targetBps: 2500, actualBps: 2580 },
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
            // La courbe oscille autour du spot et y REVIENT sur son dernier
            // point : sans cela, « dernier point » et « prix courant »
            // affichaient deux nombres différents pour la même chose.
            btcPriceUsdc:
              i === days - 1
                ? BTC_SPOT_USD
                : Math.round(BTC_SPOT_USD * (1 + Math.sin(i / 9) * 0.06 + (rnd() - 0.5) * 0.03)),
            allocations: [
              { bucket: 'Basis carry', pct: Number((42 + drift).toFixed(2)) },
              { bucket: 'RWA T-bills', pct: Number((33 - drift).toFixed(2)) },
              { bucket: 'Mining alpha', pct: 25 },
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
        maxDriftStrategyLabel: 'RWA T-bills',
        maxDriftVaultId: 'vault-1',
      }),
    }
  }

  /*
   * Exposition par stratégie, agrégée sur TOUS les vaults.
   *
   * Chaque vault est dédié à un client et porte SA PROPRE allocation : ZAND ne
   * veut pas le mix de Rain. Le modèle précédent attribuait une stratégie
   * unique à chaque vault (`Basis carry` = `vault-0`), ce qui revenait à dire
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
      'vault-0': { label: 'Hearst Holdings', capital: 420_000, basis: 4200, rwa: 3300, mining: 2500 },
      'vault-1': { label: 'ZAND Bank', capital: 12_000_000, basis: 2000, rwa: 2000, mining: 6000 },
      'vault-2': { label: 'Rain Financial', capital: 3_400_000, basis: 5500, rwa: 3500, mining: 1000 },
    }
    const POCKET = [
      { id: 'strat-0', label: 'Basis carry', key: 'basis' },
      { id: 'strat-1', label: 'RWA T-bills', key: 'rwa' },
      { id: 'strat-2', label: 'Mining alpha', key: 'mining' },
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
          { strategyId: 'strat-1', strategyLabel: 'RWA T-bills', vaultId: 'vault-1', driftBps: -142 },
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
          vaultId: `vault-${i % 3}`,
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
        btcUsd: String(BTC_SPOT_USD),
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
          vaultIds: [`vault-${i % 3}`],
        })),
      ),
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
    /* Le rendement acquis est ce que la production a laissé après les retraits,
       converti au spot pour les consommateurs qui lisent des dollars. Il n'est
       plus posé librement : un `accrued` inférieur au cumul déjà retiré faisait
       un client ayant sorti plus qu'il n'avait gagné. */
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
  /*
   * Vault DÉDIÉ du client — le produit tel qu'il doit être : un vault par
   * client, jamais un pool partagé. Les chiffres dérivent tous du même
   * principal (420 000) pour rester cohérents entre eux.
   *
   * MAQUETTE : aucun de ces champs n'existe encore côté backend réel. Ils sont
   * ici pour présenter le produit cible ; l'interface qui les consomme les
   * traite comme n'importe quelle source, donc le jour où le backend les
   * publie, rien ne change côté front.
   */
  if (p === '/api/v1/me/vault') {
    const principal = CLIENT_PRINCIPAL_USDC
    /* Le front reconvertit ce montant en bitcoin au spot : on publie donc la
       contrevaleur AU SPOT du cumul retiré, pour que la tuile affiche bien
       1.0177 BTC. Les dollars réellement encaissés sont un champ distinct. */
    const withdrawn = usdcFromBtc(CLIENT_WITHDRAWN_BTC)
    const monthlyDistribution = CLIENT_AVAILABLE_USDC
    return {
      vault: bloc({
        vaultId: 'vault-0',
        label: 'Dedicated vault',
        principalUsdc: principal,
        // Cumul déjà sorti, et sa part du principal.
        withdrawnUsdc: withdrawn,
        /* Dollars RÉELLEMENT encaissés, chaque retrait à son cours. Sous le
           spot d'aujourd'hui : les versements sont antérieurs. Publié, car le
           front ne peut pas le retrouver — il ne connaît que le cours du jour. */
        withdrawnUsdcAtPayout: CLIENT_WITHDRAWN_USDC_AT_PAYOUT,
        /* Cours de la conversion à l'entrée : le front en déduit le bitcoin
           réellement acquis, au lieu de diviser par le cours du jour. */
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

  /*
   * Parc de calcul — ce que le client a à disposition pour miner.
   *
   * Mesures à l'échelle de TOUTE l'infrastructure, pas de la part d'un client :
   * c'est la capacité industrielle à laquelle le vault donne accès. Le libellé
   * de la section le dit, sans quoi « 750 BTC » se lirait comme un solde.
   *
   * MAQUETTE : aucun endpoint réel ne publie encore le parc.
   */
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
         * Un vrai backend calcule ces valeurs à partir des machines réellement
         * affectées et de la date d'entrée. Le mock les pose en dur, cohérentes
         * entre elles : 0.021 % d'un parc de 10 000 machines et 2.1 EH/s donne
         * ~2 machines et ~441 TH/s, pour ~0.158 BTC produits.
         */
        allocatedSharePct: 0.021,
        allocatedMiners: 2,
        allocatedHashrateThs: 441,
        allocatedBtcProduced: 0.158,
      }),
    }
  }

  /*
   * Coût de production du bitcoin miné — ce que le hashrate et la difficulté
   * du réseau impliquent aujourd'hui, comparé au prix de marché. C'est la
   * mesure qui compte pour un produit adossé au minage : elle dit si la
   * production crée ou détruit de la valeur.
   */
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

  /* Rendement courant par poche, annualisé. */
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
          vaultId: `vault-${i % 3}`,
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

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve(null) }
    })
  })

const send = (res, status, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Request-Id': randomUUID(),
    'X-RateLimit-Remaining': '999',
  })
  res.end(payload)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname

  // Authentification : vérifiée pour de bon, comme le ferait le backend.
  if (path === '/api/v1/auth/login' && req.method === 'POST') {
    const body = await readBody(req)
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const account = ACCOUNTS.find((a) => a.email === email && a.password === password)
    if (!account) {
      return send(res, 401, problem(401, 'UNAUTHORIZED', 'Invalid email or password.'))
    }
    const token = randomUUID().replace(/-/g, '')
    TOKENS.set(token, account)
    persistTokens()
    return send(res, 200, {
      token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
      user: { id: account.id, email: account.email, role: account.role },
    })
  }

  if (path === '/api/v1/auth/register' && req.method === 'POST') {
    return send(res, 403, problem(403, 'FORBIDDEN', 'Registration is closed on this instance.'))
  }

  const isPublic = ENVELOPE_EXEMPT.has(path)
  if (!isPublic) {
    const auth = req.headers.authorization ?? ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!TOKENS.has(token)) {
      return send(res, 401, problem(401, 'UNAUTHORIZED', 'Missing or invalid bearer token.'))
    }
  }

  // Souscription : le backend est l'autorité, pas le formulaire. On rejoue donc
  // ici les refus qu'un vrai back opposerait (montant, minimum, capacité) pour
  // que les états d'erreur de l'UI soient réellement exerçables en local.
  if (path === '/api/v1/me/deposits' && req.method === 'POST') {
    const body = await readBody(req)
    const amount = Number(body?.amountUsdc)
    if (!Number.isFinite(amount) || amount <= 0) {
      return send(res, 400, problem(400, 'INVALID_AMOUNT', 'amountUsdc must be a positive whole number of USDC.'))
    }
    if (amount < 100_000) {
      return send(res, 422, problem(422, 'BELOW_MINIMUM', 'Amount is below the 100,000 USDC minimum for this vault.'))
    }
    if (amount > 26_750_000) {
      return send(res, 422, problem(422, 'CAPACITY_EXCEEDED', 'Amount exceeds the capacity left in the vault.'))
    }
    return send(res, 200, envelope({
      deposit: bloc({
        id: `dep_${randomUUID().slice(0, 8)}`,
        amountUsdc: amount,
        status: 'PENDING_SETTLEMENT',
        receivedAt: nowIso(),
      }),
    }))
  }

  const data = payloadFor(path)
  return send(res, 200, isPublic ? data : envelope(data))
})

server.listen(PORT, () => {
  console.log(`Mock backend Hearst Connect → http://localhost:${PORT}`)
  console.log(`Connexion : ${ACCOUNTS[0].email} / ${ACCOUNTS[0].password}`)
  console.log('Toutes les données sont FICTIVES — annoncées meta.status = LIVE pour peupler le front.')
})
