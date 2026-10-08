'use client'

import { Button } from '@/components/catalyst/button'
import { Callout } from '@/components/compositions'
import { BUFFER_PCT, MINING_PCT } from '@/lib/deposit-split'
import { CLIENT_KINDS, DEFAULT_LOCKUP_MONTHS, MIN_VAULT_USDC } from '@/lib/offers/model'
import { createOffer, simulateDraft, type DraftSimulation } from '@/features/admin-offers/actions'
import { ProjectionTable } from '@/features/user-dashboard/projection-table'
import { useActionState, useEffect, useState, useTransition } from 'react'

/**
 * Créer une offre — la première étape du parcours.
 *
 * V2 — Mining as a Service : l'offre tient en trois choses — le client, le
 * montant, la durée. Le dépôt se partage toujours de la même façon (85 % de
 * puissance de calcul, 15 % de buffer d'électricité) : plus de profil de
 * risque, plus d'allocation à régler, plus de rééquilibrage ensuite.
 */

const FIELD =
  'w-full rounded-lg border border-console-line bg-console-inset px-3 py-2 text-sm text-fg placeholder:text-fg-tertiary focus:border-accent-400 focus:outline-none'


/** Le jeu de test de la démo : un prospect plausible, déjà qualifié. */
const DEMO_PRESET = { client: 'Orbit Capital', kind: 'Family office', amount: '1000000' } as const

/* Le montant s'affiche avec ses séparateurs de milliers (1,000,000) : on ne garde
   que les chiffres et on les regroupe. Le serveur retire les virgules à la lecture. */
const groupDigits = (raw: string) => {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return digits === '' ? '' : Number(digits).toLocaleString('en-US')
}
const slug = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 16)

/** Les termes EN VIGUEUR (Settings → Product terms) ; à défaut, ceux du code. */
export type OfferTerms = Readonly<{
  minTicketUsdc: number
  defaultLockupMonths: number
  lockupOptions: readonly number[]
}>

/** Ce que la page sait déjà du client : son identifiant, son nom, et pour une
 *  nouvelle tranche son rang et l'allocation de son vault le plus récent (bps). */
export type OfferPreset = Readonly<{ clientId?: string; client?: string; tranche?: number; allocation?: readonly [number, number, number] }>

