import 'server-only'

import { callBackend } from '@/lib/backend/client'
import {
  available,
  combine,
  isAvailable,
  mapAvailability,
  movementId,
  strategyId,
  unavailable,
  vaultId,
  type AdminRegistry,
  type Availability,
  type ClientException,
  type ClientId,
  type ClientRef,
  type ComplianceReview,
  type ComplianceReviewId,
  type Deployment,
  type DeploymentId,
  type Movement,
  type Provenance,
  type RebalancingRow,
  type SourceHealth,
  type Strategy,
  type Vault,
  type VaultId,
  type VaultStatus,
} from '@/lib/vaults/model'

/**
 * Reads the operating model out of the service, once, for a whole page.
 *
 * ── What the service actually serves ─────────────────────────────────────────
 * ONE vault, at `GET /api/v1/vault` — singular. Its strategies, its RWA
 * pockets, its indexed ledger. Admin directory routes (`/clients`,
 * `/deployments`, `/compliance`) are wired when the backend exposes them;
 * empty LIVE lists stay empty — never fabricated rows.
 *
 * That distinction is the whole design of this module. A missing registry is
 * reported as `NOT_EXPOSED` with the route that would answer it; a route that
 * exists and could not be read is reported with the service's own reason. In
 * neither case does a count become zero, and in neither case is a vault, a
 * client or a movement invented to fill a table.
 *
 * The day those routes appear, this loader is where they get wired — the
 * components above it already speak the model and will not move.
 */

/* ── Wire shapes, as the service actually returns them ────────────────────── */

type Resolu<T> = Readonly<{
  status?: string
  value: T | null
  reason?: string | null
  provenance?: string | null
  freshness?: { asOf?: string | null; ageSeconds?: number | null; stale?: boolean } | null
}>

type RuntimeBloc = Readonly<{
  mode?: string | null
  chainId?: number | null
  contractAddress?: string | null
  codePresent?: boolean | null
  codePresence?: string | null
}>

type VaultReponse = Readonly<{
  runtime?: RuntimeBloc
  snapshot?: Resolu<{
    asset?: string | null
    assetDecimals?: number | null
    totalAssets?: string | null
    totalShares?: string | null
    navPerShare?: string | null
  }>
  capacity?: Resolu<{
    tvlCap?: string | null
    totalAssets?: string | null
    availableCapacity?: string | null
    utilizationBps?: number | null
  }>
}>

type PocheWire = Readonly<{
  pocket?: string | null
  label?: string | null
  targetBps?: number | null
  actualBps?: number | null
  driftBps?: number | null
  isIdle?: boolean | null
  enabled?: boolean | null
  adapter?: string | null
  pocketAssets?: string | null
}>

type StrategiesReponse = Readonly<{ runtime?: RuntimeBloc; strategies?: Resolu<readonly PocheWire[]> }>
type RwaReponse = Readonly<{ runtime?: RuntimeBloc; pockets?: Resolu<readonly PocheWire[]> }>
type RebalancingReponse = Readonly<{
  runtime?: RuntimeBloc
  rebalancing?: Resolu<{ lastRebalanceAt?: string | null; driftBps?: number | null }>
}>

type MouvementWire = Readonly<{
  id?: string | null
  eventName?: string | null
  chainId?: number | null
  contractAddress?: string | null
  blockNumber?: string | null
  txHash?: string | null
  investorAddress?: string | null
  assetAmountAtomic?: string | null
  shareAmountAtomic?: string | null
  occurredAt?: string | null
  indexedAt?: string | null
}>

type EvenementsReponse = Readonly<{ events?: Resolu<readonly MouvementWire[]> }>

type ClientWire = Readonly<{ id?: string | null; label?: string | null }>
type ClientsReponse = Readonly<{ clients?: Resolu<readonly ClientWire[]> }>

type DeploymentWire = Readonly<{
  id?: string | null
  vaultId?: string | null
  clientId?: string | null
  clientLabel?: string | null
  amountAtomic?: string | null
  strategyId?: string | null
  requestedAt?: string | null
  confirmedAt?: string | null
  status?: string | null
  reference?: string | null
}>
type DeploymentsReponse = Readonly<{ deployments?: Resolu<readonly DeploymentWire[]> }>

