import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { requireSession } from '@/lib/auth'
import { callBackend, type BackendResult } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { type RuntimePayload } from '@/lib/backend/runtime'
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
import { statutAffichage } from '@/lib/statut-affichage'
import { available, editorial, mapAvailability, measuredCount, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Opérations' }
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
  if (intervalMs < 60_000) return `toutes les ${Math.round(intervalMs / 1000)} s`
  return `toutes les ${Math.round(intervalMs / 60_000)} min`
}

function onChainReading(rebalancing: BackendResult<RebalancingStatus>): string {
  if (!rebalancing.ok) return 'Le service n’a pas répondu pour la lecture directe du contrat.'
  const bloc = rebalancing.data.rebalancing
  if (bloc === undefined) return 'Champ rebalancing absent de la réponse.'
  if (bloc.status === 'LIVE' && bloc.value !== null && bloc.value !== undefined) {
    return `LIVE — lecture on-chain reçue (${JSON.stringify(bloc.value)})`
  }
  const motif = motifLisible(bloc.reason)
  if (motif !== undefined) return `${bloc.status} — ${motif}`
  if (bloc.status === 'UNAVAILABLE' || bloc.status === 'NOT_EXPOSED' || bloc.status === 'NOT_SUPPORTED') {
    return `${bloc.status} — aucune mesure on-chain utilisable.`
  }
  return `${bloc.status} — réponse reçue sans valeur exploitable.`
}

/**
 * Opérations — Catalyst pur.
 * Sources : series1-events, events-rebalancing, rebalancing-status, dashboard, runtime.
 */
