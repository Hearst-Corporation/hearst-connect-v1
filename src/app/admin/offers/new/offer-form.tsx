'use client'

import { Button } from '@/components/catalyst/button'
import { Callout } from '@/components/compositions'
import {
  CLIENT_KINDS,
  DEFAULT_ALLOCATION,
  DEFAULT_LOCKUP_MONTHS,
  MIN_VAULT_USDC,
  RISK_PROFILES,
  RISK_PROFILE_LABEL,
  type RiskProfile,
} from '@/lib/offers/model'
import { createOffer, simulateDraft, type DraftSimulation } from '@/features/admin-offers/actions'
import { ProjectionTable } from '@/features/user-dashboard/projection-table'
import { useActionState, useEffect, useState, useTransition } from 'react'

/**
 * Créer une offre — la première étape du parcours.
 *
 * Le profil de risque AMORCE l'allocation, il ne la fige pas : deux clients
 * d'un même profil n'ont pas les mêmes contraintes. Choisir « Growth » remplit
 * donc les trois curseurs avec la grille correspondante, et chacun reste
 * modifiable ensuite.
 *
 * L'opérateur peut aussi saisir chaque part à la main : un champ de
 * pourcentage double chaque curseur, et toucher à une part bascule le profil
 * sur « Custom » — la grille de départ n'est plus ce qui est proposé.
 *
 * L'allocation doit sommer à 100 %. Le formulaire le vérifie et le dit — une
 * offre qui part avec 97 % d'allocation ouvrirait un vault dont 3 % du capital
 * ne sait pas où aller.
 */

const FIELD =
  'w-full rounded-lg border border-console-line bg-console-inset px-3 py-2 text-sm text-fg placeholder:text-fg-tertiary focus:border-accent-400 focus:outline-none'

/** Le profil affiché : une grille de départ, ou une répartition saisie à la main. */
type ProfileChoice = RiskProfile | 'custom'

/** Borne une saisie libre à une part entière entre 0 et 100. */
function clampPct(raw: string): number {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

/** Le jeu de test de la démo : un prospect plausible, déjà qualifié. */
const DEMO_PRESET = { client: 'Orbit Capital', kind: 'Family office', amount: '1000000' } as const
const slug = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 16)

/** Les termes EN VIGUEUR (Settings → Product terms et Risk profiles) ; à défaut, ceux du code. */
export type OfferTerms = Readonly<{
  minTicketUsdc: number
  defaultLockupMonths: number
  lockupOptions: readonly number[]
  profiles: Readonly<Record<RiskProfile, Readonly<{ miningBps: number; lendingBps: number; stableBps: number }>>>
}>

/** Ce que la page sait déjà du client : son identifiant, son nom, et pour une
 *  nouvelle tranche son rang et l'allocation de son vault le plus récent (bps). */
export type OfferPreset = Readonly<{ clientId?: string; client?: string; tranche?: number; allocation?: readonly [number, number, number] }>