type ComplianceWire = Readonly<{
  id?: string | null
  clientId?: string | null
  clientLabel?: string | null
  kycStatus?: string | null
  stage?: string | null
  openedAt?: string | null
  lastEventAt?: string | null
}>
type ComplianceReponse = Readonly<{ reviews?: Resolu<readonly ComplianceWire[]> }>

type DashboardReponse = Readonly<{
  identity?: Resolu<unknown>
  allocation?: Resolu<{ pockets?: readonly PocheWire[] }>
}>

/* ── Resolved → Availability ──────────────────────────────────────────────── */

function provenanceDe(raw: string | null | undefined): Provenance {
  switch (raw) {
    case 'live':
    case 'db':
    case 'indexed':
    case 'manual':
    case 'chain':
      return raw
    default:
      return 'unknown'
  }
}

/**
 * Turns one of the service's `Resolved` blocks into an `Availability`.
 *
 * A block whose `status` is LIVE but whose `value` is null is NOT available:
 * the status describes the read, the value is the reading, and only the
 * second one can be rendered.
 */
function fromResolu<T>(bloc: Resolu<T> | undefined, endpoint: string): Availability<T> {
  if (bloc === undefined) {
    return unavailable({ endpoint, status: 'UNAVAILABLE', reason: 'field_absent_from_response' })
  }
  if (bloc.value === null || bloc.value === undefined) {
    return unavailable({
      endpoint,
      reason: bloc.reason ?? null,
      status: (bloc.status as never) ?? 'UNAVAILABLE',
    })
  }
  return available(bloc.value, {
    provenance: provenanceDe(bloc.provenance),
    asOf: bloc.freshness?.asOf ?? null,
    stale: bloc.freshness?.stale === true,
  })
}

/** Narrows an availability to a single field of its value. */
function field<T, K extends keyof T>(a: Availability<T>, key: K): Availability<NonNullable<T[K]>> {
  if (!isAvailable(a)) return a
  const raw = a.value[key]
  if (raw === null || raw === undefined) {
    return unavailable({ status: 'EMPTY', reason: `${String(key)}_not_reported` })
  }
  return { ...a, value: raw as NonNullable<T[K]> }
}

/* ── Pocket assets: only when the reading agrees with itself ──────────────── */

/**
 * `rwa-vault` publishes a `pocketAssets` for every pocket. On this deployment
 * two of the three contradict their own `actualBps` by three orders of
 * magnitude — S1 reports 460296995 atomic ($460) where its 2820 bps of a
 * $1,177,864 vault imply ~$332,000.
 *
 * A number that disagrees with itself is not a measurement. So the value is
 * carried through only when it lands within a generous tolerance of the share
 * the same service reports for the same pocket; otherwise the field is
 * unavailable and names why. Nothing is averaged, corrected or preferred.
 */
const POCKET_ASSETS_TOLERANCE = 0.05

function pocketAssetsAccordants(
  pocketAssets: string | null | undefined,
  actualBps: number | null | undefined,
  totalAssets: string | null,
): Availability<string> {
  if (pocketAssets === null || pocketAssets === undefined || pocketAssets === '') {
    return unavailable({ status: 'EMPTY', reason: 'pocket_assets_not_reported' })
  }
  if (totalAssets === null || actualBps === null || actualBps === undefined) {
    return unavailable({ status: 'PARTIAL', reason: 'no_share_to_cross_check_against' })
  }

  const declared = Number(pocketAssets)
  const implied = (Number(totalAssets) * actualBps) / 10_000
  if (!Number.isFinite(declared) || !Number.isFinite(implied) || implied <= 0) {
    return unavailable({ status: 'PARTIAL', reason: 'pocket_assets_not_comparable' })
  }

  const ecart = Math.abs(declared - implied) / implied
  if (ecart > POCKET_ASSETS_TOLERANCE) {
    return unavailable({
      status: 'PARTIAL',
      reason: 'pocket_assets_contradicts_reported_share',
    })
  }
  return available(pocketAssets, { provenance: 'chain' })
}

/* ── Strategies ───────────────────────────────────────────────────────────── */

function readPocketKey(poche: PocheWire): string | null {
  const pocket = poche.pocket
  if (typeof pocket !== 'string' || pocket === '') return null
  return pocket
}

function readTargetBps(poche: PocheWire): number | null {
  const target = poche.targetBps
  if (typeof target !== 'number' || !Number.isFinite(target)) return null
  return target
}

