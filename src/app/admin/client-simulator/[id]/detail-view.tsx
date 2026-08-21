import { DashCard, DashboardShell, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { AdminToneBadge, toneForKycStatus } from '@/components/admin/status-tone'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Callout, DataTableShell, SourceAttendue, tableCol } from '@/components/compositions'
import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolved, type ResolvedBlock } from '@/lib/backend/availability'
import { formatAddress, formatCurrency, formatDateTime, formatHash } from '@/lib/format'
import { kycStatusLabel } from '@/lib/labels'
import { readableReason } from '@/lib/movements'
import {
  isAvailable,
  mapAvailability,
  measuredCount,
  unavailable,
  type Availability,
} from '@/lib/vaults/model'
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  RectangleStackIcon,
  TagIcon,
} from '@heroicons/react/16/solid'

const DETAIL_ENDPOINT = '/api/v1/admin/clients/:id'

type Identity = Readonly<{
  label: string
  walletAddress: string | null
  kycStatus: string
}>

type Position = Readonly<{
  id: string
  principalUsdc: string | null
  status: string
  subscribedAt: string
}>

type Movement = Readonly<{
  type: string
  amountUsdc: string
  occurredAt: string
  txHash: string | null
}>

type ClientDetailData = Readonly<{
  id?: string
  identity?: ResolvedBlock<Identity>
  positions?: ResolvedBlock<readonly Position[]>
  movements?: ResolvedBlock<readonly Movement[]>
  exposure?: ResolvedBlock<string>
}>

const LOCAL_REASON: Readonly<Record<string, string>> = {
  no_positions: 'no positions are on the book for this client',
  no_measurable_principal: 'no measurable principal is on the book',
  field_absent_from_response: 'this block was absent from the response',
  INVESTOR_NOT_FOUND: 'no investor record matches this identifier',
}

function formatWholeUsdc(value: string | null | undefined): string {
  return formatCurrency(value, { fromAtomic: 1, unit: '$' })
}

function absenceDetail(reading: Availability<unknown>): string {
  if (reading.kind !== 'unavailable') {
    return 'This block was not returned as a readable value.'
  }
  const code = reading.reason
  if (code === null || code === '') {
    return 'This block was not returned as a readable value.'
  }
  return readableReason(code) ?? LOCAL_REASON[code] ?? code
}

function namedSource(quoi: string, reading: Availability<unknown>) {
  return {
    quoi,
    detail: absenceDetail(reading),
    requis: [`GET ${DETAIL_ENDPOINT}`],
  }
}

function isNotFound(
  result: Awaited<ReturnType<typeof callBackend<ClientDetailData>>>,
): boolean {
  if (result.ok) return false
  return result.trace.httpStatus === 404 || result.problem?.code === 'INVESTOR_NOT_FOUND'
}

/**
 * Compact command bar — one title line (the client label), the directory link
 * on the same row, KPIs as a compact strip beside it.
 */
function ClientHeader({
  title,
  description,
  kpis,
}: Readonly<{ title: string; description: string; kpis: readonly AdminHeroKpi[] }>) {
  return (
    <header
      data-admin="hero-header"
      className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{title}</h1>
          <PanelHeaderLink href="/admin/clients">Client directory</PanelHeaderLink>
        </div>
        <p className="mt-0.5 text-xs text-fg-tertiary">{description}</p>
      </div>

      <dl className="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-x-8 gap-y-3">
        {kpis.map((kpi) => {
          const available = isAvailable(kpi.value)
          return (
            <div key={kpi.id} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-fg-secondary">
                <kpi.icon className="size-3.5 shrink-0 text-accent-300" aria-hidden="true" />
                <span className="truncate">{kpi.title}</span>
              </dt>
              <dd className="mt-0.5 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl/7 font-semibold tracking-tight tabular-nums ${available ? 'text-fg' : 'text-fg-tertiary'}`}
                >
                  {available ? kpi.value.value : '—'}
                </span>
                {kpi.unit !== undefined && kpi.unit !== '' ? (
                  <span className="truncate text-[11px] text-fg-tertiary">{kpi.unit}</span>
                ) : null}
              </dd>
            </div>
          )
        })}
      </dl>
    </header>
  )
}

