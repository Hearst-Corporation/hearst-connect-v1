import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact } from '@/components/admin/cockpit'
import { DerivePochesChart, type DerivePoche } from '@/components/admin/derive-poches-chart'
import { DistributionBarChart } from '@/components/admin/distribution-chart'
import { AdminChartSplit, AdminCol, AdminGrid, AdminMetricGrid, AdminTableSplit } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { SingleObservation } from '@/components/admin/single-observation'
import { AdminBody, AdminCaption, AdminPage, AdminSurfaceHeader } from '@/components/admin/typography'
import {
  AdminErrorState,
  AdminMetric,
  AdminSection,
  AdminSourceAttendue,
  AdminStatus,
  AdminSurface,
  AdminTable,
  type AdminTableColumn,
} from '@/components/admin/surfaces'
import { callBackend, type BackendResult } from '@/lib/backend/client'
import { plottableAsChart } from '@/lib/chart-theme'
import { explorerTxUrl } from '@/lib/explorer'
import { formatNumber } from '@/lib/format'
import {
  adresseCourte,
  dateLisible,
  ilYA,
  libelleMouvement,
  montantUsdc,
  motifLisible,
  phraseMouvement,
} from '@/lib/mouvements'
import { formatCount } from '@/lib/resolved'
import { etatSerieDe } from '@/lib/serie-etat'
import { statutAffichage } from '@/lib/statut-affichage'
import clsx from 'clsx'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Operations' }
export const dynamic = 'force-dynamic'

/**
 * Operations — what happened, what drifted, what is waiting on a move.
 *
 * The page used to answer "what does the route return?": the rebalancing
 * state was dumped as raw JSON inside a disclosure widget. An operator
 * shouldn't have to read an envelope to know whether to act. Three questions
 * structure it now:
 *
 *   01. Does it need rebalancing? — the drift from target, pocket by pocket.
 *   02. What happened on the chain? — the ledger, as a feed and as a table.
 *   03. Is the ledger up to date? — the indexer's actual state.
 *   04. What's waiting on approval? — nothing, and here's why.
 *
 * ── How the four sections are composed ─────────────────────────────────────
 * Every block on this page declares the columns it occupies; nothing is left
 * to auto-placement. Section 01 is a full-width headline card over the
 * canonical chart-and-interpretation split (8 / 4). Section 02 follows the
 * table recipe: a full-width summary, then the narrative feed in the main
 * column with the type breakdown in the deliberate secondary one, then the
 * verifiable table at full width — a six-column table with hashes in it is
 * the one block on the page that genuinely wants the whole measure. Section
 * 03 puts its four measurements straight into a metric grid: each tile is its
 * own surface now, so the panel that used to hold them was a frame inside a
 * frame. Section 04 is deliberately eight columns wide, because three lines
 * of text do not need twelve.
 *
 * ── Two sources for the same subject, on purpose ───────────────────────────
 * `GET /api/v1/rebalancing/status` is the DIRECT read of the contract: today
 * it responds UNAVAILABLE / `not_exposed_by_contract`. The deployed contract
 * simply exposes no rebalancing state. The page says so plainly instead of
 * leaving that gap to guesswork.
 *
 * What we do know instead comes from the INDEXER, via `GET /api/v1/dashboard`
 * (`rebalancing` and `allocation`, both LIVE): the date of the last
 * rebalance, the observed drift, and the signed detail pocket by pocket. The
 * two provenances are shown separately — conflating them would pass off
 * indexed data as an on-chain read.
 *
 * ── What is NOT tracked ─────────────────────────────────────────────────────
 * The delay between `occurredAt` and `indexedAt` would be easy to chart, but
 * the first batch of events was backfilled after the fact: the series would
 * mix a backfill with a nominal regime and read as "the indexer is hours
 * behind." Indexing freshness is therefore read where it's actually
 * measured — the scheduler exposed by `GET /api/v1/runtime` — not inferred
 * from the ledger.
 *
 * No rebalancing trigger threshold is published by the service: the page
 * gives the raw drift and draws no invented red line.
 */