function readActualBps(poche: PocheWire): number | null {
  const actual = poche.actualBps
  if (typeof actual !== 'number' || !Number.isFinite(actual)) return null
  return actual
}

function readDriftBps(poche: PocheWire): number | null {
  const drift = poche.driftBps
  if (typeof drift !== 'number' || !Number.isFinite(drift)) return null
  return drift
}

function buildStrategy(vault: VaultId, poche: PocheWire, rwa: PocheWire | undefined, totalAssets: string | null): Strategy | null {
  const pocket = readPocketKey(poche)
  if (pocket === null) return null

  const target = readTargetBps(poche)
  if (target === null) return null

  const actual = readActualBps(poche)
  const drift = readDriftBps(poche)
  const label = typeof poche.label === 'string' && poche.label !== '' ? poche.label : pocket
  const adapter = typeof poche.adapter === 'string' && poche.adapter !== '' ? poche.adapter : null

  return {
    id: strategyId(vault, pocket),
    vaultId: vault,
    pocket,
    label,
    targetBps: target,
    actualBps: actual,
    driftBps: drift,
    enabled: poche.enabled !== false,
    isIdle: poche.isIdle === true,
    adapter,
    assetsAtomic: pocketAssetsAccordants(rwa?.pocketAssets, poche.actualBps, totalAssets),
  }
}

function construireStrategies(
  vault: VaultId,
  poches: readonly PocheWire[],
  rwaParPoche: Map<string, PocheWire>,
  totalAssets: string | null,
): readonly Strategy[] {
  const sorties: Strategy[] = []
  for (const poche of poches) {
    const strategy = buildStrategy(vault, poche, rwaParPoche.get(poche.pocket ?? ''), totalAssets)
    if (strategy === null) continue
    sorties.push(strategy)
  }
  return sorties
}

/**
 * The share of the vault actually placed in a pocket, summed.
 *
 * Only pockets whose actual share is READABLE contribute. A pocket the
 * service could not read is excluded rather than counted as zero — otherwise
 * an unreadable pocket would silently inflate the idle capital.
 */
function partDeployeeBps(strategies: readonly Strategy[]): Availability<number> {
  const lisibles = strategies.filter((s) => s.actualBps !== null)
  if (lisibles.length === 0 || lisibles.length !== strategies.length) {
    return unavailable({
      endpoint: '/api/v1/vault',
      status: 'PARTIAL',
      reason: lisibles.length === 0 ? 'no_pocket_share_readable' : 'some_pocket_shares_unreadable',
    })
  }
  return available(
    lisibles.reduce((total, s) => total + (s.actualBps as number), 0),
    { provenance: 'chain' },
  )
}

/** The largest absolute drift across pockets — the figure that triggers action. */
function pireDeriveBps(strategies: readonly Strategy[]): Availability<number> {
  let pire: number | null = null
  for (const s of strategies) {
    const derive = s.driftBps ?? (s.actualBps === null ? null : s.actualBps - s.targetBps)
    if (derive === null || !Number.isFinite(derive)) continue
    if (pire === null || Math.abs(derive) > Math.abs(pire)) pire = derive
  }
  if (pire === null) return unavailable({ status: 'PARTIAL', reason: 'no_readable_pocket_drift' })
  return available(pire, { provenance: 'chain' })
}

function statutVault(runtime: RuntimeBloc | undefined, snapshotLu: boolean): VaultStatus {
  if (!snapshotLu) return 'UNREADABLE'
  if (runtime?.codePresent === false || runtime?.codePresence === 'absent') return 'NO_CODE'
  return 'ACTIVE'
}

/* ── Movements ────────────────────────────────────────────────────────────── */

