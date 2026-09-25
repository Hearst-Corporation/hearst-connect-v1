'use client'

import { Button } from '@/components/catalyst/button'
import { Callout } from '@/components/compositions'
import {
  CLIENT_KINDS,
  DEFAULT_ALLOCATION,
  RISK_PROFILES,
  RISK_PROFILE_LABEL,
  type RiskProfile,
} from '@/lib/offers/model'
import { useState } from 'react'

/**
 * Créer une offre — la première étape du parcours.
 *
 * Le profil de risque AMORCE l'allocation, il ne la fige pas : deux clients
 * d'un même profil n'ont pas les mêmes contraintes. Choisir « Growth » remplit
 * donc les trois curseurs avec la grille correspondante, et chacun reste
 * modifiable ensuite.
 *
 * L'allocation doit sommer à 100 %. Le formulaire le vérifie et le dit — une
 * offre qui part avec 97 % d'allocation ouvrirait un vault dont 3 % du capital
 * ne sait pas où aller.
 */

const FIELD =
  'w-full rounded-lg border border-console-line bg-console-inset px-3 py-2 text-sm text-fg placeholder:text-fg-tertiary focus:border-accent-400 focus:outline-none'

export function OfferForm() {
  const [profile, setProfile] = useState<RiskProfile>('balanced')
  const [mining, setMining] = useState(DEFAULT_ALLOCATION.balanced.miningBps / 100)
  const [lending, setLending] = useState(DEFAULT_ALLOCATION.balanced.lendingBps / 100)
  const [stable, setStable] = useState(DEFAULT_ALLOCATION.balanced.stableBps / 100)
  const [amount, setAmount] = useState('')

  /* Changer de profil réamorce les trois parts. C'est un point de départ
     assumé : l'opérateur ajuste ensuite, et son ajustement n'est pas écrasé
     tant qu'il ne rechange pas de profil. */
  function pickProfile(next: RiskProfile) {
    setProfile(next)
    const a = DEFAULT_ALLOCATION[next]
    setMining(a.miningBps / 100)
    setLending(a.lendingBps / 100)
    setStable(a.stableBps / 100)
  }

  const total = mining + lending + stable
  const balanced = Math.abs(total - 100) < 0.01
  const amountNum = Number(amount.replace(/[^\d.]/g, ''))
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0

  const slice = (pctValue: number) =>
    hasAmount ? Math.round((amountNum * pctValue) / 100).toLocaleString('en-US') : '—'

  return (
    <form className="flex flex-col gap-6">
      {/* ── LE CLIENT ────────────────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs text-fg-tertiary">Client</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Client name</span>
            <input name="clientName" required className={FIELD} placeholder="Northwind Digital" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Reference</span>
            <input name="reference" required className={FIELD} placeholder="NORTHWIND-01" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Contact email</span>
            <input name="contactEmail" type="email" className={FIELD} placeholder="treasury@…" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Kind</span>
            <select name="clientKind" className={FIELD} defaultValue="">
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
              className={FIELD}
              placeholder="1 000 000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">Lock-up (months)</span>
            <input name="lockupMonths" type="number" defaultValue={24} className={FIELD} />
          </label>
        </div>
      </fieldset>

      {/* ── LE PROFIL ET SON ALLOCATION ──────────────────────────────── */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs text-fg-tertiary">
          Risk profile — seeds the allocation, never fixes it
        </legend>

        <div className="flex flex-wrap gap-2">
          {RISK_PROFILES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => pickProfile(r)}
              className={
                profile === r
                  ? 'rounded-full bg-accent-400 px-4 py-1.5 text-sm font-medium text-[#06140a]'
                  : 'rounded-full border border-console-line px-4 py-1.5 text-sm text-fg-secondary hover:border-accent-400'
              }
            >
              {RISK_PROFILE_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-4">
          {[
            { label: 'Mining Alpha', value: mining, set: setMining, name: 'miningPct' },
            { label: 'Bitcoin Lending', value: lending, set: setLending, name: 'lendingPct' },
            { label: 'USDC Yield', value: stable, set: setStable, name: 'stablePct' },
          ].map((row) => (
            <div key={row.name} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span>{row.label}</span>
                <span className="tabular-nums text-fg-secondary">
                  {row.value} % · ${slice(row.value)}
                </span>
              </div>
              <input
                type="range"
                name={row.name}
                min={0}
                max={100}
                step={1}
                value={row.value}
                onChange={(e) => row.set(Number(e.target.value))}
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!balanced}>
          Create offer
        </Button>
        <span className="text-xs text-fg-tertiary">
          Saved as a draft — nothing is sent to the client yet.
        </span>
      </div>
    </form>
  )
}
