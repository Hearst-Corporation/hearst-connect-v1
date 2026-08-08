import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/catalyst/description-list'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame, HearstAllocationChart, RebalancingHistoryChart, type PosteAllocation, type PointDrift } from '@/components/charts'
import { DataTableShell, SectionCard } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { callBackend, type BackendResult } from '@/lib/backend/client'
import { type RuntimePayload } from '@/lib/backend/runtime'
import { formatNumber } from '@/lib/format'
import {
  adresseCourte,
  dateLisible,
  etatSourceLisibleCap,
  ilYA,
  libelleMouvement,
  montantUsdc,
  motifLisible,
  phraseMouvement,
} from '@/lib/mouvements'
import { statutAffichage } from '@/lib/statut-affichage'
import { editorial, mapAvailability, measuredCount, unavailable } from '@/lib/vaults/model'
import {
  ArrowsRightLeftIcon,
  BookOpenIcon,
  ChartBarIcon,
  CpuChipIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Operations' }
export const dynamic = 'force-dynamic'

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
}

type ReponseEvenements = { readonly events?: Resolu<readonly MouvementIndexe[]> }

type EvenementRebalancing = {
  readonly name: string
  readonly category: string
  readonly severity: string
  readonly actor: string | null
  readonly amount: string | null
  readonly txHash: string
  readonly logIndex: number
  readonly blockNumber: number
  readonly timestamp: string | null
}

type ReponseEvenementsRebalancing = { readonly events?: Resolu<readonly EvenementRebalancing[]> }

type PointRebalancingHistory = {
  readonly date: string
  readonly driftBps: number
  readonly rebalanced: boolean
}

type ReponseRebalancingHistory = { readonly history?: Resolu<readonly PointRebalancingHistory[]> }

type RuntimeContrat = {
  readonly mode?: string | null
  readonly chainId?: number | null
  readonly contractAddress?: string | null
  readonly codePresence?: string | null
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

type Runtime = RuntimePayload

type Derive = {
  readonly poche: string
  readonly cible: number
  readonly constate: number
  readonly ecart: number
}

function ecartLisible(bps: number | null | undefined): string {
  if (typeof bps !== 'number' || !Number.isFinite(bps)) return '—'
  return formatNumber(bps / 100, { maximumFractionDigits: 2 })
}

function partLisible(points: number): string {
  return formatNumber(points, { maximumFractionDigits: 2 })
}

function derivesDe(poches: readonly Poche[] | null | undefined): readonly Derive[] {
  if (!poches) return []
  const sorties: Derive[] = []
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

function cadenceLisible(intervalMs: number | null | undefined): string {
  if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs)) return '—'
  if (intervalMs < 60_000) return `every ${Math.round(intervalMs / 1000)} s`
  return `every ${Math.round(intervalMs / 60_000)} min`
}

/**
 * Phrase FR d'une lecture directe LIVE du contrat.
 *
 * On ne recopie JAMAIS le brut (`JSON.stringify`) et on ne laisse pas fuir le
 * code technique « LIVE » : on nomme la lecture et on expose deux à trois
 * champs utiles, chacun formaté par les helpers de la page. Un champ absent
 * n'est pas mentionné plutôt que rendu « 0 » ou « null ».
 */
function lectureOnChainDirecte(value: unknown): string {
  const champs: string[] = []
  if (typeof value === 'object' && value !== null) {
    const lecture = value as Record<string, unknown>
    const ecart = lecture.driftBps
    if (typeof ecart === 'number' && Number.isFinite(ecart)) {
      champs.push(`drift ${ecartLisible(ecart)} pt`)
    }
    const dernier = lecture.lastRebalanceAt
    if (typeof dernier === 'string' && dernier !== '') {
      champs.push(`last rebalance ${dateLisible(dernier)}`)
    }
  }
  return champs.length > 0
    ? `Live — reading received : ${champs.join(', ')}.`
    : 'Live — reading received.'
}