function buildMovement(mouvement: MouvementWire, vaultParContrat: Map<string, VaultId>): Movement | null {
  const id = mouvement.id
  const nom = mouvement.eventName
  if (typeof id !== 'string' || id === '' || typeof nom !== 'string' || nom === '') return null

  const contrat = typeof mouvement.contractAddress === 'string' ? mouvement.contractAddress.toLowerCase() : null
  return {
    id: movementId(id),
    vaultId: contrat === null ? null : (vaultParContrat.get(contrat) ?? null),
    eventName: nom,
    blockNumber: mouvement.blockNumber ?? null,
    txHash: mouvement.txHash ?? null,
    chainId: typeof mouvement.chainId === 'number' ? mouvement.chainId : null,
    investorAddress: mouvement.investorAddress ?? null,
    assetAmountAtomic: mouvement.assetAmountAtomic ?? null,
    shareAmountAtomic: mouvement.shareAmountAtomic ?? null,
    occurredAt: mouvement.occurredAt ?? null,
    indexedAt: mouvement.indexedAt ?? null,
    // The ledger carries no pocket on any event type it currently emits.
    // Guessing one from the event name would be a fabricated relationship.
    strategyId: unavailable({ status: 'NOT_EXPOSED', reason: 'ledger_carries_no_pocket' }),
  }
}

function construireMouvements(
  bruts: readonly MouvementWire[],
  vaultParContrat: Map<string, VaultId>,
): readonly Movement[] {
  const sorties: Movement[] = []
  for (const m of bruts) {
    const movement = buildMovement(m, vaultParContrat)
    if (movement === null) continue
    sorties.push(movement)
  }
  return sorties
}

/* ── Rebalancing queue ────────────────────────────────────────────────────── */

function fileRebalancing(vaults: readonly Vault[]): Availability<readonly RebalancingRow[]> {
  const lignes: RebalancingRow[] = []
  let auMoinsUneLecture = false

  for (const v of vaults) {
    if (!isAvailable(v.strategies)) continue
    auMoinsUneLecture = true
    for (const s of v.strategies.value) {
      const variance = s.driftBps ?? (s.actualBps === null ? null : s.actualBps - s.targetBps)
      lignes.push({
        vaultId: v.id,
        vaultLabel: v.label,
        strategyId: s.id,
        strategyLabel: s.label,
        targetBps: s.targetBps,
        actualBps: s.actualBps,
        varianceBps: variance,
        lastRebalanceAt: mapAvailability(v.rebalancing, (r) => r.lastRebalanceAt ?? ''),
      })
    }
  }

  if (!auMoinsUneLecture) {
    return unavailable({ endpoint: '/api/v1/vault/strategies', reason: 'no_vault_allocation_readable' })
  }
  return available(lignes, { provenance: 'chain' })
}

/* ── Client exceptions ────────────────────────────────────────────────────── */

/**
 * The only client-side exception this service can actually attest today.
 *
 * `GET /api/v1/dashboard` returns `identity` as PARTIAL with the reason
 * `no_investor_record`: the signed-in account is not attached to an investor
 * record. That is the service's own statement about a real account, so it is
 * a real work item. The client directory itself is exposed at `/clients`.
 */
function exceptionsClients(
  identity: Availability<unknown>,
  identityReason: string | null,
  compteLabel: string,
): Availability<readonly ClientException[]> {
  if (isAvailable(identity)) {
    // Investor record present: no synthetic client exception.
    return available([], { provenance: 'db' })
  }

  if (identityReason !== 'no_investor_record') {
    // Directory exists via /clients; this path only surfaces the known
    // identity gap, not a missing endpoint.
    return available([], { provenance: 'db' })
  }

  return available(
    [
      {
        clientId: null,
        clientLabel: compteLabel,
        issue: 'MISSING_INVESTOR_RECORD',
        relatedVaultId: null,
        compliance: unavailable({
          endpoint: '/api/v1/compliance',
          status: 'EMPTY',
          reason: 'compliance_not_linked_to_session',
        }),
        lastActivityAt: unavailable({ status: 'EMPTY', reason: 'no_investor_record' }),
        actionHref: '/admin/profile',
        actionLabel: 'Open account',
      },
    ],
    { provenance: 'db' },
  )
}

/* ── Source health ────────────────────────────────────────────────────────── */

function sourceHealth(
  endpointId: string,
  label: string,
  ok: boolean,
  detail: string | null,
  asOf: string | null,
): SourceHealth {
  return { endpointId, label, status: ok ? 'LIVE' : 'UNAVAILABLE', detail, asOf }
}

/* ── Vault assembly ───────────────────────────────────────────────────────── */

function readVaultId(vaultData: VaultReponse | null): VaultId | null {
  if (vaultData === null) return null
  const runtime = vaultData.runtime
  return vaultId(runtime?.chainId, runtime?.contractAddress)
}