/* ── Actual response shapes ───────────────────────────────────────────────── */

type MouvementIndexe = {
  readonly id: string
  readonly eventName: string
  readonly blockNumber: string
  readonly txHash: string
  readonly investorAddress: string | null
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
}

type Resolu<T> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
  readonly provenance?: string | null
}

type ReponseEvenements = {
  readonly events?: Resolu<readonly MouvementIndexe[]>
}

/** `runtime` block embedded in the `rebalancing/status` response. */
type RuntimeContrat = {
  readonly mode?: string | null
  readonly chainId?: number | null
  readonly contractAddress?: string | null
  readonly codePresence?: string | null
  readonly indexerLagBlocks?: number | null
}

type RebalancingStatus = {
  readonly runtime?: RuntimeContrat
  readonly rebalancing?: Resolu<unknown>
}

type Poche = {
  readonly pocket: string
  readonly label?: string | null
  readonly targetBps?: number | null
  readonly actualBps?: number | null
  readonly driftBps?: number | null
}

type Dashboard = {
  readonly rebalancing?: Resolu<{
    readonly lastRebalanceAt?: string | null
    readonly driftBps?: number | null
    readonly pending?: unknown
  }>
  readonly allocation?: Resolu<{ readonly pockets?: readonly Poche[] }>
}