export function OfferForm({ demo = false, terms, preset }: Readonly<{ demo?: boolean; terms?: OfferTerms | null; preset?: OfferPreset }>) {
  const MIN_TICKET = terms?.minTicketUsdc ?? MIN_VAULT_USDC
  const GRID = terms?.profiles ?? DEFAULT_ALLOCATION
  const LOCKUPS = terms?.lockupOptions ?? []
  /* Ouverte depuis une fiche client (« New tranche », « New version ») : le
     client est déjà connu, l'offre lui sera rattachée par son identifiant. */
  const presetClientId = preset?.clientId ?? null
  /* Démo : tout est pré-rempli (nom, référence, courriel de test, typologie,
     1 000 000 USDC) — chaque champ reste modifiable. */
  const presetClient = preset?.client ?? (demo ? DEMO_PRESET.client : '')
  /* Une NOUVELLE TRANCHE reprend l'allocation du vault le plus récent du
     client : c'est le mandat qu'il a déjà signé. Elle ouvrira son propre vault,
     modifiable ici comme toute offre. */
  const tranche = preset?.tranche ?? null
  const inherited = preset?.allocation ?? [NaN, NaN, NaN]
  const inherits = tranche !== null && inherited.every((v) => Number.isFinite(v) && v >= 0) && inherited.reduce((a, b) => a + b, 0) === 10_000
  const [profile, setProfile] = useState<ProfileChoice>(inherits ? 'custom' : 'balanced')
  const [mining, setMining] = useState(inherits ? inherited[0] / 100 : GRID.balanced.miningBps / 100)
  const [lending, setLending] = useState(inherits ? inherited[1] / 100 : GRID.balanced.lendingBps / 100)
  const [stable, setStable] = useState(inherits ? inherited[2] / 100 : GRID.balanced.stableBps / 100)
  const [amount, setAmount] = useState(demo ? DEMO_PRESET.amount : '')
  const [months, setMonths] = useState(terms?.defaultLockupMonths ?? DEFAULT_LOCKUP_MONTHS)
  const [state, submit, submitting] = useActionState(createOffer, { error: null })
  const [projection, setProjection] = useState<DraftSimulation | null>(null)
  const [projecting, startProjecting] = useTransition()

  /* Changer de profil réamorce les trois parts. C'est un point de départ
     assumé : l'opérateur ajuste ensuite, et son ajustement n'est pas écrasé
     tant qu'il ne rechange pas de profil. */
  function pickProfile(next: RiskProfile) {
    setProfile(next)
    const a = GRID[next]
    setMining(a.miningBps / 100)
    setLending(a.lendingBps / 100)
    setStable(a.stableBps / 100)
  }

  /* Une part modifiée à la main : ce n'est plus la grille du profil. */
  function setShare(set: (v: number) => void, value: number) {
    set(value)
    setProfile('custom')
  }

  const total = mining + lending + stable
  const balanced = Math.abs(total - 100) < 0.01
  const amountNum = Number(amount.replace(/[^\d.]/g, ''))
  const typedAmount = Number.isFinite(amountNum) && amountNum > 0
  /* Le ticket minimum : en dessous, ni projection ni création. */
  const belowMinimum = typedAmount && amountNum < MIN_TICKET
  const hasAmount = typedAmount && !belowMinimum

  const slice = (pctValue: number) =>
    hasAmount ? Math.round((amountNum * pctValue) / 100).toLocaleString('en-US') : '—'

  /* La projection se recalcule à chaque réglage, 400 ms après le dernier
     mouvement — pas à chaque pixel de curseur. Elle ne part que si l'offre est
     projetable : un montant, et une allocation à 100 %. */
  useEffect(() => {
    if (!hasAmount || !balanced || !(months > 0)) {
      setProjection(null)
      return
    }
    const timer = setTimeout(() => {
      startProjecting(async () => {
        setProjection(
          await simulateDraft({
            amountUsdc: Math.round(amountNum),
            months,
            miningBps: Math.round(mining * 100),
            lendingBps: Math.round(lending * 100),
            stableBps: Math.round(stable * 100),
          }),
        )
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [amountNum, hasAmount, balanced, months, mining, lending, stable])

  return (
    <form action={submit} className="flex flex-col gap-6">
      {tranche !== null ? (
        <Callout tone="info" title={`Vault ${tranche} — a new deposit`}>
          {presetClient || 'This client'} already holds {tranche - 1} vault{tranche - 1 > 1 ? 's' : ''}. This deposit
          opens its own vault, with its own entry price and lockup — it is never added to an existing one.
          {inherits ? ' The allocation is taken from their latest vault; adjust it if the mandate changes.' : ''}
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
              placeholder="1 000 000"
              value={amount}
              aria-invalid={belowMinimum}
              onChange={(e) => setAmount(e.target.value)}
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

      {/* ── LE PROFIL ET SON ALLOCATION ──────────────────────────────── */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs text-fg-tertiary">
          Risk profile — seeds the allocation, never fixes it
        </legend>

        {/* Le sélecteur du bloc vault de /account : piste sombre, choix actif
            en aplat blanc. « Custom » ne réamorce rien : il garde les parts
            telles qu'elles sont, pour les saisir une à une. */}
        <div className="ud-seg" role="group" aria-label="Risk profile">
          {RISK_PROFILES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={profile === r}
              onClick={() => pickProfile(r)}
              className={`ud-seg-btn${profile === r ? ' active' : ''}`}
            >
              {RISK_PROFILE_LABEL[r]}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={profile === 'custom'}
            onClick={() => setProfile('custom')}
            className={`ud-seg-btn${profile === 'custom' ? ' active' : ''}`}
          >
            Custom
          </button>
        </div>
        <input type="hidden" name="riskProfile" value={profile} />

        <div className="mt-2 flex flex-col gap-4">
          {[
            { label: 'Mining Alpha', value: mining, set: setMining, name: 'miningPct' },
            { label: 'Bitcoin Lending', value: lending, set: setLending, name: 'lendingPct' },
            { label: 'USDC Yield', value: stable, set: setStable, name: 'stablePct' },
          ].map((row) => (
            <div key={row.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{row.label}</span>
                <span className="flex items-center gap-2 tabular-nums text-fg-secondary">
                  {/* Saisie directe de la part : le curseur seul obligeait à
                      viser au point près pour tomber juste à 100 %. */}
                  <label className="flex items-center gap-1">
                    <span className="sr-only">{row.label} share</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={1}
                      value={row.value}
                      onChange={(e) => setShare(row.set, clampPct(e.target.value))}
                      className="w-16 [appearance:textfield] rounded-lg border border-console-line bg-console-inset px-2 py-1 text-right text-sm text-fg tabular-nums focus:border-accent-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    %
                  </label>
                  <span className="min-w-[7rem]">· ${slice(row.value)}</span>
                </span>
              </div>
              <input
                type="range"
                name={row.name}
                min={0}
                max={100}
                step={1}
                value={row.value}
                onChange={(e) => setShare(row.set, Number(e.target.value))}
                className="accent-[#9eea7a]"
              />
            </div>
          ))}
        </div>

        {/* Une allocation qui ne somme pas à 100 % ouvrirait un vault dont une
            part du capital ne sait pas où aller. Le formulaire refuse. */}
        {!balanced ? (
          <Callout tone="warning" title={`Allocation adds up to ${total} %`}>
            The three pockets must total 100 %. {total > 100 ? 'Reduce' : 'Increase'} one of them
            by {Math.abs(total - 100)} points.
          </Callout>
        ) : (
          <p className="text-xs text-fg-tertiary">
            Adds up to 100 %. This split becomes the vault target once the offer is signed.
          </p>
        )}
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
              : !balanced
                ? 'Bring the three pockets to 100 % to project this offer.'
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
        <Button type="submit" disabled={!balanced || belowMinimum || submitting}>
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