function buildRwaMap(rwaBloc: Availability<readonly PocheWire[]>): Map<string, PocheWire> {
  const rwaParPoche = new Map<string, PocheWire>()
  if (!isAvailable(rwaBloc)) return rwaParPoche
  for (const p of rwaBloc.value) {
    if (typeof p.pocket === 'string') rwaParPoche.set(p.pocket, p)
  }
  return rwaParPoche
}

function buildVaultStrategies(
  vaultId: VaultId,
  strategiesBloc: Availability<readonly PocheWire[]>,
  rwaBloc: Availability<readonly PocheWire[]>,
  totalAssets: string | null,
): Availability<readonly Strategy[]> {
  return mapAvailability(strategiesBloc, (poches) => construireStrategies(vaultId, poches, buildRwaMap(rwaBloc), totalAssets))
}

function buildVaultRecord(
  vaultId: VaultId,
  vaultData: VaultReponse,
  snapshot: Availability<{
    asset?: string | null
    assetDecimals?: number | null
    totalAssets?: string | null
    totalShares?: string | null
    navPerShare?: string | null
  }>,
  capacity: Availability<{
    tvlCap?: string | null
    totalAssets?: string | null
    availableCapacity?: string | null
    utilizationBps?: number | null
  }>,
  strategies: Availability<readonly Strategy[]>,
  rebalancingBloc: Availability<{ lastRebalanceAt?: string | null; driftBps?: number | null }>,
): Vault {
  const runtime = vaultData.runtime
  const contractAddress = runtime?.contractAddress as string
  const listeStrategies = isAvailable(strategies) ? strategies.value : []
  const derniereActivite = isAvailable(snapshot) ? snapshot.asOf : null

  return {
    id: vaultId,
    // The contract publishes no name. Deriving one from the chain and the
    // address is a description of the object, not an invented label.
    label: `Série 1 · ${contractAddress.slice(0, 6)}…${contractAddress.slice(-4)}`,
    chainId: typeof runtime?.chainId === 'number' ? runtime.chainId : null,
    contractAddress,
    status: statutVault(runtime, isAvailable(snapshot)),
    asset: combine(field(snapshot, 'asset'), field(snapshot, 'assetDecimals'), (symbol, decimals) => ({
      symbol,
      decimals,
    })),
    totalAssetsAtomic: field(snapshot, 'totalAssets'),
    tvlCapAtomic: field(capacity, 'tvlCap'),
    capacityRemainingAtomic: field(capacity, 'availableCapacity'),
    utilizationBps: field(capacity, 'utilizationBps'),
    navPerShare: field(snapshot, 'navPerShare'),
    strategies,
    deployedBps: isAvailable(strategies) ? partDeployeeBps(listeStrategies) : strategies,
    worstDriftBps: isAvailable(strategies) ? pireDeriveBps(listeStrategies) : strategies,
    rebalancing: mapAvailability(rebalancingBloc, (r) => ({
      lastRebalanceAt: r.lastRebalanceAt ?? null,
      driftBps: typeof r.driftBps === 'number' ? r.driftBps : null,
    })),
    // /clients enumerates investors; it does not attach an owner to this vault.
    client: unavailable({
      endpoint: '/api/v1/clients',
      status: 'EMPTY',
      reason: 'vault_owner_not_reported',
    }),
    lastActivityAt: isAvailable(snapshot) && snapshot.asOf !== null
      ? available(snapshot.asOf, {
          provenance: snapshot.provenance,
          stale: snapshot.stale,
          asOf: snapshot.asOf,
        })
      : unavailable({ status: 'EMPTY', reason: 'no_snapshot_timestamp' }),
  }
}

/* ── Loader ───────────────────────────────────────────────────────────────── */

type BackendResponses = Readonly<{
  vaultRes: Awaited<ReturnType<typeof callBackend<VaultReponse>>>
  strategiesRes: Awaited<ReturnType<typeof callBackend<StrategiesReponse>>>
  rwaRes: Awaited<ReturnType<typeof callBackend<RwaReponse>>>
  rebalRes: Awaited<ReturnType<typeof callBackend<RebalancingReponse>>>
  eventsRes: Awaited<ReturnType<typeof callBackend<EvenementsReponse>>>
  dashboardRes: Awaited<ReturnType<typeof callBackend<DashboardReponse>>>
  clientsRes: Awaited<ReturnType<typeof callBackend<ClientsReponse>>>
  deploymentsRes: Awaited<ReturnType<typeof callBackend<DeploymentsReponse>>>
  complianceRes: Awaited<ReturnType<typeof callBackend<ComplianceReponse>>>
}>

