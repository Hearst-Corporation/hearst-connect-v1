/**
 * Données du mock backend Hearst Connect — FICTIVES, une seule source.
 *
 * Partagées par le mock local (`scripts/mock-backend.mjs`, serveur HTTP sur
 * :4106) et par la démo déployée (`api/demo-backend/[...path]/route.ts`).
 * Avant, la démo en gardait une copie à la main : elle a pris du retard et
 * servait des écrans vides. Ce fichier ne touche ni au disque ni au réseau —
 * chaque hôte garde ses jetons et sa persistance.
 *
 * Chaque enveloppe est marquée `status: 'LIVE'` (voir `envelope()`) afin que
 * les surfaces se peuplent — les valeurs restent entièrement fictives.
 */

import { createHash, randomUUID } from 'node:crypto'

/** Identifiants du mock local. Rien de sensible : ce serveur ne sert que des données fictives. */
const ACCOUNTS = [
  { id: 'usr_mock_admin', email: 'admin@localhost', password: 'localdev', role: 'admin' },
]

/** Offres créées depuis la console. En mémoire ; le mock local les recharge
 *  depuis son fichier temporaire et s'abonne via `onOffersChanged`. */
const CREATED_OFFERS = []
let persistOffers = () => {}
/** L'hôte branche ici sa persistance des offres créées. */
function onOffersChanged(fn) {
  persistOffers = fn
}

/**
 * LE registre des clients — une seule table, un seul identifiant par client.
 *
 * Les offres, les vaults, le KYC et l'activité se rattachent tous à ce
 * `clientId`. Avant, l'annuaire publiait des « Client simulé N » que ni les
 * offres ni les vaults ne connaissaient : la console ne pouvait pas savoir que
 * l'offre de « Orbit Markets » et le vault de « Hearst Holdings » étaient le
 * même client. Un mock qui ne relie rien ne teste rien.
 *
 * `vault` : l'index du vault dédié (vaultKey), null tant qu'il n'est pas ouvert.
 */
const CLIENT_BOOK = [
  { id: 'cli_1', label: 'Hearst Holdings', kyc: 'APPROVED', vault: 0, since: '2025-08-20' },
  { id: 'cli_2', label: 'ZAND Bank', kyc: 'APPROVED', vault: 1, since: '2025-02-10' },
  { id: 'cli_3', label: 'Rain Financial', kyc: 'APPROVED', vault: 2, since: '2025-06-01' },
  { id: 'cli_4', label: 'Meridian Family Office', kyc: 'APPROVED', vault: 3, since: '2024-10-10' },
  { id: 'cli_5', label: 'Northgate Capital', kyc: 'APPROVED', vault: 4, since: '2025-12-20' },
  { id: 'cli_6', label: 'Northwind Digital', kyc: 'NOT_STARTED', vault: null, since: '2026-09-01' },
  { id: 'cli_7', label: 'Accrue Capital', kyc: 'PENDING', vault: null, since: '2026-08-12' },
  { id: 'cli_8', label: 'Halven Custody', kyc: 'APPROVED', vault: null, since: '2026-07-30' },
  { id: 'cli_9', label: 'Solstice Wealth', kyc: 'APPROVED', vault: null, since: '2026-07-02' },
  { id: 'cli_10', label: 'Kestrel Partners', kyc: 'NOT_STARTED', vault: null, since: '2026-06-15' },
]

