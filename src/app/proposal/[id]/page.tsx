import { requireSession } from '@/lib/auth'
import { loadAdminOffers, loadOfferSimulation } from '@/lib/admin-dashboard/load'
import type { OfferSimulation } from '@/lib/admin-dashboard/contracts'
import { formatDate, formatNumber } from '@/lib/format'
import type { Offer } from '@/lib/offers/model'
import { isAvailable, valueOf } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PrintButton } from './print-button'
import { ProposalAnswer } from './proposal-answer'
import { DemoDock } from '@/features/demo/demo-dock'
import './proposal.css'

export const metadata: Metadata = { title: 'Proposal' }
export const dynamic = 'force-dynamic'

/**
 * La proposition commerciale d'une offre, prête à imprimer en PDF.
 *
 * Tout vient de ce qui a été saisi côté admin — le client, le montant, la
 * durée — et de la MÊME simulation que la fiche d'offre et que
 * l'écran du client. Rien n'est réécrit à la main : la propale et la console
 * ne peuvent pas diverger.
 *
 * Hors de la console (pas de barre latérale) : c'est un document qu'on envoie,
 * pas un écran qu'on pilote.
 */

/* V2 — MINING AS A SERVICE : le dépôt se partage en deux, toujours de la même façon. */
const SPLIT = [
  {
    key: 'mining' as const,
    bps: 9000,
    label: 'Computing power',
    color: '#9eea7a',
    blurb: 'Hashrate bought in Hearst’s mining pool. It mines bitcoin for your vault from day one.',
  },
  {
    key: 'buffer' as const,
    bps: 1000,
    label: 'Electricity buffer',
    color: '#a9a9a9',
    blurb: 'Kept in USDC to pay the fleet’s electricity bills — you never receive an invoice.',
  },
]

const usd = (v: number) => `$${formatNumber(Math.round(v), { maximumFractionDigits: 0 })}`
const usdCompact = (v: number) => `$${formatNumber(v, { notation: 'compact', maximumFractionDigits: 1 })}`
const btc = (v: number) => `${formatNumber(v, { maximumFractionDigits: 2 })} BTC`
/** La puissance dans l'unité qui se lit : TH/s, PH/s dès 1 000, EH/s dès le million. */
const power = (ths: number) =>
  ths >= 1_000_000
    ? `${formatNumber(ths / 1_000_000, { maximumFractionDigits: 2 })} EH/s`
    : ths >= 1_000
      ? `${formatNumber(ths / 1_000, { maximumFractionDigits: 2 })} PH/s`
      : `${formatNumber(ths, { maximumFractionDigits: 0 })} TH/s`
const pct = (bps: number) => `${formatNumber(bps / 100, { maximumFractionDigits: 0 })} %`