async function fetchRegistryResponses(
  movementLimit: number,
): Promise<BackendResponses> {
  const [
    vaultRes,
    strategiesRes,
    rwaRes,
    rebalRes,
    eventsRes,
    dashboardRes,
    clientsRes,
    deploymentsRes,
    complianceRes,
  ] = await Promise.all([
    callBackend<VaultReponse>('vault'),
    callBackend<StrategiesReponse>('vault-strategies'),
    callBackend<RwaReponse>('rwa-vault'),
    callBackend<RebalancingReponse>('rebalancing-status'),
    callBackend<EvenementsReponse>('series1-events', { params: { limit: movementLimit } }),
    callBackend<DashboardReponse>('dashboard'),
    callBackend<ClientsReponse>('clients'),
    callBackend<DeploymentsReponse>('deployments'),
    callBackend<ComplianceReponse>('compliance'),
  ])
  return { vaultRes, strategiesRes, rwaRes, rebalRes, eventsRes, dashboardRes, clientsRes, deploymentsRes, complianceRes }
}

function buildClients(
  clientsRes: BackendResponses['clientsRes'],
  sources: SourceHealth[],
): Availability<readonly ClientRef[]> {
  const bloc = fromResolu(clientsRes.ok ? clientsRes.data.clients : undefined, '/api/v1/clients')
  sources.push(
    sourceHealth(
      'clients',
      'Client directory',
      clientsRes.ok && isAvailable(bloc),
      clientsRes.ok ? (clientsRes.data.clients?.reason ?? null) : 'No response',
      isAvailable(bloc) ? bloc.asOf : null,
    ),
  )
  if (!clientsRes.ok) {
    const httpStatus = clientsRes.trace.httpStatus
    return unavailable({
      endpoint: '/api/v1/clients',
      status: httpStatus === 404 ? 'NOT_EXPOSED' : 'UNAVAILABLE',
      reason: httpStatus === 404 ? 'no_client_directory_endpoint' : 'service_did_not_respond',
    })
  }
  return mapAvailability(bloc, (rows) =>
    rows.flatMap((row) => {
      if (typeof row.id !== 'string' || row.id === '' || typeof row.label !== 'string' || row.label === '') return []
      return [{ id: row.id as ClientId, label: row.label }]
    }),
  )
}

function buildDeployments(
  deploymentsRes: BackendResponses['deploymentsRes'],
  defaultVaultId: VaultId | null,
  sources: SourceHealth[],
): Availability<readonly Deployment[]> {
  const bloc = fromResolu(deploymentsRes.ok ? deploymentsRes.data.deployments : undefined, '/api/v1/deployments')
  sources.push(
    sourceHealth(
      'deployments',
      'Deployments',
      deploymentsRes.ok && isAvailable(bloc),
      deploymentsRes.ok ? (deploymentsRes.data.deployments?.reason ?? null) : 'No response',
      isAvailable(bloc) ? bloc.asOf : null,
    ),
  )
  if (!deploymentsRes.ok) {
    const httpStatus = deploymentsRes.trace.httpStatus
    return unavailable({
      endpoint: '/api/v1/deployments',
      status: httpStatus === 404 ? 'NOT_EXPOSED' : 'UNAVAILABLE',
      reason: httpStatus === 404 ? 'no_deployment_ledger_endpoint' : 'service_did_not_respond',
    })
  }
  return mapAvailability(bloc, (rows) =>
    rows.flatMap((row) => {
      const resolvedVaultId = (row.vaultId ?? defaultVaultId) as VaultId | null
      if (typeof row.id !== 'string' || row.id === '' || resolvedVaultId === null) return []
      const status = row.status
      const normalizedStatus =
        status === 'REQUESTED' || status === 'CONFIRMED' || status === 'FAILED' || status === 'PENDING'
          ? status
          : 'PENDING'
      return [
        {
          id: row.id as DeploymentId,
          vaultId: resolvedVaultId,
          clientLabel:
            typeof row.clientLabel === 'string' && row.clientLabel !== ''
              ? available(row.clientLabel, { provenance: 'db' })
              : unavailable({ status: 'EMPTY', reason: 'client_label_not_reported' }),
          amountAtomic: row.amountAtomic ?? null,
          strategyId: typeof row.strategyId === 'string' ? (row.strategyId as never) : null,
          requestedAt: row.requestedAt ?? null,
          confirmedAt: row.confirmedAt ?? null,
          status: normalizedStatus,
          reference: row.reference ?? null,
        },
      ]
    }),
  )
}