function onChainReading(rebalancing: BackendResult<RebalancingStatus>): string {
  if (!rebalancing.ok) return 'The service did not respond for the direct contract read.'
  const bloc = rebalancing.data.rebalancing
  if (bloc === undefined) return 'Rebalancing field missing from the response.'
  if (bloc.status === 'LIVE' && bloc.value !== null && bloc.value !== undefined) {
    return lectureOnChainDirecte(bloc.value)
  }
  const motif = motifLisible(bloc.reason)
  if (motif !== undefined) return `${etatSourceLisibleCap(bloc.status)} — ${motif}`
  if (bloc.status === 'UNAVAILABLE' || bloc.status === 'NOT_EXPOSED' || bloc.status === 'NOT_SUPPORTED') {
    return `${etatSourceLisibleCap(bloc.status)} — no usable on-chain measurement.`
  }
  return `${etatSourceLisibleCap(bloc.status)} — response received with no usable value.`
}

/**
 * Opérations — grammaire premium (dialecte B).
 * Sources : series1-events, events-rebalancing, rebalancing-status, dashboard, runtime.
 */
export default async function Page() {
  await requireSession()
  const [reponse, rebalancingEvents, rebalancing, dashboard, runtime, history] = await Promise.all([
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 50 } }),
    callBackend<ReponseEvenementsRebalancing>('events-rebalancing', { params: { limit: 50 } }),
    callBackend<RebalancingStatus>('rebalancing-status'),
    callBackend<Dashboard>('dashboard'),
    callBackend<Runtime>('runtime'),
    callBackend<ReponseRebalancingHistory>('rebalancing-history', { params: { limit: 90 } }),
  ])

  const mouvements = reponse.ok ? (reponse.data.events?.value ?? null) : null
  const rebalEvents = rebalancingEvents.ok ? (rebalancingEvents.data.events?.value ?? null) : null
  const derives = derivesDe(dashboard.ok ? dashboard.data.allocation?.value?.pockets : undefined)
  const mesure = dashboard.ok ? dashboard.data.rebalancing?.value : undefined
  const planificateur = runtime.ok ? runtime.data.indexerScheduler : undefined
  const contrat = rebalancing.ok ? rebalancing.data.runtime : undefined
  const historyPoints = history.ok ? (history.data.history?.value ?? null) : null

  const eventsAvail = availabilityFromResolu<readonly MouvementIndexe[]>(
    reponse.ok ? reponse.data.events : undefined,
    '/api/v1/series1/events',
  )
  const movementCountCell = measuredCount(eventsAvail)

  const allocationBloc = dashboard.ok ? dashboard.data.allocation : undefined
  const pocketsMeasuredCell = mapAvailability(
    availabilityFromResolu(allocationBloc, '/api/v1/dashboard'),
    (allocation) => formatNumber(derivesDe(allocation?.pockets).length),
  )

  const runtimeStatus = runtime.ok
    ? (runtime.data.indexerStatus ?? runtime.data.indexer?.status ?? 'NOT_REPORTED')
    : 'UNAVAILABLE'
  const journalStatus =
    reponse.ok && reponse.data.events
      ? editorial(etatSourceLisibleCap(statutAffichage(reponse.data.events.status)))
      : unavailable({
          endpoint: '/api/v1/series1/events',
          status: 'UNAVAILABLE',
          reason: 'events_source_unreachable',
        })

  const pendingLabel = !dashboard.ok
    ? 'Dashboard unreadable — pending not verified'
    : dashboard.data.rebalancing?.status !== 'LIVE'
      ? 'Rebalancing dashboard not LIVE — pending not verified'
      : mesure?.pending === null || mesure?.pending === undefined || mesure.pending === false
        ? 'None reported'
        : 'A request is open'

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'movements', title: 'Movements', value: movementCountCell, icon: ArrowsRightLeftIcon },
    { id: 'pockets', title: 'Pockets measured', value: pocketsMeasuredCell, icon: ChartBarIcon },
    {
      id: 'indexer',
      title: 'Indexer',
      value: editorial(etatSourceLisibleCap(runtimeStatus)),
      icon: CpuChipIcon,
    },
    { id: 'journal', title: 'Journal status', value: journalStatus, icon: BookOpenIcon },
  ]

  return (
    <div className="space-y-8">
      {/* ── EN-TÊTE ──────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Operations"
        description="Series 1 movements, pocket allocation, and indexer freshness."
        kpis={kpis}
      />

      {/* ── CHART RÉEL : allocation cible vs constatée par poche ──── */}
      <ChartFrame
        question="Does observed allocation follow its target, pocket by pocket?"
        unite="in percent — target share vs observed share"
        etat={
          !dashboard.ok
            ? {
                type: 'unavailable',
                explication: 'The dashboard did not respond — pocket allocation cannot be read.',
              }
            : derives.length === 0
              ? {
                  type: 'empty',
                  explication:
                    'No pocket reports both its target and observed share — waiting on the source.',
                }
              : { type: 'plotted' }
        }
        expectedSource={['GET /api/v1/dashboard']}
      >
        <HearstAllocationChart
          postes={derives.map<PosteAllocation>((d) => ({
            label: d.poche,
            ciblePct: d.cible,
            constatePct: d.constate,
          }))}
        />
      </ChartFrame>

      {/* ── CHART : historique du drift ──────────────────────────── */}
      <ChartFrame
        question="Comment le drift d'allocation a-t-il évolué au fil du temps ?"
        unite="drift en pourcentage — seuil de rééquilibrage à 10%"
        etat={
          !history.ok
            ? {
                type: 'indisponible',
                explication: "L'historique de rééquilibrage n'a pas pu être lu.",
              }
            : historyPoints === null || historyPoints.length === 0
              ? {
                  type: 'vide',
                  explication:
                    "Aucun point d'historique de drift n'est encore conservé — la série apparaîtra au premier snapshot.",
                }
              : { type: 'tracee' }
        }
        expectedSource={['GET /api/v1/rebalancing/history']}
      >
        {historyPoints !== null && historyPoints.length > 0 ? (
          <RebalancingHistoryChart
            points={historyPoints.map((p) => ({
              date: p.date,
              driftBps: p.driftBps,
              rebalanced: p.rebalanced,
            }))}
          />
        ) : null}
      </ChartFrame>

      {/* ── TABLE : écart par poche ──────────────────────────────── */}
      <DataTableShell
        title="Pocket drift"
        description="Drift between target and observed share, pocket by pocket (dashboard source)."
        count={derives.length > 0 ? `${formatNumber(derives.length)} pocket(s)` : undefined}
        calme={
          derives.length > 0
            ? undefined
            : 'No pocket reports both its target and observed share — waiting on the source.'
        }
      >
        {derives.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Pocket</TableHeader>
                <TableHeader>Target %</TableHeader>
                <TableHeader>Observed %</TableHeader>
                <TableHeader>Drift pt</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {derives.map((d) => (
                <TableRow key={d.poche}>
                  <TableCell className="font-medium">{d.poche}</TableCell>
                  <TableCell>{partLisible(d.cible)}</TableCell>
                  <TableCell>{partLisible(d.constate)}</TableCell>
                  <TableCell>{formatNumber(d.ecart, { maximumFractionDigits: 2, signDisplay: 'always' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      {/* ── TABLE : journal des mouvements ───────────────────────── */}
      <DataTableShell
        title="Movement journal"
        description="series1-events source only — no synthetic events."
        calme={
          mouvements !== null && mouvements.length > 0
            ? undefined
            : reponse.ok
              ? 'No indexed movements yet.'
              : 'The movement journal could not be read.'
        }
      >
        {mouvements !== null && mouvements.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Event</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Investor</TableHeader>
                <TableHeader>When</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {mouvements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{phraseMouvement(m.eventName)}</div>
                    <div className="text-xs text-fg-tertiary">{libelleMouvement(m.eventName)}</div>
                  </TableCell>
                  <TableCell>{m.assetAmountAtomic ? montantUsdc(m.assetAmountAtomic) : '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{adresseCourte(m.investorAddress) ?? '—'}</TableCell>
                  <TableCell title={dateLisible(m.occurredAt)}>{ilYA(m.occurredAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      {/* ── TABLE : événements de rééquilibrage ──────────────────── */}
      <DataTableShell
        title="Rebalancing events"
        description="Source /api/v1/events/rebalancing — Rebalance, VaultSwapped, strategy changes."
        calme={
          rebalEvents !== null && rebalEvents.length > 0
            ? undefined
            : rebalancingEvents.ok
              ? 'No rebalancing events indexed yet.'
              : 'The rebalancing journal could not be read.'
        }
      >
        {rebalEvents !== null && rebalEvents.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Event</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Investor</TableHeader>
                <TableHeader>When</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rebalEvents.map((m) => (
                <TableRow key={`${m.txHash}-${m.logIndex}`}>
                  <TableCell>
                    <div className="font-medium">{phraseMouvement(m.name)}</div>
                    <div className="text-xs text-fg-tertiary">{libelleMouvement(m.name)}</div>
                  </TableCell>
                  <TableCell>{m.amount ? montantUsdc(m.amount) : '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{adresseCourte(m.actor) ?? '—'}</TableCell>
                  <TableCell title={dateLisible(m.timestamp)}>{ilYA(m.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      {/* ── SECTION : rééquilibrage (mesure + lecture on-chain) ──── */}
      <SectionCard
        title="Rebalancing"
        hint="Indexed measurement (dashboard) and direct contract read are intentionally separate."
        tone="plain"
      >
        <DescriptionList>
          <DescriptionTerm>Observed drift</DescriptionTerm>
          <DescriptionDetails>{ecartLisible(mesure?.driftBps)} pt</DescriptionDetails>
          <DescriptionTerm>Last rebalance</DescriptionTerm>
          <DescriptionDetails>{dateLisible(mesure?.lastRebalanceAt ?? null)}</DescriptionDetails>
          <DescriptionTerm>Elapsed time</DescriptionTerm>
          <DescriptionDetails>{ilYA(mesure?.lastRebalanceAt ?? null)}</DescriptionDetails>
          <DescriptionTerm>Pending request</DescriptionTerm>
          <DescriptionDetails>{pendingLabel}</DescriptionDetails>
          <DescriptionTerm>On-chain reading</DescriptionTerm>
          <DescriptionDetails>
            <Text className="mt-0!">{onChainReading(rebalancing)}</Text>
          </DescriptionDetails>
          <DescriptionTerm>Contract mode</DescriptionTerm>
          <DescriptionDetails>{contrat?.mode ?? '—'}</DescriptionDetails>
          <DescriptionTerm>Chain</DescriptionTerm>
          <DescriptionDetails>
            {contrat?.chainId === undefined || contrat.chainId === null ? '—' : String(contrat.chainId)}
          </DescriptionDetails>
          <DescriptionTerm>Contract queried</DescriptionTerm>
          <DescriptionDetails className="font-mono text-sm">{contrat?.contractAddress ?? '—'}</DescriptionDetails>
          <DescriptionTerm>Code at address</DescriptionTerm>
          <DescriptionDetails>{contrat?.codePresence ?? '—'}</DescriptionDetails>
        </DescriptionList>
      </SectionCard>

      {/* ── SECTION : indexer freshness ────────────────────── */}
      <SectionCard title="Indexer freshness" hint="Indexing scheduler (runtime)." tone="plain">
        <DescriptionList>
          <DescriptionTerm>Last sync</DescriptionTerm>
          <DescriptionDetails>
            {ilYA(planificateur?.lastSuccessAt ?? (runtime.ok ? (runtime.data.indexer?.lastSyncedAt ?? null) : null))}
          </DescriptionDetails>
          <DescriptionTerm>Last indexed block</DescriptionTerm>
          <DescriptionDetails>{planificateur?.lastIndexedBlock ?? '—'}</DescriptionDetails>
          <DescriptionTerm>Interval</DescriptionTerm>
          <DescriptionDetails>{cadenceLisible(planificateur?.intervalMs)}</DescriptionDetails>
          <DescriptionTerm>Consecutive errors</DescriptionTerm>
          <DescriptionDetails>
            {planificateur?.consecutiveErrors === undefined || planificateur.consecutiveErrors === null
              ? '—'
              : formatNumber(planificateur.consecutiveErrors)}
          </DescriptionDetails>
        </DescriptionList>
      </SectionCard>
    </div>
  )
}
