import { Card, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { AdminTableSplit } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection, AdminTable, type AdminTableColumn } from '@/components/admin/surfaces'
import { AdminPage, AdminSurfaceTitle } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Data Coverage' }
export const dynamic = 'force-dynamic'

/**
 * Data Coverage — which product surfaces are actually served.
 *
 * The aggregate returned by the service describes eighteen business
 * surfaces, each with its own status. This is THE question this page
 * answers: what can we rely on today, and what's missing elsewhere, and why.
 *
 * Three choices govern it:
 *
 * 1. We don't show the raw payload. A screen of JSON teaches nothing to
 *    someone who has to decide.
 *
 * 2. We don't requalify any status. The service computes the overall status
 *    worst-field-first: a single degraded surface pulls down the whole. This
 *    is documented behavior — we explain it rather than fix it. A frontend
 *    that "improves" an upstream status lies to its reader.
 *
 * 3. Eighteen surfaces are ONE list, not three framed panels. The rejected
 *    version put each status tier in its own card, so the reader compared
 *    boxes instead of rows, and a tier holding two surfaces got the same
 *    frame as a tier holding twelve. The surfaces now share a single table
 *    ordered by tier, with the meaning of each tier — and how many surfaces
 *    it holds — in a deliberate secondary column beside it.
 */

type ResolvedField = { readonly status: string; readonly value: unknown; readonly reason?: string | null }

const isResolvedField = (v: unknown): v is ResolvedField =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

/** The business name of each surface. An unknown key keeps its key. */
const SURFACE_NAME: Record<string, string> = {
  identity: 'Investor identity',
  position: 'Position held',
  distributions: 'Distributions paid',
  activity: 'Account activity',
  proofs: 'Proof of reserves',
  allocation: 'Portfolio allocation',
  subscription: 'Subscription terms',
  alerts: 'Active alerts',
  capacity: 'Fund capacity',
  reserve: 'Cash reserve',
  performance: 'Performance',
  mining: 'Fleet production',
  rebalancing: 'Rebalancing',
  vault: 'Asset vault',
  strategies: 'Active strategies',
  recentEvents: 'Recent movements',
  engine: 'Mining engine',
  aiExperts: 'AI-assisted analysis',
}

const surfaceName = (key: string): string => SURFACE_NAME[key] ?? key

/* ── The three status tiers ──────────────────────────────────────────────── */

type CoverageTier = 'served' | 'partial' | 'notOpened'

const TIER_TITLE: Record<CoverageTier, string> = {
  served: 'Served',
  partial: 'Partially served',
  notOpened: 'Not yet open',
}

const TIER_EXPLANATION: Record<CoverageTier, string> = {
  served: 'These surfaces return a usable value. You can rely on them.',
  partial:
    'These surfaces respond, but without a value: the service knows what to return, it simply has nothing to say today.',
  notOpened: 'These surfaces are not yet open. Nothing is expected from them for now.',
}

/**
 * Colour here is a claim about state, which is exactly what these three tiers
 * are — so the semantic palette is spent where it means something. An
 * ordinary dataset would get the mint ramp instead.
 */
const TIER_DOT: Record<CoverageTier, string> = {
  served: 'bg-success-500',
  partial: 'bg-warning-500',
  notOpened: 'bg-zinc-500',
}

const TIER_TEXT: Record<CoverageTier, string> = {
  served: 'text-success-400',
  partial: 'text-warning-400',
  notOpened: 'text-zinc-500 dark:text-zinc-400',
}

/** The ranking follows the status declared by the service, without reinterpreting it. */
function tierFromStatus(status: string): CoverageTier {
  if (status === 'LIVE') return 'served'
  if (status === 'PARTIAL' || status === 'STALE' || status === 'SNAPSHOT' || status === 'EMPTY') return 'partial'
  return 'notOpened'
}

const TIER_ORDER: readonly CoverageTier[] = ['served', 'partial', 'notOpened']

type Surface = { readonly key: string; readonly name: string; readonly tier: CoverageTier; readonly reason: string | undefined }

const countIn = (surfaces: readonly Surface[], tier: CoverageTier): number =>
  surfaces.filter((s) => s.tier === tier).length

/* ── The headline band ───────────────────────────────────────────────────── */

/**
 * One band, sized to what it holds: the figure that answers the page's
 * question, the two counts that qualify it, and a proportion bar that only
 * needs the full width because it IS the full width.
 */
