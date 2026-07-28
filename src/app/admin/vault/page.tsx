import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
import { UtilizationChart } from '@/components/admin/utilization-chart'
import { VaultEcartChart, type EcartPoche, type NiveauEcart } from '@/components/admin/vault-ecart-chart'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vault' }
export const dynamic = 'force-dynamic'

/**
 * Vault — how much, how much room, and allocated how.
 *
 * The old page lined up three raw route responses. This one asks three
 * questions: what's the current balance, what margin remains before the
 * cap, and is the money placed in line with the contract's targets.
 *
 * The gap between target and actual is the only column that triggers
 * action. It's therefore treated as such: signed, colored by magnitude, and
 * named in deviation points rather than basis points — nobody reads "315"
 * as "three points of deviation." It now has TWO readings that don't
 * overlap: the chart gives the direction and relative magnitude on a
 * zero-centered axis, the table gives the exact figures.
 *
 * ── What this page refuses to plot ─────────────────────────────────────────
 * 1. No per-pocket balance IN DOLLARS. The `rwa-vault` route does expose a
 *    `pocketAssets`, but it contradicts the `actualBps` from
 *    `vault/strategies` on two pockets out of three (S1: $460 read against
 *    the ~$332,000 implied by 2820 bps). As long as the two on-chain
 *    readings diverge, converting basis points to dollars would mean
 *    picking a figure — and giving it a precision it doesn't have. So the
 *    allocation stays in percentage, the unit in which the backend is
 *    internally consistent.
 * 2. No share-value curve. `navPerShare` is a point, not a series: the
 *    backend exposes no NAV-per-share history. A line drawn between a
 *    single point and the origin would read as a measured performance.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Vault = {
  readonly snapshot?: Resolu<{ asset: string; totalAssets: string; totalShares: string; navPerShare: string }>
  readonly capacity?: Resolu<{
    tvlCap: string
    totalAssets: string
    availableCapacity: string
    utilizationBps: number | null
  }>
}

type Strategie = {
  readonly pocket: string
  readonly label: string
  readonly targetBps: number
  readonly actualBps: number | null
  readonly driftBps: number | null
  readonly isIdle: boolean
}

type Strategies = { readonly strategies?: Resolu<readonly Strategie[]> }

/** Atomic USDC amount (6 decimals, as a string) rendered in dollars. */
function usdc(atomique: string | null | undefined, decimales = 0): string {
  return formatCurrency(atomique, { decimals: decimales })
}

/** A number already expressed in dollars, rendered with its unit. */
function dollars(montant: number, decimales = 0): string {
  return formatCurrency(montant, { decimals: decimales, fromAtomic: 1 })
}

function nombreOuNull(brut: string | null | undefined): number | null {
  if (brut === null || brut === undefined || brut === '') return null
  const n = Number(brut)
  return Number.isFinite(n) ? n : null
}

function pourcentBps(bps: number, decimales = 2): string {
  return formatPercent(bps, { fromBps: true, maximumFractionDigits: decimales })
}

/* ── Reading the deviation ───────────────────────────────────────────────── */

/**
 * This page's historical thresholds, now named in a single place: under one
 * deviation point the pocket is within tolerance, past five points it calls
 * for a correction. The chart and the table read the same rule.
 */
function niveauEcart(points: number): NiveauEcart {
  const ampleur = Math.abs(points)
  if (ampleur >= 5) return 'a-corriger'
  if (ampleur >= 1) return 'modere'
  return 'conforme'
}

/** Color never states the status alone: the word accompanies it everywhere. */
const NIVEAU_MOT: Record<NiveauEcart, string> = {
  conforme: 'within tolerance',
  modere: 'moderate deviation',
  'a-corriger': 'needs correction',
}

const NIVEAU_TON: Record<NiveauEcart, string> = {
  conforme: 'text-success-400',
  modere: 'text-zinc-300',
  'a-corriger': 'text-warning-400',
}

/** A deviation reads signed, and its magnitude decides its color. */
function ecartLisible(driftBps: number | null): { texte: string; ton: string; mot: string } {
  if (driftBps === null || !Number.isFinite(driftBps)) {
    return { texte: '—', ton: 'text-zinc-400', mot: 'not readable' }
  }
  const pts = driftBps / 100
  const niveau = niveauEcart(pts)
  const signe = pts > 0 ? '+' : ''
  return {
    texte: `${signe}${formatNumber(pts, { maximumFractionDigits: 2 })} pt`,
    ton: NIVEAU_TON[niveau],
    mot: NIVEAU_MOT[niveau],
  }
}