/**
 * Admin client 360 — GET /api/v1/admin/clients/:id.
 * Each Resolved block is shown or named; a 404 does not invent a client.
 */
export async function ClientSimulatorDetailView({ id }: Readonly<{ id: string }>) {
  const result = await callBackend<ClientDetailData>('admin-client-detail', { params: { id } })

  if (isNotFound(result)) {
    const missing = unavailable({
      endpoint: DETAIL_ENDPOINT,
      status: 'UNAVAILABLE',
      reason: 'INVESTOR_NOT_FOUND',
    })
    const kpis: readonly AdminHeroKpi[] = [
      { id: 'identity', title: 'Identity', value: missing, icon: TagIcon },
      { id: 'exposure', title: 'Exposure', value: missing, icon: BanknotesIcon },
      { id: 'positions', title: 'Positions', value: missing, icon: RectangleStackIcon },
      { id: 'movements', title: 'Movements', value: missing, icon: ArrowsRightLeftIcon },
    ]
    return (
      <DashboardShell>
        <ClientHeader
          title={id}
          description="GET /api/v1/admin/clients/:id — named absence when the investor is not on the book."
          kpis={kpis}
        />
        <Callout tone="warning" title="Client not found">
          GET /api/v1/admin/clients/{id} returned 404 (INVESTOR_NOT_FOUND). No client record is shown.
        </Callout>
      </DashboardShell>
    )
  }

  if (!result.ok) {
    const failed = unavailable({
      endpoint: DETAIL_ENDPOINT,
      status: result.state.status,
      reason: result.state.reason,
    })
    const kpis: readonly AdminHeroKpi[] = [
      { id: 'identity', title: 'Identity', value: failed, icon: TagIcon },
      { id: 'exposure', title: 'Exposure', value: failed, icon: BanknotesIcon },
      { id: 'positions', title: 'Positions', value: failed, icon: RectangleStackIcon },
      { id: 'movements', title: 'Movements', value: failed, icon: ArrowsRightLeftIcon },
    ]
    return (
      <DashboardShell>
        <ClientHeader
          title={id}
          description="GET /api/v1/admin/clients/:id — named absence when the 360 cannot be read."
          kpis={kpis}
        />
        <Callout tone="warning" title="Client detail unavailable">
          {absenceDetail(failed)}
        </Callout>
      </DashboardShell>
    )
  }

  const identity = availabilityFromResolved(result.data.identity, DETAIL_ENDPOINT)
  const positions = availabilityFromResolved(result.data.positions, DETAIL_ENDPOINT)
  const movements = availabilityFromResolved(result.data.movements, DETAIL_ENDPOINT)
  const exposure = availabilityFromResolved(result.data.exposure, DETAIL_ENDPOINT)

  const title = isAvailable(identity) ? identity.value.label : id
  const exposureKpi = mapAvailability(exposure, (value) => formatWholeUsdc(value))

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'identity', title: 'Identity', value: mapAvailability(identity, (row) => row.label), icon: TagIcon },
    { id: 'exposure', title: 'Exposure', value: exposureKpi, icon: BanknotesIcon },
    { id: 'positions', title: 'Positions', value: measuredCount(positions), icon: RectangleStackIcon },
    { id: 'movements', title: 'Movements', value: measuredCount(movements), icon: ArrowsRightLeftIcon },
  ]

  return (
    <DashboardShell>
      <ClientHeader
        title={title}
        description="GET /api/v1/admin/clients/:id — identity, positions, movements, and exposure."
        kpis={kpis}
      />

      {/* Row A — who this is beside what it sums to; an absent block is named
          in the same slot (SourceAttendue is already a framed panel). */}
      <BentoGrid>
        <BentoCard span={6}>
          {isAvailable(identity) ? (
            <DashCard
              title="Identity"
              subtitle="Label, wallet, and partner KYC from the 360 read-model."
              titleLevel={2}
            >
              <DescriptionList>
                <DescriptionTerm>Label</DescriptionTerm>
                <DescriptionDetails>{identity.value.label}</DescriptionDetails>
                <DescriptionTerm>Wallet</DescriptionTerm>
                <DescriptionDetails className="font-mono text-sm">
                  {formatAddress(identity.value.walletAddress) ?? '—'}
                </DescriptionDetails>
                <DescriptionTerm>KYC</DescriptionTerm>
                <DescriptionDetails>
                  <AdminToneBadge tone={toneForKycStatus(identity.value.kycStatus)}>
                    {kycStatusLabel(identity.value.kycStatus)}
                  </AdminToneBadge>
                </DescriptionDetails>
              </DescriptionList>
            </DashCard>
          ) : (
            <SourceAttendue {...namedSource('Identity', identity)} />
          )}
        </BentoCard>
        <BentoCard span={6}>
          {isAvailable(exposure) ? (
            <DashCard
              title="Exposure"
              subtitle="Sum of on-book principal. Absent principal is never shown as zero."
              titleLevel={2}
            >
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-fg">
                {formatWholeUsdc(exposure.value)}
              </p>
            </DashCard>
          ) : (
            <SourceAttendue {...namedSource('Exposure', exposure)} />
          )}
        </BentoCard>
      </BentoGrid>

      <DataTableShell
        title="Positions"
        description="On-book positions for this investor. An absent block is named; an empty list is empty."
        count={
          isAvailable(positions) && positions.value.length > 0
            ? `${positions.value.length} position(s)`
            : undefined
        }
        source={!isAvailable(positions) ? namedSource('Positions', positions) : undefined}
        calme={
          isAvailable(positions) && positions.value.length === 0
            ? 'No positions on the book for this client.'
            : undefined
        }
      >
        {isAvailable(positions) && positions.value.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader className={tableCol.hash}>Identifier</TableHeader>
                <TableHeader className={tableCol.numeric}>Principal</TableHeader>
                <TableHeader className={tableCol.status}>Status</TableHeader>
                <TableHeader className={tableCol.date}>Subscribed</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.value.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className={`${tableCol.hash} text-sm`}>{row.id}</TableCell>
                  <TableCell className={tableCol.numeric}>{formatWholeUsdc(row.principalUsdc)}</TableCell>
                  <TableCell className={tableCol.status}>{row.status}</TableCell>
                  <TableCell className={tableCol.date}>{formatDateTime(row.subscribedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      <DataTableShell
        title="Movements"
        description="Ledger movements for this investor. An absent block is named; an empty list is empty."
        count={
          isAvailable(movements) && movements.value.length > 0
            ? `${movements.value.length} movement(s)`
            : undefined
        }
        source={!isAvailable(movements) ? namedSource('Movements', movements) : undefined}
        calme={
          isAvailable(movements) && movements.value.length === 0
            ? 'No movements on the book for this client.'
            : undefined
        }
      >
        {isAvailable(movements) && movements.value.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader className={tableCol.status}>Type</TableHeader>
                <TableHeader className={tableCol.numeric}>Amount</TableHeader>
                <TableHeader className={tableCol.date}>When</TableHeader>
                <TableHeader className={tableCol.hash}>Transaction</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.value.map((row, index) => (
                <TableRow key={row.txHash ?? `${row.type}-${row.occurredAt}-${String(index)}`}>
                  <TableCell className={tableCol.status}>{row.type}</TableCell>
                  <TableCell className={tableCol.numeric}>{formatWholeUsdc(row.amountUsdc)}</TableCell>
                  <TableCell className={tableCol.date}>{formatDateTime(row.occurredAt)}</TableCell>
                  <TableCell className={`${tableCol.hash} text-sm`}>
                    {formatHash(row.txHash) ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>
    </DashboardShell>
  )
}
