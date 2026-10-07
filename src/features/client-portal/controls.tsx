'use client'

import { useState, useTransition } from 'react'
import { addWallet, investMore, requestPortalWithdrawal, setEndOfTerm, setNotification } from './actions'

/* Les gestes du client, chacun dans son contrôle. Rien ne part sans un clic,
   et le refus du backend s'affiche à l'endroit où l'on a agi. */

const INPUT =
  'h-11 w-full rounded-lg bg-white/5 px-3 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-[var(--hearst-green)]'
const SECONDARY =
  'inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5'

function Dialog({ title, subtitle, onClose, children }: Readonly<{ title: string; subtitle: string; onClose: () => void; children: React.ReactNode }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d0f0d] p-6 text-white ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-medium">{title}</p>
            <p className="text-sm text-white/60">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-white/50 hover:text-white" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export type WithdrawVault = Readonly<{ vaultId: string; label: string; availableBtc: number }>
export type WithdrawWallet = Readonly<{ id: string; label: string; address: string; status: string; activeFrom: string }>

/**
 * RETIRER — un vault, un portefeuille AUTORISÉ, un montant en bitcoin.
 * « Max » arrondit vers le bas : jamais plus que le disponible. La demande part
 * à Hearst ; son suivi (approuvé, co-signé, confirmé) se lit dans Activity.
 */
export function WithdrawButton({
  vaults,
  wallets,
  spotUsd,
  className = 'ud-cta inline-flex h-9 items-center',
}: Readonly<{ vaults: readonly WithdrawVault[]; wallets: readonly WithdrawWallet[]; spotUsd: number; className?: string }>) {
  const usable = vaults.filter((v) => v.availableBtc >= 0.0001)
  const [open, setOpen] = useState(false)
  const [vaultId, setVaultId] = useState(usable[0]?.vaultId ?? '')
  const active = wallets.filter((w) => w.status === 'active')
  const [walletId, setWalletId] = useState(active[0]?.id ?? '')
  const vault = usable.find((v) => v.vaultId === vaultId)
  const max = vault ? (Math.floor(vault.availableBtc * 10_000) / 10_000).toFixed(4) : '0.0000'
  const [amount, setAmount] = useState(max)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (usable.length === 0) {
    return (
      <button type="button" disabled className={`${className} cursor-not-allowed opacity-40`} title="Nothing available to withdraw yet">
        Withdraw
      </button>
    )
  }
  const n = Number(amount.replace(',', '.'))
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDone(false)
          setError(null)
          setAmount(max)
          setOpen(true)
        }}
        className={className}
      >
        Withdraw
      </button>
      {open ? (
        <Dialog title="Withdraw bitcoin" subtitle="To one of your whitelisted wallets, after Hearst’s validation." onClose={() => setOpen(false)}>
          {done ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/80">
                {n.toFixed(4)} BTC requested. Follow it in Activity: approved by Hearst, co-signed in Fireblocks, then confirmed on-chain.
              </p>
              <button type="button" onClick={() => setOpen(false)} className="ud-cta inline-flex h-9 items-center self-end">
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {usable.length > 1 ? (
                <label className="flex flex-col gap-1.5 text-sm text-white/70">
                  From
                  <select
                    className={INPUT}
                    value={vaultId}
                    onChange={(e) => {
                      setVaultId(e.target.value)
                      const v = usable.find((x) => x.vaultId === e.target.value)
                      setAmount(v ? (Math.floor(v.availableBtc * 10_000) / 10_000).toFixed(4) : '')
                    }}
                  >
                    {usable.map((v) => (
                      <option key={v.vaultId} value={v.vaultId}>
                        {v.label} · {v.availableBtc.toFixed(4)} BTC available
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm text-white/70">
                To
                <select className={INPUT} value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} disabled={w.status !== 'active'}>
                      {w.label} · {w.address.slice(0, 8)}…{w.address.slice(-6)}
                      {w.status !== 'active' ? ' (cooling period)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/70">
                Amount (BTC)
                <div className="flex gap-2">
                  <input className={INPUT} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <button type="button" onClick={() => setAmount(max)} className="h-11 rounded-lg px-3 text-xs text-white/70 ring-1 ring-white/15 hover:bg-white/5">
                    Max
                  </button>
                </div>
              </label>
              <p className="text-xs text-white/50">
                Available {max} BTC{Number.isFinite(n) && n > 0 ? ` · this request ≈ $${Math.round(n * spotUsd).toLocaleString('en-US')}` : ''}
              </p>
              {error ? <p className="text-sm text-amber-300">{error}</p> : null}
              <button
                type="button"
                disabled={pending || !walletId}
                onClick={() =>
                  start(async () => {
                    setError(null)
                    const out = await requestPortalWithdrawal(vaultId, walletId, n)
                    if (out.ok) setDone(true)
                    else setError(out.error)
                  })
                }
                className="ud-cta inline-flex h-9 items-center self-end disabled:opacity-50"
              >
                {pending ? 'Sending…' : 'Request the withdrawal'}
              </button>
            </div>
          )}
        </Dialog>
      ) : null}
    </>
  )
}

/** INVESTIR DAVANTAGE — un nouveau versement ouvre un nouveau vault ; la demande va à son interlocuteur. */
export function InvestMoreButton({ ownerName, className = SECONDARY }: Readonly<{ ownerName: string; className?: string }>) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Invest more
      </button>
      {open ? (
        <Dialog title="Invest more" subtitle={`A new deposit opens a new vault, at that day’s entry price. ${ownerName} prepares the proposal.`} onClose={() => setOpen(false)}>
          {done ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/80">{ownerName} has your request and will send a proposal shortly.</p>
              <button type="button" onClick={() => setOpen(false)} className="ud-cta inline-flex h-9 items-center self-end">
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm text-white/70">
                Amount you have in mind (USDC)
                <input className={INPUT} inputMode="numeric" placeholder="e.g. 500,000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/70">
                Anything we should know
                <textarea className={`${INPUT} h-24 py-2`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Timing, lockup, allocation…" />
              </label>
              {error ? <p className="text-sm text-amber-300">{error}</p> : null}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const n = Number(amount.replace(/[^\d.]/g, ''))
                    const out = await investMore(Number.isFinite(n) && n > 0 ? n : null, note)
                    if (out.ok) setDone(true)
                    else setError(out.error)
                  })
                }
                className="ud-cta inline-flex h-9 items-center self-end disabled:opacity-50"
              >
                {pending ? 'Sending…' : `Send to ${ownerName.split(' ')[0]}`}
              </button>
            </div>
          )}
        </Dialog>
      ) : null}
    </>
  )
}