/** Capital du vault dédié de chaque client — le même que le registre des vaults. */
/** Les décisions de l'admin, `approvalId → approved|declined` — en mémoire, le temps du mock. */
const DECISIONS = new Map()
/** Le protocole de chaque poche, par vault — modifié quand un changement est approuvé. */
const VAULT_PROTOCOLS = [0, 1, 2, 3, 4].map(() => ({
  mining: { name: 'Hearst fleet', apy: 14.2 },
  lending: { name: 'Aave (cbBTC)', apy: 8.4 },
  stable: { name: 'Morpho (USDC)', apy: 10.1 },
}))
/** Les électricités déjà payées, `vaultId:YYYY-MM` — en mémoire, le temps du mock. */
const PAID_ELECTRICITY = new Set()
const VAULT_PRINCIPAL = [420_000, 12_000_000, 3_400_000, 850_000, 5_600_000]
/** Date d'ouverture de chaque vault — la même que le registre. */
// Des ouvertures étalées : un book qui grandit client après client, pas un an à vide.
const VAULT_START = ['2025-09-10', '2025-03-01', '2025-06-15', '2024-10-20', '2026-01-15']
/** L'allocation de chaque vault (bps) — la même que le registre. */
const VAULT_ALLOC = [
  { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
  { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
  { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
  { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
  { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
]
/**
 * L'écart ACTUEL de chaque poche à sa cible, en points de base (100 = 1 pt),
 * depuis le dernier rééquilibrage. La somme fait zéro : ce qu'une poche gagne,
 * une autre le perd. La plus forte valeur absolue est la « dérive » du registre.
 * `null` : la source ne lit pas la dérive de ce vault.
 */
const VAULT_DRIFT = [
  { mining: 142, lending: -60, stable: -82 },
  { mining: -684, lending: 300, stable: 384 },
  { mining: -200, lending: -118, stable: 318 },
  { mining: 96, lending: -40, stable: -56 },
  null,
]
/** La bande que le mandat de chaque vault tolère, en bps (même que le registre ; 500 par défaut). */
const VAULT_BAND = [500, 500, 250, 800, 500]
/** La part réelle de chaque poche aujourd'hui = cible + écart. */
const vaultCurrentBps = (v) => {
  const a = VAULT_ALLOC[v]
  const d = VAULT_DRIFT[v] ?? { mining: 0, lending: 0, stable: 0 }
  return { mining: a.miningBps + d.mining, lending: a.lendingBps + d.lending, stable: a.stableBps + d.stable }
}
/**
 * L'historique des rééquilibrages d'un vault : tous les 2 à 3 mois, ou dès que
 * la dérive sort de la bande. Chaque ligne dit l'écart AVANT (en points, par
 * poche), ce qui a été échangé, et la répartition APRÈS — revenue à la cible.
 */
/** Les rééquilibrages approuvés depuis la console, pendant que le mock tourne. */
const EXECUTED_REBALANCES = []

function vaultRebalances(v) {
  const executed = EXECUTED_REBALANCES.filter((r) => r.v === v).reverse()
  return [...executed, ...plannedRebalances(v)]
}

function plannedRebalances(v) {
  const start = new Date(`${VAULT_START[v]}T00:00:00Z`)
  const out = []
  const d = new Date(start)
  d.setUTCMonth(d.getUTCMonth() + 3)
  let k = 0
  while (d < new Date('2026-08-20T00:00:00Z')) {
    // On ne rééquilibre que HORS de la bande : l'écart corrigé la dépasse
    // toujours (de 0,3 à 2,5 pt). Le sens varie : le minage tantôt en excès
    // (le bitcoin a monté), tantôt en défaut.
    const bandBps = VAULT_BAND[v]
    const over = 30 + ((k * 71 + v * 29) % 220)
    const sign = (k + v) % 3 === 0 ? 1 : -1
    const m = sign * (bandBps + over)
    const l = Math.round(-m * 0.45)
    const before = { mining: m, lending: l, stable: -m - l }
    const worst = Math.max(Math.abs(before.mining), Math.abs(before.lending), Math.abs(before.stable))
    const moveUsd = Math.round((VAULT_PRINCIPAL[v] * Math.abs(m)) / 10_000)
    out.push({
      at: new Date(d.getTime() + (k % 3) * 86_400_000 + 2 * 3_600_000).toISOString(),
      before,
      worst,
      moveUsd,
      fromBucket: m > 0 ? 'Mining Alpha' : 'USDC Yield',
      toBucket: m > 0 ? 'USDC Yield' : 'Mining Alpha',
      k,
    })
    d.setUTCMonth(d.getUTCMonth() + 2 + (k % 2))
    k += 1
  }
  return out.reverse()
}

/** Rendement annuel de chaque poche — le même que la simulation d'offre. */
const POCKET_APY = { mining: 0.142, lending: 0.084, stable: 0.101 }

/**
 * Le parc, machine par machine — ce que le bloc « Compute infrastructure »
 * annonçait sans jamais pouvoir le montrer. Déterministe : mêmes machines à
 * chaque démarrage. Les compteurs agrégés de /api/v1/mining s'en déduisent,
 * pour que le total et la liste ne se contredisent pas.
 */
const SITES = [
  { site: 'Itaipú', country: 'Paraguay', code: 'PY' },
  { site: 'Addis Ababa', country: 'Ethiopia', code: 'ET' },
  { site: 'Tromsø', country: 'Norway', code: 'NO' },
  { site: 'Rockdale, TX', country: 'United States', code: 'US' },
  { site: 'Baie-Comeau', country: 'Canada', code: 'CA' },
]
const MODELS = [
  { model: 'Antminer S21 Pro', ths: 234, jth: 15 },
  { model: 'Antminer S21', ths: 200, jth: 17.5 },
  { model: 'Whatsminer M60S', ths: 186, jth: 18.5 },
]
/* Production d'un TH/s : ~5,5e-7 BTC par jour au hashprice actuel (≈ 0,05 $). */
const BTC_PER_THS_DAY = 5.5e-7
const FLEET_SIZE = 10_000
const MACHINES = Array.from({ length: FLEET_SIZE }, (_, i) => {
  const site = SITES[i % SITES.length]
  const m = MODELS[(i * 7) % MODELS.length]
  const offline = i % 89 === 17
  const uptime = offline ? 41.5 - (i % 5) : Number((98.8 + ((i * 37) % 12) / 10).toFixed(1))
  const ths = offline ? 0 : Number((m.ths * (0.97 + ((i * 13) % 6) / 100)).toFixed(1))
  const plugged = new Date(Date.parse('2024-11-04T00:00:00Z') + ((i * 9973) % 640) * 86_400_000)
  return {
    id: `HC-${site.code}-${String(i + 1).padStart(4, '0')}`,
    model: m.model,
    site: site.site,
    country: site.country,
    pluggedAt: plugged.toISOString(),
    hashrateThs: ths,
    efficiencyJth: m.jth,
    uptime30dPct: uptime,
    btcProduced30d: Number((ths * BTC_PER_THS_DAY * 30 * (uptime / 100)).toFixed(5)),
    status: offline ? 'offline' : 'online',
  }
})
/* Le prix du TH/s (machine, hébergement, mise en service) : le capital qu'un
   vault place dans sa poche Mining lui ACHÈTE de la puissance à ce prix. La
   simulation d'offre utilise le même. */
const USD_PER_THS = 50
/** Capital de la poche Mining de chaque vault (capital × sa propre part de minage). */
const VAULT_MINING_BPS = [4000, 6000, 2000, 2000, 4000]
const VAULT_MINING_CAPITAL = VAULT_PRINCIPAL.map((p, i) => (p * VAULT_MINING_BPS[i]) / 10_000)
/* Chaque machine est AFFECTÉE à un vault jusqu'à ce que ce vault ait la
   puissance que son capital a achetée ; le reste du parc est LIBRE — capacité
   disponible pour les prochains clients. L'ordre est mélangé (pas premier) pour
   que chaque vault ait des machines sur plusieurs sites. */
const MACHINE_VAULT = (() => {
  const out = new Array(FLEET_SIZE).fill(null)
  const order = Array.from({ length: FLEET_SIZE }, (_, k) => (k * 7919) % FLEET_SIZE) // 7919 premier avec 10 000
  let cursor = 0
  VAULT_MINING_CAPITAL.forEach((capital, v) => {
    const target = capital / USD_PER_THS
    let got = 0
    while (got < target && cursor < order.length) {
      const i = order[cursor++]
      if (MACHINES[i].status !== 'online') continue
      out[i] = v
      got += MACHINES[i].hashrateThs
    }
  })
  return out
})()
const vaultIndexOfMachine = (k) => MACHINE_VAULT[k]
/** La puissance réellement affectée à chaque vault. */
const VAULT_THS = VAULT_MINING_CAPITAL.map((_, v) =>
  MACHINES.reduce((s, m, i) => s + (MACHINE_VAULT[i] === v ? m.hashrateThs : 0), 0),
)
const FLEET_THS = MACHINES.reduce((s, m) => s + m.hashrateThs, 0)
const FLEET_ACTIVE = MACHINES.filter((m) => m.status === 'online').length
const FLEET_UPTIME = Number((MACHINES.reduce((s, m) => s + m.uptime30dPct, 0) / MACHINES.length).toFixed(1))

/** Les clients du registre, plus ceux nés d'une offre créée depuis la console. */
const allClients = () => [
  ...CLIENT_BOOK,
  ...CREATED_OFFERS.filter((o) => !CLIENT_BOOK.some((c) => c.id === o.clientId)).map((o) => ({
    id: o.clientId,
    label: o.clientName,
    kyc: 'NOT_STARTED',
    vault: null,
    since: o.createdAt.slice(0, 10),
  })),
]

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
 * LA RÉSERVE D'UN VAULT, mois par mois — la source unique de tout ce que le
 * client reçoit. Chaque poche rapporte, ce gain est CONVERTI en bitcoin au cours
 * du mois, et c'est ce bitcoin qui est distribué. Le registre (cumul), la fiche
 * client, les mouvements, les validations et le tableau de bord en dérivent :
 * aucun chiffre ne peut contredire un autre.
 *
 * Du plus récent au plus ancien ; le dernier mois attend sa validation,
 * l'avant-dernier est approuvé, les autres sont versés.
 */
/** n = mois en arrière depuis août 2026 (le dernier mois clos). */
const monthPrice = (n) => Math.round(BTC_SPOT_USD - n * 1_400 + ((n * 7919) % 5_000) - 2_500 * Math.min(n, 1))
/** Le rendement du parc ce mois-là (uptime, difficulté) — le même pour tous. */
const monthWobble = (n) => 0.82 + ((n * 37) % 30) / 100
/** L'électricité pèse ~36 % de la valeur minée. */
const ELECTRICITY_SHARE = 0.36

function vaultMonths(v) {
  const out = []
  // Le dernier mois CLOS : août 2026 — le même que la clôture mensuelle.
  const d = new Date(Date.UTC(2026, 7, 1))
  const first = new Date(`${VAULT_START[v].slice(0, 7)}-01T00:00:00Z`)
  first.setUTCMonth(first.getUTCMonth() + 1)
  const principal = VAULT_PRINCIPAL[v]
  const a = VAULT_ALLOC[v]
  let n = 0
  while (d >= first) {
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    // Le cours du mois : le spot aujourd'hui, plus bas en remontant le temps.
    const price = monthPrice(n)
    const wobble = monthWobble(n)
    const pockets = [
      // Le minage : ce que SA puissance a miné, électricité déduite (~36 %).
      { bucket: 'Mining Alpha', usd: VAULT_THS[v] * BTC_PER_THS_DAY * 30 * wobble * (1 - ELECTRICITY_SHARE) * price },
      { bucket: 'Bitcoin Lending', usd: ((principal * a.lendingBps) / 10_000) * (POCKET_APY.lending / 12) },
      { bucket: 'USDC Yield', usd: ((principal * a.stableBps) / 10_000) * (POCKET_APY.stable / 12) },
    ].map((b) => ({ bucket: b.bucket, usd: Math.round(b.usd), btcSats: Math.round((b.usd / price) * 1e8) }))
    out.push({
      month,
      price,
      pockets,
      sats: pockets.reduce((t, b) => t + b.btcSats, 0),
      usd: pockets.reduce((t, b) => t + b.usd, 0),
      // Le reward du dernier mois attend l'admin ; une fois approuvé, il est
      // versé et arrive côté client. Refusé, il reste bloqué (« declined »).
      status:
        n === 0
          ? rewardDecision(v) === 'approved'
            ? 'distributed'
            : rewardDecision(v) === 'declined'
              ? 'declined'
              : 'pending'
          : 'distributed',
    })
    d.setUTCMonth(d.getUTCMonth() - 1)
    n += 1
  }
  return out
}
/** La décision de l'admin sur le reward en attente d'un vault, s'il y en a une. */
function rewardDecision(v) {
  const c = CLIENT_BOOK.find((x) => x.vault === v)
  return c ? DECISIONS.get(`apr_dist_${c.id}`) : undefined
}

/** Le bitcoin accumulé par un vault depuis son ouverture. */
// Seuls les rewards VALIDÉS sont dans la réserve : un mois en attente n'est pas encore au client.
const vaultReserveSats = (v) => vaultMonths(v).filter((m) => m.status === 'distributed').reduce((t, m) => t + m.sats, 0)
/** Le bitcoin d'un mois donné, pour un vault. */
const vaultMonthSats = (v, month) => vaultMonths(v).find((m) => m.month === month)?.sats ?? 0

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
      hashrate: bloc({ reportedHashrateTh: FLEET_THS.toFixed(2), totalBtcEarnedSats: '75040000000' }, 'chain'),
      electricity: bloc({
        monthlyCost: '7736',
        payee: '0x' + '33'.repeat(20),
        totalPaid: '92832',
        lastPayment: '2026-08-01T09:00:00Z',
        nextEligiblePayment: '2026-09-01T09:00:00Z',
        canPay: true,
      }, 'chain'),
      operationalTelemetry: bloc({ machineCount: MACHINES.length, activeMachines: FLEET_ACTIVE, averageUptimePct: FLEET_UPTIME }),
    }
  }
  if (p === '/api/v1/mining/machines') {
    return {
      machines: bloc(
        MACHINES.map((m, k) => ({ ...m, vaultId: vaultIndexOfMachine(k) === null ? null : vaultKey(vaultIndexOfMachine(k)) })),
      ),
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
      approvals: bloc(([
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
          amountUsdc: null,
          amountBtcSats: 4_200_000,
          requestedAt: '2026-09-09T09:05:00Z',
          note: 'Bitcoin withdrawal to the client’s wallet',
        },
        // Un rééquilibrage PROPOSÉ pour chaque vault sorti de sa bande : rien
        // ne bouge tant que l'admin ne l'a pas approuvé.
        ...CLIENT_BOOK.filter((c) => c.vault !== null && VAULT_DRIFT[c.vault] !== null).flatMap((c) => {
          const d = VAULT_DRIFT[c.vault]
          const worst = Math.max(Math.abs(d.mining), Math.abs(d.lending), Math.abs(d.stable))
          if (worst <= VAULT_BAND[c.vault]) return []
          const entries = Object.entries(d).sort((a, b) => a[1] - b[1])
          const name = { mining: 'Mining Alpha', lending: 'Bitcoin Lending', stable: 'USDC Yield' }
          const usd = Math.round((VAULT_PRINCIPAL[c.vault] * worst) / 10_000)
          return [{
            id: `apr_reb_${c.id}`,
            kind: 'rebalance',
            clientId: c.id,
            clientLabel: c.label,
            vaultId: vaultKey(c.vault),
            amountUsdc: null,
            amountBtcSats: Math.round((usd / BTC_SPOT_USD) * 1e8),
            requestedAt: '2026-09-04T08:00:00Z',
            note: `${name[entries[entries.length - 1][0]]} over target, ${name[entries[0][0]]} under — outside the ±${VAULT_BAND[c.vault] / 100} pt band`,
            rebalance: {
              driftBps: d,
              bandBps: VAULT_BAND[c.vault],
              fromBucket: name[entries[entries.length - 1][0]],
              toBucket: name[entries[0][0]],
              usd,
              btcSats: Math.round((usd / BTC_SPOT_USD) * 1e8),
            },
          }]
        }),
        // Un changement de protocole proposé : l'USDC de ZAND passerait de Morpho à Aave.
        ...(VAULT_PROTOCOLS[1].stable.name.startsWith('Morpho')
          ? [{
              id: 'apr_proto_cli_2',
              kind: 'protocol',
              clientId: 'cli_2',
              clientLabel: 'ZAND Bank',
              vaultId: vaultKey(1),
              amountUsdc: Math.round((VAULT_PRINCIPAL[1] * vaultCurrentBps(1).stable) / 10_000),
              amountBtcSats: null,
              requestedAt: '2026-09-06T09:30:00Z',
              note: 'USDC Yield: Morpho 10.1 % → Aave 12.0 %',
              protocol: {
                bucket: 'USDC Yield',
                fromProtocol: 'Morpho (USDC)',
                fromApyPct: 10.1,
                toProtocol: 'Aave (USDC)',
                toApyPct: 12.0,
                amountUsd: Math.round((VAULT_PRINCIPAL[1] * vaultCurrentBps(1).stable) / 10_000),
                reason: 'Higher supply rate on Aave v3 for the same risk tier; liquidity above 1 bn USDC.',
              },
            }]
          : []),
        // Une distribution à signer PAR VAULT : le mois clos qui attend.
        ...CLIENT_BOOK.filter((c) => c.vault !== null).map((c) => {
          const m = vaultMonths(c.vault).find((x) => x.status === 'pending')
          return {
            id: `apr_dist_${c.id}`,
            kind: 'distribution',
            clientId: c.id,
            clientLabel: c.label,
            vaultId: vaultKey(c.vault),
            amountUsdc: null,
            amountBtcSats: m?.sats ?? 0,
            requestedAt: '2026-09-02T10:00:00Z',
            note: 'August distribution, awaiting sign-off',
          }
        }),
      ]).filter((a) => !DECISIONS.has(a.id))),
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
      { id: vaultKey(0), client: 'Hearst Holdings', allocation: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 }, kind: 'Crypto company', clientId: 'cli_1', principal: 420_000, start: '2025-09-10', months: 24, depositUnlocked: false, drift: 142, threshold: null },
      { id: vaultKey(1), client: 'ZAND Bank', allocation: { miningBps: 6000, lendingBps: 2500, stableBps: 1500 }, kind: 'Crypto company', clientId: 'cli_2', principal: 12_000_000, start: '2025-03-01', months: 24, depositUnlocked: true, drift: -684, threshold: null },
      { id: vaultKey(2), client: 'Rain Financial', allocation: { miningBps: 2000, lendingBps: 2500, stableBps: 5500 }, kind: 'Fund', clientId: 'cli_3', principal: 3_400_000, start: '2025-06-15', months: 24, depositUnlocked: false, drift: 318, threshold: 250 },
      { id: vaultKey(3), client: 'Meridian Family Office', allocation: { miningBps: 2000, lendingBps: 2500, stableBps: 5500 }, kind: 'Family office', clientId: 'cli_4', principal: 850_000, start: '2024-10-20', months: 24, depositUnlocked: false, drift: 96, threshold: 800 },
      { id: vaultKey(4), client: 'Northgate Capital', allocation: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 }, kind: 'Crypto exchange', clientId: 'cli_5', principal: 5_600_000, start: '2026-01-15', months: 24, depositUnlocked: false, drift: null, threshold: null },
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
            // Typologie du client (liste de `CLIENT_KINDS`) — sert la
            // répartition de l'AUM par type sur le tableau de bord.
            clientKind: v.kind,
            // L'allocation PROPRE à ce vault — chaque client a la sienne, taillée
            // sur son profil. C'est elle qui fixe sa part du minage.
            allocation: v.allocation,
            principalUsdc: v.principal,
            // Rendement accru : ~14.8 % du principal, comme le vault client.
            // Le cumul de la réserve : la somme de ses mois, en bitcoin.
            accruedBtcSats: vaultReserveSats(VAULT_PRINCIPAL.indexOf(v.principal)),
            // Le versement d'entrée, converti en bitcoin au cours du premier mois.
            capitalBtcSats: (() => {
              const ms = vaultMonths(VAULT_PRINCIPAL.indexOf(v.principal))
              return Math.round((v.principal / (ms[ms.length - 1]?.price ?? BTC_SPOT_USD)) * 1e8)
            })(),
            accruedUsdc: vaultMonths(VAULT_PRINCIPAL.indexOf(v.principal))
              .filter((m) => m.status === 'distributed')
              .reduce((t, m) => t + m.usd, 0),
            lockupStartAt: start.toISOString(),
            lockupEndAt: end.toISOString(),
            lockupMonths: v.months,
            lockupElapsedMonths: elapsed,
            depositUnlocked: v.depositUnlocked,
            status: 'ACTIVE',
            // La dérive vient de l'état ACTUEL du vault : un rééquilibrage approuvé la remet à zéro.
            worstDriftBps: (() => {
              const d = VAULT_DRIFT[VAULT_PRINCIPAL.indexOf(v.principal)]
              if (d === null) return null
              return [d.mining, d.lending, d.stable].reduce((w, x) => (Math.abs(x) > Math.abs(w) ? x : w), 0)
            })(),
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
    // Les TROIS poches du vault RWA : en n'en publiant qu'une, le mock cachait
    // celle où le rendement minier est versé (Mining Alpha, p1).
    return { runtime: runtimeBlock(), pockets: bloc(POCKETS, 'chain') }
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
            // Croissance régulière (souscriptions) avec une ondulation légère, qui
            // finit EXACTEMENT sur l'AUM de l'overview : deux AUM différents sur
            // un même écran se liraient comme un bug.
            aumUsdc:
              i === days - 1
                ? 48_250_000
                : Math.round(48_250_000 * (0.82 + 0.18 * (i / (days - 1))) * (1 + Math.sin(i / 6) * 0.008)),
            // La courbe oscille autour du spot et y REVIENT sur son dernier
            // point : sans cela, « dernier point » et « prix courant »
            // affichaient deux nombres différents pour la même chose.
            btcPriceUsdc:
              i === days - 1
                ? BTC_SPOT_USD
                : Math.round(BTC_SPOT_USD * (1 + Math.sin(i / 9) * 0.06 + (rnd() - 0.5) * 0.03)),
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
        VAULT_PRINCIPAL.flatMap((_, v) =>
          vaultRebalances(v).map((r) => {
            const a = VAULT_ALLOC[v]
            return {
              id: `op_${v}_${r.k}`,
              vaultId: vaultKey(v),
              blockNumber: String(21_400_000 - Math.round((Date.parse('2026-08-27') - Date.parse(r.at)) / 12_000)),
              txHash: '0x' + ((v + 1) * 16 + r.k).toString(16).padStart(2, '0').repeat(32),
              logIndex: r.k,
              occurredAt: r.at,
              indexedAt: r.at,
              // Après le rééquilibrage, le vault est revenu à SA cible.
              allocations: [String(a.miningBps), String(a.lendingBps), String(a.stableBps)],
              driftBeforeBps: { mining: r.before.mining, lending: r.before.lending, stable: r.before.stable },
              worstDriftBeforeBps: r.worst,
              moved: { fromBucket: r.fromBucket, toBucket: r.toBucket, usd: r.moveUsd },
              swaps: [
                r.fromBucket === 'Mining Alpha'
                  ? { tokenIn: 'WBTC', tokenOut: 'USDC', amountIn: String(Math.round((r.moveUsd / BTC_SPOT_USD) * 1e8)), amountOut: atomic(r.moveUsd) }
                  : { tokenIn: 'USDC', tokenOut: 'WBTC', amountIn: atomic(r.moveUsd), amountOut: String(Math.round((r.moveUsd / BTC_SPOT_USD) * 1e8)) },
              ],
            }
          }),
        ).sort((x, y) => y.occurredAt.localeCompare(x.occurredAt)),
        'chain',
      ),
    }
  }

  if (p === '/api/v1/admin/activity/timeseries') {
    return { timeseries: bloc({ series: series(p, 90, 44_000_000, 49_000_000) }, 'indexed') }
  }

  if (p === '/api/v1/admin/activity/recent') {
    /* L'activité des vaults, tirée de LEURS mouvements : les distributions et
       les retraits en bitcoin, les rééquilibrages sans montant (ils déplacent
       du capital entre poches, rien n'entre ni ne sort). */
    const events = []
    CLIENT_BOOK.filter((c) => c.vault !== null).forEach((c) => {
      const months = vaultMonths(c.vault)
      const paid = months.filter((m) => m.status === 'distributed')[0]
      if (paid) {
        events.push({
          type: 'DISTRIBUTION',
          title: 'Bitcoin distributed',
          c,
          amountBtcSats: paid.sats,
          occurredAt: `${paid.month}-01T09:00:00Z`,
        })
      }
    })
    // Les rééquilibrages : le dernier de chaque vault, tiré de SON historique.
    CLIENT_BOOK.filter((c) => c.vault !== null).forEach((c) => {
      const r = vaultRebalances(c.vault)[0]
      if (r) events.push({ type: 'REBALANCE', title: 'Rebalanced to target', c, amountBtcSats: null, occurredAt: r.at })
    })
    const w = CLIENT_BOOK.find((x) => x.vault === 1)
    events.push({ type: 'WITHDRAWAL', title: 'Bitcoin withdrawn', c: w, amountBtcSats: Math.round(vaultMonths(1)[3].sats * 1.6), occurredAt: '2026-06-14T11:20:00Z' })
    return {
      events: bloc(
        events
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
          .map((e, i) => ({
            id: `act_${i}`,
            type: e.type,
            title: e.title,
            clientId: e.c.id,
            clientLabel: e.c.label,
            vaultId: vaultKey(e.c.vault),
            amountAtomic: null,
            amountBtcSats: e.amountBtcSats,
            asset: e.amountBtcSats !== null ? 'BTC' : null,
            txHash: '0x' + (i + 9).toString(16).padStart(2, '0').repeat(32),
            blockNumber: String(21_400_100 - i * 30),
            occurredAt: e.occurredAt,
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
        allClients().map((c, i) => ({
          id: c.id,
          label: c.label,
          createdAt: new Date(c.since + 'T09:00:00Z').toISOString(),
          lastActivityAt: new Date(Date.parse('2026-09-28T00:00:00Z') - i * 86_400_000).toISOString(),
          kycProvider: 'Som',
          kycStatus: c.kyc,
          currentExposureAtomic: c.vault === null ? '0' : atomic(VAULT_PRINCIPAL[c.vault]),
          vaultIds: c.vault === null ? [] : [vaultKey(c.vault)],
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

      /* La puissance de calcul que le capital Mining achète, au prix du TH/s
         du parc (`USD_PER_THS`) — le même qui affecte les machines aux vaults. */
      const miningCapitalUsdc = (amount * miningBps) / 10_000

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
          miningCapitalUsdc: Math.round(miningCapitalUsdc),
          usdPerThs: USD_PER_THS,
          hashrateThs: Math.round(miningCapitalUsdc / USD_PER_THS),
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
    /* Chaque lecture par client part du MÊME registre : un prospect n'a pas de
       vault, donc ni rendement, ni distribution, ni mouvement ; un client actif
       voit des montants à l'échelle de SON capital, pas des 420 000 $ de
       Hearst Holdings pour tout le monde. */
    const scopedClient = (id) => allClients().find((c) => c.id === id) ?? null
    const scaleOf = (c) => (c === null || c.vault === null ? 0 : VAULT_PRINCIPAL[c.vault] / 420_000)
    const scaled = (v, k) => Math.round(v * k)

    const mVault = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/vault$/)
    if (mVault) {
      const clientId = mVault[1]
      const c = scopedClient(clientId)
      if (c === null || c.vault === null) return { vault: bloc(null) }
      /* Hearst Holdings garde les constantes de /api/v1/me/vault (c'est le
         client de démonstration de /account) ; les autres sont à l'échelle. */
      const principal = c.vault === 0 ? CLIENT_PRINCIPAL_USDC : VAULT_PRINCIPAL[c.vault]
      const withdrawn = usdcFromBtc(CLIENT_WITHDRAWN_BTC)
      return {
        vault: bloc({
          clientId,
          vaultId: vaultKey(c.vault),
          label: 'Dedicated Vault',
          principalUsdc: principal,
          withdrawnUsdc: withdrawn,
          withdrawnUsdcAtPayout: CLIENT_WITHDRAWN_USDC_AT_PAYOUT,
          entryRateUsd: CLIENT_ENTRY_RATE_USD,
          availableUsdc: CLIENT_AVAILABLE_USDC,
          nextDistributionAt: '2026-10-01T09:00:00Z',
          lockupStartAt: `${VAULT_START[c.vault]}T09:00:00Z`,
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
      const k = scaleOf(scopedClient(mYields[1]))
      if (k === 0) return { yields: bloc([]) }
      /* Rendement par poche, en run-rate annualisé. Le client le lit dans
         « Strategy Exposure » sans qu'aucun écran admin ne puisse le recouper. */
      // La répartition RÉELLE de CE vault : sa cible, plus l'écart depuis le dernier rééquilibrage.
      const v = scopedClient(mYields[1]).vault
      const cur = vaultCurrentBps(v)
      const capital = (bps) => Math.round((VAULT_PRINCIPAL[v] * bps) / 10_000)
      return {
        yields: bloc([
          { bucket: 'Mining Alpha', protocol: VAULT_PROTOCOLS[v].mining.name, yieldPct: VAULT_PROTOCOLS[v].mining.apy, capitalUsdc: capital(cur.mining), trendPct: 0.4, targetBps: VAULT_ALLOC[v].miningBps, driftBps: VAULT_DRIFT[v]?.mining ?? null },
          { bucket: 'Bitcoin Lending', protocol: VAULT_PROTOCOLS[v].lending.name, yieldPct: VAULT_PROTOCOLS[v].lending.apy, capitalUsdc: capital(cur.lending), trendPct: -0.2, targetBps: VAULT_ALLOC[v].lendingBps, driftBps: VAULT_DRIFT[v]?.lending ?? null },
          { bucket: 'USDC Yield', protocol: VAULT_PROTOCOLS[v].stable.name, yieldPct: VAULT_PROTOCOLS[v].stable.apy, capitalUsdc: capital(cur.stable), trendPct: 0.1, targetBps: VAULT_ALLOC[v].stableBps, driftBps: VAULT_DRIFT[v]?.stable ?? null },
        ]),
      }
    }

    const mDist = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/distributions$/)
    if (mDist) {
      const k = scaleOf(scopedClient(mDist[1]))
      if (k === 0) return { distributions: bloc([]) }
      /* Les distributions de CE client, par état. Le backend expose
         l'approbation mais aucune lecture : l'admin approuvait à l'aveugle. */
      return {
        distributions: bloc(
          vaultMonths(scopedClient(mDist[1]).vault).map((m) => ({
            id: `dst_${m.month}`,
            month: m.month,
            status: m.status,
            btcAmountSats: m.sats,
            yieldUsdc: m.usd,
            btcPriceUsdc: m.price,
            distributionDate: m.status === 'distributed' ? `${m.month}-01T09:00:00Z` : null,
            byBucket: m.pockets,
          })),
        ),
      }
    }

    const mMov = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/movements$/)
    if (mMov) {
      const k = scaleOf(scopedClient(mMov[1]))
      if (k === 0) return { movements: bloc([]) }
      /* Le journal de CE client. `admin/activity/recent` reste global — il dit
         ce que fait le portefeuille, jamais ce qu'a fait une personne. */
      return {
        /* Le journal en BITCOIN : le dépôt arrive en USDC (son équivalent BTC
           au cours du jour est noté), tout le reste — distributions versées,
           retraits — part en bitcoin. */
        movements: bloc(
          (() => {
            const v = scopedClient(mMov[1]).vault
            const months = vaultMonths(v)
            const hash = (n) => `0x${((n + 7) * 2654435761).toString(16).padStart(8, '0').repeat(8).slice(0, 64)}`
            const paid = months.filter((m) => m.status === 'distributed').slice(0, 4)
            const rows = paid.map((m, i) => ({
              id: `mv_d_${m.month}`,
              type: 'distribution',
              amountBtcSats: m.sats,
              amountUsdc: m.usd,
              btcPriceUsd: m.price,
              occurredAt: `${m.month}-01T09:00:00Z`,
              txHash: hash(i),
              status: 'confirmed',
            }))
            // Un retrait de bitcoin vers le portefeuille du client, après la deuxième distribution.
            if (paid[1]) {
              const sats = Math.round(paid[1].sats * 1.6)
              rows.push({
                id: 'mv_w_1',
                type: 'withdrawal',
                amountBtcSats: sats,
                amountUsdc: Math.round((sats / 1e8) * paid[1].price),
                btcPriceUsd: paid[1].price,
                occurredAt: `${paid[1].month}-14T11:20:00Z`,
                txHash: hash(9),
                status: 'confirmed',
              })
            }
            const startPrice = months[months.length - 1]?.price ?? BTC_SPOT_USD
            rows.push({
              id: 'mv_dep',
              type: 'deposit',
              amountBtcSats: Math.round((VAULT_PRINCIPAL[v] / startPrice) * 1e8),
              amountUsdc: VAULT_PRINCIPAL[v],
              btcPriceUsd: startPrice,
              occurredAt: `${VAULT_START[v]}T09:00:00Z`,
              txHash: hash(11),
              status: 'confirmed',
            })
            return rows.sort((x, y) => y.occurredAt.localeCompare(x.occurredAt))
          })(),
        ),
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
          clientId: 'cli_6',
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
          clientId: 'cli_4',
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
          questionnaire: { platformKind: 'Family Office', assetsUnderManagement: '$50M – $250M', fundsIdleOrEarning: 'Partly earning', hasProductToday: 'Not Yet', productInterest: 'Capital preservation', firstVaultSize: '$500k – $1M', launchTimeline: 'Next quarter', submittedAt: iso(3) },
        },
        {
          id: 'off_003',
          reference: 'ACCRUE-02',
          clientId: 'cli_7',
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
          clientId: 'cli_8',
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
          clientId: 'cli_9',
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
          questionnaire: { platformKind: 'Wealth Platform', assetsUnderManagement: '$50M – $250M', fundsIdleOrEarning: 'Mostly sitting unused', hasProductToday: 'Yes', productInterest: 'Capital preservation', firstVaultSize: '$500k – $1M', launchTimeline: 'Within 3 months', submittedAt: iso(42) },
        },
        {
          id: 'off_006',
          reference: 'HEARST-01',
          clientId: 'cli_1',
          clientName: 'Hearst Holdings',
          clientKind: 'Crypto company',
          contactEmail: 'treasury@hearst-holdings.test',
          amountUsdc: 420_000,
          riskProfile: 'balanced',
          allocation: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
          lockupMonths: 24,
          status: 'active',
          createdAt: iso(400),
          updatedAt: iso(380),
          sentAt: iso(395),
          decidedAt: iso(388),
          vaultId: vaultKey(0),
          notes: null,
          questionnaire: { platformKind: 'Crypto Company', assetsUnderManagement: '$10M – $50M', fundsIdleOrEarning: 'Mostly sitting unused', hasProductToday: 'Yes', productInterest: 'Balanced', firstVaultSize: '$100k – $500k', launchTimeline: 'ASAP', submittedAt: iso(405) },
        },
        {
          id: 'off_007',
          reference: 'KESTREL-01',
          clientId: 'cli_10',
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
          questionnaire: { platformKind: 'Fund', assetsUnderManagement: '$250M+', fundsIdleOrEarning: 'Partly earning', hasProductToday: 'Yes', productInterest: 'Growth-oriented', firstVaultSize: '$1M – $5M', launchTimeline: 'Within 6 months', submittedAt: iso(66) },
        },
        {
          id: 'off_008',
          reference: 'ZAND-01',
          clientId: 'cli_2',
          clientName: 'ZAND Bank',
          clientKind: 'Crypto company',
          contactEmail: 'treasury@zand.test',
          amountUsdc: 12_000_000,
          riskProfile: 'growth',
          allocation: { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
          lockupMonths: 24,
          status: 'active',
          createdAt: iso(600),
          updatedAt: iso(580),
          sentAt: iso(595),
          decidedAt: iso(588),
          vaultId: vaultKey(1),
          notes: null,
          questionnaire: { platformKind: 'Bank', assetsUnderManagement: '$50M – $250M', fundsIdleOrEarning: 'Partly earning', hasProductToday: 'Yes', productInterest: 'Growth-oriented', firstVaultSize: '$5M+', launchTimeline: 'ASAP', submittedAt: iso(605) },
        },
        {
          id: 'off_009',
          reference: 'RAIN-01',
          clientId: 'cli_3',
          clientName: 'Rain Financial',
          clientKind: 'Fund',
          contactEmail: 'ops@rain.test',
          amountUsdc: 3_400_000,
          riskProfile: 'conservative',
          allocation: { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
          lockupMonths: 24,
          status: 'active',
          createdAt: iso(490),
          updatedAt: iso(470),
          sentAt: iso(485),
          decidedAt: iso(478),
          vaultId: vaultKey(2),
          notes: null,
          questionnaire: { platformKind: 'Fund', assetsUnderManagement: '$50M – $250M', fundsIdleOrEarning: 'Mostly sitting unused', hasProductToday: 'Yes', productInterest: 'Capital preservation', firstVaultSize: '$1M – $5M', launchTimeline: 'Within 3 months', submittedAt: iso(495) },
        },
        {
          id: 'off_010',
          reference: 'NORTHGATE-01',
          clientId: 'cli_5',
          clientName: 'Northgate Capital',
          clientKind: 'Crypto exchange',
          contactEmail: 'treasury@northgate.test',
          amountUsdc: 5_600_000,
          riskProfile: 'balanced',
          allocation: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
          lockupMonths: 24,
          status: 'active',
          createdAt: iso(270),
          updatedAt: iso(250),
          sentAt: iso(265),
          decidedAt: iso(258),
          vaultId: vaultKey(4),
          notes: null,
          questionnaire: { platformKind: 'Crypto Exchange', assetsUnderManagement: '$50M – $250M', fundsIdleOrEarning: 'Mostly sitting unused', hasProductToday: 'Not Yet', productInterest: 'Balanced', firstVaultSize: '$5M+', launchTimeline: 'ASAP', submittedAt: iso(275) },
        },
        // Les offres créées depuis la console pendant que ce mock tourne.
        ...CREATED_OFFERS,
      ]),
    }
  }

  if (p === '/api/v1/clients') {
    return {
      clients: bloc(
        allClients().map((c) => ({ id: c.id, label: c.label })),
      ),
    }
  }
  if (/^\/api\/v1\/admin\/clients\/[^/]+$/.test(p)) {
    return {
      id: p.split('/').pop(),
      displayName: allClients().find((c) => c.id === p.split('/').pop())?.label ?? 'Unknown client',
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
        subscribedAt: '2025-09-10T09:00:00Z',
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
        vaultId: vaultKey(0),
        label: 'Dedicated Vault',
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
        lockupStartAt: '2025-09-10T09:00:00Z',
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
        minersManaged: MACHINES.length,
        hashrateEhs: Number((FLEET_THS / 1e6).toFixed(2)),
        btcProducedTotal: 750.4,
        countries: 10,
        uptimePct: FLEET_UPTIME,
        asOf: nowIso(),
        /*
         * Part attribuée au vault du client, au prorata de son capital.
         *
         * Un vrai backend calcule ces valeurs à partir des machines réellement
         * affectées et de la date d'entrée. Le mock les pose en dur, cohérentes
         * entre elles : 0.021 % d'un parc de 10 000 machines et 2.1 EH/s donne
         * ~2 machines et ~441 TH/s, pour ~0.158 BTC produits.
         */
        allocatedSharePct: Number(((VAULT_THS[0] / FLEET_THS) * 100).toFixed(2)),
        allocatedMiners: MACHINE_VAULT.filter((v) => v === 0).length,
        allocatedHashrateThs: Math.round(VAULT_THS[0]),
        // Six mois de production de SA puissance — la même somme que ses lignes de clôture mensuelle.
        allocatedBtcProduced: Number((VAULT_THS[0] * BTC_PER_THS_DAY * 30 * 6 * 0.975).toFixed(4)),
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
        networkDifficulty: 9.205e13,
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
          vaultId: vaultKey(i % 3),
          clientId: CLIENT_BOOK[i % 5].id,
          clientLabel: CLIENT_BOOK[i % 5].label,
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
        allClients().map((c, i) => ({
          id: `rev_${i}`,
          clientId: c.id,
          clientLabel: c.label,
          kycStatus: c.kyc,
          stage: c.kyc === 'APPROVED' ? 'COMPLETE' : c.kyc === 'PENDING' ? 'DOCUMENTS' : 'NOT_STARTED',
          openedAt: new Date(c.since + 'T09:00:00Z').toISOString(),
          lastEventAt: new Date(Date.parse('2026-09-28T00:00:00Z') - i * 86_400_000).toISOString(),
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
        // Tous les vaults, mois par mois : ce que le book a distribué en bitcoin.
        (() => {
          const byMonth = new Map()
          VAULT_PRINCIPAL.forEach((_, v) => {
            for (const m of vaultMonths(v)) {
              const cur = byMonth.get(m.month) ?? { sats: 0, usd: 0, price: m.price, status: m.status, buckets: {}, vaults: [] }
              const buckets = { ...cur.buckets }
              for (const b of m.pockets) {
                const prev = buckets[b.bucket] ?? { usd: 0, btcSats: 0 }
                buckets[b.bucket] = { usd: prev.usd + b.usd, btcSats: prev.btcSats + b.btcSats }
              }
              const c = CLIENT_BOOK.find((x) => x.vault === v)
              byMonth.set(m.month, {
                sats: cur.sats + m.sats,
                usd: cur.usd + m.usd,
                price: m.price,
                status: m.status,
                buckets,
                vaults: [...cur.vaults, { vaultId: vaultKey(v), clientLabel: c?.label ?? vaultKey(v), btcSats: m.sats }],
              })
            }
          })
          return [...byMonth.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, m], i) => ({
              id: `dist_${i}`,
              month,
              distributionDate: `${month}-05T10:00:00Z`,
              btcAmountSats: String(m.sats),
              btcPriceUsdc: String(m.price),
              yieldUsdc: String(m.usd),
              // Ce que chaque poche a ajouté, tous vaults confondus.
              byBucket: Object.entries(m.buckets).map(([bucket, v]) => ({ bucket, ...v })),
              // Et ce que chaque vault a reçu ce mois-là.
              byVault: m.vaults,
              rwaStrategyId: 'p1',
              status: m.status,
              approvedAt: m.status !== 'pending' ? `${month}-04T16:00:00Z` : null,
              approvedBy: m.status !== 'pending' ? 'admin@localhost' : null,
            }))
        })(),
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

  /*
   * LA CLÔTURE MENSUELLE, vault par vault.
   *
   * Le parc est unique ; chaque vault en possède une part. Chaque mois, la
   * production du parc et son électricité se répartissent entre les vaults au
   * prorata du capital que CHACUN a placé dans sa poche Mining (son capital ×
   * sa part minage) — pas de son capital total : un vault prudent à 20 % de
   * minage ne reçoit pas comme un vault offensif à 60 %. Chaque ligne se valide
   * séparément : c'est la distribution DE CE client.
   */
  if (p === '/api/v1/admin/mining/monthly-close') {
    const vaults = [
      { idx: 0, clientId: 'cli_1', client: 'Hearst Holdings', principal: 420_000, miningBps: 4000 },
      { idx: 1, clientId: 'cli_2', client: 'ZAND Bank', principal: 12_000_000, miningBps: 6000 },
      { idx: 2, clientId: 'cli_3', client: 'Rain Financial', principal: 3_400_000, miningBps: 2000 },
      { idx: 3, clientId: 'cli_4', client: 'Meridian Family Office', principal: 850_000, miningBps: 2000 },
      { idx: 4, clientId: 'cli_5', client: 'Northgate Capital', principal: 5_600_000, miningBps: 4000 },
    ]
    const miningCapital = vaults.map((v) => (v.principal * v.miningBps) / 10_000)
    const months = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(Date.UTC(2026, 2 + k, 1))
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    })
    return {
      months: bloc(
        months.map((month, m) => {
          /* La production du parc ENTIER, et son électricité (~17 J/TH à
             0,045 $/kWh). Chaque vault en reçoit la part de SA puissance ; la
             part des machines libres reste à Hearst. */
          // Les MÊMES formules que la réserve de chaque vault (`vaultMonths`).
          const n = months.length - 1 - m
          const fleetSats = Math.round(FLEET_THS * BTC_PER_THS_DAY * 30 * monthWobble(n) * 1e8)
          const price = monthPrice(n)
          const electricityUsd = Math.round((fleetSats / 1e8) * price * ELECTRICITY_SHARE)
          const last = m === months.length - 1
          return {
            month,
            fleetBtcSats: fleetSats,
            btcPriceUsd: price,
            electricityUsd,
            lines: vaults.map((v, i) => {
              const share = VAULT_THS[v.idx] / FLEET_THS
              const sats = Math.round(fleetSats * share)
              const gross = Math.round((sats / 1e8) * price)
              const elec = Math.round(electricityUsd * share)
              return {
                id: `dist_${month}_${v.idx}`,
                vaultId: vaultKey(v.idx),
                clientId: v.clientId,
                clientLabel: v.client,
                miningCapitalUsdc: Math.round(miningCapital[i]),
                hashrateThs: Math.round(VAULT_THS[v.idx]),
                sharePct: Number((share * 100).toFixed(2)),
                btcSats: sats,
                grossUsd: gross,
                electricityUsd: elec,
                netUsd: gross - elec,
                // Le dernier mois est en cours de validation : certains vaults
                // sont déjà signés, d'autres attendent.
                // Le dernier mois attend sa signature, l'avant-dernier est approuvé —
                // comme la réserve de chaque vault (`vaultMonths`).
                // Le reward du mois se valide sur la fiche du client : la clôture en suit la décision.
                status: last ? (rewardDecision(v.idx) === 'approved' ? 'distributed' : rewardDecision(v.idx) === 'declined' ? 'declined' : 'pending') : 'distributed',
                // L'électricité de CE vault : payée pour les mois clos, due pour le dernier.
                electricityStatus: !last || PAID_ELECTRICITY.has(`${vaultKey(v.idx)}:${month}`) ? 'paid' : 'due',
              }
            }),
          }
        }),
      ),
    }
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

// ── Écritures ────────────────────────────────────────────────────────────────

const ENVELOPE_EXEMPT = new Set(['/health', '/ready', '/api/v1/runtime'])

const reply = (status, body) => ({ status, body })

/**
 * Les écritures que le mock sait jouer (souscription, décision d'un admin,
 * électricité, création d'offre). `body` est déjà parsé ; `null` si la route
 * n'est pas une écriture connue — l'hôte retombe alors sur `payloadFor`.
 * L'authentification reste à l'hôte : elle se fait avant cet appel.
 */
function handleWrite(method, path, body) {
  // Souscription : le backend est l'autorité, pas le formulaire. On rejoue donc
  // ici les refus qu'un vrai back opposerait (montant, minimum, capacité) pour
  // que les états d'erreur de l'UI soient réellement exerçables en local.
  if (path === '/api/v1/me/deposits' && method === 'POST') {
    const amount = Number(body?.amountUsdc)
    if (!Number.isFinite(amount) || amount <= 0) {
      return reply(400, problem(400, 'INVALID_AMOUNT', 'amountUsdc must be a positive whole number of USDC.'))
    }
    if (amount < 100_000) {
      return reply(422, problem(422, 'BELOW_MINIMUM', 'Amount is below the 100,000 USDC minimum for this vault.'))
    }
    if (amount > 26_750_000) {
      return reply(422, problem(422, 'CAPACITY_EXCEEDED', 'Amount exceeds the capacity left in the vault.'))
    }
    return reply(200, envelope({
      deposit: bloc({
        id: `dep_${randomUUID().slice(0, 8)}`,
        amountUsdc: amount,
        status: 'PENDING_SETTLEMENT',
        receivedAt: nowIso(),
      }),
    }))
  }

  // Création d'une offre : le backend valide, le formulaire pré-valide
  // seulement. L'allocation doit sommer à 10 000 bps — une offre à 97 %
  // ouvrirait un vault dont une part du capital ne sait pas où aller.
  /* LA DÉCISION D'UN ADMIN sur un élément en attente. Un rééquilibrage
     approuvé remet le vault à sa cible ; un changement de protocole approuvé
     bascule la poche sur le nouveau protocole. Refusé : rien ne bouge. */
  const mDecide = path.match(/^\/api\/v1\/admin\/approvals\/([^/]+)\/decision$/)
  if (mDecide && method === 'POST') {
    const decision = body?.decision === 'decline' ? 'declined' : 'approved'
    const id = mDecide[1]
    DECISIONS.set(id, decision)
    if (decision === 'approved' && id.startsWith('apr_reb_')) {
      const c = CLIENT_BOOK.find((x) => `apr_reb_${x.id}` === id)
      if (c && c.vault !== null && VAULT_DRIFT[c.vault]) {
        // Le keeper exécute : l'écart corrigé entre dans l'historique, le vault revient à sa cible.
        const before = { ...VAULT_DRIFT[c.vault] }
        const worst = Math.max(Math.abs(before.mining), Math.abs(before.lending), Math.abs(before.stable))
        const sorted = Object.entries(before).sort((a, b) => a[1] - b[1])
        const name = { mining: 'Mining Alpha', lending: 'Bitcoin Lending', stable: 'USDC Yield' }
        EXECUTED_REBALANCES.push({
          v: c.vault,
          at: new Date().toISOString(),
          before,
          worst,
          moveUsd: Math.round((VAULT_PRINCIPAL[c.vault] * worst) / 10_000),
          fromBucket: name[sorted[sorted.length - 1][0]],
          toBucket: name[sorted[0][0]],
          k: 100 + EXECUTED_REBALANCES.length,
        })
        VAULT_DRIFT[c.vault] = { mining: 0, lending: 0, stable: 0 }
      }
    }
    if (decision === 'approved' && id === 'apr_proto_cli_2') {
      VAULT_PROTOCOLS[1].stable = { name: 'Aave (USDC)', apy: 12.0 }
    }
    return reply(200, envelope({ id, decision }))
  }

  /* L'électricité se paie VAULT PAR VAULT, pour un mois donné : le paiement
     est retenu (en mémoire) et la clôture mensuelle le montre aussitôt. */
  if (path === '/api/v1/mining/electricity/pay' && method === 'POST') {
    if (typeof body?.vaultId === 'string' && typeof body?.month === 'string') {
      PAID_ELECTRICITY.add(`${body.vaultId}:${body.month}`)
    }
    return reply(200, envelope({ status: 'recorded', reason: null }))
  }

  if (path === '/api/v1/admin/offers' && method === 'POST') {
    const clientName = String(body?.clientName ?? '').trim()
    const amount = Number(body?.amountUsdc)
    const months = Number(body?.lockupMonths)
    const alloc = body?.allocation ?? {}
    const bps = [alloc.miningBps, alloc.lendingBps, alloc.stableBps].map(Number)
    if (clientName === '') {
      return reply(400, problem(400, 'INVALID_CLIENT', 'clientName is required.'))
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return reply(400, problem(400, 'INVALID_AMOUNT', 'amountUsdc must be a positive whole number of USDC.'))
    }
    // Le ticket minimum d'un vault dédié.
    if (amount < 100_000) {
      return reply(400, problem(400, 'BELOW_MINIMUM', 'A dedicated vault starts at 100,000 USDC.'))
    }
    if (!Number.isFinite(months) || months <= 0) {
      return reply(400, problem(400, 'INVALID_LOCKUP', 'lockupMonths must be a positive number of months.'))
    }
    if (bps.some((b) => !Number.isFinite(b) || b < 0) || bps.reduce((a, b) => a + b, 0) !== 10_000) {
      return reply(422, problem(422, 'ALLOCATION_NOT_100', 'The three pockets must total 10,000 bps.'))
    }
    const now = nowIso()
    const n = CREATED_OFFERS.length + 1
    // Un client existant garde son identifiant (deuxième tranche, renouvellement) ;
    // un prospect nouveau en reçoit un.
    const known = allClients().find(
      (c) => c.id === body?.clientId || c.label.toLowerCase() === clientName.toLowerCase(),
    )
    const offer = {
      id: `off_new_${String(n).padStart(3, '0')}`,
      clientId: known?.id ?? `cli_new_${String(n).padStart(3, '0')}`,
      reference: String(body?.reference ?? '').trim() || `${clientName.split(' ')[0].toUpperCase()}-${String(n).padStart(2, '0')}`,
      clientName,
      clientKind: body?.clientKind || null,
      contactEmail: body?.contactEmail || null,
      amountUsdc: Math.round(amount),
      riskProfile: ['conservative', 'balanced', 'growth'].includes(body?.riskProfile) ? body.riskProfile : 'balanced',
      allocation: { miningBps: bps[0], lendingBps: bps[1], stableBps: bps[2] },
      lockupMonths: Math.round(months),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      sentAt: null,
      decidedAt: null,
      vaultId: null,
      notes: body?.notes || null,
      questionnaire: null,
    }
    CREATED_OFFERS.unshift(offer)
    persistOffers()
    return reply(201, envelope({ offer: bloc(offer) }))
  }
  return null
}

export {
  ACCOUNTS,
  CREATED_OFFERS,
  ENVELOPE_EXEMPT,
  bloc,
  envelope,
  handleWrite,
  nowIso,
  onOffersChanged,
  payloadFor,
  problem,
  randomUUID,
}