export default async function ProposalPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession()
  const { id } = await params

  const offers = await loadAdminOffers()
  const offer: Offer | undefined = (valueOf(offers) ?? []).find((o) => o.id === id)
  if (!offer) notFound()

  const simulation =
    offer.amountUsdc !== null
      ? await loadOfferSimulation(offer.id, {
          amountUsdc: offer.amountUsdc,
          months: offer.lockupMonths,
          miningBps: offer.allocation.miningBps,
          lendingBps: offer.allocation.lendingBps,
          stableBps: offer.allocation.stableBps,
        })
      : null
  const sim = simulation !== null && isAvailable(simulation) ? simulation.value : null
  const last = sim?.points[sim.points.length - 1]
  const today = formatDate(new Date().toISOString())
  const ths = sim?.hashrateThs ?? null

  return (
    <div className="proposal-root" data-theme="dark">
      <div className="proposal-toolbar">
        <Link
          href={offer.clientId ? `/admin/clients/${offer.clientId}` : `/admin/offers/${offer.id}`}
          className="text-sm text-white/70 hover:text-white"
        >
          ← Back to the offer
        </Link>
        <span className="text-sm text-white/60">
          {offer.clientName} · {offer.reference}
        </span>
        <PrintButton />
      </div>
      <ProposalAnswer offer={offer} />
      <DemoDock />

      {/* ── 1. COUVERTURE ──────────────────────────────────────────────── */}
      <section className="proposal-sheet is-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/hearst-connect.svg" alt="Hearst Connect" className="h-12 w-auto self-start" />
        {/* L'illustration de marque au-dessus du titre : elle comble le vide
            de la couverture et en donne le ton. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/proposal-cube.png" alt="" aria-hidden="true" className="proposal-cover-art" />
        <div className="mt-auto">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#9eea7a] uppercase">Confidential proposal</p>
          <h1 className="mt-4 text-[44px] leading-[1.05] font-medium tracking-[-0.02em] max-sm:text-[32px]">
            Bitcoin Strategic
            <br />
            Reserve
          </h1>
          <p className="mt-6 text-lg text-white/70">A dedicated vault, prepared for</p>
          <p className="mt-1 text-3xl font-medium">{offer.clientName}</p>
        </div>
        <dl className="mt-16 grid grid-cols-4 gap-6 border-t border-white/15 pt-6 text-sm max-sm:grid-cols-2">
          <CoverFact label="Amount" value={offer.amountUsdc !== null ? `${usd(offer.amountUsdc)} USDC` : '—'} />
          <CoverFact label="Computing power" value={ths !== null ? power(ths) : '—'} accent />
          <CoverFact label="Lockup" value={`${offer.lockupMonths} months`} />
          <CoverFact label="Date" value={today} />
        </dl>
        <p className="mt-8 text-xs text-white/40">
          Reference {offer.reference} · Hearst Corporation · This document does not constitute an offer to
          sell securities. Projections are simulations, not commitments.
        </p>
      </section>

      {/* ── 2. LES CONDITIONS ─────────────────────────────────────────── */}
      <section className="proposal-sheet">
        <SheetHead step="01" title="The proposal" subtitle={`Prepared for ${offer.clientName}`} />

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10">
          <Term label="Capital committed" value={offer.amountUsdc !== null ? `${usd(offer.amountUsdc)} USDC` : '—'} />
          <Term label="Lockup" value={`${offer.lockupMonths} months`} />
          <Term
            label="Electricity buffer"
            value={offer.amountUsdc !== null ? `${usd(offer.amountUsdc * 0.1)} USDC` : '—'}
          />
          {/* Le produit est une réserve de bitcoin : on annonce le bitcoin
              visé au terme, jamais un rendement en dollars. */}
          <Term label="Bitcoin at term, median" value={last ? btc(last.btcP50) : '—'} accent />
        </dl>

        <h3 className="mt-10 text-lg font-medium">How your deposit works</h3>
        <p className="mt-1 text-sm text-white/55">
          One activity — bitcoin mining. Your deposit buys computing power in Hearst’s pool; a small part stays aside
          to pay the electricity. Everything mined goes to your bitcoin reserve.
        </p>
        <div className="mt-6 flex items-center gap-10 max-sm:flex-col max-sm:items-stretch max-sm:gap-6">
          <StaticDonut />
          <ul className="flex flex-1 flex-col gap-4">
            {SPLIT.map((p) => (
              <li key={p.key} className="flex gap-3">
                <span className="mt-1.5 size-3 shrink-0 rounded-sm" style={{ background: p.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{p.label}</span>
                    <span className="tabular-nums">
                      <span className="font-medium">{pct(p.bps)}</span>
                      {offer.amountUsdc !== null ? (
                        <span className="text-white/55">
                          {' · '}
                          {usd((offer.amountUsdc * p.bps) / 10_000)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/55">
                    {p.blurb}
                    {p.key === 'mining' && ths !== null ? <span className="text-[#9eea7a]"> {power(ths)}.</span> : null}
                    {p.key === 'buffer' && sim?.bufferMonths !== undefined ? (
                      <span className="text-[#9eea7a]"> About {formatNumber(sim.bufferMonths, { maximumFractionDigits: 0 })} months of bills.</span>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Le cœur du produit : la puissance de calcul que le capital achète.
            Lue dans la simulation (backend), comme sur /account. */}
        <h3 className="mt-10 text-lg font-medium">Your computing power</h3>
        <p className="mt-1 text-sm text-white/55">
          You never receive an electricity bill — it is paid from the buffer, at cost. When the buffer falls below 3 months of
          bills, Hearst tops it back up to 6 months by selling part of that month’s mined bitcoin, never more than half.
        </p>
        {sim && ths !== null ? (
          <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10 max-sm:grid-cols-1">
            <Term label="Hashrate allocated" value={power(ths)} accent />
            <Term
              label="Mining capital"
              value={sim.miningCapitalUsdc !== undefined ? usd(sim.miningCapitalUsdc) : '—'}
            />
            <Term
              label="Electricity, a month"
              value={sim.electricityMonthlyUsd !== undefined ? `≈ ${usd(sim.electricityMonthlyUsd)}` : '—'}
            />
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/55">The computing power could not be computed for this offer.</p>
        )}
        {sim?.usdPerThs !== undefined ? (
          <p className="mt-3 text-xs text-white/40">
            At {usd(sim.usdPerThs)} per TH/s — machine, hosting and commissioning included.
          </p>
        ) : null}

        <SheetFoot reference={offer.reference} page={2} />
      </section>

      {/* ── 3. LA PROJECTION ──────────────────────────────────────────── */}
      <section className="proposal-sheet">
        <SheetHead
          step="02"
          title={`Projection at ${offer.lockupMonths} months`}
          subtitle={
            sim
              ? `${formatNumber(sim.runs)} Monte-Carlo runs · bitcoin volatility ${formatNumber(sim.btcVolAnnualPct, { maximumFractionDigits: 0 })} %`
              : 'Simulation unavailable'
          }
        />

        {sim && last ? (
          <>
            <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10 max-sm:grid-cols-1">
              <Term label="Median value at term" value={usdCompact(last.p50)} />
              <Term label="Median, in bitcoin" value={btc(last.btcP50)} />
              <Term
                label="Median vs simply holding"
                value={`${formatNumber((last.btcP50 / sim.hodlBtc - 1) * 100, { maximumFractionDigits: 0, signDisplay: 'exceptZero' })} %`}
                accent
              />
            </div>

            {/* Le tableau de projection de /account, en BITCOIN seulement : c'est
                l'unité de la réserve. Trois échéances, bas / médian / haut. */}
            <ProjectionPrint simulation={sim} unit="btc" months={offer.lockupMonths} />
            <p className="mt-4 text-xs leading-relaxed text-white/55">
              Monte-Carlo simulation over {formatNumber(sim.runs)} runs. Downside and upside are the 10th and 90th
              percentiles: eight runs out of ten land between them. In bitcoin the spread is far wider, because the
              price moves too ({formatNumber(sim.btcVolAnnualPct, { maximumFractionDigits: 0 })} % annualised
              volatility). Simply buying bitcoin today would give {btc(sim.hodlBtc)}. A projection is not a forecast.
            </p>
          </>
        ) : (
          <p className="mt-8 text-sm text-white/55">
            The projection could not be computed for this offer — it is shown rather than estimated by hand.
          </p>
        )}

        <SheetFoot reference={offer.reference} page={3} />
      </section>

      {/* ── 4. LE PARCOURS ET LES RISQUES ─────────────────────────────── */}
      <section className="proposal-sheet">
        <SheetHead step="03" title="Next steps" subtitle="From signature to your first distribution" />
        <ol className="mt-8 flex flex-col gap-5">
          {[
            ['Sign the proposal', 'The amount and the lockup above become the terms of your dedicated vault.'],
            ['Receive your credentials', 'We open your Hearst Connect access and send the funding instructions.'],
            ['Fund the vault', `Transfer ${offer.amountUsdc !== null ? `${usd(offer.amountUsdc)} USDC` : 'the agreed amount'} to the address provided. We confirm reception.`],
            ['Your vault goes live', 'Your computing power is switched on and the buffer is funded. You follow it in real time on your dashboard.'],
            ['Your reserve grows', 'Every month, the bitcoin mined for your vault is added to your reserve — each addition visible with its date and amount.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#9eea7a] text-sm font-medium text-[#06140a]">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-sm text-white/55">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-12 text-lg font-medium">Risks</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">
          <li>Bitcoin is volatile. The value of the vault in dollars and in bitcoin can fall as well as rise.</li>
          <li>Mining output depends on network difficulty, energy costs and the hashprice — none of which Hearst controls.</li>
          <li>When electricity costs rise, the buffer empties faster and more mined bitcoin is sold to refill it.</li>
          <li>Capital is locked for {offer.lockupMonths} months. Early withdrawal is not guaranteed.</li>
          <li>The projections in this document are simulations ({sim ? formatNumber(sim.runs) : '—'} runs), not commitments.</li>
        </ul>

        <div className="mt-auto rounded-xl bg-white/[0.06] p-5 text-sm">
          <p className="font-medium">Hearst Corporation</p>
          <p className="mt-1 text-white/55">
            Proposal {offer.reference}, issued {today}. Valid 30 days. For any question, reply to the email this
            proposal came with.
          </p>
        </div>
        <SheetFoot reference={offer.reference} page={4} />
      </section>
    </div>
  )
}

function CoverFact({ label, value, accent }: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <div>
      <dt className="text-white/50">{label}</dt>
      <dd className={`mt-1 text-base font-medium ${accent ? 'text-[#9eea7a]' : ''}`}>{value}</dd>
    </div>
  )
}

function SheetHead({ step, title, subtitle }: Readonly<{ step: string; title: string; subtitle: string }>) {
  return (
    <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-5 max-sm:flex-col max-sm:gap-3">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] text-white/40 uppercase">{step}</p>
        <h2 className="mt-2 text-[26px] leading-tight font-medium tracking-[-0.01em]">{title}</h2>
        <p className="mt-1 text-sm text-white/55">{subtitle}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/hearst-h.svg" alt="" className="h-8 w-auto opacity-80" />
    </header>
  )
}

function SheetFoot({ reference, page }: Readonly<{ reference: string; page: number }>) {
  return (
    <footer className="mt-auto flex justify-between pt-8 text-[10px] text-white/40">
      <span>Hearst Connect · Bitcoin Strategic Reserve · {reference}</span>
      <span>{page} / 4</span>
    </footer>
  )
}

function Term({ label, value, accent }: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <div className="bg-[#151515] p-5">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className={`mt-1 text-2xl font-medium tabular-nums ${accent ? 'text-[#9eea7a]' : ''}`}>{value}</dd>
    </div>
  )
}

/** Anneau statique (conic-gradient) : net à l'impression, sans moteur de graphe. */
function StaticDonut() {
  let acc = 0
  const stops = SPLIT.map((p) => {
    const from = (acc / 10_000) * 360
    acc += p.bps
    return `${p.color} ${from}deg ${(acc / 10_000) * 360}deg`
  })
  return (
    <div
      className="size-44 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(${stops.join(', ')})`,
        WebkitMask: 'radial-gradient(closest-side, transparent 60%, black 61%)',
        mask: 'radial-gradient(closest-side, transparent 60%, black 61%)',
      }}
    />
  )
}

/** Le tableau de projection, version papier : une unité par tableau. */
function ProjectionPrint({
  simulation,
  unit,
  months,
}: Readonly<{ simulation: OfferSimulation; unit: 'btc' | 'usd'; months: number }>) {
  const horizons = [...new Set([6, 12, months])].filter((m) => m <= months && m < simulation.points.length).sort((a, b) => a - b)
  const base = unit === 'btc' ? simulation.startValueBtc : simulation.startValueUsdc
  const fmt = (v: number) => (unit === 'btc' ? btc(v) : usd(v))
  const growth = (v: number) =>
    base > 0 ? `${formatNumber(((v - base) / base) * 100, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })} %` : ''

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-medium">In {unit === 'btc' ? 'bitcoin' : 'USDC'}</h3>
        <p className="text-sm text-white/55">
          Proposed capital · <span className="font-medium text-white">{fmt(base)}</span>
        </p>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-white/55">
            <th className="py-2 font-normal">Horizon</th>
            <th className="py-2 text-center font-normal">Downside</th>
            {/* La médiane en vert citrus plein, chiffres à l'encre — la colonne se lit d'abord. */}
            <th className="rounded-t-xl bg-[#9eea7a] py-2 text-center font-semibold text-black">Median</th>
            <th className="py-2 text-center font-normal">Upside</th>
          </tr>
        </thead>
        <tbody>
          {horizons.map((m, r) => {
            const p = simulation.points[m]
            const v = unit === 'btc' ? [p.btcP10, p.btcP50, p.btcP90] : [p.p10, p.p50, p.p90]
            const last = r === horizons.length - 1
            return (
              <tr key={m} className="border-b border-white/[0.06]">
                <td className="py-2.5 font-medium">{m} months</td>
                {v.map((x, i) => (
                  <td
                    key={i}
                    className={`py-2.5 text-center tabular-nums ${i === 1 ? `bg-[#9eea7a] font-semibold text-black ${last ? 'rounded-b-xl' : ''}` : ''}`}
                  >
                    {fmt(x)}
                    <span className={`ml-2 text-xs ${i === 1 ? 'font-normal text-black/60' : 'text-white/55'}`}>{growth(x)}</span>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
