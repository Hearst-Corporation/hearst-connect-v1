'use client'

import { requestDeposit, type DepositOutcome } from '@/lib/backend/deposit-request'
import { useActionState, useState } from 'react'

const INITIAL: DepositOutcome = {
  ok: false,
  problem: null,
  stateReason: null,
  trace: null,
  validationError: null,
  acceptedUsdc: null,
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

/**
 * Subscription intent form, folded behind the "Deposit" CTA.
 *
 * `minimum` and `capacity` are the very figures the page shows elsewhere; they
 * ride along as hidden fields so the server refuses on the same numbers the
 * user is reading. They stay a courtesy check — the backend decides.
 */
export function DepositForm({
  minimumUsdc,
  capacityUsdc,
}: Readonly<{ minimumUsdc: number | null; capacityUsdc: number | null }>) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(requestDeposit, INITIAL)

  // The backend's own words when it refuses; never a rewritten reason.
  const backendError = state.problem ? state.problem.detail : state.stateReason

  return (
    <div className="deposit-block">
      <button
        type="button"
        className="position-deposit-cta"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Deposit
      </button>

      {open ? (
        <form action={action} className="deposit-form">
          {minimumUsdc !== null ? <input type="hidden" name="minimumUsdc" value={minimumUsdc} /> : null}
          {capacityUsdc !== null ? <input type="hidden" name="capacityUsdc" value={capacityUsdc} /> : null}

          <label className="deposit-label" htmlFor="amountUsdc">
            Amount to subscribe
          </label>
          <div className="deposit-row">
            <input
              id="amountUsdc"
              name="amountUsdc"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={minimumUsdc !== null ? fmt(minimumUsdc) : '0'}
              disabled={pending}
              className="deposit-input"
              aria-describedby="deposit-help"
            />
            <span className="deposit-unit">USDC</span>
            <button type="submit" className="deposit-submit" disabled={pending}>
              {pending ? 'Sending…' : 'Submit'}
            </button>
          </div>

          <p id="deposit-help" className="deposit-help">
            {minimumUsdc !== null ? `Minimum ${fmt(minimumUsdc)} USDC.` : null}
            {minimumUsdc !== null && capacityUsdc !== null ? ' ' : null}
            {capacityUsdc !== null ? `${fmt(capacityUsdc)} USDC left to the cap.` : null}
          </p>

          {state.validationError ? (
            <p role="alert" className="deposit-error">
              {state.validationError}
            </p>
          ) : null}

          {backendError && !state.ok ? (
            <p role="alert" className="deposit-error">
              {backendError}
            </p>
          ) : null}

          {state.ok ? (
            <output className="deposit-ok">
              Request recorded for {state.acceptedUsdc !== null ? fmt(state.acceptedUsdc) : '—'} USDC. Your
              book position updates once the subscription is settled.
            </output>
          ) : null}
        </form>
      ) : (
        <p className="deposit-hint">Subscription request — the vault terms apply.</p>
      )}
    </div>
  )
}