export default async function Page() {
  await requireSession()
  const [reponse, rebalancingEvents, rebalancing, dashboard, runtime] = await Promise.all([
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 50 } }),
    callBackend<ReponseEvenements>('events-rebalancing', { params: { limit: 50 } }),
    callBackend<RebalancingStatus>('rebalancing-status'),
    callBackend<Dashboard>('dashboard'),
    callBackend<Runtime>('runtime'),
  ])

  const mouvements = reponse.ok ? (reponse.data.events?.value ?? null) : null
  const rebalEvents = rebalancingEvents.ok ? (rebalancingEvents.data.events?.value ?? null) : null
  const rebalEventsAvail = availabilityFromResolu<readonly MouvementIndexe[]>(
    rebalancingEvents.ok ? rebalancingEvents.data.events : undefined,
    '/api/v1/events/rebalancing',
  )
  const rebalEventCount = measuredCount(rebalEventsAvail)
  const derives = derivesDe(dashboard.ok ? dashboard.data.allocation?.value?.pockets : undefined)
  const mesure = dashboard.ok ? dashboard.data.rebalancing?.value : undefined
  const planificateur = runtime.ok ? runtime.data.indexerScheduler : undefined
  const contrat = rebalancing.ok ? rebalancing.data.runtime : undefined

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

  const rebalancingStatus = rebalancing.ok
    ? (rebalancing.data.rebalancing?.status ?? 'UNAVAILABLE')
    : 'UNAVAILABLE'
  const runtimeStatus = runtime.ok
    ? (runtime.data.indexerStatus ?? runtime.data.indexer?.status ?? 'NOT_REPORTED')
    : 'UNAVAILABLE'
  const journalStatus =
    reponse.ok && reponse.data.events
      ? editorial(statutAffichage(reponse.data.events.status))
      : unavailable({
          endpoint: '/api/v1/series1/events',
          status: 'UNAVAILABLE',
          reason: 'events_source_unreachable',
        })

  const pendingLabel = !dashboard.ok
    ? 'Dashboard illisible — pending non attesté'
    : dashboard.data.rebalancing?.status !== 'LIVE'
      ? 'Rééquilibrage dashboard non LIVE — pending non attesté'
      : mesure?.pending === null || mesure?.pending === undefined || mesure.pending === false
        ? 'Aucune signalée'
        : 'Une demande est ouverte'

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Opérations"
        description="Événements Series 1, événements de rééquilibrage indexés, écart d’allocation, et fraîcheur de l’indexeur."
      />

      <DescriptionList>
        <DescriptionTerm>Mouvements</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={movementCountCell} />
        </DescriptionDetails>
        <DescriptionTerm>Événements de rééquilibrage</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={rebalEventCount} />
        </DescriptionDetails>
        <DescriptionTerm>Poches mesurées</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={pocketsMeasuredCell} />
        </DescriptionDetails>
        <DescriptionTerm>Source de rééquilibrage</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(rebalancingStatus)} />
        </DescriptionDetails>
        <DescriptionTerm>Indexeur</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(runtimeStatus)} />
        </DescriptionDetails>
        <DescriptionTerm>État du journal</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={journalStatus} />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Rééquilibrage"
        description="Mesure indexée (dashboard) et lecture directe du contrat sont séparées à dessein."
      />
      <DescriptionList>
        <DescriptionTerm>Écart observé</DescriptionTerm>
        <DescriptionDetails>{ecartLisible(mesure?.driftBps)} pt</DescriptionDetails>
        <DescriptionTerm>Dernier rééquilibrage</DescriptionTerm>
        <DescriptionDetails>{dateLisible(mesure?.lastRebalanceAt ?? null)}</DescriptionDetails>
        <DescriptionTerm>Temps écoulé</DescriptionTerm>
        <DescriptionDetails>{ilYA(mesure?.lastRebalanceAt ?? null)}</DescriptionDetails>
        <DescriptionTerm>Demande en attente</DescriptionTerm>
        <DescriptionDetails>{pendingLabel}</DescriptionDetails>
        <DescriptionTerm>Lecture on-chain</DescriptionTerm>
        <DescriptionDetails>
          <Text className="!mt-0">{onChainReading(rebalancing)}</Text>
        </DescriptionDetails>
        <DescriptionTerm>Mode du contrat</DescriptionTerm>
        <DescriptionDetails>{contrat?.mode ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Chaîne</DescriptionTerm>
        <DescriptionDetails>{contrat?.chainId === undefined || contrat.chainId === null ? '—' : String(contrat.chainId)}</DescriptionDetails>
        <DescriptionTerm>Contrat interrogé</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">
          {contrat?.contractAddress ?? '—'}
        </DescriptionDetails>
        <DescriptionTerm>Code à l’adresse</DescriptionTerm>
        <DescriptionDetails>{contrat?.codePresence ?? '—'}</DescriptionDetails>
      </DescriptionList>

      {derives.length > 0 ? (
        <>
          <AdminSectionHeading title="Écart par poche" />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Poche</TableHeader>
                <TableHeader>Cible %</TableHeader>
                <TableHeader>Constaté %</TableHeader>
                <TableHeader>Écart pt</TableHeader>
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
          </Table>
        </>
      ) : (
        <Text>Aucune poche ne renseigne à la fois sa cible et sa part constatée — en attente de la source.</Text>
      )}

      <AdminSectionHeading title="Fraîcheur de l’indexeur" />
      <DescriptionList>
        <DescriptionTerm>Dernière synchronisation</DescriptionTerm>
        <DescriptionDetails>
          {ilYA(
            planificateur?.lastSuccessAt ??
              (runtime.ok ? (runtime.data.indexer?.lastSyncedAt ?? null) : null),
          )}
        </DescriptionDetails>
        <DescriptionTerm>Dernier bloc indexé</DescriptionTerm>
        <DescriptionDetails>{planificateur?.lastIndexedBlock ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Intervalle</DescriptionTerm>
        <DescriptionDetails>{cadenceLisible(planificateur?.intervalMs)}</DescriptionDetails>
        <DescriptionTerm>Erreurs consécutives</DescriptionTerm>
        <DescriptionDetails>
          {planificateur?.consecutiveErrors === undefined || planificateur.consecutiveErrors === null
            ? '—'
            : formatNumber(planificateur.consecutiveErrors)}
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Journal des mouvements"
        description="Source series1-events uniquement — aucun événement synthétique."
      />
      {mouvements !== null && mouvements.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Événement</TableHeader>
              <TableHeader>Montant</TableHeader>
              <TableHeader>Investisseur</TableHeader>
              <TableHeader>Quand</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {mouvements.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{phraseMouvement(m.eventName)}</div>
                  <div className="text-xs text-zinc-500">{libelleMouvement(m.eventName)}</div>
                </TableCell>
                <TableCell>
                  {m.assetAmountAtomic ? montantUsdc(m.assetAmountAtomic) : '—'}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {adresseCourte(m.investorAddress) ?? '—'}
                </TableCell>
                <TableCell title={dateLisible(m.occurredAt)}>{ilYA(m.occurredAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Text>
          {reponse.ok
            ? 'Aucun mouvement indexé pour l’instant.'
            : 'Le journal des mouvements n’a pas pu être lu.'}
        </Text>
      )}

      <AdminSectionHeading
        title="Événements de rééquilibrage"
        description="Source /api/v1/events/rebalancing — Rebalance, VaultSwapped, changements de stratégie."
      />
      {rebalEvents !== null && rebalEvents.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Événement</TableHeader>
              <TableHeader>Montant</TableHeader>
              <TableHeader>Investisseur</TableHeader>
              <TableHeader>Quand</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rebalEvents.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{phraseMouvement(m.eventName)}</div>
                  <div className="text-xs text-zinc-500">{libelleMouvement(m.eventName)}</div>
                </TableCell>
                <TableCell>
                  {m.assetAmountAtomic ? montantUsdc(m.assetAmountAtomic) : '—'}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {adresseCourte(m.investorAddress) ?? '—'}
                </TableCell>
                <TableCell title={dateLisible(m.occurredAt)}>{ilYA(m.occurredAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Text>
          {rebalancingEvents.ok
            ? 'Aucun événement de rééquilibrage indexé pour l’instant.'
            : 'Le journal de rééquilibrage n’a pas pu être lu.'}
        </Text>
      )}
    </div>
  )
}