function buildCompliance(
  complianceRes: BackendResponses['complianceRes'],
  sources: SourceHealth[],
): Availability<readonly ComplianceReview[]> {
  const bloc = fromResolu(complianceRes.ok ? complianceRes.data.reviews : undefined, '/api/v1/compliance')
  sources.push(
    sourceHealth(
      'compliance',
      'Compliance',
      complianceRes.ok && isAvailable(bloc),
      complianceRes.ok ? (complianceRes.data.reviews?.reason ?? null) : 'No response',
      isAvailable(bloc) ? bloc.asOf : null,
    ),
  )
  if (!complianceRes.ok) {
    const httpStatus = complianceRes.trace.httpStatus
    return unavailable({
      endpoint: '/api/v1/compliance',
      status: httpStatus === 404 ? 'NOT_EXPOSED' : 'UNAVAILABLE',
      reason: httpStatus === 404 ? 'no_compliance_review_endpoint' : 'service_did_not_respond',
    })
  }
  return mapAvailability(bloc, (rows) =>
    rows.flatMap((row) => {
      if (typeof row.id !== 'string' || row.id === '' || typeof row.clientId !== 'string' || row.clientId === '') {
        return []
      }
      return [
        {
          id: row.id as ComplianceReviewId,
          clientId: row.clientId as ClientId,
          clientLabel: typeof row.clientLabel === 'string' ? row.clientLabel : row.clientId,
          // A missing stage/KYC status stays empty (rendered as "—" / neutral badge) —
          // never fabricated as 'a-verifier'/'pending', which would read as a real Som verdict.
          stage: typeof row.stage === 'string' ? row.stage : '',
          kycStatus: typeof row.kycStatus === 'string' ? row.kycStatus : '',
          openedAt: row.openedAt ?? null,
          lastEventAt: row.lastEventAt ?? null,
        },
      ]
    }),
  )
}

function buildVaults(
  responses: BackendResponses,
  sources: SourceHealth[],
): { vaults: Availability<readonly Vault[]>; vaultParContrat: Map<string, VaultId> } {
  const { vaultRes, strategiesRes, rwaRes, rebalRes } = responses
  const vaultData = vaultRes.ok ? vaultRes.data : null
  const runtime = vaultData?.runtime
  const id = readVaultId(vaultData)

  const snapshot = fromResolu(vaultData?.snapshot, '/api/v1/vault')
  const capacity = fromResolu(vaultData?.capacity, '/api/v1/vault')
  sources.push(
    sourceHealth(
      'vault',
      'Vault',
      vaultRes.ok && isAvailable(snapshot),
      vaultRes.ok ? null : 'No response',
      isAvailable(snapshot) ? snapshot.asOf : null,
    ),
  )

  const vaultParContrat = new Map<string, VaultId>()
  if (id === null) {
    return {
      vaults: unavailable({
        endpoint: '/api/v1/vault',
        reason: vaultRes.ok ? 'no_contract_address_reported' : 'service_did_not_respond',
      }),
      vaultParContrat,
    }
  }

  const contractAddress = (runtime?.contractAddress as string).toLowerCase()
  vaultParContrat.set(contractAddress, id)
  const totalAssets = isAvailable(snapshot) ? (snapshot.value.totalAssets ?? null) : null

  const strategiesBloc = fromResolu(strategiesRes.ok ? strategiesRes.data.strategies : undefined, '/api/v1/vault/strategies')
  sources.push(
    sourceHealth(
      'vault-strategies',
      'Strategies',
      isAvailable(strategiesBloc),
      null,
      isAvailable(strategiesBloc) ? strategiesBloc.asOf : null,
    ),
  )

  const rwaBloc = fromResolu(rwaRes.ok ? rwaRes.data.pockets : undefined, '/api/v1/rwa-vault')
  sources.push(
    sourceHealth('rwa-vault', 'Poches RWA', isAvailable(rwaBloc), null, isAvailable(rwaBloc) ? rwaBloc.asOf : null),
  )

  const rebalancingBloc = fromResolu(
    rebalRes.ok ? rebalRes.data.rebalancing : undefined,
    '/api/v1/rebalancing/status',
  )
  sources.push(
    sourceHealth(
      'rebalancing-status',
      'Rebalancing',
      isAvailable(rebalancingBloc),
      rebalRes.ok ? (rebalRes.data.rebalancing?.reason ?? null) : 'No response',
      null,
    ),
  )

  const strategies = buildVaultStrategies(id, strategiesBloc, rwaBloc, totalAssets)
  const vault = buildVaultRecord(id, vaultData as VaultReponse, snapshot, capacity, strategies, rebalancingBloc)
  const vaults = available([vault], { provenance: 'chain', asOf: vault.lastActivityAt.kind === 'available' ? vault.lastActivityAt.value : null })

  return { vaults, vaultParContrat }
}