/** LA FIN DU BLOCAGE — le client dit à l'avance ce qu'il veut : récupérer sa réserve, ou la renouveler. */
export function EndOfTermChoice({ vaultId, value }: Readonly<{ vaultId: string; value: string }>) {
  const [choice, setChoice] = useState(value)
  const [pending, start] = useTransition()
  const options = [
    { id: 'release', label: 'Receive my reserve' },
    { id: 'renew', label: 'Renew as a new vault' },
    { id: 'undecided', label: 'Not decided yet' },
  ] as const
  return (
    <div className="ud-seg flex-wrap" role="group" aria-label="At the end of the lockup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={pending}
          aria-pressed={choice === o.id}
          onClick={() => {
            setChoice(o.id)
            start(async () => {
              await setEndOfTerm(vaultId, o.id)
            })
          }}
          className={`ud-seg-btn${choice === o.id ? ' active' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Un interrupteur de notification, enregistré au clic. */
export function NotificationSwitch({
  id,
  label,
  detail,
  value,
  icon = null,
}: Readonly<{ id: string; label: string; detail: string; value: boolean; icon?: React.ReactNode }>) {
  const [on, setOn] = useState(value)
  const [, start] = useTransition()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="flex flex-col">
          <span className="text-sm text-fg">{label}</span>
          <span className="text-xs text-fg-tertiary">{detail}</span>
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => {
          const next = !on
          setOn(next)
          start(async () => {
            await setNotification(id, next)
          })
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full p-0 transition-colors ${on ? 'bg-[var(--hearst-green)]' : 'bg-white/15'}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

/** AJOUTER UN PORTEFEUILLE — utilisable après 48 h : la période qui arrête une demande détournée. */
export function AddWalletForm() {
  const [label, setLabel] = useState('')
  const [network, setNetwork] = useState('Bitcoin')
  const [address, setAddress] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <input className={INPUT} placeholder="Label — e.g. Custody account" value={label} onChange={(e) => setLabel(e.target.value)} />
        <select className={INPUT} value={network} onChange={(e) => setNetwork(e.target.value)}>
          <option>Bitcoin</option>
          <option>Ethereum</option>
        </select>
      </div>
      <input className={`${INPUT} font-mono text-xs`} placeholder="Wallet address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-tertiary">A new address can receive bitcoin 48 h after you add it.</p>
        <button
          type="button"
          disabled={pending || address.trim().length < 20}
          onClick={() =>
            start(async () => {
              const out = await addWallet(label.trim() || 'Wallet', network, address.trim())
              setMsg(out.ok ? { ok: true, text: 'Added — usable in 48 h.' } : { ok: false, text: out.error ?? 'Refused.' })
              if (out.ok) {
                setLabel('')
                setAddress('')
              }
            })
          }
          className="ud-cta inline-flex h-9 items-center disabled:opacity-40"
        >
          {pending ? 'Adding…' : 'Add wallet'}
        </button>
      </div>
      {msg ? <p className={`text-xs ${msg.ok ? 'text-[var(--hearst-green)]' : 'text-amber-300'}`}>{msg.text}</p> : null}
    </div>
  )
}