function CoverageBand({ surfaces }: Readonly<{ surfaces: readonly Surface[] }>) {
  const served = countIn(surfaces, 'served')
  const partial = countIn(surfaces, 'partial')
  const notOpened = countIn(surfaces, 'notOpened')

  return (
    <Card className="p-6">
      <div className="grid items-end gap-x-10 gap-y-6 sm:grid-cols-2">
        <HeroFigure valeur={`${served}`} libelle="Surfaces served" unite={`of ${surfaces.length}`} />
        <div className="grid grid-cols-3 gap-x-6">
          <SideFact libelle="Partially served" valeur={partial === 0 ? 'none' : String(partial)} />
          <SideFact libelle="Not yet open" valeur={notOpened === 0 ? 'none' : String(notOpened)} />
          <SideFact libelle="Coverage" valeur={`${Math.round((served / surfaces.length) * 100)}%`} />
        </div>
      </div>

      {/* One bar, three segments: the proportion is grasped at a glance,
          without reading three numbers and comparing them. */}
      <div className="mt-6 flex h-2 gap-0.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {TIER_ORDER.map((tier) => {
          const count = countIn(surfaces, tier)
          if (count === 0) return null
          return (
            <div
              key={tier}
              className={clsx('h-full', TIER_DOT[tier])}
              style={{ width: `${(count / surfaces.length) * 100}%` }}
            />
          )
        })}
      </div>
      <p className="mt-3 max-w-prose text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        The overall status announced by the service reads worst-field-first: a single incomplete surface pulls
        down the whole. This is intentional — better one alert too many than a falsely reassuring screen.
      </p>
    </Card>
  )
}

/* ── The list ────────────────────────────────────────────────────────────── */

const COLONNES: readonly AdminTableColumn<Surface>[] = [
  {
    key: 'surface',
    header: 'Surface',
    cell: (s) => <span className="text-zinc-950 dark:text-white">{s.name}</span>,
  },
  {
    key: 'tier',
    header: 'Status',
    className: 'w-44',
    cell: (s) => (
      <span className={clsx('inline-flex items-center gap-2 whitespace-nowrap', TIER_TEXT[s.tier])}>
        <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', TIER_DOT[s.tier])} />
        {TIER_TITLE[s.tier]}
      </span>
    ),
  },
  {
    key: 'reason',
    header: 'What the service says',
    /* An unmapped reason code renders as an absence, never as a technical
       string leaked into a business console. */
    cell: (s) => <span className="text-zinc-500 dark:text-zinc-400">{s.reason ?? '—'}</span>,
  },
]

/** The key to the table, in the secondary column — one entry per tier. */
function TierLegend({ surfaces }: Readonly<{ surfaces: readonly Surface[] }>) {
  return (
    <Card className="p-5">
      <AdminSurfaceTitle as="p">What each status means</AdminSurfaceTitle>
      <dl className="mt-4 space-y-4">
        {TIER_ORDER.map((tier) => (
          <div key={tier}>
            <dt className="flex items-baseline gap-2">
              <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', TIER_DOT[tier])} />
              <span className="text-sm font-medium text-zinc-950 dark:text-white">{TIER_TITLE[tier]}</span>
              <span className="ml-auto text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {countIn(surfaces, tier)}
              </span>
            </dt>
            <dd className="mt-1 pl-3.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {TIER_EXPLANATION[tier]}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function CoverageBody({
  aggregate,
  surfaces,
}: Readonly<{ aggregate: Record<string, unknown> | null; surfaces: readonly Surface[] }>) {
  if (aggregate === null) {
    return (
      <SourceAttendue
        quoi="The status of the surfaces could not be read"
        detail="The service did not respond. No coverage is assumed: showing “all good” without a response would be the worst lie this screen could tell."
        requis={['A response from the service']}
      />
    )
  }
  if (surfaces.length === 0) {
    return (
      <SourceAttendue
        quoi="The service described no surfaces"
        detail="The response arrived, but it contains no usable surface. Nothing is inferred from this silence."
        requis={['A response describing the status of each surface']}
      />
    )
  }

  // Served first, then what is still waiting: the order carries the ranking,
  // so no second grouping mechanism is needed on top of it.
  const ordonnees = TIER_ORDER.flatMap((tier) => surfaces.filter((s) => s.tier === tier))

  return (
    <>
      <CoverageBand surfaces={surfaces} />

      <AdminSection
        title="Surface by surface"
        description="Every surface the service described, ranked by the status it declares. Nothing is requalified on the way to this screen."
      >
        <AdminTableSplit
          main={
            <Card className="overflow-hidden">
              <AdminTable columns={COLONNES} rows={ordonnees} keyFn={(s) => s.key} />
            </Card>
          }
          aside={<TierLegend surfaces={surfaces} />}
        />
      </AdminSection>
    </>
  )
}

export default async function Page() {
  const response = await callBackend<Record<string, unknown>>('dashboard')
  const aggregate = response.ok ? response.data : null

  const surfaces =
    aggregate === null
      ? []
      : Object.entries(aggregate)
          .filter((entry): entry is [string, ResolvedField] => isResolvedField(entry[1]))
          .map(([key, resolved]) => ({
            key,
            name: surfaceName(key),
            tier: tierFromStatus(resolved.status),
            reason: motifLisible(resolved.reason),
          }))

  return (
    <AdminPage>
      <PageHeader
        title="Data Coverage"
        description="What the product can rely on today, surface by surface, and why the rest is still waiting on its source."
      />

      <CoverageBody aggregate={aggregate} surfaces={surfaces} />
    </AdminPage>
  )
}