/* ── Deviation table ─────────────────────────────────────────────────────── */

function EcartsTable({ actives }: Readonly<{ actives: readonly Strategie[] }>) {
  return (
    <Card>
      <CardHeader
        title="Which pockets deviate from their target?"
        hint="A positive deviation signals a pocket ahead of its target"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-left text-xs text-zinc-400">
              <th scope="col" className="px-5 py-2.5 font-medium">
                Pocket
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Target
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Actual
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Deviation
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-white/5">
            {actives.map((s) => {
              const ecart = ecartLisible(s.driftBps)
              return (
                <tr key={s.pocket}>
                  <th scope="row" className="px-5 py-3 text-left font-normal text-zinc-200">
                    {s.label}
                  </th>
                  <td className="px-5 py-3 text-right text-zinc-400 tabular-nums">{pourcentBps(s.targetBps)}</td>
                  <td className="px-5 py-3 text-right text-zinc-200 tabular-nums">
                    {s.actualBps === null ? '—' : pourcentBps(s.actualBps)}
                  </td>
                  <td className={clsx('px-5 py-3 text-right tabular-nums', ecart.ton)}>{ecart.texte}</td>
                  {/* The status is written, not just tinted: a reader who
                      can't distinguish the hues gets the same information. */}
                  <td className={clsx('px-5 py-3 text-right text-xs', ecart.ton)}>{ecart.mot}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ── Shares × share-value consistency check ──────────────────────────────── */

/**
 * The first check a fund manager runs: the number of shares multiplied by
 * the share value should reproduce the balance. All three terms are served
 * LIVE by `vault` — so there's nothing to invent, only to verify, and to say
 * by how much it's off.
 *
 * The tolerance isn't picked by feel: the share value is published to six
 * decimals, so each share carries up to 0.5 × 10⁻⁶ $ of rounding. Beyond
 * that bound, the gap is no longer a rounding artifact.
 */
function ControleCoherence({
  parts,
  valeurPart,
  encours,
}: Readonly<{ parts: number; valeurPart: number; encours: number }>) {
  const reconstitue = parts * valeurPart
  const ecart = Math.abs(encours - reconstitue)
  const tolerance = parts * 0.5e-6
  const coherent = ecart <= tolerance

  return (
    <p className="mt-6 border-t border-zinc-950/5 pt-4 text-xs text-zinc-500 dark:border-white/5 dark:text-zinc-400">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">Consistency check · </span>
      {formatNumber(parts)} shares × {formatCurrency(valeurPart, { decimals: 6, fromAtomic: 1 })}{' '}
      = {dollars(reconstitue)}, a {dollars(ecart, 2)} difference from the recorded balance.{' '}
      <span className={coherent ? 'text-success-400' : 'text-warning-400'}>
        {coherent
          ? `Consistent: share-value rounding accounts for up to ${dollars(tolerance, 2)}.`
          : `Needs review: the gap exceeds the ${dollars(tolerance, 2)} attributable to rounding.`}
      </span>
    </p>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const [vault, strategies] = await Promise.all([
    callBackend<Vault>('vault'),
    callBackend<Strategies>('vault-strategies'),
  ])

  const v = vault.ok ? vault.data : null
  const snap = v?.snapshot?.value
  const cap = v?.capacity?.value

  const liste = strategies.ok ? strategies.data.strategies?.value : null
  const actives = liste === null || liste === undefined ? [] : liste.filter((s) => !s.isIdle)

  const poches: PocheAllocation[] = actives.map((s) => ({
    poche: s.pocket,
    cible: s.targetBps / 100,
    reel: s.actualBps === null ? null : s.actualBps / 100,
  }))

  // Only pockets whose deviation is actually readable enter the chart: a
  // pocket without a readable deviation is not a pocket with zero deviation.
  const ecarts: EcartPoche[] = actives.flatMap((s) => {
    if (s.driftBps === null || !Number.isFinite(s.driftBps)) return []
    const points = s.driftBps / 100
    const niveau = niveauEcart(points)
    return [{ poche: s.pocket, label: s.label, ecart: points, niveau, mot: NIVEAU_MOT[niveau] }]
  })

  // What the active pockets actually cover of the balance. The remainder
  // isn't a rounding error: it's money that isn't in any active pocket, and
  // it's stated as such.
  const reels = actives.map((s) => s.actualBps).filter((bps): bps is number => bps !== null)
  const couvertureBps = reels.length > 0 && reels.length === actives.length ? reels.reduce((a, b) => a + b, 0) : null
  const ciblesBps = actives.reduce((a, s) => a + s.targetBps, 0)

  const nbParts = nombreOuNull(snap?.totalShares)
  const valeurPart = nombreOuNull(snap?.navPerShare)
  const encoursAtomique = nombreOuNull(snap?.totalAssets)
  const controleLisible = nbParts !== null && valeurPart !== null && encoursAtomique !== null && nbParts > 0

  return (
    <AdminPage>
      <PageHeader
        title="Vault"
        description="The fund's assets under management, the margin before its cap, and how closely its allocation follows contract targets."
      />

      <AdminSection>

      {v === null ? (
        <SourceAttendue
          quoi="Vault state could not be read"
          detail="The service did not respond. No value is shown rather than a stale one."
          requis={['A response from the service']}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                <HeroFigure
                  valeur={usdc(snap?.totalAssets)}
                  libelle="Vault balance"
                  unite={snap?.asset ?? undefined}
                />
                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
                  <SideFact libelle="Share value" valeur={snap?.navPerShare ?? '—'} />
                  <SideFact
                    libelle="Shares issued"
                    valeur={nbParts === null ? '—' : formatNumber(nbParts)}
                  />
                </dl>
              </div>

              {controleLisible ? (
                <ControleCoherence parts={nbParts} valeurPart={valeurPart} encours={encoursAtomique / 1_000_000} />
              ) : null}
            </Card>

            {/* The cap is no longer a flat gauge: the donut carries the cap
                at its center, the utilization rate, and — crucially — BOTH
                amounts: a percentage alone doesn't say how much room remains
                to raise. Component already in service on the dashboard: the
                same fact, read the same way, in two places. */}
            <Card className="flex flex-col p-6">
              <p className="text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Deposit cap</p>
              <div className="mt-4 flex-1">
                <UtilizationChart
                  tvlCap={cap?.tvlCap}
                  totalAssets={cap?.totalAssets}
                  availableCapacity={cap?.availableCapacity}
                  utilizationBps={cap?.utilizationBps === undefined ? null : cap.utilizationBps}
                />
              </div>
              <p className="mt-4 border-t border-zinc-950/5 pt-3 text-xs text-zinc-500 dark:border-white/5 dark:text-zinc-400">
                {cap === null || cap === undefined
                  ? 'Capacity could not be read: no amount is shown rather than a zero.'
                  : `${usdc(cap.availableCapacity)} of capacity remains before the ${usdc(cap.tvlCap)} cap.`}
              </p>
            </Card>
          </div>

          <ChartFrame
            question="Is the money allocated where it should be?"
            unite="as a percentage of the vault"
            etat={
              poches.length > 0
                ? { type: 'tracee' }
                : { type: 'attendue', explication: 'No active strategy could be read on-chain.' }
            }
          >
            <>
              <AllocationChart poches={poches} />
              {/* Targets total 100%; actual pockets rarely do. The remainder
                  is balance outside any active pocket — a fact, not a
                  rounding artifact, and it's stated here rather than left to
                  mental math. */}
              {couvertureBps === null ? null : (
                <p className="px-5 pb-5 text-xs text-zinc-500 dark:text-zinc-400">
                  Active pockets cover {pourcentBps(couvertureBps)} of the balance, against targets totaling{' '}
                  {pourcentBps(ciblesBps)}:{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {pourcentBps(10_000 - couvertureBps)} of the balance is not attached to any active pocket.
                  </span>
                </p>
              )}
            </>
          </ChartFrame>

          <ChartFrame
            question="How far does each pocket deviate from its target?"
            unite="in percentage points, actual minus target"
            etat={
              ecarts.length > 0
                ? { type: 'tracee' }
                : {
                    type: 'attendue',
                    explication: 'No deviation could be read on-chain for the active pockets.',
                  }
            }
          >
            <VaultEcartChart ecarts={ecarts} />
          </ChartFrame>

          {actives.length > 0 ? <EcartsTable actives={actives} /> : null}
        </>
      )}
      </AdminSection>
    </AdminPage>
  )
}
