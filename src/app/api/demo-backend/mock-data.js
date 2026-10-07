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
 * `vault` : l'index du PREMIER vault du client (vaultKey), null tant qu'aucun
 * n'est ouvert. `vaults` : tous ses vaults, un par tranche, du plus ancien au
 * plus récent — un nouveau versement ouvre un nouveau vault, il ne s'ajoute
 * jamais à un vault existant (prix d'entrée, blocage et allocation propres).
 */
const CLIENT_BOOK_BASE = [
  { id: 'cli_1', label: 'Hearst Holdings', kyc: 'APPROVED', vault: 0, since: '2025-08-20' },
  { id: 'cli_2', label: 'ZAND Bank', kyc: 'APPROVED', vault: 1, vaults: [1, 5], since: '2025-02-10' },
  { id: 'cli_3', label: 'Rain Financial', kyc: 'APPROVED', vault: 2, since: '2025-06-01' },
  { id: 'cli_4', label: 'Meridian Family Office', kyc: 'APPROVED', vault: 3, since: '2024-10-10' },
  { id: 'cli_5', label: 'Northgate Capital', kyc: 'APPROVED', vault: 4, since: '2025-12-20' },
  { id: 'cli_6', label: 'Northwind Digital', kyc: 'NOT_STARTED', vault: null, since: '2026-09-01' },
  { id: 'cli_7', label: 'Accrue Capital', kyc: 'PENDING', vault: null, since: '2026-08-12' },
  { id: 'cli_8', label: 'Halven Custody', kyc: 'APPROVED', vault: null, since: '2026-07-30' },
  { id: 'cli_9', label: 'Solstice Wealth', kyc: 'APPROVED', vault: null, since: '2026-07-02' },
  { id: 'cli_10', label: 'Kestrel Partners', kyc: 'NOT_STARTED', vault: null, since: '2026-06-15' },
]

/** La table VIVANTE des clients : le socle, plus les clients nés d'une offre,
 *  avec leur KYC et leurs vaults tels que le monde les a fait évoluer.
 *  Reconstruite par `applyWorld` à chaque requête. */
const CLIENT_BOOK = CLIENT_BOOK_BASE.map((c) => ({ ...c }))

/** Le type de chaque client — sert la répartition de l'AUM par type. */
const CLIENT_KIND = { cli_1: 'Crypto company', cli_2: 'Crypto company', cli_3: 'Fund', cli_4: 'Family office', cli_5: 'Crypto exchange' }
/** Les vaults d'un client, un par tranche, du plus ancien au plus récent. */
const vaultsOf = (c) => c.vaults ?? (c.vault === null || c.vault === undefined ? [] : [c.vault])
/** Le client qui détient un vault. */
const ownerOf = (v) => CLIENT_BOOK.find((c) => vaultsOf(c).includes(v)) ?? null
/** Le rang de la tranche d'un vault chez son client (1 = premier versement). */
const trancheOf = (v) => {
  const c = ownerOf(v)
  return c ? vaultsOf(c).indexOf(v) + 1 : 1
}
/** La clé des décisions d'un vault : `cli_2` pour la première tranche (les
 *  identifiants existants ne bougent pas), `cli_2_t2` pour la suivante. */
const vaultTag = (v) => {
  const t = trancheOf(v)
  return t === 1 ? ownerOf(v).id : `${ownerOf(v).id}_t${t}`
}
/** Le libellé d'un vault : le client, et sa tranche quand il en a plusieurs. */
const vaultLabel = (v) => {
  const c = ownerOf(v)
  if (c === null) return null
  return vaultsOf(c).length > 1 ? `${c.label} · Vault ${trancheOf(v)}` : c.label
}
/** Tous les vaults ouverts, avec leur client et leur rang de tranche. */
const ALL_VAULTS = () => CLIENT_BOOK.flatMap((c) => vaultsOf(c).map((v, i) => ({ v, c, tranche: i + 1 })))
/** Les décisions de l'admin, `approvalId → approved|declined` — en mémoire, le temps du mock. */
const DECISIONS = new Map()
/** Le protocole de chaque poche, par vault — modifié quand un changement est approuvé. */
const VAULT_PROTOCOLS = [0, 1, 2, 3, 4, 5].map(() => ({
  mining: { name: 'Hearst fleet', apy: 14.2 },
  lending: { name: 'Aave (cbBTC)', apy: 8.4 },
  stable: { name: 'Morpho (USDC)', apy: 10.1 },
}))
/** Les électricités déjà payées, `vaultId:YYYY-MM` — en mémoire, le temps du mock. */
const PAID_ELECTRICITY = new Set()
// L'index 5 est la DEUXIÈME tranche de ZAND Bank : un nouveau versement, donc un nouveau vault.
const VAULT_PRINCIPAL = [420_000, 12_000_000, 3_400_000, 850_000, 5_600_000, 2_000_000]
/** Date d'ouverture de chaque vault — la même que le registre. */
// Des ouvertures étalées : un book qui grandit client après client, pas un an à vide.
const VAULT_START = ['2025-09-10', '2025-03-01', '2025-06-15', '2024-10-20', '2026-01-15', '2026-02-02']
/** L'allocation de chaque vault (bps) — la même que le registre. */
const VAULT_ALLOC = [
  { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
  { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
  { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
  { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
  { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
  // La tranche 2 reprend l'allocation de la tranche 1 : c'est le pré-remplissage d'une nouvelle tranche.
  { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
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
  { mining: 118, lending: -48, stable: -70 },
]
/** La bande que le mandat de chaque vault tolère, en bps (même que le registre ; 500 par défaut). */
const VAULT_BAND = [500, 500, 250, 800, 500, 500]
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
  // Un vault ouvert pendant la démo n'a pas d'histoire : ses rééquilibrages sont ceux qu'on approuve.
  if (v >= BASE_VAULT_COUNT) return []
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
const VAULT_MINING_BPS = [4000, 6000, 2000, 2000, 4000, 6000]
/** Le nombre de vaults du SOCLE ; ceux ouverts pendant la démo viennent après. */
const BASE_VAULT_COUNT = VAULT_PRINCIPAL.length
const VAULT_MINING_CAPITAL = VAULT_PRINCIPAL.map((p, i) => (p * VAULT_MINING_BPS[i]) / 10_000)
/* Chaque machine est AFFECTÉE à un vault jusqu'à ce que ce vault ait la
   puissance que son capital a achetée ; le reste du parc est LIBRE — capacité
   disponible pour les prochains clients. L'ordre est mélangé (pas premier) pour
   que chaque vault ait des machines sur plusieurs sites. */
const MACHINE_VAULT = new Array(FLEET_SIZE).fill(null)
/** La puissance réellement affectée à chaque vault. */
const VAULT_THS = []
function allocateMachines() {
  MACHINE_VAULT.fill(null)
  const order = Array.from({ length: FLEET_SIZE }, (_, k) => (k * 7919) % FLEET_SIZE) // 7919 premier avec 10 000
  let cursor = 0
  VAULT_MINING_CAPITAL.forEach((capital, v) => {
    const target = capital / USD_PER_THS
    let got = 0
    while (got < target && cursor < order.length) {
      const i = order[cursor++]
      if (MACHINES[i].status !== 'online') continue
      MACHINE_VAULT[i] = v
      got += MACHINES[i].hashrateThs
    }
  })
  VAULT_THS.length = 0
  VAULT_MINING_CAPITAL.forEach((_, v) =>
    VAULT_THS.push(MACHINES.reduce((t, m, i) => t + (MACHINE_VAULT[i] === v ? m.hashrateThs : 0), 0)),
  )
}
allocateMachines()
const vaultIndexOfMachine = (k) => MACHINE_VAULT[k]
const FLEET_THS = MACHINES.reduce((s, m) => s + m.hashrateThs, 0)
const FLEET_ACTIVE = MACHINES.filter((m) => m.status === 'online').length
const FLEET_UPTIME = Number((MACHINES.reduce((s, m) => s + m.uptime30dPct, 0) / MACHINES.length).toFixed(1))

/** Les clients du registre, plus ceux nés d'une offre créée depuis la console. */
const allClients = () => CLIENT_BOOK

/* ══ L'HORLOGE ═════════════════════════════════════════════════════════════
 * « Aujourd'hui » pour le mock : la date réelle, avancée de `WORLD.clock`
 * mois. Le dernier mois CLOS est celui qui précède aujourd'hui. Toutes les
 * dates du métier en découlent : rewards, échéances, clôture mensuelle — la
 * démo peut ainsi avancer d'un mois, ou jusqu'à la fin d'un blocage. */
const addMonths = (t, n) => {
  const d = new Date(t)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d
}
const mockNow = () => addMonths(Date.now(), WORLD.clock)
const lastClosed = () => {
  const n = mockNow()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 1))
}
const ymOf = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const monthName = (ym) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const nowIso = () => mockNow().toISOString()

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
/*
 * LE COURS D'UN MOIS DU CALENDRIER — fixe, quelle que soit l'horloge. Indexé
 * sur le dernier mois clos RÉEL (k = 0) : en remontant le temps, la série
 * historique ; au-delà (l'horloge de la démo avance), une tendance qui monte.
 * Indexé sur le dernier mois clos de l'horloge, un mois était re-pricé à
 * chaque avancée et un dépôt « achetait » rétroactivement plus de bitcoin.
 */
const calIndex = (ym) => {
  const now = new Date()
  const anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  const d = new Date(`${ym}-01T00:00:00Z`)
  return (new Date(anchor).getUTCFullYear() - d.getUTCFullYear()) * 12 + new Date(anchor).getUTCMonth() - d.getUTCMonth()
}
const priceOf = (ym) => {
  const k = calIndex(ym)
  // Le mois en cours EST le cours affiché : un vault ouvert aujourd'hui convertit au spot, pas au-dessus.
  if (k === -1) return BTC_SPOT_USD
  return k >= 0 ? monthPrice(k) : Math.round(BTC_SPOT_USD + (-k - 1) * 900 + ((-k * 7919) % 4_000) - 2_000)
}
const wobbleOf = (ym) => monthWobble(Math.abs(calIndex(ym)))
/** Le rendement du parc ce mois-là (uptime, difficulté) — le même pour tous. */
const monthWobble = (n) => 0.82 + ((n * 37) % 30) / 100
/** L'électricité pèse ~36 % de la valeur minée. */
const ELECTRICITY_SHARE = 0.36

function vaultMonths(v) {
  const out = []
  // Le dernier mois CLOS — ou celui où le blocage a été levé, s'il l'a été.
  const released = WORLD.released[v] ? new Date(`${WORLD.released[v].month}-01T00:00:00Z`) : null
  const d = released && released < lastClosed() ? released : lastClosed()
  const first = new Date(`${VAULT_START[v].slice(0, 7)}-01T00:00:00Z`)
  // Un vault du socle commence le mois suivant son ouverture ; un vault ouvert
  // pendant la démo compte son mois d'ouverture (au prorata), pour que la
  // première clôture arrive au mois suivant.
  if (v < BASE_VAULT_COUNT) first.setUTCMonth(first.getUTCMonth() + 1)
  const principal = VAULT_PRINCIPAL[v]
  const a = VAULT_ALLOC[v]
  let n = 0
  while (d >= first) {
    const month = ymOf(d)
    // Le cours du mois : celui du calendrier, le même à chaque lecture.
    const price = priceOf(month)
    const wobble = wobbleOf(month)
    const pockets = [
      // Le minage : ce que SA puissance a miné, électricité déduite (~36 %).
      { bucket: 'Mining Alpha', usd: VAULT_THS[v] * BTC_PER_THS_DAY * 30 * wobble * (1 - ELECTRICITY_SHARE) * price },
      { bucket: 'Bitcoin Lending', usd: ((principal * a.lendingBps) / 10_000) * (POCKET_APY.lending / 12) },
      { bucket: 'USDC Yield', usd: ((principal * a.stableBps) / 10_000) * (POCKET_APY.stable / 12) },
    ].map((b) => ({ bucket: b.bucket, usd: Math.round(b.usd), btcSats: Math.round((b.usd / price) * 1e8) }))
    // Le reward du dernier mois clos attend l'admin ; une fois approuvé il est
    // versé. Les mois antérieurs sont réglés — sauf refus explicite.
    const decision = rewardDecision(v, month)
    const latest = month === ymOf(lastClosed()) && !released
    out.push({
      month,
      price,
      pockets,
      sats: pockets.reduce((t, b) => t + b.btcSats, 0),
      usd: pockets.reduce((t, b) => t + b.usd, 0),
      status: decision === 'declined' ? 'declined' : latest && decision !== 'approved' ? 'pending' : 'distributed',
    })
    d.setUTCMonth(d.getUTCMonth() - 1)
    n += 1
  }
  return out
}
/** Le premier mois rémunéré d'un vault (voir `vaultMonths`). */
function firstMonthOf(v) {
  const first = new Date(`${VAULT_START[v].slice(0, 7)}-01T00:00:00Z`)
  if (v < BASE_VAULT_COUNT) first.setUTCMonth(first.getUTCMonth() + 1)
  return ymOf(first)
}
/** La décision de l'admin sur le reward d'un vault pour un mois donné. */
function rewardDecision(v, month) {
  return ownerOf(v) ? WORLD.decisions[`apr_dist_${vaultTag(v)}_${month}`] : undefined
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
  '0x6e8b1d3a5f7c9e0b2d4f6a8c0e2b4d6f8a0c2e4a',
]
/** Le n-ième vault, sous la forme que `parseVaultId` accepte. */
function vaultKey(n) {
  return `${VAULT_CHAIN_ID}-${VAULT_ADDRESSES[n % VAULT_ADDRESSES.length]}`
}

function payloadFor(path, search = '') {
  const rnd = seeded(path)
  const p = path

  /* L'état de la démo guidée : l'horloge, le prospect embarqué, son offre,
     son KYC, ses vaults et ce qui l'attend. Le panneau de démo s'en sert pour
     savoir à quelle étape on en est. */
  if (p === '/api/v1/demo/state') {
    const tour = WORLD.tour
    const offer = tour?.offerId ? (allOffers().find((o) => o.id === tour.offerId) ?? null) : null
    const client = offer ? (allClients().find((c) => c.id === offer.clientId) ?? null) : null
    const vaults = client
      ? vaultsOf(client).map((v) => {
          const start = new Date(`${VAULT_START[v]}T09:00:00Z`)
          const months = lockupMonthsOf(v)
          const ms = vaultMonths(v)
          return {
            vaultId: vaultKey(v),
            tranche: trancheOf(v),
            openedAt: start.toISOString(),
            lockupEndAt: addMonths(start, months).toISOString(),
            lockupEnded: addMonths(start, months) <= mockNow(),
            released: isReleased(v),
            monthsRewarded: ms.length,
            rewardsValidated: ms.filter((m) => m.status === 'distributed').length,
            pendingReward: ms.find((m) => m.status === 'pending')?.month ?? null,
            // Le mois clos a-t-il son électricité payée (Settlement) ?
            closedMonth: ms.length > 0 ? ymOf(lastClosed()) : null,
            electricityPaid: ms.length > 0 && WORLD.paid.includes(`${vaultKey(v)}:${ymOf(lastClosed())}`),
            rebalances: (WORLD.rebalanced[v] ?? []).length,
            withdrawals: withdrawalsOf(v).map((w) => ({ id: w.id, status: w.status, btc: w.sats / 1e8 })),
            availableBtc: vaultEconomy(v).availableSats / 1e8,
            drifting: (() => {
              const d = VAULT_DRIFT[v]
              return d !== null && Math.max(Math.abs(d.mining), Math.abs(d.lending), Math.abs(d.stable)) > VAULT_BAND[v]
            })(),
          }
        })
      : []
    return {
      state: {
        clock: WORLD.clock,
        today: nowIso(),
        lastClosed: ymOf(lastClosed()),
        tour,
        viewAs: WORLD.viewAs,
        offer,
        client: client ? { id: client.id, label: client.label, kyc: client.kyc, aml: client.aml ?? null } : null,
        vaults,
        offers: client ? allOffers().filter((o) => o.clientId === client.id).map((o) => ({ id: o.id, reference: o.reference, status: o.status })) : [],
      },
    }
  }

  /* ── /account COMME LE CLIENT DE LA DÉMO ──────────────────────────────────
     Quand la démo regarde un client (`viewAs`), ses lectures `/me/*` viennent
     de SON vault : son versement, ses rewards validés, ses retraits. Sans
     client regardé, Hearst Holdings et ses constantes, comme avant. */
  const seen = viewedVault()
  if (seen !== null) {
    const { v, c } = seen
    const eco = vaultEconomy(v)
    const usdOf = (sats) => usdcFromBtc(sats / 1e8)
    const months = vaultMonths(v)
    if (p === '/api/v1/me/vault') {
      const next = addMonths(new Date(Date.UTC(mockNow().getUTCFullYear(), mockNow().getUTCMonth(), 1)), 1)
      return {
        vault: bloc({
          vaultId: vaultKey(v),
          label: vaultsOf(c).length > 1 ? `Vault ${trancheOf(v)}` : 'Dedicated Vault',
          principalUsdc: VAULT_PRINCIPAL[v],
          withdrawnUsdc: usdOf(eco.withdrawnSats),
          withdrawnUsdcAtPayout: eco.withdrawnUsdAtPayout,
          entryRateUsd: eco.entryRate,
          availableUsdc: usdOf(eco.availableSats),
          nextDistributionAt: next.toISOString(),
          lockupStartAt: `${VAULT_START[v]}T09:00:00Z`,
          lockupMonths: lockupMonthsOf(v),
          depositUnlocked: false,
          depositRequestedAt: null,
          withdrawUnlocked: !isReleased(v),
          producedBtc: eco.producedSats / 1e8,
          accruedBtc: eco.accruedSats / 1e8,
          pendingWithdrawalBtc: eco.pendingSats / 1e8,
        }),
      }
    }
    if (p === '/api/v1/me/portfolio') {
      const accrued = usdOf(eco.accruedSats)
      return {
        position: bloc({
          principal: VAULT_PRINCIPAL[v],
          accrued,
          value: VAULT_PRINCIPAL[v] + accrued,
          status: isReleased(v) ? 'RELEASED' : 'ACTIVE',
          subscribedAt: `${VAULT_START[v]}T09:00:00Z`,
        }),
      }
    }
    if (p === '/api/v1/me/movements') {
      const hash = (n) => '0x' + createHash('sha256').update(`${vaultKey(v)}:${n}`).digest('hex')
      const rows = [
        { id: 'mv_dep', type: 'deposit', amountUsdc: VAULT_PRINCIPAL[v], occurredAt: `${VAULT_START[v]}T09:00:00Z`, txHash: hash('dep') },
        ...months
          .filter((m) => m.status === 'distributed')
          .map((m) => ({ id: `mv_d_${m.month}`, type: 'distribution', amountUsdc: m.usd, occurredAt: `${addMonths(new Date(`${m.month}-01T09:00:00Z`), 1).toISOString().slice(0, 10)}T09:00:00Z`, txHash: hash(m.month) })),
        ...eco.withdrawals
          .filter((w) => w.status !== 'declined')
          .map((w) => {
            // Approuvé, le retrait part par Fireblocks : confirmé quand la transaction l'est.
            const tx = txOfRef(`apr_wd_${w.id}`)
            const view = tx ? fireblocksView(tx) : null
            const status = w.status !== 'approved' ? w.status : view?.status === 'COMPLETED' ? 'confirmed' : 'processing'
            return { id: `mv_${w.id}`, type: 'withdraw', amountUsdc: usdOf(w.sats), occurredAt: w.at, txHash: view?.txHash ?? '', status }
          }),
      ]
      return { movements: bloc(rows.sort((x, y) => y.occurredAt.localeCompare(x.occurredAt))) }
    }
    if (p === '/api/v1/vault/bucket-yields') {
      const cur = vaultCurrentBps(v)
      const capital = (bps) => Math.round((VAULT_PRINCIPAL[v] * bps) / 10_000)
      return {
        bucketYields: bloc([
          { bucket: 'Mining Alpha', yieldPct: VAULT_PROTOCOLS[v].mining.apy, capitalUsdc: capital(cur.mining), trendPct: 0.4 },
          { bucket: 'Bitcoin Lending', yieldPct: VAULT_PROTOCOLS[v].lending.apy, capitalUsdc: capital(cur.lending), trendPct: -0.2 },
          { bucket: 'USDC Yield', yieldPct: VAULT_PROTOCOLS[v].stable.apy, capitalUsdc: capital(cur.stable), trendPct: 0.1 },
        ]),
      }
    }
  }

  if (p === '/health') return { status: 'ok', uptimeSeconds: 128_400 }
  // Les sondes, dans la forme que lit la page Service (`RuntimePayload`, `ready`/`db`).
  if (p === '/ready') return { ready: true, db: 'ok', status: 'ready', checks: { database: 'ok', indexer: 'ok' } }
  if (p === '/api/v1/runtime') {
    return {
      service: 'hearst-connect-backend (mock local)',
      serviceVersion: 'mock-1',
      commitSha: 'demo0000',
      environment: 'local-mock',
      uptimeSeconds: 128_400,
      databaseStatus: 'ready',
      contractStatus: 'CONFIGURED',
      indexerStatus: 'RUNNING',
      db: { reachable: true, latencyMs: 3 },
      contract: { ...runtimeBlock(), contractAddress: '0x' + '11'.repeat(20) },
      indexer: { status: 'running', lastSyncedAt: nowIso() },
      indexerScheduler: {
        status: 'RUNNING',
        intervalMs: 15_000,
        lastRunAt: nowIso(),
        lastSuccessAt: nowIso(),
        consecutiveErrors: 0,
        lastIndexedBlock: 21_400_320,
      },
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
        /* Un dépôt REÇU attend son autorisation : les fonds d'une offre en
           « funding » sont arrivés. Autorisé, l'offre passe à « funds received »
           et le vault peut être ouvert. Une nouvelle tranche ouvre un NOUVEAU
           vault : il n'existe pas encore. */
        ...allOffers()
          .filter((o) => o.status === 'funding' && o.fundsReceivedAt)
          .map((o) => ({
            id: `apr_dep_${o.id}`,
            kind: 'deposit',
            clientId: o.clientId,
            clientLabel: o.clientName,
            vaultId: null,
            amountUsdc: o.amountUsdc,
            requestedAt: o.fundsReceivedAt,
            note: `${o.reference} — funds received, opens a new vault once authorised`,
          })),
        // Les retraits demandés depuis /account pendant la démo : en bitcoin, vers le portefeuille du client.
        ...(WORLD.withdrawals ?? []).map((w) => ({
          id: `apr_wd_${w.id}`,
          kind: 'withdrawal',
          clientId: ownerOf(w.v)?.id ?? null,
          clientLabel: vaultLabel(w.v),
          vaultId: vaultKey(w.v),
          amountUsdc: null,
          amountBtcSats: w.sats,
          requestedAt: w.at,
          note: 'Bitcoin withdrawal to the client’s wallet — requested from their dashboard',
        })),
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
        ...ALL_VAULTS().filter(({ v }) => VAULT_DRIFT[v] !== null && !isReleased(v)).flatMap(({ v, c }) => {
          const d = VAULT_DRIFT[v]
          const worst = Math.max(Math.abs(d.mining), Math.abs(d.lending), Math.abs(d.stable))
          if (worst <= VAULT_BAND[v]) return []
          const entries = Object.entries(d).sort((a, b) => a[1] - b[1])
          const name = { mining: 'Mining Alpha', lending: 'Bitcoin Lending', stable: 'USDC Yield' }
          const usd = Math.round((VAULT_PRINCIPAL[v] * worst) / 10_000)
          return [{
            // Un identifiant par proposition : la suivante, des mois plus tard, en est une autre.
            id: `apr_reb_${vaultTag(v)}_${(WORLD.rebalanced[v] ?? []).length}`,
            kind: 'rebalance',
            clientId: c.id,
            clientLabel: vaultLabel(v),
            vaultId: vaultKey(v),
            amountUsdc: null,
            amountBtcSats: Math.round((usd / BTC_SPOT_USD) * 1e8),
            requestedAt: new Date(lastClosed().getTime() + 34 * 86_400_000).toISOString(),
            note: `${name[entries[entries.length - 1][0]]} over target, ${name[entries[0][0]]} under — outside the ±${VAULT_BAND[v] / 100} pt band`,
            rebalance: {
              driftBps: d,
              bandBps: VAULT_BAND[v],
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
        ...ALL_VAULTS().flatMap(({ v, c }) => {
          const m = vaultMonths(v).find((x) => x.status === 'pending')
          if (!m) return []
          return [{
            id: `apr_dist_${vaultTag(v)}_${m.month}`,
            kind: 'distribution',
            clientId: c.id,
            clientLabel: vaultLabel(v),
            vaultId: vaultKey(v),
            amountUsdc: null,
            amountBtcSats: m?.sats ?? 0,
            requestedAt: new Date(lastClosed().getTime() + 32 * 86_400_000).toISOString(),
            note: `${monthName(m.month)} distribution, awaiting sign-off`,
          }]
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
    /* UN VAULT PAR TRANCHE : un client qui verse une deuxième fois ouvre un
       deuxième vault (son prix d'entrée, son blocage, son allocation). Le
       registre en publie une ligne chacun, avec son rang de tranche.
       `drift` : écart de la poche la plus dérivée ; `threshold` : la bande
       PROPRE au vault, null = défaut (500 bps, soit 5 pt). */
    const vaults = ALL_VAULTS().map(({ v, c, tranche }) => ({
      v,
      id: vaultKey(v),
      client: c.label,
      allocation: VAULT_ALLOC[v],
      kind: CLIENT_KIND[c.id] ?? c.kind ?? null,
      clientId: c.id,
      tranche,
      principal: VAULT_PRINCIPAL[v],
      start: VAULT_START[v],
      months: lockupMonthsOf(v),
      depositUnlocked: v === 1,
      threshold: VAULT_BAND[v] === 500 ? null : VAULT_BAND[v],
    }))
    return {
      vaults: bloc(
        vaults.map((v) => {
          const start = new Date(v.start + 'T09:00:00Z')
          const end = new Date(start)
          end.setMonth(end.getMonth() + v.months)
          const now = mockNow()
          const elapsed = Math.max(
            0,
            Math.min((now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth(), v.months),
          )
          return {
            vaultId: v.id,
            clientId: v.clientId,
            clientLabel: v.client,
            // Le rang du versement chez ce client : 1 pour le premier vault, 2 pour le suivant…
            tranche: v.tranche,
            // Typologie du client (liste de `CLIENT_KINDS`) — sert la
            // répartition de l'AUM par type sur le tableau de bord.
            clientKind: v.kind,
            // L'allocation PROPRE à ce vault — chaque client a la sienne, taillée
            // sur son profil. C'est elle qui fixe sa part du minage.
            allocation: v.allocation,
            principalUsdc: v.principal,
            // Rendement accru : ~14.8 % du principal, comme le vault client.
            // Le cumul de la réserve : la somme de ses mois, en bitcoin.
            accruedBtcSats: vaultReserveSats(v.v),
            // Le versement d'entrée, converti en bitcoin au cours du premier mois.
            capitalBtcSats: (() => {
              const ms = vaultMonths(v.v)
              return Math.round((v.principal / (ms[ms.length - 1]?.price ?? BTC_SPOT_USD)) * 1e8)
            })(),
            accruedUsdc: vaultMonths(v.v)
              .filter((m) => m.status === 'distributed')
              .reduce((t, m) => t + m.usd, 0),
            lockupStartAt: start.toISOString(),
            lockupEndAt: end.toISOString(),
            lockupMonths: v.months,
            lockupElapsedMonths: elapsed,
            depositUnlocked: v.depositUnlocked,
            // Blocage levé : la réserve est rendue au client, le vault est clos.
            status: isReleased(v.v) ? 'RELEASED' : 'ACTIVE',
            releasedAt: WORLD.released[v.v]?.at ?? null,
            // La dérive vient de l'état ACTUEL du vault : un rééquilibrage approuvé la remet à zéro.
            worstDriftBps: (() => {
              const d = VAULT_DRIFT[v.v]
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
    ALL_VAULTS().forEach(({ v, c }) => {
      const months = vaultMonths(v)
      const paid = months.filter((m) => m.status === 'distributed')[0]
      if (paid) {
        events.push({
          type: 'DISTRIBUTION',
          title: 'Bitcoin distributed',
          c,
          v,
          amountBtcSats: paid.sats,
          occurredAt: `${paid.month}-01T09:00:00Z`,
        })
      }
    })
    // Les rééquilibrages : le dernier de chaque vault, tiré de SON historique.
    ALL_VAULTS().forEach(({ v, c }) => {
      const r = vaultRebalances(v)[0]
      if (r) events.push({ type: 'REBALANCE', title: 'Rebalanced to target', c, v, amountBtcSats: null, occurredAt: r.at })
    })
    const w = ownerOf(1)
    events.push({ type: 'WITHDRAWAL', title: 'Bitcoin withdrawn', c: w, v: 1, amountBtcSats: Math.round(vaultMonths(1)[3].sats * 1.6), occurredAt: '2026-06-14T11:20:00Z' })
    return {
      events: bloc(
        events
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
          .map((e, i) => ({
            id: `act_${i}`,
            type: e.type,
            title: e.title,
            clientId: e.c.id,
            clientLabel: vaultLabel(e.v),
            vaultId: vaultKey(e.v),
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

  /* LES RÉGLAGES — valeurs courantes, demandes de changement, rôles approbateurs. */
  if (p === '/api/v1/admin/settings') {
    const v = currentSettings()
    return {
      settings: bloc({
        values: v,
        changes: (WORLD.changes ?? []).map(changeView).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        approverRoles: Object.fromEntries(['settings', 'risk', 'treasury'].map((k) => [k, policyOf(k).roles])),
      }),
    }
  }

  /* LE JOURNAL D'AUDIT — déduit de tout ce que le monde a enregistré : pas
     de seconde source qui pourrait diverger de la première. */
  if (p === '/api/v1/admin/audit') {
    const q = new URLSearchParams(search)
    const limit = Math.min(500, Number(q.get('limit')) || 200)
    const out = []
    const push = (at, actor, action, target, detail, category) => at && out.push({ id: `${category}:${out.length}`, at, actor, action, target, detail, category })
    const nameOf = (email) => SETTINGS_BASE.team.find((m) => m.email === email)?.name ?? email
    for (const c of WORLD.changes ?? []) {
      const title = SETTINGS_TITLES[c.section] ?? c.section
      push(c.createdAt, nameOf(c.author), 'Requested a change', title, c.reason || null, 'settings')
      for (const a of c.approvals ?? []) push(a.at, nameOf(a.by), 'Approved a change', title, null, 'settings')
      if (c.status === 'rejected') push(c.decidedAt, nameOf(c.rejectedBy), 'Rejected a change', title, null, 'settings')
      if (c.status === 'cancelled') push(c.decidedAt, nameOf(c.rejectedBy), 'Cancelled a change', title, null, 'settings')
      if (changeEffective(c)) push(c.effectiveAt ?? c.appliedAt, 'System', 'Applied a change', title, c.effectiveAt ? 'after its timelock' : null, 'settings')
    }
    for (const [id, d] of Object.entries(WORLD.decisions ?? {})) {
      push((WORLD.decidedAt ?? {})[id] ?? null, 'Admin (you)', d === 'approved' ? 'Approved' : 'Declined', id.replace(/^apr_/, '').replace(/_/g, ' '), null, 'decision')
    }
    for (const o of allOffers().filter((x) => WORLD.offers.some((y) => y.id === x.id) || WORLD.patch[x.id])) {
      push(o.createdAt, 'Admin (you)', 'Created an offer', `${o.reference} · ${o.clientName}`, null, 'offer')
      push(o.sentAt, 'Admin (you)', 'Sent the proposal', o.reference, null, 'offer')
      push(o.decidedAt, o.acceptedBy === 'client' ? o.clientName : 'Admin (you)', o.status === 'declined' ? 'Declined the offer' : 'Accepted the offer', o.reference, null, 'offer')
      push(o.fundingRequestedAt, 'Admin (you)', 'Called the funds', o.reference, null, 'offer')
      push(o.fundsReceivedAt, 'Fireblocks', 'Detected the deposit', o.reference, null, 'payment')
      push(o.openedAt, 'Admin (you)', 'Opened the vault', o.reference, null, 'offer')
    }
    for (const e of WORLD.emails ?? []) push(e.sentAt, 'Admin (you)', 'Sent an email', e.subject || e.emailId, `to ${e.to.join(', ')} · logged in HubSpot`, 'email')
    for (const t of WORLD.txs ?? []) push(t.createdAt, 'Fireblocks', `Created a ${t.kind} transaction`, t.note ?? t.kind, `${t.amount ?? ''} ${t.asset}`.trim(), 'payment')
    for (const w of WORLD.withdrawals ?? []) push(w.at, vaultLabel(w.v) ?? 'Client', 'Requested a withdrawal', `${(w.sats / 1e8).toFixed(4)} BTC`, null, 'client')
    for (const [id, k] of Object.entries(WORLD.kyc ?? {})) push(k.at ?? null, 'Sumsub', `KYC ${String(k.kyc).toLowerCase()} · AML ${String(k.aml ?? '—').toLowerCase()}`, allClients().find((c) => c.id === id)?.label ?? id, null, 'compliance')
    return { audit: bloc(out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)) }
  }

  /* LA SANTÉ DES INTÉGRATIONS — chaque service tiers dont le produit dépend.
     Le backend les sonde ; le front lit. Le mock les dit branchées en bac à
     sable, avec ce qu'elles ont réellement fait pendant la démo. */
  if (p === '/api/v1/admin/integrations') {
    const ago = (s) => new Date(mockNow().getTime() - s * 1000).toISOString()
    const lastOf = (list, key) => (list.length > 0 ? list[list.length - 1][key] : null)
    return {
      integrations: bloc([
        {
          id: 'sumsub', name: 'Sumsub', role: 'KYC & AML', status: 'connected', environment: 'sandbox',
          lastCallAt: ago(42), lastWebhookAt: ago(3_600),
          detail: `${allClients().filter((c) => c.kyc === 'APPROVED').length} applicants approved · decisions arrive by webhook`,
        },
        {
          id: 'fireblocks', name: 'Fireblocks', role: 'Custody & payments', status: 'connected', environment: 'sandbox',
          lastCallAt: lastOf(WORLD.txs ?? [], 'createdAt') ?? ago(120), lastWebhookAt: lastOf(WORLD.txs ?? [], 'createdAt') ?? ago(900),
          detail: `${(WORLD.txs ?? []).length} transactions this session · co-signing policy: 2 of 3`,
        },
        {
          id: 'hubspot', name: 'HubSpot', role: 'CRM', status: 'connected', environment: 'production',
          lastCallAt: lastOf(WORLD.emails ?? [], 'sentAt') ?? ago(300), lastWebhookAt: null,
          detail: `${(WORLD.emails ?? []).length} emails logged this session · contacts and deals synced`,
        },
        {
          id: 'gmail', name: 'Gmail', role: 'Sending', status: 'connected', environment: 'production',
          lastCallAt: lastOf(WORLD.emails ?? [], 'sentAt') ?? ago(300), lastWebhookAt: null,
          detail: 'Sends as the signed-in operator (Google Workspace, OAuth)',
        },
        {
          id: 'price', name: 'Kaiko', role: 'BTC price feed', status: 'connected', environment: 'production',
          lastCallAt: ago(30), lastWebhookAt: null,
          detail: `BTC/USD ${BTC_SPOT_USD.toLocaleString('en-US')} · every conversion and reward uses this rate`,
        },
        {
          id: 'pool', name: 'Mining pool', role: 'Fleet production', status: 'connected', environment: 'production',
          lastCallAt: ago(600), lastWebhookAt: ago(3_600),
          detail: `${(FLEET_THS / 1e6).toFixed(2)} EH/s reported · daily payouts reconciled with the fleet`,
        },
      ]),
    }
  }

  /* Les transactions Fireblocks, d'un client (`?clientId=`) ou de tout le book. */
  if (p === '/api/v1/admin/transactions') {
    const q = new URLSearchParams(search)
    const clientId = q.get('clientId')
    return {
      transactions: bloc(
        (WORLD.txs ?? [])
          .filter((t) => clientId === null || t.clientId === clientId)
          .map(fireblocksView)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        'fireblocks',
      ),
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
          kycProvider: 'Sumsub',
          kycStatus: c.kyc,
          // Qui suit ce client : un relationship manager de l'équipe (Settings → Team).
          relationshipManager: ['Tom Becker', 'Admin (you)', 'Tom Becker', 'Sarah Klein'][i % 4],
          // L'AML, décidé par Sumsub avec le KYC : sans lui, pas d'appel de fonds.
          amlStatus: c.aml ?? (c.kyc === 'APPROVED' ? 'CLEAR' : null),
          // Le dossier chez Sumsub : son identifiant ouvre le cockpit, son niveau dit ce qui a été vérifié.
          sumsub:
            c.kyc === 'NOT_STARTED' || !c.kyc
              ? null
              : {
                  applicantId: createHash('sha256').update(`sumsub:${c.id}`).digest('hex').slice(0, 24),
                  levelName: 'kyb-institutional',
                  reviewAnswer: c.kyc === 'APPROVED' ? 'GREEN' : c.kyc === 'REJECTED' ? 'RED' : null,
                  reviewedAt: c.kyc === 'APPROVED' ? new Date(c.since + 'T12:00:00Z').toISOString() : null,
                },
          currentExposureAtomic: atomic(vaultsOf(c).reduce((t, v) => t + VAULT_PRINCIPAL[v], 0)),
          vaultIds: vaultsOf(c).map(vaultKey),
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
    /* Un client peut détenir plusieurs vaults (un par tranche) : `?vaultId=`
       choisit lequel ; sans lui, la première tranche — le contrat d'avant. */
    const wanted = new URLSearchParams(search).get('vaultId')
    const pick = (c) => {
      if (c === null) return null
      const vs = vaultsOf(c)
      return vs.find((v) => vaultKey(v) === wanted) ?? vs[0] ?? null
    }
    const scaleOf = (c) => (pick(c) === null ? 0 : VAULT_PRINCIPAL[pick(c)] / 420_000)
    const scaled = (v, k) => Math.round(v * k)

    const mVault = p.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/vault$/)
    if (mVault) {
      const clientId = mVault[1]
      const c = scopedClient(clientId)
      const v = pick(c)
      if (v === null) return { vault: bloc(null) }
      /* Hearst Holdings garde les constantes de /api/v1/me/vault (c'est le
         client de démonstration de /account) ; les autres sont à l'échelle. */
      const principal = v === 0 ? CLIENT_PRINCIPAL_USDC : VAULT_PRINCIPAL[v]
      const withdrawn = usdcFromBtc(CLIENT_WITHDRAWN_BTC)
      return {
        vault: bloc({
          clientId,
          vaultId: vaultKey(v),
          label: vaultsOf(c).length > 1 ? `Vault ${trancheOf(v)}` : 'Dedicated Vault',
          principalUsdc: principal,
          withdrawnUsdc: withdrawn,
          withdrawnUsdcAtPayout: CLIENT_WITHDRAWN_USDC_AT_PAYOUT,
          entryRateUsd: CLIENT_ENTRY_RATE_USD,
          availableUsdc: CLIENT_AVAILABLE_USDC,
          nextDistributionAt: '2026-10-01T09:00:00Z',
          lockupStartAt: `${VAULT_START[v]}T09:00:00Z`,
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
      const v = pick(scopedClient(mYields[1]))
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
          vaultMonths(pick(scopedClient(mDist[1]))).map((m) => ({
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
            const v = pick(scopedClient(mMov[1]))
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
    return { offers: bloc(allOffers()) }
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
    // La part du vault regardé : Hearst Holdings (0), ou le client de la démo.
    const fv = viewedVault()?.v ?? 0
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
        allocatedSharePct: Number(((VAULT_THS[fv] / FLEET_THS) * 100).toFixed(2)),
        allocatedMiners: MACHINE_VAULT.filter((v) => v === fv).length,
        allocatedHashrateThs: Math.round(VAULT_THS[fv]),
        // Six mois de production de SA puissance — la même somme que ses lignes de clôture mensuelle.
        allocatedBtcProduced:
          fv === 0
            ? Number((VAULT_THS[0] * BTC_PER_THS_DAY * 30 * 6 * 0.975).toFixed(4))
            : Number((vaultMonths(fv).reduce((t, m) => t + (m.pockets[0]?.btcSats ?? 0), 0) / 1e8).toFixed(4)),
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
    // Le client de la démo : SON versement, SON blocage.
    const shown = viewedVault()
    const start = shown ? VAULT_PRINCIPAL[shown.v] : 482_000
    const months = shown ? lockupMonthsOf(shown.v) : 24
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
              byMonth.set(m.month, {
                sats: cur.sats + m.sats,
                usd: cur.usd + m.usd,
                price: m.price,
                status: m.status,
                buckets,
                vaults: [...cur.vaults, { vaultId: vaultKey(v), clientLabel: vaultLabel(v) ?? vaultKey(v), btcSats: m.sats }],
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
    const rows = Array.from({ length: 6 }, (_, k) => ymOf(addMonths(lastClosed(), k - 5))).map((period, i) => ({
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
    // Une ligne par VAULT (une tranche = un vault), pas par client.
    const vaults = ALL_VAULTS().filter(({ v }) => !isReleased(v)).map(({ v, c }) => ({
      idx: v,
      clientId: c.id,
      client: vaultLabel(v),
      principal: VAULT_PRINCIPAL[v],
      miningBps: VAULT_MINING_BPS[v],
    }))
    const miningCapital = vaults.map((v) => (v.principal * v.miningBps) / 10_000)
    // Les six derniers mois clos, le plus ancien d'abord.
    const months = Array.from({ length: 6 }, (_, k) => ymOf(addMonths(lastClosed(), k - 5)))
    return {
      months: bloc(
        months.map((month, m) => {
          /* La production du parc ENTIER, et son électricité (~17 J/TH à
             0,045 $/kWh). Chaque vault en reçoit la part de SA puissance ; la
             part des machines libres reste à Hearst. */
          // Les MÊMES formules que la réserve de chaque vault (`vaultMonths`).
          const n = months.length - 1 - m
          const fleetSats = Math.round(FLEET_THS * BTC_PER_THS_DAY * 30 * wobbleOf(month) * 1e8)
          const price = priceOf(month)
          const electricityUsd = Math.round((fleetSats / 1e8) * price * ELECTRICITY_SHARE)
          const last = m === months.length - 1
          return {
            month,
            fleetBtcSats: fleetSats,
            btcPriceUsd: price,
            electricityUsd,
            // Un vault n'apparaît qu'à partir de son premier mois rémunéré.
            lines: vaults.filter((v) => firstMonthOf(v.idx) <= month).map((v, i) => {
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
                // Un vault ouvert après ce mois n'y a rien reçu.
                status: last
                  ? rewardDecision(v.idx, month) === 'approved'
                    ? 'distributed'
                    : rewardDecision(v.idx, month) === 'declined'
                      ? 'declined'
                      : 'pending'
                  : rewardDecision(v.idx, month) === 'declined'
                    ? 'declined'
                    : 'distributed',
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

// ── Les offres ───────────────────────────────────────────────────────────────

/** Les offres du socle, telles que le pipeline les connaissait au départ. */
function baseOffers() {
  const day = 86_400_000
  const now = Date.parse('2026-09-25T00:00:00Z')
  const iso = (daysAgo) => new Date(now - daysAgo * day).toISOString()
  return [

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
        // La DEUXIÈME tranche de ZAND : une nouvelle offre, qui a ouvert un nouveau vault.
        {
          id: 'off_008b',
          reference: 'ZAND-02',
          clientId: 'cli_2',
          clientName: 'ZAND Bank',
          clientKind: 'Crypto company',
          contactEmail: 'treasury@zand.test',
          amountUsdc: 2_000_000,
          riskProfile: 'growth',
          // L'allocation de la tranche 1, reprise telle quelle.
          allocation: { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
          lockupMonths: 24,
          status: 'active',
          createdAt: iso(250),
          updatedAt: iso(235),
          sentAt: iso(246),
          decidedAt: iso(240),
          vaultId: vaultKey(5),
          notes: 'Second vault — its own entry price and lockup.',
          questionnaire: null,
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
    // La TROISIÈME tranche de ZAND : les fonds sont arrivés, le dépôt attend son autorisation.
    {
      id: 'off_008c',
      reference: 'ZAND-03',
      clientId: 'cli_2',
      clientName: 'ZAND Bank',
      clientKind: 'Crypto company',
      contactEmail: 'treasury@zand.test',
      amountUsdc: 1_500_000,
      riskProfile: 'growth',
      allocation: { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
      lockupMonths: 24,
      status: 'funding',
      createdAt: iso(40),
      updatedAt: iso(17),
      sentAt: iso(38),
      decidedAt: iso(30),
      fundsReceivedAt: '2026-09-08T14:22:00Z',
      vaultId: null,
      notes: 'Third tranche, board approved — opens a new vault.',
      questionnaire: null,
    },
  ]
}

/** Toutes les offres : le socle avec ses étapes franchies, puis celles créées depuis la console. */
function allOffers() {
  // Chaque offre porte ses courriels envoyés (Gmail) et consignés (HubSpot).
  const withEmails = (o) => ({
    ...o,
    // Toute offre acceptée (ou au-delà) a son compte Fireblocks — les offres du socle aussi.
    fireblocks:
      o.fireblocks ??
      (['accepted', 'funding', 'funded', 'active'].includes(o.status)
        ? {
            vaultAccountId: String(1000 + (parseInt(createHash('sha256').update(`va:${o.id}`).digest('hex').slice(0, 6), 16) % 9000)),
            asset: 'USDC',
            network: 'Ethereum',
            depositAddress: '0x' + createHash('sha256').update(`deposit:${o.id}`).digest('hex').slice(0, 40),
          }
        : null),
    sentEmails: (WORLD.emails ?? []).filter((e) => e.offerId === o.id),
    // Le deal HubSpot de l'offre : créé avec elle, il avance avec ses étapes.
    hubspotDealUrl: `https://app.hubspot.com/contacts/48210735/record/0-3/${parseInt(createHash('sha256').update(`deal:${o.id}`).digest('hex').slice(0, 8), 16)}`,
  })
  return [...baseOffers().map((o) => ({ ...o, ...(WORLD.patch[o.id] ?? {}) })), ...WORLD.offers].map(withEmails)
}

// ── Le monde modifiable ──────────────────────────────────────────────────────

/*
 * Le mock garde DEUX choses : un SOCLE fixe (les tables ci-dessus) et un MONDE
 * qui change — décisions, électricité payée, rééquilibrages, offres et leurs
 * étapes, KYC/AML, vaults ouverts, blocages levés, et l'horloge.
 *
 * Le monde ne vit pas dans la mémoire du serveur : sur Vercel, chaque requête
 * peut tomber sur une instance différente — une décision prise à une étape
 * était perdue à la suivante. Il voyage donc avec la session : l'hôte le lit
 * dans l'en-tête `x-demo-world` (relayé par le front depuis un cookie), le
 * réapplique (`useWorld`), et le renvoie après chaque écriture.
 */
function emptyWorld() {
  return {
    clock: 0, // mois avancés depuis aujourd'hui
    decisions: {}, // approvalId → approved | declined
    paid: [], // `${vaultId}:${YYYY-MM}` — électricité payée
    rebalanced: {}, // index de vault → [{ clock, at, before, worst, moveUsd, fromBucket, toBucket, k }]
    offers: [], // offres créées depuis la console
    patch: {}, // offerId → champs modifiés d'une offre du socle (ses étapes)
    kyc: {}, // clientId → { kyc, aml } — la décision de Sumsub
    opened: [], // vaults ouverts : { clientId, offerId, principal, alloc, months, openedAt, clock }
    released: {}, // index de vault → { month, at, sats } — blocage levé, réserve rendue
    viewAs: null, // le client que /account montre (null = Hearst Holdings)
    withdrawals: [], // retraits demandés depuis /account : { id, v, sats, usd, at }
    txs: [], // transactions Fireblocks : { id, kind, clientId, vaultId, asset, amount, … }
    emails: [], // courriels envoyés (Gmail) et consignés (HubSpot) : { offerId, emailId, … }
    changes: [], // demandes de changement des réglages : { id, section, after, approvals, … }
    decidedAt: {}, // approvalId → date de la décision (pour le journal d'audit)
    tour: null, // la démo guidée : { clientName, offerId }
  }
}
let WORLD = emptyWorld()

const BASE = {
  principal: [...VAULT_PRINCIPAL],
  start: [...VAULT_START],
  alloc: VAULT_ALLOC.map((a) => ({ ...a })),
  drift: VAULT_DRIFT.map((d) => (d === null ? null : { ...d })),
  band: [...VAULT_BAND],
  miningBps: [...VAULT_MINING_BPS],
  addresses: [...VAULT_ADDRESSES],
}
const defaultProtocols = () => ({
  mining: { name: 'Hearst fleet', apy: 14.2 },
  lending: { name: 'Aave (cbBTC)', apy: 8.4 },
  stable: { name: 'Morpho (USDC)', apy: 10.1 },
})
/** Le blocage d'un vault, en mois : 24 pour le socle, celui de l'offre sinon. */
const lockupMonthsOf = (v) => (v >= BASE_VAULT_COUNT ? (WORLD.opened[v - BASE_VAULT_COUNT]?.months ?? 24) : 24)
const isReleased = (v) => WORLD.released[v] !== undefined

/* ══ LES RÉGLAGES ══════════════════════════════════════════════════════════
 * Le socle (ci-dessous), plus les changements APPLIQUÉS. Un changement est une
 * demande : son auteur ne peut pas l'approuver (quatre yeux), il faut autant
 * d'approbations que la règle l'exige, puis le délai de la section court
 * (timelock) avant qu'il s'applique. Le monde ne garde que les demandes ; les
 * valeurs courantes s'en déduisent à chaque lecture. */
const SETTINGS_BASE = {
  team: [
    { id: 'm_admin', name: 'Admin (you)', email: 'admin@localhost', role: 'Admin', twoFactor: true, status: 'active' },
    { id: 'm_risk', name: 'Sarah Klein', email: 'sarah.klein@hearst.test', role: 'Risk', twoFactor: true, status: 'active' },
    { id: 'm_fin', name: 'Marc Dubois', email: 'marc.dubois@hearst.test', role: 'Finance', twoFactor: true, status: 'active' },
    { id: 'm_comp', name: 'Lina Haddad', email: 'lina.haddad@hearst.test', role: 'Compliance', twoFactor: true, status: 'active' },
    { id: 'm_rm', name: 'Tom Becker', email: 'tom.becker@hearst.test', role: 'Relationship manager', twoFactor: false, status: 'active' },
    { id: 'm_view', name: 'Board observer', email: 'board@hearst.test', role: 'Viewer', twoFactor: true, status: 'invited' },
  ],
  policies: [
    { id: 'deposit', label: 'Authorise a deposit', approvers: 1, roles: ['Admin', 'Finance'], thresholdBtc: null },
    { id: 'withdrawal', label: 'Approve a client withdrawal', approvers: 1, roles: ['Admin', 'Finance'], thresholdBtc: null },
    { id: 'withdrawal-large', label: 'Approve a large withdrawal', approvers: 2, roles: ['Admin', 'Finance', 'Risk'], thresholdBtc: 1 },
    { id: 'rebalance', label: 'Approve a rebalancing', approvers: 1, roles: ['Admin', 'Risk'], thresholdBtc: null },
    { id: 'protocol', label: 'Switch a protocol', approvers: 2, roles: ['Admin', 'Risk'], thresholdBtc: null },
    { id: 'release', label: 'Release a reserve', approvers: 2, roles: ['Admin', 'Finance'], thresholdBtc: null },
    { id: 'electricity', label: 'Pay electricity', approvers: 1, roles: ['Admin', 'Finance'], thresholdBtc: null },
    { id: 'settings', label: 'Change a setting', approvers: 1, roles: ['Admin', 'Risk', 'Compliance'], thresholdBtc: null },
    { id: 'risk', label: 'Change a risk parameter', approvers: 1, roles: ['Admin', 'Risk'], thresholdBtc: null },
    { id: 'treasury', label: 'Change the address book or payees', approvers: 1, roles: ['Admin', 'Finance'], thresholdBtc: null },
  ],
  security: { sso: 'Google Workspace', mfaRequired: true, sessionHours: 12, ipAllowlist: [] },
  terms: {
    minTicketUsdc: 100_000,
    lockupOptions: ['12', '24', '36'],
    defaultLockupMonths: 24,
    rewardsCadence: 'monthly',
    managementFeeBps: 150,
    performanceFeeBps: 1000,
  },
  profiles: [
    { id: 'conservative', label: 'Conservative', miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
    { id: 'balanced', label: 'Balanced', miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
    { id: 'growth', label: 'Growth', miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
  ],
  strategies: [
    { id: 's_fleet', pocket: 'Mining Alpha', protocol: 'Hearst fleet', status: 'enabled', capUsd: 60_000_000, apyPct: 14.2, apySource: 'Fleet telemetry', risk: 'medium' },
    { id: 's_aave_btc', pocket: 'Bitcoin Lending', protocol: 'Aave v3 (cbBTC)', status: 'enabled', capUsd: 25_000_000, apyPct: 8.4, apySource: 'Aave subgraph', risk: 'low' },
    { id: 's_morpho', pocket: 'USDC Yield', protocol: 'Morpho (USDC)', status: 'enabled', capUsd: 30_000_000, apyPct: 10.1, apySource: 'Morpho API', risk: 'low' },
    { id: 's_aave_usdc', pocket: 'USDC Yield', protocol: 'Aave v3 (USDC)', status: 'enabled', capUsd: 20_000_000, apyPct: 12.0, apySource: 'Aave subgraph', risk: 'low' },
  ],
  limits: { driftBandBps: 500, maxProtocolExposureBps: 6000, maxClientExposureUsd: 25_000_000, liquidityBufferBps: 300, guardianPause: false },
  addressBook: [
    { id: 'a_hh', owner: 'Hearst Holdings', label: 'Treasury cold wallet', asset: 'BTC', network: 'Bitcoin', address: 'bc1qhh7k0x3m4n2p8r5t6w9y1z3c5v7b9n2m4k6j8h', activeFrom: '2025-09-01T00:00:00Z' },
    { id: 'a_zand', owner: 'ZAND Bank', label: 'Custody — Fireblocks', asset: 'BTC', network: 'Bitcoin', address: 'bc1qz4nd8c2v6b0n4m8k2j6h0g4f8d2s6a0p4o8i2u', activeFrom: '2026-02-01T00:00:00Z' },
  ],
  payees: [
    { id: 'p_host', name: 'Nordic Hosting AS', purpose: 'Hosting & electricity — Norway sites', asset: 'USDC', address: '0x7e1c00ffee0000000000000000000000000c0de1', schedule: 'monthly' },
    { id: 'p_tx', name: 'Lone Star Power', purpose: 'Electricity — Texas sites', asset: 'USDC', address: '0x9a2f00ffee0000000000000000000000000c0de2', schedule: 'monthly' },
  ],
  compliance: { level: 'kyb-institutional', reverifyMonths: 12, blockedJurisdictions: ['IR', 'KP', 'SY', 'CU', 'RU'], amlBlockAt: 'high', blockOnFlag: true },
  templates: [
    { id: 'proposal', label: 'Proposal', subject: 'Hearst Connect — your Bitcoin Strategic Reserve proposal', hubspotStage: 'Proposal sent', intro: 'Following our conversation, here is the proposal.' },
    { id: 'funding', label: 'Funding instructions', subject: 'Hearst Connect — funding instructions', hubspotStage: 'Contract signed', intro: 'Thank you for confirming. Here are the funding instructions.' },
    { id: 'funded', label: 'Funds received', subject: 'Hearst Connect — funds received', hubspotStage: 'Funded', intro: 'We have received your deposit.' },
    { id: 'credentials', label: 'Access', subject: 'Hearst Connect — your access', hubspotStage: 'Closed won — live', intro: 'Your vault is live.' },
  ],
  notifications: [
    { id: 'n1', event: 'A vault leaves its drift band', notify: ['Risk'], channels: ['Slack'] },
    { id: 'n2', event: 'A withdrawal waits more than 24 h', notify: ['Finance', 'Admin'], channels: ['Slack', 'Email'] },
    { id: 'n3', event: 'An integration stops answering', notify: ['Admin'], channels: ['Slack', 'SMS'] },
    { id: 'n4', event: 'A lockup ends within 30 days', notify: ['Relationship manager'], channels: ['Email'] },
    { id: 'n5', event: 'Sumsub flags a client', notify: ['Compliance'], channels: ['Slack', 'Email'] },
    { id: 'n6', event: 'A settings change waits for approval', notify: ['Admin', 'Risk'], channels: ['Slack'] },
  ],
}
/** La gouvernance de chaque section : sa règle d'approbation et son délai (miroir du schéma front). */
const SETTINGS_GOV = {
  team: ['settings', 0], policies: ['risk', 24], security: ['settings', 0], terms: ['risk', 24], profiles: ['risk', 24],
  strategies: ['risk', 24], limits: ['risk', 24], addressBook: ['treasury', 48], payees: ['treasury', 48],
  compliance: ['settings', 0], templates: ['settings', 0], notifications: ['settings', 0],
}
const SETTINGS_TITLES = {
  team: 'Team & roles', policies: 'Approval policies', security: 'Security', terms: 'Product terms', profiles: 'Risk profiles',
  strategies: 'Strategies & protocols', limits: 'Risk limits', addressBook: 'Address book', payees: 'Payees',
  compliance: 'KYC & AML', templates: 'Email templates', notifications: 'Notifications',
}
const changeEffective = (c) => c.status === 'applied' || (c.status === 'scheduled' && c.effectiveAt && Date.parse(c.effectiveAt) <= mockNow().getTime())
/** Les réglages courants : le socle, plus chaque changement dont le délai est passé. */
function currentSettings() {
  const v = JSON.parse(JSON.stringify(SETTINGS_BASE))
  for (const c of (WORLD.changes ?? []).filter(changeEffective).sort((a, b) => (a.appliedAt ?? a.effectiveAt).localeCompare(b.appliedAt ?? b.effectiveAt))) {
    v[c.section] = c.after
  }
  return v
}
const changeView = (c) => ({ ...c, status: changeEffective(c) ? 'applied' : c.status })
const policyOf = (id) => currentSettings().policies.find((p) => p.id === id) ?? { approvers: 1, roles: ['Admin'] }

/* ══ FIREBLOCKS ════════════════════════════════════════════════════════════
 * Tout ce qui DÉPLACE de l'argent passe par Fireblocks : l'admin décide, la
 * console crée la transaction, Fireblocks la fait signer (politique de
 * co-signature) puis la diffuse. Le statut avance seul, en temps réel, pour
 * que la démo montre le cycle : signature → diffusion → terminée.
 * Un dépôt entrant est DÉTECTÉ par Fireblocks sur l'adresse de dépôt du client. */
const FB_WALLET = { BTC: 'bc1q-hearst-client-wallet', USDC: '0x-electricity-payee' }
function fireblocksTx(kind, fields) {
  const n = (WORLD.txs ?? []).length + 1
  const tx = {
    id: createHash('sha256').update(`fb:${n}:${kind}:${JSON.stringify(fields)}`).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*/, '$1-$2-$3-$4-$5'),
    kind,
    createdAt: nowIso(),
    realMs: Date.now(),
    ...fields,
  }
  WORLD.txs = [...(WORLD.txs ?? []), tx]
  return tx
}
/** Le statut Fireblocks d'une transaction, au fil du temps réel. */
function fireblocksView(t) {
  const s = (Date.now() - t.realMs) / 1000
  const status = t.kind === 'deposit' ? 'COMPLETED' : s < 8 ? 'PENDING_SIGNATURE' : s < 20 ? 'BROADCASTING' : 'COMPLETED'
  const { realMs, ...rest } = t
  return {
    ...rest,
    status,
    txHash: status === 'COMPLETED' ? '0x' + createHash('sha256').update(`hash:${t.id}`).digest('hex') : null,
    consoleUrl: `https://console.fireblocks.io/v2/transactions/${t.id}`,
  }
}
const txOfRef = (ref) => (WORLD.txs ?? []).find((t) => t.ref === ref) ?? null

/** Le vault que /account montre pendant la démo : la première tranche encore ouverte du client regardé. */
function viewedVault() {
  if (!WORLD.viewAs) return null
  const c = allClients().find((x) => x.id === WORLD.viewAs)
  if (!c) return null
  const vs = vaultsOf(c)
  const v = vs.find((x) => !isReleased(x)) ?? vs[0]
  return v === undefined ? null : { v, c }
}

/** Les retraits demandés par le client d'un vault, avec la décision de l'admin. */
const withdrawalsOf = (v) =>
  (WORLD.withdrawals ?? [])
    .filter((w) => w.v === v)
    .map((w) => ({ ...w, status: WORLD.decisions[`apr_wd_${w.id}`] ?? 'pending' }))

/**
 * L'ÉCONOMIE D'UN VAULT, du point de vue de son client :
 *   produit (rewards validés) = retiré + acquis ; disponible = acquis − retraits en attente.
 */
function vaultEconomy(v) {
  const withdrawals = withdrawalsOf(v)
  const producedSats = vaultReserveSats(v)
  const done = withdrawals.filter((w) => w.status === 'approved')
  const withdrawnSats = done.reduce((t, w) => t + w.sats, 0)
  const pendingSats = withdrawals.filter((w) => w.status === 'pending').reduce((t, w) => t + w.sats, 0)
  const accruedSats = Math.max(0, producedSats - withdrawnSats)
  return {
    withdrawals,
    producedSats,
    withdrawnSats,
    withdrawnUsdAtPayout: done.reduce((t, w) => t + w.usd, 0),
    pendingSats,
    accruedSats,
    availableSats: Math.max(0, accruedSats - pendingSats),
    entryRate: priceOf(VAULT_START[v].slice(0, 7)),
  }
}

/*
 * LA DÉRIVE GRANDIT AVEC LE TEMPS : chaque mois, le minage s'écarte de sa
 * cible (le bitcoin bouge, la production s'accumule). Un vault sort de sa
 * bande au bout de quelques mois ; un rééquilibrage approuvé le remet à zéro.
 */
const driftGrowth = (v) => {
  const s = v % 2 === 0 ? 1 : -1
  return { mining: 140 * s, lending: -60 * s, stable: -80 * s }
}
function driftOf(v) {
  const done = WORLD.rebalanced[v] ?? []
  const last = done.length > 0 ? done[done.length - 1].clock : null
  const opened = v >= BASE_VAULT_COUNT ? WORLD.opened[v - BASE_VAULT_COUNT] : null
  const base = last !== null || opened ? { mining: 0, lending: 0, stable: 0 } : BASE.drift[v]
  if (base === null) return null
  const months = last !== null ? WORLD.clock - last : opened ? WORLD.clock - opened.clock : WORLD.clock
  const g = driftGrowth(v)
  return { mining: base.mining + g.mining * months, lending: base.lending + g.lending * months, stable: base.stable + g.stable * months }
}

/** Une adresse de vault stable, dérivée de l'offre qui l'a ouvert. */
const addressFor = (seed) => '0x' + createHash('sha256').update(String(seed)).digest('hex').slice(0, 40)

/** Réapplique le monde : le socle, puis tout ce qui a changé. */
function applyWorld(w) {
  WORLD = { ...emptyWorld(), ...(w ?? {}) }
  const reset = (arr, base) => {
    arr.length = 0
    arr.push(...base)
  }
  // Les vaults : le socle, puis ceux ouverts pendant la démo.
  reset(VAULT_PRINCIPAL, BASE.principal)
  reset(VAULT_START, BASE.start)
  reset(VAULT_ALLOC, BASE.alloc.map((a) => ({ ...a })))
  reset(VAULT_BAND, BASE.band)
  reset(VAULT_MINING_BPS, BASE.miningBps)
  reset(VAULT_ADDRESSES, BASE.addresses)
  VAULT_PROTOCOLS.length = 0
  for (let i = 0; i < BASE_VAULT_COUNT; i++) VAULT_PROTOCOLS.push(defaultProtocols())
  for (const o of WORLD.opened) {
    VAULT_PRINCIPAL.push(o.principal)
    VAULT_START.push(o.openedAt.slice(0, 10))
    VAULT_ALLOC.push({ ...o.alloc })
    VAULT_BAND.push(Number(currentSettings().limits.driftBandBps) || 500)
    VAULT_MINING_BPS.push(o.alloc.miningBps)
    VAULT_ADDRESSES.push(addressFor(o.offerId))
    VAULT_PROTOCOLS.push(defaultProtocols())
  }
  if (WORLD.decisions.apr_proto_cli_2 === 'approved') VAULT_PROTOCOLS[1].stable = { name: 'Aave (USDC)', apy: 12.0 }
  reset(VAULT_MINING_CAPITAL, VAULT_PRINCIPAL.map((p, i) => (p * VAULT_MINING_BPS[i]) / 10_000))
  allocateMachines()

  // Les clients : le socle, les prospects nés d'une offre, leurs vaults, leur KYC.
  CLIENT_BOOK.length = 0
  for (const c of CLIENT_BOOK_BASE) {
    CLIENT_BOOK.push({ ...c, vaults: c.vaults ? [...c.vaults] : c.vault === null ? [] : [c.vault] })
  }
  for (const o of WORLD.offers) {
    if (!CLIENT_BOOK.some((c) => c.id === o.clientId)) {
      CLIENT_BOOK.push({ id: o.clientId, label: o.clientName, kyc: 'NOT_STARTED', vault: null, vaults: [], since: o.createdAt.slice(0, 10), kind: o.clientKind })
    }
  }
  WORLD.opened.forEach((o, i) => {
    const c = CLIENT_BOOK.find((x) => x.id === o.clientId)
    if (!c) return
    c.vaults.push(BASE_VAULT_COUNT + i)
    if (c.vault === null) c.vault = BASE_VAULT_COUNT + i
  })
  for (const [id, k] of Object.entries(WORLD.kyc)) {
    const c = CLIENT_BOOK.find((x) => x.id === id)
    if (c) Object.assign(c, { kyc: k.kyc, aml: k.aml ?? null })
  }

  // La dérive, les rééquilibrages exécutés, les décisions, l'électricité, les offres.
  VAULT_DRIFT.length = 0
  for (let v = 0; v < VAULT_PRINCIPAL.length; v++) VAULT_DRIFT.push(driftOf(v))
  EXECUTED_REBALANCES.length = 0
  for (const [v, list] of Object.entries(WORLD.rebalanced)) for (const r of list) EXECUTED_REBALANCES.push({ ...r, v: Number(v) })
  DECISIONS.clear()
  for (const [k, d] of Object.entries(WORLD.decisions)) DECISIONS.set(k, d)
  PAID_ELECTRICITY.clear()
  for (const k of WORLD.paid) PAID_ELECTRICITY.add(k)
  CREATED_OFFERS.length = 0
  CREATED_OFFERS.push(...WORLD.offers)
}

/** Le monde lu dans l'en-tête `x-demo-world` (base64url de JSON). Illisible : le socle. */
function useWorld(header) {
  try {
    applyWorld(header ? JSON.parse(Buffer.from(String(header), 'base64url').toString('utf8')) : null)
  } catch {
    applyWorld(null)
  }
}
const serializeWorld = () => Buffer.from(JSON.stringify(WORLD)).toString('base64url')

// ── Écritures ────────────────────────────────────────────────────────────────

const ENVELOPE_EXEMPT = new Set(['/health', '/ready', '/api/v1/runtime'])

const reply = (status, body) => ({ status, body })

/** Modifie une offre : directement si elle a été créée ici, par un patch si elle vient du socle. */
function patchOffer(offer, fields) {
  if (WORLD.offers.some((o) => o.id === offer.id)) {
    WORLD.offers = WORLD.offers.map((o) => (o.id === offer.id ? { ...o, ...fields } : o))
  } else {
    WORLD.patch = { ...WORLD.patch, [offer.id]: { ...(WORLD.patch[offer.id] ?? {}), ...fields } }
  }
}

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
  /* UN RETRAIT DEMANDÉ PAR LE CLIENT — en bitcoin, pris sur ce qu'il a acquis.
     Rien ne sort avant la validation de l'admin : la demande entre dans sa file. */
  if (path === '/api/v1/me/withdrawals' && method === 'POST') {
    const seen = viewedVault()
    if (seen === null) return reply(409, problem(409, 'NO_VAULT', 'This account has no vault to withdraw from.'))
    if (isReleased(seen.v)) return reply(409, problem(409, 'VAULT_CLOSED', 'This vault has been released.'))
    const available = vaultEconomy(seen.v).availableSats
    /* Le client saisit 4 décimales : « tout » arrondi peut dépasser de quelques
       satoshis. Un écart sous 0.0001 BTC vaut « tout ce qui est disponible ». */
    const asked = Math.round(Number(body?.amountBtcSats))
    // Dans les deux sens : un reste de moins de 0.0001 BTC part avec la demande.
    const sats = Math.abs(available - asked) < 10_000 ? available : asked
    if (!Number.isFinite(sats) || sats <= 0) return reply(400, problem(400, 'INVALID_AMOUNT', 'amountBtcSats must be a positive number of satoshis.'))
    if (sats > available) {
      return reply(422, problem(422, 'ABOVE_AVAILABLE', `Only ${(Math.floor(available / 1e4) / 1e4).toFixed(4)} BTC is available to withdraw.`))
    }
    const id = `wd_${String((WORLD.withdrawals ?? []).length + 1).padStart(3, '0')}`
    WORLD.withdrawals = [...(WORLD.withdrawals ?? []), { id, v: seen.v, sats, usd: Math.round((sats / 1e8) * BTC_SPOT_USD), at: nowIso() }]
    applyWorld(WORLD)
    return reply(200, envelope({ withdrawal: bloc({ id, amountBtcSats: sats, status: 'PENDING_APPROVAL', requestedAt: nowIso() }) }))
  }

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
     bascule la poche sur le nouveau protocole ; un dépôt autorisé fait passer
     l'offre à « funds received ». Refusé : rien ne bouge. */
  const mDecide = path.match(/^\/api\/v1\/admin\/approvals\/([^/]+)\/decision$/)
  if (mDecide && method === 'POST') {
    const decision = body?.decision === 'decline' ? 'declined' : 'approved'
    const id = mDecide[1]
    WORLD.decisions[id] = decision
    WORLD.decidedAt = { ...(WORLD.decidedAt ?? {}), [id]: nowIso() }
    // Le gardien a gelé les allocations : aucun rééquilibrage ne part.
    if (decision === 'approved' && (id.startsWith('apr_reb_') || id.startsWith('apr_proto_')) && currentSettings().limits.guardianPause) {
      delete WORLD.decisions[id]
      delete WORLD.decidedAt[id]
      return reply(423, problem(423, 'GUARDIAN_PAUSE', 'Allocation moves are frozen by the guardian pause (Settings → Risk limits).'))
    }
    if (decision === 'approved' && id.startsWith('apr_reb_')) {
      const hit = ALL_VAULTS().find(({ v }) => `apr_reb_${vaultTag(v)}_${(WORLD.rebalanced[v] ?? []).length}` === id)
      if (hit && VAULT_DRIFT[hit.v]) {
        // Le keeper exécute : l'écart corrigé entre dans l'historique, le vault revient à sa cible.
        const v = hit.v
        const before = { ...VAULT_DRIFT[v] }
        const worst = Math.max(Math.abs(before.mining), Math.abs(before.lending), Math.abs(before.stable))
        const sorted = Object.entries(before).sort((x, y) => x[1] - y[1])
        const name = { mining: 'Mining Alpha', lending: 'Bitcoin Lending', stable: 'USDC Yield' }
        const list = WORLD.rebalanced[v] ?? []
        WORLD.rebalanced[v] = [
          ...list,
          {
            clock: WORLD.clock,
            at: nowIso(),
            before,
            worst,
            moveUsd: Math.round((VAULT_PRINCIPAL[v] * worst) / 10_000),
            fromBucket: name[sorted[sorted.length - 1][0]],
            toBucket: name[sorted[0][0]],
            k: 100 + list.length,
          },
        ]
        const done = WORLD.rebalanced[v][WORLD.rebalanced[v].length - 1]
        fireblocksTx('rebalance', {
          ref: id, clientId: ownerOf(v)?.id ?? null, vaultId: vaultKey(v), asset: 'USDC', amount: done.moveUsd,
          source: done.fromBucket, destination: done.toBucket, note: 'Rebalancing back to target — contract call',
        })
      }
    }
    /* Une décision qui DÉPLACE de l'argent devient une transaction Fireblocks. */
    if (decision === 'approved' && id.startsWith('apr_wd_')) {
      const w = (WORLD.withdrawals ?? []).find((x) => `apr_wd_${x.id}` === id)
      if (w) {
        fireblocksTx('withdrawal', {
          ref: id, clientId: ownerOf(w.v)?.id ?? null, vaultId: vaultKey(w.v), asset: 'BTC', amount: w.sats / 1e8,
          source: `Vault ${vaultLabel(w.v)}`, destination: FB_WALLET.BTC, note: 'Bitcoin withdrawal to the client’s whitelisted wallet',
        })
      }
    }
    if (decision === 'approved' && id === 'apr_2') {
      fireblocksTx('withdrawal', {
        ref: id, clientId: 'cli_1', vaultId: vaultKey(0), asset: 'BTC', amount: 0.042,
        source: 'Vault Hearst Holdings', destination: FB_WALLET.BTC, note: 'Bitcoin withdrawal to the client’s whitelisted wallet',
      })
    }
    if (decision === 'approved' && id.startsWith('apr_proto_')) {
      fireblocksTx('protocol', {
        ref: id, clientId: ownerOf(1)?.id ?? null, vaultId: vaultKey(1), asset: 'USDC',
        amount: Math.round((VAULT_PRINCIPAL[1] * vaultCurrentBps(1).stable) / 10_000),
        source: 'Morpho (USDC)', destination: 'Aave (USDC)', note: 'Protocol switch — contract call',
      })
    }
    if (decision === 'approved' && id.startsWith('apr_dep_')) {
      const offer = allOffers().find((o) => `apr_dep_${o.id}` === id)
      if (offer) patchOffer(offer, { status: 'funded', fundedAt: nowIso() })
    }
    applyWorld(WORLD)
    return reply(200, envelope({ id, decision }))
  }

  /* L'électricité se paie VAULT PAR VAULT, pour un mois donné : le paiement
     est retenu et la clôture mensuelle le montre aussitôt. */
  if (path === '/api/v1/mining/electricity/pay' && method === 'POST') {
    if (typeof body?.vaultId === 'string' && typeof body?.month === 'string') {
      const key = `${body.vaultId}:${body.month}`
      if (!WORLD.paid.includes(key)) {
        const v = VAULT_PRINCIPAL.findIndex((_, i) => vaultKey(i) === body.vaultId)
        fireblocksTx('electricity', {
          ref: `elec:${key}`, clientId: v >= 0 ? (ownerOf(v)?.id ?? null) : null, vaultId: body.vaultId, asset: 'USDC',
          amount: Number(body.amount) || null, source: v >= 0 ? `Vault ${vaultLabel(v)}` : 'Vault', destination: FB_WALLET.USDC,
          note: `Electricity — ${monthName(body.month)}`,
        })
      }
      WORLD.paid = [...new Set([...WORLD.paid, key])]
      applyWorld(WORLD)
    }
    return reply(200, envelope({ status: 'recorded', reason: null }))
  }

  /* ── LE PARCOURS D'UNE OFFRE ───────────────────────────────────────────
     Une étape à la fois, dans l'ordre du métier. Le backend est l'autorité :
     il refuse un saut d'étape, et il refuse d'appeler les fonds tant que Sumsub
     n'a pas validé le KYC ET l'AML du client.

       draft → sent → accepted → funding ─(fonds reçus)→ [dépôt à autoriser]
             → funded → active (le vault s'ouvre)
       sent / draft → declined · draft / sent → expired */
  const mStep = path.match(/^\/api\/v1\/admin\/offers\/([^/]+)\/transition$/)
  if (mStep && method === 'POST') {
    const offer = allOffers().find((o) => o.id === mStep[1])
    if (!offer) return reply(404, problem(404, 'NOT_FOUND', 'No such offer.'))
    const to = String(body?.to ?? '')
    const from = {
      sent: ['draft'],
      accepted: ['sent'],
      declined: ['draft', 'sent'],
      funding: ['accepted'],
      funds_received: ['funding'],
      active: ['funded'],
      expired: ['draft', 'sent'],
    }[to]
    if (!from) return reply(400, problem(400, 'UNKNOWN_STEP', `Unknown step "${to}".`))
    if (!from.includes(offer.status) || (to === 'funds_received' && offer.fundsReceivedAt)) {
      return reply(409, problem(409, 'INVALID_STEP', `This offer is "${offer.status}" — it cannot go to "${to}".`))
    }
    const client = allClients().find((c) => c.id === offer.clientId)
    const cleared = client?.kyc === 'APPROVED' && (client?.aml ?? 'CLEAR') === 'CLEAR'
    if (to === 'funding' && !cleared) {
      return reply(409, problem(409, 'KYC_REQUIRED', 'Funds cannot be called until Sumsub has cleared the client’s KYC and AML.'))
    }
    const now = nowIso()
    const patch = {
      sent: { status: 'sent', sentAt: now },
      /* Accepté : Fireblocks ouvre le compte du futur vault et son adresse de
         dépôt — c'est elle que porte le courriel d'appel de fonds. */
      accepted: {
        status: 'accepted', decidedAt: now, acceptedBy: body?.by === 'client' ? 'client' : 'admin',
        fireblocks: {
          vaultAccountId: String(1000 + (parseInt(createHash('sha256').update(`va:${offer.id}`).digest('hex').slice(0, 6), 16) % 9000)),
          asset: 'USDC',
          network: 'Ethereum',
          depositAddress: '0x' + createHash('sha256').update(`deposit:${offer.id}`).digest('hex').slice(0, 40),
        },
      },
      declined: { status: 'declined', decidedAt: now },
      funding: { status: 'funding', fundingRequestedAt: now },
      funds_received: { fundsReceivedAt: now },
      expired: { status: 'expired' },
      active: {},
    }[to]
    if (to === 'active') {
      // LE VAULT S'OUVRE : son capital, son allocation, son blocage, ses machines.
      const index = BASE_VAULT_COUNT + WORLD.opened.length
      WORLD.opened = [
        ...WORLD.opened,
        {
          clientId: offer.clientId,
          offerId: offer.id,
          principal: offer.amountUsdc,
          alloc: { ...offer.allocation },
          months: offer.lockupMonths,
          openedAt: now,
          clock: WORLD.clock,
        },
      ]
      Object.assign(patch, { status: 'active', vaultId: `${VAULT_CHAIN_ID}-${addressFor(offer.id)}`, openedAt: now, vaultIndex: index })
      // La démo regarde désormais ce client depuis /account.
      if (WORLD.tour && WORLD.tour.offerId === offer.id) WORLD.viewAs = offer.clientId
    }
    // Le virement entrant est détecté par Fireblocks ; l'ouverture convertit l'USDC en bitcoin.
    if (to === 'funds_received') {
      fireblocksTx('deposit', {
        ref: `deposit:${offer.id}`, clientId: offer.clientId, vaultId: null, asset: 'USDC', amount: offer.amountUsdc,
        source: `${offer.clientName} — external wallet`, destination: offer.fireblocks?.depositAddress ?? 'Deposit address',
        note: `Funding of ${offer.reference}, detected on-chain`,
      })
    }
    if (to === 'active') {
      fireblocksTx('conversion', {
        ref: `conversion:${offer.id}`, clientId: offer.clientId, vaultId: patch.vaultId, asset: 'USDC', amount: offer.amountUsdc,
        source: 'USDC', destination: 'BTC + strategy pockets', note: 'Conversion at entry — the deposit becomes the vault’s reserve',
      })
    }
    patchOffer(offer, { ...patch, updatedAt: now })
    applyWorld(WORLD)
    return reply(200, envelope({ offer: bloc(allOffers().find((o) => o.id === offer.id)) }))
  }

  /* UNE DEMANDE DE CHANGEMENT — jamais appliquée à la création : elle attend
     ses approbations, puis son délai. */
  if (path === '/api/v1/admin/settings/changes' && method === 'POST') {
    const section = String(body?.section ?? '')
    const gov = SETTINGS_GOV[section]
    if (!gov) return reply(400, problem(400, 'UNKNOWN_SECTION', `Unknown section "${section}".`))
    const author = String(body?.author ?? 'admin@localhost')
    const before = currentSettings()[section]
    const after = body?.value
    if (after === undefined || JSON.stringify(after) === JSON.stringify(before)) {
      return reply(400, problem(400, 'NO_CHANGE', 'Nothing changed in this section.'))
    }
    if ((WORLD.changes ?? []).some((c) => c.section === section && c.status === 'pending')) {
      return reply(409, problem(409, 'CHANGE_PENDING', 'A change to this section is already waiting for approval — decide it first.'))
    }
    if (section === 'profiles' && Array.isArray(after) && after.some((r) => Number(r.miningBps) + Number(r.lendingBps) + Number(r.stableBps) !== 10_000)) {
      return reply(422, problem(422, 'ALLOCATION_NOT_100', 'Each profile must total 100 %.'))
    }
    const n = (WORLD.changes ?? []).length + 1
    WORLD.changes = [
      ...(WORLD.changes ?? []),
      {
        id: `chg_${String(n).padStart(3, '0')}`,
        section,
        reason: String(body?.reason ?? '').slice(0, 280),
        author,
        createdAt: nowIso(),
        status: 'pending',
        required: Math.max(1, Number(policyOf(gov[0]).approvers) || 1),
        approvals: [],
        rejectedBy: null,
        effectiveAt: null,
        before,
        after,
      },
    ]
    applyWorld(WORLD)
    return reply(200, envelope({ change: bloc(changeView(WORLD.changes[WORLD.changes.length - 1])) }))
  }
  const mChg = path.match(/^\/api\/v1\/admin\/settings\/changes\/([^/]+)\/decision$/)
  if (mChg && method === 'POST') {
    const c = (WORLD.changes ?? []).find((x) => x.id === mChg[1])
    if (!c) return reply(404, problem(404, 'NOT_FOUND', 'No such change.'))
    const by = String(body?.by ?? '')
    const member = currentSettings().team.find((m) => m.email === by)
    const decision = String(body?.decision ?? '')
    const now = nowIso()
    const update = (fields) => {
      WORLD.changes = WORLD.changes.map((x) => (x.id === c.id ? { ...x, ...fields } : x))
    }
    if (decision === 'cancel') {
      if (!['pending', 'scheduled'].includes(c.status) || changeEffective(c)) return reply(409, problem(409, 'NOT_CANCELLABLE', 'This change can no longer be cancelled.'))
      update({ status: 'cancelled', rejectedBy: by || c.author, decidedAt: now })
    } else {
      if (c.status !== 'pending') return reply(409, problem(409, 'NOT_PENDING', 'This change is not waiting for a decision.'))
      if (!member || member.status !== 'active') return reply(403, problem(403, 'NOT_A_MEMBER', 'Only an active team member can decide.'))
      if (by === c.author) return reply(403, problem(403, 'FOUR_EYES', 'The author of a change cannot approve or reject it.'))
      const roles = policyOf(SETTINGS_GOV[c.section][0]).roles
      if (!roles.includes(member.role)) return reply(403, problem(403, 'ROLE_NOT_ALLOWED', `${member.role} cannot decide this change — allowed: ${roles.join(', ')}.`))
      if (c.approvals.some((a) => a.by === by)) return reply(409, problem(409, 'ALREADY_APPROVED', 'This member already approved it.'))
      if (decision === 'reject') {
        update({ status: 'rejected', rejectedBy: by, decidedAt: now })
      } else {
        const approvals = [...c.approvals, { by, at: now }]
        if (approvals.length < c.required) {
          update({ approvals })
        } else {
          // Le délai de la section — sauf la pause du gardien, ou une mise en pause de protocole : immédiates.
          const urgent =
            (c.section === 'limits' && c.after?.guardianPause === true && c.before?.guardianPause !== true) ||
            (c.section === 'strategies' && JSON.stringify((c.after ?? []).map((s) => ({ ...s, status: 'enabled' }))) === JSON.stringify((c.before ?? []).map((s) => ({ ...s, status: 'enabled' }))))
          const hours = urgent ? 0 : SETTINGS_GOV[c.section][1]
          if (hours === 0) update({ approvals, status: 'applied', appliedAt: now })
          else update({ approvals, status: 'scheduled', effectiveAt: new Date(mockNow().getTime() + hours * 3_600_000).toISOString() })
        }
      }
    }
    applyWorld(WORLD)
    return reply(200, envelope({ change: bloc(changeView(WORLD.changes.find((x) => x.id === c.id))) }))
  }

  /* UN COURRIEL DU PARCOURS — envoyé depuis le Gmail de l'opérateur, consigné
     sur le contact et le deal HubSpot. Quand l'envoyer EST l'étape (la
     proposition, l'appel de fonds), l'étape passe d'abord : si elle est
     refusée (KYC non validé), rien ne part. */
  const mMail = path.match(/^\/api\/v1\/admin\/offers\/([^/]+)\/emails\/([^/]+)\/send$/)
  if (mMail && method === 'POST') {
    const offer = allOffers().find((o) => o.id === mMail[1])
    if (!offer) return reply(404, problem(404, 'NOT_FOUND', 'No such offer.'))
    const to = (Array.isArray(body?.to) ? body.to : []).filter((a) => typeof a === 'string' && a.includes('@'))
    if (to.length === 0) return reply(400, problem(400, 'NO_RECIPIENT', 'Add at least one recipient.'))
    const step = { proposal: ['draft', 'sent'], funding: ['accepted', 'funding'] }[mMail[2]]
    if (step && offer.status === step[0]) {
      const moved = handleWrite('POST', `/api/v1/admin/offers/${offer.id}/transition`, { to: step[1], by: 'admin' })
      if (moved.status >= 400) return moved
    }
    const n = (WORLD.emails ?? []).length + 1
    const sent = {
      offerId: offer.id,
      emailId: mMail[2],
      to,
      cc: (Array.isArray(body?.cc) ? body.cc : []).filter((a) => typeof a === 'string' && a.includes('@')),
      subject: String(body?.subject ?? ''),
      sentAt: nowIso(),
      gmailMessageId: createHash('sha256').update(`gmail:${n}`).digest('hex').slice(0, 16),
      hubspotEngagementId: String(41_000_000 + n),
    }
    WORLD.emails = [...(WORLD.emails ?? []), sent]
    applyWorld(WORLD)
    return reply(200, envelope({ email: bloc(sent, 'gmail') }))
  }

  /* LA DÉCISION DE SUMSUB — le partenaire KYC/AML. La console ne la prend
     jamais : en production elle arrive par le partenaire. Ici, la démo la
     simule pour dérouler le parcours. */
  const mKyc = path.match(/^\/api\/v1\/admin\/clients\/([^/]+)\/kyc$/)
  if (mKyc && method === 'POST') {
    const kyc = ['APPROVED', 'PENDING', 'REJECTED', 'NOT_STARTED'].includes(body?.kyc) ? body.kyc : 'APPROVED'
    const aml = ['CLEAR', 'FLAGGED'].includes(body?.aml) ? body.aml : kyc === 'APPROVED' ? 'CLEAR' : null
    WORLD.kyc = { ...WORLD.kyc, [mKyc[1]]: { kyc, aml, at: nowIso() } }
    applyWorld(WORLD)
    return reply(200, envelope({ clientId: mKyc[1], kyc, aml }))
  }

  /* FIN DU BLOCAGE : la réserve (versement converti + accumulé) est rendue
     au client en bitcoin, et le vault se clôt. Refusé tant que le blocage court. */
  const mRelease = path.match(/^\/api\/v1\/admin\/vaults\/([^/]+)\/release$/)
  if (mRelease && method === 'POST') {
    const v = VAULT_PRINCIPAL.findIndex((_, i) => vaultKey(i) === decodeURIComponent(mRelease[1]))
    if (v < 0) return reply(404, problem(404, 'NOT_FOUND', 'No such vault.'))
    if (isReleased(v)) return reply(409, problem(409, 'ALREADY_RELEASED', 'This vault has already been released.'))
    const start = new Date(`${VAULT_START[v]}T09:00:00Z`)
    if (addMonths(start, lockupMonthsOf(v)) > mockNow()) {
      return reply(409, problem(409, 'LOCKUP_RUNNING', 'The lockup has not ended yet.'))
    }
    const ms = vaultMonths(v)
    const capital = Math.round((VAULT_PRINCIPAL[v] / (ms[ms.length - 1]?.price ?? BTC_SPOT_USD)) * 1e8)
    WORLD.released = { ...WORLD.released, [v]: { month: ymOf(lastClosed()), at: nowIso(), sats: capital + vaultReserveSats(v) } }
    fireblocksTx('release', {
      ref: `release:${vaultKey(v)}`, clientId: ownerOf(v)?.id ?? null, vaultId: vaultKey(v), asset: 'BTC',
      amount: (capital + vaultReserveSats(v)) / 1e8, source: `Vault ${vaultLabel(v)}`, destination: FB_WALLET.BTC,
      note: 'End of lockup — the reserve returned to the client',
    })
    applyWorld(WORLD)
    return reply(200, envelope({ vaultId: vaultKey(v), releasedSats: WORLD.released[v].sats }))
  }

  /* ── LA DÉMO GUIDÉE ────────────────────────────────────────────────────
     Démarrer (un monde neuf, un prospect à embarquer), réinitialiser, avancer
     l'horloge, regarder /account comme un client donné. */
  if (path === '/api/v1/demo/start' && method === 'POST') {
    WORLD = { ...emptyWorld(), tour: { clientName: String(body?.clientName ?? '').trim() || 'Orbit Capital', offerId: null } }
    applyWorld(WORLD)
    return reply(200, envelope({ tour: WORLD.tour }))
  }
  if (path === '/api/v1/demo/reset' && method === 'POST') {
    applyWorld(null)
    return reply(200, envelope({ reset: true }))
  }
  if (path === '/api/v1/demo/clock' && method === 'POST') {
    const months = Math.max(1, Math.min(36, Math.round(Number(body?.months) || 1)))
    WORLD.clock += months
    applyWorld(WORLD)
    return reply(200, envelope({ clock: WORLD.clock, today: nowIso(), lastClosed: ymOf(lastClosed()) }))
  }
  if (path === '/api/v1/demo/view-as' && method === 'POST') {
    WORLD.viewAs = typeof body?.clientId === 'string' && body.clientId !== '' ? body.clientId : null
    applyWorld(WORLD)
    return reply(200, envelope({ viewAs: WORLD.viewAs }))
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
    // Le ticket minimum d'un vault dédié — celui des termes du produit en vigueur.
    const minTicket = Number(currentSettings().terms.minTicketUsdc) || 100_000
    if (amount < minTicket) {
      return reply(400, problem(400, 'BELOW_MINIMUM', `A dedicated vault starts at ${minTicket.toLocaleString('en-US')} USDC.`))
    }
    if (!Number.isFinite(months) || months <= 0) {
      return reply(400, problem(400, 'INVALID_LOCKUP', 'lockupMonths must be a positive number of months.'))
    }
    if (bps.some((b) => !Number.isFinite(b) || b < 0) || bps.reduce((a, b) => a + b, 0) !== 10_000) {
      return reply(422, problem(422, 'ALLOCATION_NOT_100', 'The three pockets must total 10,000 bps.'))
    }
    const now = nowIso()
    const n = WORLD.offers.length + 1
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
    WORLD.offers = [offer, ...WORLD.offers]
    // L'offre de la démo guidée : celle du prospect qu'elle embarque.
    if (WORLD.tour && !WORLD.tour.offerId && offer.clientName.toLowerCase() === WORLD.tour.clientName.toLowerCase()) {
      WORLD.tour = { ...WORLD.tour, offerId: offer.id }
    }
    applyWorld(WORLD)
    return reply(201, envelope({ offer: bloc(offer) }))
  }
  return null
}

applyWorld(null)

export {
  ACCOUNTS,
  serializeWorld,
  useWorld,
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