type Runtime = {
  readonly contract?: RuntimeContrat
  readonly indexer?: { readonly status?: string | null; readonly lastSyncedAt?: string | null }
  readonly indexerStatus?: string | null
  readonly indexerScheduler?: {
    readonly status?: string | null
    readonly intervalMs?: number | null
    readonly lastRunAt?: string | null
    readonly lastSuccessAt?: string | null
    readonly consecutiveErrors?: number | null
    readonly lastIndexedBlock?: string | null
  }
  readonly db?: { readonly reachable?: boolean | null; readonly latencyMs?: number | null }
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

function instantDe(iso: string | null | undefined): number | null {
  if (iso === null || iso === undefined || iso === '') return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

function jourLisible(iso: string | null): string {
  const t = instantDe(iso)
  if (t === null) return 'unknown date'
  return new Date(t).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function heureLisible(iso: string | null): string {
  const t = instantDe(iso)
  if (t === null) return '—'
  return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/** A drift in basis points reads as percentage points, never raw. */
function ecartLisible(bps: number | null | undefined): string {
  if (typeof bps !== 'number' || !Number.isFinite(bps)) return '—'
  return formatNumber(bps / 100, { maximumFractionDigits: 2 })
}

/** A drift only means something with its direction attached. */
function ecartSigneLisible(points: number): string {
  return formatNumber(points, { maximumFractionDigits: 2, signDisplay: 'always' })
}

function partLisible(points: number): string {
  return formatNumber(points, { maximumFractionDigits: 2 })
}

/** String integer → BigInt. An unreadable value isn't counted. */
function entierAtomique(valeur: string | null | undefined): bigint | null {
  if (valeur === null || valeur === undefined || valeur === '') return null
  try {
    return BigInt(valeur)
  } catch {
    return null
  }
}

function nombreDeChaine(valeur: string | null | undefined): string {
  const entier = entierAtomique(valeur)
  return entier === null ? '—' : formatNumber(Number(entier))
}

/** A chain id isn't a quantity: no thousands separator. */
function chaineLisible(chainId: number | null | undefined): string {
  if (typeof chainId !== 'number' || !Number.isFinite(chainId)) return '—'
  return String(chainId)
}

function retardLisible(blocs: number | null | undefined): string {
  if (typeof blocs !== 'number' || !Number.isFinite(blocs)) {
    return 'Indexer lag: not reported by the contract.'
  }
  return `Indexer lag reported by the contract: ${formatCount(blocs)} block(s).`
}

function cadenceLisible(intervalMs: number | null | undefined): string {
  if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs)) return '—'
  if (intervalMs < 60_000) return `every ${Math.round(intervalMs / 1000)}s`
  return `every ${Math.round(intervalMs / 60_000)}min`
}

/**
 * The database's reachability, in three states rather than two.
 *
 * `reachable` absent is not `reachable: false`: the first says the runtime
 * response carried nothing on the subject, the second is a service claiming
 * its own database is down. Collapsing them announced an outage nobody
 * measured.
 */
function baseDonneesLisible(reachable: boolean | null | undefined): string {
  if (reachable === true) return 'Database: reachable'
  if (reachable === false) return 'Database: unreachable'
  return 'Database: not reported'
}

/**
 * Machine reason → sentence. An unknown reason doesn't leak through as-is: better to
 * say we don't know than to show `not_exposed_by_contract` on screen.
 */
function phraseIndisponibilite(motif: string | null | undefined): string {
  const lisible = motifLisible(motif)
  if (lisible !== undefined) return `Reason given by the service: ${lisible}.`
  return 'The service does not specify a reason.'
}

/* ── Ledger: real aggregates ──────────────────────────────────────────────── */

function trierDuPlusRecent(mouvements: readonly MouvementIndexe[]): readonly MouvementIndexe[] {
  return [...mouvements].sort((a, b) => {
    const ta = instantDe(a.occurredAt)
    const tb = instantDe(b.occurredAt)
    if (ta === null && tb === null) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    return tb - ta
  })
}

type BarreType = { readonly nom: string; readonly valeur: number }

type CumulType = {
  readonly nom: string
  readonly nombre: number
  /** Sum of amounts carried by this type, or `null` if it carries none. */
  readonly montantAtomique: string | null
}

type Agregat = { nombre: number; total: bigint; avecMontant: number }

function agregerParType(mouvements: readonly MouvementIndexe[]): readonly CumulType[] {
  const parType = new Map<string, Agregat>()
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    // `BigInt(0)`, not `0n`: the project's compilation target is ES2017,
    // where the BigInt literal doesn't exist yet.
    const courant = parType.get(nom) ?? { nombre: 0, total: BigInt(0), avecMontant: 0 }
    courant.nombre += 1
    const montant = entierAtomique(m.assetAmountAtomic)
    if (montant !== null) {
      courant.total += montant
      courant.avecMontant += 1
    }
    parType.set(nom, courant)
  }
  return [...parType.entries()].map(([nom, agregat]) => ({
    nom,
    nombre: agregat.nombre,
    montantAtomique: agregat.avecMontant > 0 ? agregat.total.toString() : null,
  }))
}

const barresDe = (cumuls: readonly CumulType[]): readonly BarreType[] =>
  cumuls.map((c) => ({ nom: c.nom, valeur: c.nombre }))

type GroupeJour = { readonly jour: string; readonly mouvements: readonly MouvementIndexe[] }

/** The feed reads by day: that's how a team tells the story of its week. */
function grouperParJour(mouvements: readonly MouvementIndexe[]): readonly GroupeJour[] {
  const parJour = new Map<string, MouvementIndexe[]>()
  for (const m of mouvements) {
    const jour = jourLisible(m.occurredAt)
    const deja = parJour.get(jour)
    if (deja === undefined) parJour.set(jour, [m])
    else deja.push(m)
  }
  return [...parJour.entries()].map(([jour, liste]) => ({ jour, mouvements: liste }))
}

/* ── Rebalancing: drift pocket by pocket ──────────────────────────────────── */

function derivesDe(poches: readonly Poche[] | null | undefined): readonly DerivePoche[] {
  if (!poches) return []
  const sorties: DerivePoche[] = []
  for (const p of poches) {
    const cible = p.targetBps
    const constate = p.actualBps
    const ecart = p.driftBps
    if (typeof cible !== 'number' || typeof constate !== 'number' || typeof ecart !== 'number') continue
    const intitule = p.label === null || p.label === undefined || p.label === '' ? p.pocket : p.label
    sorties.push({
      poche: `${p.pocket} · ${intitule}`,
      cible: cible / 100,
      constate: constate / 100,
      ecart: ecart / 100,
    })
  }
  return sorties
}

/**
 * State of the drift frame.
 *
 * Three distinct absences, three distinct messages: the service staying
 * silent, the source not being wired up, and the case where the allocation
 * arrives but without the three fields needed to compute a drift. Conflating
 * them would pass off an outage as a missing feature.
 */
function etatDeriveDe(dashboard: BackendResult<Dashboard>, derives: readonly DerivePoche[]): EtatSerie {
  if (!dashboard.ok) {
    return {
      type: 'indisponible',
      explication: 'The service did not respond. No drift is shown rather than a stale value.',
    }
  }
  if (derives.length > 0) return { type: 'tracee' }

  const defaut = 'No pocket reports both its target and its observed share.'
  const etat = etatSerieDe(dashboard.data.allocation, defaut)
  return etat.type === 'tracee' ? { type: 'attendue', explication: defaut } : etat
}

/* ── Section 01 · Rebalancing ──────────────────────────────────────────────── */

function SyntheseDerive({ dashboard }: Readonly<{ dashboard: BackendResult<Dashboard> }>) {
  if (!dashboard.ok) {
    return <AdminErrorState state={dashboard.state} title="Drift measurement unavailable" />
  }

  const champ = dashboard.data.rebalancing
  const mesure = champ?.value

  return (
    <Card className="p-6">
      {/* Two declared tracks. The figure used to sit in a flex row where both
          it and the fact list asked for "whatever is left", so the gap between
          them moved with every value. The hero keeps its measure now. */}
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-end">
        <HeroFigure
          valeur={ecartLisible(mesure?.driftBps)}
          libelle="Observed drift from target allocation"
          unite="percentage points"
        />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <SideFact libelle="Last rebalance" valeur={dateLisible(mesure?.lastRebalanceAt)} />
          <SideFact libelle="Time since" valeur={ilYA(mesure?.lastRebalanceAt)} />
          {/* `pending: null`: the service reports no request. We say so
              explicitly rather than showing "0", which would read as a counter. */}
          <SideFact
            libelle="Pending request"
            valeur={mesure?.pending === null || mesure?.pending === undefined ? 'None reported' : 'A request is open'}
          />
        </dl>
      </div>
      <p className="mt-5 border-t border-zinc-950/5 pt-4 text-xs text-zinc-500 dark:border-console-line-soft dark:text-zinc-400">
        Indexed measurement · {statutAffichage(champ?.status)} — no trigger threshold is published by the
        service: the drift is given raw, the decision stays human.
      </p>
    </Card>
  )
}

const QUESTION_DERIVE = 'Which pocket is drifting from its target?'
const UNITE_DERIVE = 'in percentage points'

/**
 * The drift, plotted — or stated, when there is only one of it.
 *
 * A single pocket rendered into a bar chart is one bar alone in a plot area,
 * which reads as a chart whose other series failed to load. `plottableAsChart`
 * is the test; below it the honest rendering is the measurement itself.
 */
function CadreDerive({
  derives,
  etat,
}: Readonly<{ derives: readonly DerivePoche[]; etat: EtatSerie }>) {
  const seule = derives[0]

  if (etat.type === 'tracee' && !plottableAsChart(derives.length) && seule !== undefined) {
    return (
      <ChartFrame question={QUESTION_DERIVE} unite={UNITE_DERIVE} etat={etat}>
        <SingleObservation
          valeur={ecartSigneLisible(seule.ecart)}
          unite="points"
          periode={seule.poche}
          contexte={`Target ${partLisible(seule.cible)}% · observed ${partLisible(seule.constate)}%`}
          note="Only one pocket reports both its target and its observed share — there is no distribution to plot yet."
        />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame question={QUESTION_DERIVE} unite={UNITE_DERIVE} etat={etat}>
      <DerivePochesChart poches={derives} />
    </ChartFrame>
  )
}

function LectureOnChain({ rebalancing }: Readonly<{ rebalancing: BackendResult<RebalancingStatus> }>) {
  if (!rebalancing.ok) {
    return <AdminErrorState state={rebalancing.state} title="Rebalancing state unavailable" />
  }

  const champ = rebalancing.data.rebalancing
  const contrat = rebalancing.data.runtime
  const lisible = champ?.status === 'LIVE' && champ.value !== null

  return (
    <AdminSurface padding>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AdminStatus status={statutAffichage(champ?.status)} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Direct contract read</p>
      </div>

      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        {lisible
          ? 'The contract exposes a rebalancing state: see the detail below.'
          : 'The deployed contract exposes no rebalancing state. This is not a service outage: the read capability is absent from the source.'}
      </p>
      {lisible ? null : <AdminCaption className="mt-1">{phraseIndisponibilite(champ?.reason)}</AdminCaption>}

      {/* These four facts used to be buried in raw JSON: they say which
          contract was queried, and whether it actually carries code. They
          stack in one column because this panel is four grid columns wide —
          the four-across row they used to sit in wrapped into ragged pairs. */}
      <dl className="mt-5 space-y-3 border-t border-zinc-950/5 pt-4 dark:border-console-line-soft">
        <SideFact libelle="Contract mode" valeur={contrat?.mode ?? '—'} />
        <SideFact libelle="Chain" valeur={chaineLisible(contrat?.chainId)} />
        <SideFact libelle="Contract queried" valeur={adresseCourte(contrat?.contractAddress) ?? '—'} />
        <SideFact
          libelle="Code present at address"
          valeur={contrat?.codePresence === 'present' ? 'Yes' : (contrat?.codePresence ?? '—')}
        />
      </dl>

      <Link
        href="/admin/keeper"
        className="mt-5 inline-block text-sm text-accent-600 hover:underline dark:text-accent-400"
      >
        Keeper actions (rebalancing) →
      </Link>
    </AdminSurface>
  )
}

/* ── Section 02 · Ledger ───────────────────────────────────────────────────── */

function cellType(m: MouvementIndexe) {
  return <span className="text-zinc-950 dark:text-white">{libelleMouvement(m.eventName)}</span>
}

/**
 * A dash isn't an amount: it doesn't carry the accent color, reserved for
 * values that are actually numeric. A green "—" used to read as a sum at
 * first glance.
 */
function cellMontant(m: MouvementIndexe) {
  if (m.assetAmountAtomic === null) {
    return <span className="text-zinc-500 dark:text-zinc-400">—</span>
  }
  return (
    <span className="font-semibold text-accent-600 tabular-nums dark:text-accent-400">
      {montantUsdc(m.assetAmountAtomic)}
    </span>
  )
}

function cellAdresse(m: MouvementIndexe) {
  return adresseCourte(m.investorAddress) ?? '—'
}

function cellBloc(m: MouvementIndexe) {
  return m.blockNumber
}

function cellDate(m: MouvementIndexe) {
  return <span className="text-zinc-500 dark:text-zinc-400">{dateLisible(m.occurredAt)}</span>
}

function renderTxHash(chainId: number | undefined, txHash: string) {
  const url = explorerTxUrl(chainId, txHash)
  const court = adresseCourte(txHash)
  if (!court) return '—'
  if (!url) return court
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-600 hover:underline dark:text-accent-400"
    >
      {court}
    </a>
  )
}

function colonnesMouvements(chainId: number | undefined): readonly AdminTableColumn<MouvementIndexe>[] {
  return [
    { key: 'type', header: 'Type', cell: cellType },
    { key: 'montant', header: 'Amount', cell: cellMontant },
    { key: 'adresse', header: 'Investor', mono: true, cell: cellAdresse },
    { key: 'bloc', header: 'Block', mono: true, cell: cellBloc },
    {
      key: 'hash',
      header: 'Transaction',
      mono: true,
      cell: (m) => renderTxHash(chainId, m.txHash),
    },
    { key: 'date', header: 'Date', cell: cellDate },
  ]
}

function detailRegistreVide(reason: string | null | undefined): string {
  if (reason === 'no_events_indexed') {
    return 'The ledger was queried and is empty — not an outage.'
  }
  return 'The ledger returns no movement.'
}

/** One line of the feed: the time, the sentence, the actor, the amount. */
function LigneFil({ mouvement }: Readonly<{ mouvement: MouvementIndexe }>) {
  const acteur = adresseCourte(mouvement.investorAddress)
  return (
    <li className="grid gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline">
      <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {heureLisible(mouvement.occurredAt)}
      </span>
      <span className="min-w-0 text-sm text-zinc-950 dark:text-white">
        {phraseMouvement(mouvement.eventName)}
        {acteur === null ? null : (
          <span className="ml-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">{acteur}</span>
        )}
      </span>
      <span className="text-sm text-zinc-700 tabular-nums dark:text-zinc-300">
        {mouvement.assetAmountAtomic === null ? '—' : montantUsdc(mouvement.assetAmountAtomic)}
      </span>
    </li>
  )
}

/**
 * The chronological feed — the most recent movements, narrated.
 *
 * It doesn't duplicate the table: the table carries the verifiable detail
 * (block, transaction, address), the feed carries the read — when, what, how
 * much. An operator opens the page for the second question, not the first.
 */
function FilChronologique({ mouvements }: Readonly<{ mouvements: readonly MouvementIndexe[] }>) {
  const groupes = grouperParJour(mouvements)
  return (
    <Card>
      <CardHeader
        title="What happened, and when?"
        hint={`The ${mouvements.length} most recent movements, newest first`}
      />
      <div className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
        {groupes.map((groupe) => (
          <div key={groupe.jour}>
            <p className="bg-zinc-50/80 px-5 py-2 text-xs font-medium text-zinc-500 first-letter:uppercase dark:bg-console-inset dark:text-zinc-400">
              {groupe.jour}
            </p>
            <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              {groupe.mouvements.map((m) => (
                <LigneFil key={m.id} mouvement={m} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * The shape of the ledger — or the single type it holds, when there is one.
 *
 * Same rule as the drift chart: one category is not a distribution, and a
 * lone bar in a plot area reads as a chart with data missing.
 */
function RepartitionParType({ cumuls }: Readonly<{ cumuls: readonly CumulType[] }>) {
  const question = 'Which types make up the ledger?'
  const unite = 'movements, by type'
  const majeur = cumuls[0]

  if (!plottableAsChart(cumuls.length)) {
    if (majeur === undefined) return null
    return (
      <ChartFrame question={question} unite={unite} etat={{ type: 'tracee' }}>
        <SingleObservation
          valeur={formatCount(majeur.nombre)}
          unite="movements"
          periode={majeur.nom}
          contexte="Every movement recorded so far carries this type."
          note="A single type has been recorded — there is no distribution to plot yet."
        />
      </ChartFrame>
    )
  }

  return (
    <ChartFrame question={question} unite={unite} etat={{ type: 'tracee' }}>
      <DistributionBarChart barres={barresDe(cumuls)} />
    </ChartFrame>
  )
}

/** The ledger's headline facts: volume, period covered, cumulative amounts. */
function EnTeteRegistre({
  mouvements,
  cumuls,
}: Readonly<{ mouvements: readonly MouvementIndexe[]; cumuls: readonly CumulType[] }>) {
  const dernier = mouvements[0]?.occurredAt ?? null
  const premier = mouvements[mouvements.length - 1]?.occurredAt ?? null
  const avecMontant = cumuls.filter((c) => c.montantAtomique !== null)

  return (
    <Card className="p-6">
      {/* Declared tracks again: the count anchors a fixed measure on the left,
          the facts fill the remaining one. These stay `SideFact`s rather than
          metric tiles — a formatted date at tile size truncates. */}
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-end">
        <HeroFigure valeur={formatCount(mouvements.length)} libelle="Movements recorded on chain" />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <SideFact libelle="Distinct types" valeur={formatCount(cumuls.length)} />
          <SideFact libelle="First movement recorded" valeur={dateLisible(premier)} />
          <SideFact libelle="Last movement recorded" valeur={ilYA(dernier)} />
          {/* Totals are given by type only: summing a deposit and an
              electricity payment would produce a total that means nothing. */}
          {avecMontant.map((c) => (
            <SideFact key={c.nom} libelle={`${c.nom} · total`} valeur={montantUsdc(c.montantAtomique)} />
          ))}
        </dl>
      </div>
    </Card>
  )
}

function RegistreMouvements({
  reponse,
  mouvements,
  chainId,
}: Readonly<{
  reponse: BackendResult<ReponseEvenements>
  mouvements: readonly MouvementIndexe[] | null
  chainId: number | undefined
}>) {
  if (!reponse.ok) {
    return <AdminErrorState state={reponse.state} />
  }

  if (!mouvements || mouvements.length === 0) {
    return (
      <AdminSourceAttendue
        quoi="No movement recorded"
        detail={detailRegistreVide(reponse.data.events?.reason)}
        requis={['A first movement recorded on the chain']}
      />
    )
  }

  const recents = trierDuPlusRecent(mouvements)
  const cumuls = agregerParType(recents)
  const fil = recents.slice(0, 6)

  return (
    <>
      <EnTeteRegistre mouvements={recents} cumuls={cumuls} />

      {/* The narrative in the main column, the shape of the ledger in the
          deliberate secondary one. `items-start` so neither card is stretched
          to the other's height with nothing to put in the extra space. */}
      <AdminTableSplit
        className="items-start"
        main={<FilChronologique mouvements={fil} />}
        aside={<RepartitionParType cumuls={cumuls} />}
      />

      {/* Full measure, on purpose: six columns carrying addresses and
          transaction hashes is the one block on this page that needs it. */}
      <AdminSurface>
        <AdminSurfaceHeader
          className="px-5 pt-5 sm:px-6"
          title="Detailed ledger"
          description="Every movement with its block, transaction, and the address involved — the verifiable version."
        />
        <AdminTable rows={recents} keyFn={(m) => m.id} columns={colonnesMouvements(chainId)} />
      </AdminSurface>
    </>
  )
}

/* ── Section 03 · Indexing ─────────────────────────────────────────────────── */

/** The state carries a word as much as a color: the tint alone is never enough. */
const ETAT_INDEXEUR: Record<string, { readonly mot: string; readonly point: string; readonly texte: string }> = {
  RUNNING: { mot: 'Running', point: 'bg-success-500', texte: 'text-success-400' },
  // Idle is not an incident and not a success — it stays neutral rather than
  // spending a fourth hue on "nothing is happening, and that is fine".
  IDLE: { mot: 'Idle', point: 'bg-zinc-400 dark:bg-zinc-500', texte: 'text-zinc-600 dark:text-zinc-300' },
  DEGRADED: { mot: 'Degraded', point: 'bg-warning-500', texte: 'text-warning-400' },
  STOPPED: { mot: 'Stopped', point: 'bg-danger-500', texte: 'text-danger-400' },
  ERROR: { mot: 'Error', point: 'bg-danger-500', texte: 'text-danger-400' },
}

function etatIndexeur(brut: string | null | undefined) {
  if (typeof brut !== 'string' || brut === '') {
    return { mot: 'Not reported', point: 'bg-zinc-600', texte: 'text-zinc-400' }
  }
  return ETAT_INDEXEUR[brut.toUpperCase()] ?? { mot: brut, point: 'bg-zinc-600', texte: 'text-zinc-400' }
}

function SectionIndexation({ runtime }: Readonly<{ runtime: BackendResult<Runtime> }>) {
  if (!runtime.ok) {
    return <AdminErrorState state={runtime.state} title="Indexing state unavailable" />
  }

  const planificateur = runtime.data.indexerScheduler
  const derniereSynchro = runtime.data.indexer?.lastSyncedAt
  const etat = etatIndexeur(runtime.data.indexerStatus ?? runtime.data.indexer?.status)

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-hidden="true" className={clsx('size-2 shrink-0 rounded-full', etat.point)} />
        <p className={clsx('text-sm font-medium', etat.texte)}>Indexer: {etat.mot}</p>
        <AdminBody>The ledger above is only as good as this sync.</AdminBody>
      </div>

      {/* No panel around the tiles. Each `AdminMetric` carries its own ring
          and background now, so the surface that used to hold them was a
          frame drawn inside a frame. Four measurements, four columns, no
          orphan in the last row. */}
      <div>
        <AdminMetricGrid count={4}>
          <AdminMetric label="Last sync" value={ilYA(derniereSynchro)} hint={dateLisible(derniereSynchro)} />
          <AdminMetric label="Last indexed block" value={nombreDeChaine(planificateur?.lastIndexedBlock)} />
          <AdminMetric label="Polling interval" value={cadenceLisible(planificateur?.intervalMs)} />
          {/* An error counter measured at zero IS information; it doesn't come
              from an absence collapsed into zero. */}
          <AdminMetric
            label="Consecutive errors"
            value={formatCount(planificateur?.consecutiveErrors)}
            hint={baseDonneesLisible(runtime.data.db?.reachable)}
          />
        </AdminMetricGrid>
        <AdminCaption className="mt-3">{retardLisible(runtime.data.contract?.indexerLagBlocks)}</AdminCaption>
      </div>
    </>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const [reponse, rebalancing, dashboard, runtime] = await Promise.all([
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 50 } }),
    callBackend<RebalancingStatus>('rebalancing-status'),
    callBackend<Dashboard>('dashboard'),
    callBackend<Runtime>('runtime'),
  ])

  // `runtime` isn't wrapped: the chain is read under `contract`, never at the
  // root. Read from the wrong place, it evaluates to `undefined` and no
  // explorer link gets built.
  const chainId = runtime.ok ? (runtime.data.contract?.chainId ?? undefined) : undefined
  const mouvements = reponse.ok ? (reponse.data.events?.value ?? null) : null

  const derives = derivesDe(dashboard.ok ? dashboard.data.allocation?.value?.pockets : undefined)
  const etatDerive = etatDeriveDe(dashboard, derives)

  return (
    <AdminPage>
      <PageHeader
        title="Operations"
        description="Whether it needs rebalancing, what happened on the chain, and whether the ledger is up to date."
      />

      <AdminSection
        index="01"
        title="Rebalancing"
        description="The drift from target allocation, pocket by pocket — and what the contract itself doesn't expose."
      >
        <SyntheseDerive dashboard={dashboard} />

        {/* The canonical split: the measurement at eight columns, what the
            contract will and won't say about it at four. They used to be
            three cards stacked at full width, which gave the on-chain read
            the same weight as the drift itself. */}
        <AdminChartSplit
          className="items-start"
          chart={<CadreDerive derives={derives} etat={etatDerive} />}
          aside={<LectureOnChain rebalancing={rebalancing} />}
        />
      </AdminSection>

      <AdminSection
        index="02"
        title="Movement ledger"
        description="The indexed events of Series 1 — what actually happened on the chain."
        // The backend returns this status as a free-form field: we validate
        // it instead of forcing it, otherwise an "undefined" label would show.
        // It belongs in the section's action slot, not in a bare row of its
        // own above the content.
        actions={
          reponse.ok && reponse.data.events ? (
            <AdminStatus status={statutAffichage(reponse.data.events.status)} />
          ) : null
        }
      >
        <RegistreMouvements reponse={reponse} mouvements={mouvements} chainId={chainId} />
      </AdminSection>

      <AdminSection
        index="03"
        title="Ledger freshness"
        description="A ledger is only as good as its indexing: here is its state, measured at the source."
      >
        <SectionIndexation runtime={runtime} />
      </AdminSection>

      {/* Placed at the end of the page, not the top: an empty queue opening
          the screen would make it look dead. The content itself doesn't
          change — the source still doesn't exist, and that's what needs to
          be said. Eight columns rather than twelve: the card is sized to the
          three lines it holds, and the rest is deliberate whitespace. */}
      <AdminSection
        index="04"
        title="Pending approval"
        description="Financial approvals — source pending"
      >
        <AdminGrid>
          <AdminCol span={8}>
            <AdminSourceAttendue
              quoi="No approval queue open"
              detail="DistributionApproval, VaultDeploymentApproval, and ProposalSignature exist in the database but are not yet exposed over HTTP."
              requis={[
                'Reading pending requests and received signatures',
                'Approve/reject action with logging',
                'Compliance check attached to each request',
              ]}
            />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
    </AdminPage>
  )
}