function buildMovements(
  eventsRes: BackendResponses['eventsRes'],
  vaultParContrat: Map<string, VaultId>,
  sources: SourceHealth[],
): Availability<readonly Movement[]> {
  const eventsBloc = fromResolu(eventsRes.ok ? eventsRes.data.events : undefined, '/api/v1/series1/events')
  sources.push(
    sourceHealth('series1-events', 'Journal', isAvailable(eventsBloc), null, isAvailable(eventsBloc) ? eventsBloc.asOf : null),
  )
  return mapAvailability(eventsBloc, (bruts) => construireMouvements(bruts, vaultParContrat))
}

function buildClientExceptions(
  dashboardRes: BackendResponses['dashboardRes'],
  compteLabel: string,
  sources: SourceHealth[],
): Availability<readonly ClientException[]> {
  const identityBloc = fromResolu(dashboardRes.ok ? dashboardRes.data.identity : undefined, '/api/v1/dashboard')
  const identityReason = dashboardRes.ok ? (dashboardRes.data.identity?.reason ?? null) : null
  sources.push(
    sourceHealth('dashboard', 'Dossier investisseur', isAvailable(identityBloc), identityReason, null),
  )
  return exceptionsClients(identityBloc, identityReason, compteLabel)
}

export async function loadAdminRegistry(
  compteLabel: string,
  opts: { movementLimit?: number } = {},
): Promise<AdminRegistry> {
  const responses = await fetchRegistryResponses(opts.movementLimit ?? 25)
  const sources: SourceHealth[] = []

  const { vaults, vaultParContrat } = buildVaults(responses, sources)
  const movements = buildMovements(responses.eventsRes, vaultParContrat, sources)
  const clientExceptions = buildClientExceptions(responses.dashboardRes, compteLabel, sources)
  const listeVaults = isAvailable(vaults) ? vaults.value : []
  const defaultVaultId = listeVaults.length > 0 ? listeVaults[0].id : null
  const clients = buildClients(responses.clientsRes, sources)
  const deployments = buildDeployments(responses.deploymentsRes, defaultVaultId, sources)
  const compliance = buildCompliance(responses.complianceRes, sources)

  return {
    vaults,
    clients,
    clientExceptions,
    deployments,
    compliance,
    movements,
    rebalancing: fileRebalancing(listeVaults),
    sources,
  }
}

/** Reads one vault by its route identifier. `null` when the id matches nothing. */
export async function loadVault(
  id: VaultId,
  compteLabel: string,
): Promise<{ registry: AdminRegistry; vault: Vault | null }> {
  const registry = await loadAdminRegistry(compteLabel, { movementLimit: 50 })
  const liste = isAvailable(registry.vaults) ? registry.vaults.value : []
  return { registry, vault: liste.find((v) => v.id === id) ?? null }
}

/*
 * Retiré le 2026-08-04 (LOT B3) : `export type { ClientRef, Deployment } from
 * '@/lib/vaults/model'`. Ce ré-export n'avait aucun consommateur — les modules
 * qui ont besoin de ces types les importent directement depuis `model.ts`
 * directement depuis `@/lib/vaults/model`. Deux chemins d'import
 * pour un même type ne servent qu'à faire diverger les conventions.
 */