export function OfferForm({ demo = false, terms, preset }: Readonly<{ demo?: boolean; terms?: OfferTerms | null; preset?: OfferPreset }>) {
  const MIN_TICKET = terms?.minTicketUsdc ?? MIN_VAULT_USDC
  const LOCKUPS = terms?.lockupOptions ?? []
  /* Ouverte depuis une fiche client (« New tranche », « New version ») : le
     client est déjà connu, l'offre lui sera rattachée par son identifiant. */
  const presetClientId = preset?.clientId ?? null
  /* Démo : tout est pré-rempli (nom, référence, courriel de test, typologie,
     1 000 000 USDC) — chaque champ reste modifiable. */
  const presetClient = preset?.client ?? (demo ? DEMO_PRESET.client : '')
  /* Une NOUVELLE TRANCHE ouvre son propre vault, au cours du jour, avec son propre blocage. */
  const tranche = preset?.tranche ?? null
  const [amount, setAmount] = useState(demo ? groupDigits(DEMO_PRESET.amount) : '')
  const [months, setMonths] = useState(terms?.defaultLockupMonths ?? DEFAULT_LOCKUP_MONTHS)
  const [state, submit, submitting] = useActionState(createOffer, { error: null })
  const [projection, setProjection] = useState<DraftSimulation | null>(null)
  const [projecting, startProjecting] = useTransition()

  const amountNum = Number(amount.replace(/[^\d.]/g, ''))
  const typedAmount = Number.isFinite(amountNum) && amountNum > 0
  /* Le ticket minimum : en dessous, ni projection ni création. */
  const belowMinimum = typedAmount && amountNum < MIN_TICKET
  const hasAmount = typedAmount && !belowMinimum

  const slice = (pctValue: number) =>
    hasAmount ? Math.round((amountNum * pctValue) / 100).toLocaleString('en-US') : '—'

  /* La projection se recalcule à chaque réglage, 400 ms après le dernier
     changement. Elle ne part que si l'offre est projetable : un montant et une durée. */
  useEffect(() => {
    if (!hasAmount || !(months > 0)) {
      setProjection(null)
      return
    }
    const timer = setTimeout(() => {
      startProjecting(async () => {
        setProjection(
          await simulateDraft({
            amountUsdc: Math.round(amountNum),
            months,
            miningBps: MINING_PCT * 100,
            lendingBps: 0,
            stableBps: BUFFER_PCT * 100,
          }),
        )
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [amountNum, hasAmount, months])

  return (
    <form action={submit} className="flex flex-col gap-6">
      {tranche !== null ? (
        <Callout tone="info" title={`Vault ${tranche} — a new deposit`}>
          {presetClient || 'This client'} already holds {tranche - 1} vault{tranche - 1 > 1 ? 's' : ''}. This deposit
          opens its own vault, with its own entry price and lockup — it is never added to an existing one.
        </Callout>
      ) : null}

      {/* ── LE CLIENT ────────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs text-fg-tertiary">Client</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Client name</span>
            <input
              name="clientName"
              required
              defaultValue={presetClient}
              readOnly={presetClientId !== null}
              className={FIELD}
              placeholder="Northwind Digital"
            />
            {presetClientId !== null ? <input type="hidden" name="clientId" value={presetClientId} /> : null}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Reference</span>
            <input
              name="reference"
              required
              className={FIELD}
              placeholder="NORTHWIND-01"
              defaultValue={demo && presetClient ? `${slug(presetClient)}-${String(tranche ?? 1).padStart(2, '0')}` : undefined}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Contact email</span>
            <input
              name="contactEmail"
              type="email"
              className={FIELD}
              placeholder="treasury@…"
              defaultValue={demo && presetClient ? `treasury@${slug(presetClient).toLowerCase()}.test` : undefined}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Kind</span>
            <select name="clientKind" className={FIELD} defaultValue={demo ? DEMO_PRESET.kind : ''}>
              <option value="">Not recorded</option>
              {CLIENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {/* ── LES TERMES ───────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs text-fg-tertiary">Terms</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Amount (USDC)</span>
            <input
              name="amountUsdc"
              inputMode="numeric"
              className={`${FIELD} ${belowMinimum ? 'border-danger-400 focus:border-danger-400' : ''}`}
              placeholder="1,000,000"
              value={amount}
              aria-invalid={belowMinimum}
              onChange={(e) => setAmount(groupDigits(e.target.value))}
            />
            {belowMinimum ? (
              <span className="text-xs text-danger-400">
                Minimum {MIN_TICKET.toLocaleString('en-US')} USDC per vault — this amount cannot open one.
              </span>
            ) : (
              <span className="text-xs text-fg-tertiary">
                {/* Le seul montant en USDC du parcours : ce qu'il achète en bitcoin à l'entrée. */}
                {projection?.ok && hasAmount
                  ? `≈ ${projection.simulation.hodlBtc.toLocaleString('en-US', { maximumFractionDigits: 2 })} BTC at today’s price — converted at entry. `
                  : ''}
                Minimum {MIN_TICKET.toLocaleString('en-US')} USDC.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Lock-up (months)</span>
            <input
              name="lockupMonths"
              type="number"
              min={1}
              value={months}
              onChange={(e) => setMonths(Math.max(0, Math.round(Number(e.target.value))))}
              className={FIELD}
            />
            {/* Les durées que les termes du produit proposent : un clic. */}
            {LOCKUPS.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {LOCKUPS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${months === m ? 'bg-white/[0.08] text-fg ring-white/20' : 'text-fg-tertiary ring-[var(--ud-line)] hover:text-fg'}`}
                  >
                    {m} months
                  </button>
                ))}
              </span>
            ) : null}
          </label>
        </div>
      </fieldset>

      {/* ── LE PARTAGE DU DÉPÔT — V2 ─────────────────────────────────────
          Plus de profil ni d'allocation à régler : Mining as a Service. Le
          dépôt achète de la puissance (85 %) et garde un buffer USDC (15 %)
          qui paie l'électricité. Rien à choisir, rien à rééquilibrer. */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs text-fg-tertiary">How the deposit is split — the same for every vault</legend>
        <input type="hidden" name="riskProfile" value="balanced" />
        <input type="hidden" name="miningPct" value={MINING_PCT} />
        <input type="hidden" name="lendingPct" value={0} />
        <input type="hidden" name="stablePct" value={BUFFER_PCT} />
        {/* Sur aplat vert citrus, chiffres en grand : la bande des KPI. Le split
            se lit d'un coup d'œil, c'est la décision de l'offre. */}
        <div className="grid gap-px overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--hearst-green-ink)_14%,var(--hearst-green))] sm:grid-cols-2">
          {[
            {
              label: 'Computing power',
              pct: MINING_PCT,
              detail:
                projection?.ok && projection.simulation.hashrateThs !== undefined
                  ? `${projection.simulation.hashrateThs.toLocaleString('en-US')} TH/s in Hearst’s pool`
                  : 'Hashrate in Hearst’s pool',
            },
            {
              label: 'Electricity buffer',
              pct: BUFFER_PCT,
              detail:
                projection?.ok && projection.simulation.bufferMonths !== undefined
                  ? `USDC · ≈ ${Math.round(projection.simulation.bufferMonths)} months of bills`
                  : 'USDC, pays the electricity',
            },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-2 bg-[var(--hearst-green)] px-5 py-5 text-[var(--hearst-green-ink)]">
              <span className="text-sm font-medium opacity-80">{row.label}</span>
              <span className="flex items-baseline gap-3 tabular-nums">
                <span className="text-[44px] leading-none font-medium tracking-[-0.02em]">{row.pct} %</span>
                <span className="text-lg font-medium opacity-80">${slice(row.pct)}</span>
              </span>
              <span className="text-xs opacity-70">{row.detail}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-fg-tertiary">
          When the buffer falls below 3 months of bills, it is topped back up to 6 months by selling part of that month’s mined
          bitcoin — never more than half.
        </p>
      </fieldset>

      {/* ── LA PROJECTION ───────────────────────────────────────────────
          Le Monte-Carlo de la fiche d'offre, en direct : ce que le client
          verra dans sa propale, AVANT de l'enregistrer. Même moteur que sa
          projection une fois le vault ouvert. */}
      <section className="flex flex-col gap-4 border-t border-[var(--ud-line)] pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="mb-[7px] text-[11px] font-medium tracking-[0.14em] text-[var(--ud-fg-3)] uppercase">
              Monte-Carlo
            </p>
            <h3 className="text-[17px] leading-[1.3] font-medium text-fg">Projection at {months} months</h3>
            <p className="mt-[3px] text-[12px] text-[var(--ud-fg-3)]">
              The same engine the client sees — recomputed as you adjust the offer
            </p>
          </div>
          {projecting ? <span className="text-xs text-fg-tertiary">Simulating…</span> : null}
        </div>

        {projection === null ? (
          <p className="rounded-lg bg-[var(--ud-inset)] px-4 py-6 text-center text-sm text-fg-tertiary">
            {belowMinimum
              ? `A vault starts at ${MIN_TICKET.toLocaleString('en-US')} USDC — raise the amount to project this offer.`
              : !hasAmount
              ? 'Enter an amount to project this offer.'
              : 'Preparing the projection…'}
          </p>
        ) : !projection.ok ? (
          <Callout tone="warning" title="Projection not available">
            {projection.reason}
          </Callout>
        ) : (
          <ProjectionResult simulation={projection.simulation} />
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={belowMinimum || submitting}>
          {submitting ? 'Creating…' : 'Create offer'}
        </Button>
        <span className="text-xs text-fg-tertiary">
          Saved as a draft — nothing is sent to the client yet.
        </span>
      </div>
      {state.error !== null ? (
        <Callout tone="warning" title="The offer was not created">
          {state.error}
        </Callout>
      ) : null}
    </form>
  )
}

/** Le tableau de projection de /account, à l'identique : 6, 12 mois et le
 *  terme du lockup ; bas, médian, haut ; en BTC ou en USDC. */
function ProjectionResult({
  simulation,
}: Readonly<{ simulation: Extract<DraftSimulation, { ok: true }>['simulation'] }>) {
  const term = simulation.horizonMonths
  return (
    <ProjectionTable
      projection={simulation}
      leadLabel="Proposed capital"
      horizons={[...new Set([6, 12, term])].filter((m) => m <= term).sort((a, b) => a - b)}
    />
  )
}
