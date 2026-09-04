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
  { pocket: 'p0', label: 'Basis carry', targetBps: 4200, actualBps: 4262, driftBps: 62, isIdle: false, enabled: true, adapter: 'BasisAdapter', pocketAssets: String(Math.round(20_265_000 * 1e6)) },
  { pocket: 'p1', label: 'RWA T-bills', targetBps: 3300, actualBps: 3158, driftBps: -142, isIdle: false, enabled: true, adapter: 'RwaAdapter', pocketAssets: String(Math.round(15_922_500 * 1e6)) },
  { pocket: 'p2', label: 'Mining alpha', targetBps: 2500, actualBps: 2580, driftBps: 80, isIdle: false, enabled: true, adapter: 'MiningAdapter', pocketAssets: String(Math.round(12_062_500 * 1e6)) },
]

// ── Payloads par route ───────────────────────────────────────────────────────

const VAULTS = ['Hearst BTC Yield', 'Hearst RWA Core', 'Hearst Mining Alpha']

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
      btcProduced: bloc({ totalSats: '312500000', currentPriceUsdc: '94820' }, 'live'),
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
            btcPriceUsdc: Math.round(money(rnd, 88_000, 99_000)),
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

  if (p === '/api/v1/admin/portfolio/exposure') {
    return {
      exposure: bloc({
        totalAumAtomic: atomic(48_250_000),
        strategies: [
          { strategyId: 'strat-0', strategyLabel: 'Basis carry', vaultId: 'vault-0', targetBps: 4200, actualBps: 4262, driftBps: 62, exposureAtomic: atomic(20_265_000), status: 'ACTIVE' },
          { strategyId: 'strat-1', strategyLabel: 'RWA T-bills', vaultId: 'vault-1', targetBps: 3300, actualBps: 3158, driftBps: -142, exposureAtomic: atomic(15_922_500), status: 'ACTIVE' },
          { strategyId: 'strat-2', strategyLabel: 'Mining alpha', vaultId: 'vault-2', targetBps: 2500, actualBps: 2580, driftBps: 80, exposureAtomic: atomic(12_062_500), status: 'ACTIVE' },
        ],
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
    const principal = 420_000
    const accrued = 62_000
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

export { ACCOUNTS, ENVELOPE_EXEMPT, envelope, problem, bloc, payloadFor, nowIso, randomUUID }
