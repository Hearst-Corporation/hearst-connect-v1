'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { advanceClock, clearKyc, resetDemo, startDemo, type DemoOutcome } from './actions'
import type { DemoState } from './load'

/**
 * LE BOUTON DÉMO — présenter tout le parcours, de bout en bout, dans le produit.
 *
 * Six actes, dans l'ordre d'une vraie relation client :
 *   1. Onboarding — l'offre, la proposition, la réponse du client, le KYC/AML
 *      de Sumsub, l'appel de fonds, le virement, l'autorisation, le vault ouvert.
 *   2. Le premier mois — le mois se clôt, le reward se valide, l'électricité
 *      se paie (Settlement).
 *   3. Côté client — on change de siège : son tableau de bord, puis un retrait.
 *   4. Retour à la console — le retrait à valider, la dérive, le rééquilibrage.
 *   5. Une deuxième tranche — un nouveau versement ouvre un NOUVEAU vault.
 *   6. La fin du blocage — rendre la réserve en bitcoin, ou renouveler.
 *
 * Le panneau ne fait pas le parcours à la place du produit : il dit où l'on en
 * est et emmène au bon écran, où le vrai bouton attend. Il ne joue lui-même que
 * ce qui n'appartient pas à la console : la décision de Sumsub, et l'horloge.
 */

type Step = Readonly<{
  key: string
  act: string
  title: string
  detail: string
  href?: string
  cta?: string
  /** Un geste que le panneau joue lui-même. */
  play?: 'kyc' | { months: number; label: string }
  done: boolean
}>

const OPEN_KEY = 'hc-demo-open'

function stepsOf(s: DemoState): Step[] {
  const tour = s.tour
  if (tour === null) return []
  const o = s.offer
  const status = o?.status ?? null
  const clientId = o?.clientId ?? s.client?.id ?? null
  const client = clientId ? `/admin/clients/${clientId}` : '/admin/clients'
  const at = (list: string[]) => status !== null && list.includes(status)
  const cleared = s.client?.kyc === 'APPROVED' && (s.client?.aml ?? 'CLEAR') === 'CLEAR'
  const v1 = s.vaults[0] ?? null
  const withdrawals = s.vaults.flatMap((v) => v.withdrawals)
  const lockupMonths = v1 ? Math.max(1, Math.ceil((Date.parse(v1.lockupEndAt) - Date.parse(s.today)) / (30.44 * 86_400_000))) : 1
  const name = encodeURIComponent(s.client?.label ?? tour.clientName)

  const steps: Omit<Step, 'done'>[] = []
  const done: boolean[] = []
  const add = (step: Omit<Step, 'done'>, isDone: boolean) => {
    steps.push(step)
    done.push(isDone)
  }

  // ── 1. ONBOARDING ──────────────────────────────────────────────────────
  const A1 = 'Onboarding'
  add(
    {
      key: 'offer',
      act: A1,
      title: 'Prepare the offer',
      detail: `${tour.clientName} is a prospect. The form is pre-filled — show the risk profile seeding the allocation, and the projection following live. Then create the offer.`,
      href: `/admin/offers/new?client=${encodeURIComponent(tour.clientName)}`,
      cta: 'Open the offer form',
    },
    o !== null,
  )
  add(
    {
      key: 'send',
      act: A1,
      title: 'Send the proposal',
      detail: 'On the client page, under Emails: hit Send. It leaves from your Gmail, is logged on the HubSpot contact and deal, and records the step.',
      href: client,
      cta: 'Go to the client',
    },
    o !== null && status !== 'draft',
  )
  add(
    {
      key: 'answer',
      act: A1,
      title: 'The client accepts',
      detail: 'Switch seats: this is what the client receives. They accept from the proposal itself.',
      href: o ? `/proposal/${o.id}` : undefined,
      cta: 'Open the proposal',
    },
    at(['accepted', 'funding', 'funded', 'active']),
  )
  add(
    {
      key: 'kyc',
      act: A1,
      title: 'Sumsub clears KYC & AML',
      detail: 'Sumsub decides, never the console: in production its verdict arrives by webhook, and the client page links to the Sumsub file. Here the demo plays it.',
      play: 'kyc',
    },
    cleared,
  )
  add(
    {
      key: 'funding',
      act: A1,
      title: 'Call the funds',
      detail: 'KYC cleared: send the funding email from the client page. It carries the client’s Fireblocks deposit address — Fireblocks opened their vault account when they accepted.',
      href: client,
      cta: 'Go to the client',
    },
    at(['funding', 'funded', 'active']),
  )
  add(
    {
      key: 'vault',
      act: A1,
      title: 'Funds in — the vault opens',
      detail:
        'On the client page, follow the Next step box: the USDC lands on the Fireblocks address (Funds received), you authorise the deposit, then open the vault — converted into bitcoin at today’s price, its mining pocket buying machines. Show the reserve, the machines and the Fireblocks transactions.',
      href: client,
      cta: 'Go to the client',
    },
    at(['active']),
  )

  // ── 2. LE PREMIER MOIS ─────────────────────────────────────────────────
  const A2 = 'The first month'
  // L'horloge d'abord (tant que rien n'est clos), puis le lien vers la validation.
  const monthClosed = (v1?.monthsRewarded ?? 0) > 0
  add(
    {
      key: 'reward',
      act: A2,
      title: 'Close the month, validate the reward',
      detail: monthClosed
        ? 'The month is closed: the pockets produced, converted into bitcoin. Nothing reaches the client before an admin signs it off — approve it in « Waiting on you ».'
        : 'Move the calendar one month: the vault’s pockets produce, the result is converted into bitcoin, and a reward waits for sign-off.',
      ...(monthClosed ? { href: '/admin#distribution', cta: 'Open the decisions' } : { play: { months: 1, label: 'Close the month (+1)' } }),
    },
    (v1?.rewardsValidated ?? 0) > 0,
  )
  add(
    {
      key: 'electricity',
      act: A2,
      title: 'Settlement — pay the electricity',
      detail: 'The monthly gesture, vault by vault: what was mined, what the machines cost, what reaches the client. Pay this vault’s electricity.',
      href: '/admin/settlement',
      cta: 'Open Settlement',
    },
    Boolean(v1?.electricityPaid),
  )

  // ── 3. CÔTÉ CLIENT ─────────────────────────────────────────────────────
  const A3 = 'The client’s side'
  add(
    {
      key: 'account',
      act: A3,
      title: 'Their dashboard — and a withdrawal',
      detail: `Switch seats again: ${s.client?.label ?? tour.clientName}’s dashboard — the reserve in bitcoin, the month’s reward, the machines. Then hit Withdraw.`,
      href: '/account',
      cta: 'Open their dashboard',
    },
    withdrawals.length > 0,
  )

  // ── 4. RETOUR À LA CONSOLE ─────────────────────────────────────────────
  const A4 = 'Back to the console'
  add(
    {
      key: 'withdrawal',
      act: A4,
      title: 'Approve the withdrawal',
      detail: 'The request is waiting on the dashboard, in « Waiting on you ». Approving it creates the Fireblocks transaction: signers co-sign, then it is broadcast — follow it on the client page.',
      href: '/admin#withdrawal',
      cta: 'Open the decisions',
    },
    withdrawals.some((w) => w.status !== 'pending'),
  )
  const drifted = Boolean(v1?.drifting) || (v1?.rebalances ?? 0) > 0
  add(
    {
      key: 'rebalance',
      act: A4,
      title: 'Six months later — rebalance',
      detail: drifted
        ? 'The allocation left its band. The keeper proposes the move; approve it on the client page and the vault returns to its target — a Fireblocks contract call.'
        : 'Markets move, production accumulates: let six months pass and the allocation drifts away from its target.',
      ...(drifted ? { href: client, cta: 'Go to the client' } : { play: { months: 6, label: '+6 months' } }),
    },
    (v1?.rebalances ?? 0) > 0,
  )

  // ── 5. UNE DEUXIÈME TRANCHE ────────────────────────────────────────────
  const A5 = 'A second vault'
  const trancheOffered = s.offers.length >= 2
  add(
    {
      key: 'tranche',
      act: A5,
      title: 'The client invests again',
      detail: trancheOffered
        ? 'Same journey, faster — KYC is already cleared. From the client page: send, accept, fund, authorise, open.'
        : 'A new deposit never tops up the first vault: it opens a new one, at today’s entry price, with its own lockup. The form is pre-filled.',
      href: trancheOffered ? client : clientId ? `/admin/offers/new?clientId=${clientId}&client=${name}&tranche=2` : undefined,
      cta: trancheOffered ? 'Go to the client' : 'Prepare vault 2',
    },
    s.vaults.length >= 2,
  )

  // ── 6. LA FIN DU BLOCAGE ───────────────────────────────────────────────
  const A6 = 'End of the lockup'
  const ended = Boolean(v1?.lockupEnded)
  add(
    {
      key: 'release',
      act: A6,
      title: 'End of lockup — release or renew',
      detail: ended
        ? 'Two outcomes, on the client page: return the reserve to the client in bitcoin (a Fireblocks transfer), or renew as a new vault.'
        : 'Fast-forward to the end of the first vault’s lockup.',
      ...(ended ? { href: client, cta: 'Go to the client' } : { play: { months: lockupMonths, label: `Jump ${lockupMonths} months` } }),
    },
    Boolean(v1?.released),
  )

  /* Une étape passée le reste : le mois suivant remet l'électricité à payer,
     mais la démo a déjà montré le geste. Une étape est faite si elle l'est,
     ou si une étape plus loin l'est. */
  for (let i = done.length - 2; i >= 0; i--) done[i] = done[i] || done[i + 1]
  return steps.map((st, i) => ({ ...st, done: done[i] }))
}

function ActionButton({
  action,
  label,
  pendingLabel,
  fields,
  primary,
}: Readonly<{
  action: (prev: DemoOutcome | null, form: FormData) => Promise<DemoOutcome>
  label: string
  pendingLabel: string
  fields?: Record<string, string>
  primary?: boolean
}>) {
  const [outcome, run, pending] = useActionState<DemoOutcome | null, FormData>(action, null)
  return (
    <form action={run} className="flex flex-col gap-1">
      {Object.entries(fields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex h-8 items-center justify-center rounded-full px-3.5 text-xs font-medium disabled:opacity-50 ${
          primary ? 'bg-[#9eea7a] text-[#06140a] hover:bg-[#b4f294]' : 'text-white ring-1 ring-white/20 hover:bg-white/10'
        }`}
      >
        {pending ? pendingLabel : label}
      </button>
      {outcome?.ok === false ? <p className="text-[11px] text-amber-300">{outcome.error}</p> : null}
    </form>
  )
}

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function DemoPanel({ state }: Readonly<{ state: DemoState }>) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === '1') setOpen(true)
    } catch {}
  }, [])
  /* Chaque changement d'écran replie le panneau : l'écran d'arrivée est ce
     qu'on présente (démarrer mène au formulaire d'offre, une étape à sa page). */
  const pathname = usePathname()
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }
  const toggle = (next: boolean) => {
    setOpen(next)
    try {
      localStorage.setItem(OPEN_KEY, next ? '1' : '0')
    } catch {}
  }

  const steps = stepsOf(state)
  const current = steps.findIndex((s) => !s.done)
  const finished = steps.length > 0 && current === -1
  const live = state.vaults.length > 0
  const acts = [...new Set(steps.map((s) => s.act))]
  const currentAct = current >= 0 ? steps[current].act : null

  const pill =
    state.tour === null ? 'Demo' : finished ? 'Demo · complete' : `Demo · ${current + 1}/${steps.length} · ${steps[current].title}`

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => toggle(true)}
        className="fixed right-4 bottom-4 z-[60] inline-flex h-10 max-w-[calc(100vw-32px)] items-center gap-2 truncate rounded-full bg-[#0b120a] px-4 text-sm font-medium text-white shadow-lg ring-1 ring-[#9eea7a]/40 hover:ring-[#9eea7a] print:hidden"
      >
        <span className="size-2 shrink-0 rounded-full bg-[#9eea7a]" />
        <span className="truncate">{pill}</span>
      </button>
    )
  }

  return (
    <aside className="fixed right-4 bottom-4 z-[60] flex max-h-[min(680px,calc(100vh-32px))] w-[390px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl bg-[#0b120a] text-white shadow-2xl ring-1 ring-[#9eea7a]/40 print:hidden">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex flex-col">
          <p className="text-[11px] tracking-[0.12em] text-[#9eea7a] uppercase">Guided demo · fictional data</p>
          <p className="text-sm font-medium">
            {state.tour ? (state.client?.label ?? state.tour.clientName) : 'The whole journey, end to end'}
            <span className="font-normal text-white/50"> · {monthLabel(state.today)}</span>
          </p>
        </div>
        <button type="button" onClick={() => toggle(false)} className="rounded-full px-2 text-lg text-white/60 hover:text-white" aria-label="Close the demo panel">
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {state.tour === null ? (
          <StartForm />
        ) : (
          <div className="flex flex-col gap-3">
            {acts.map((act, ai) => {
              const inAct = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.act === act)
              const actDone = inAct.every(({ s }) => s.done)
              const isCurrentAct = act === currentAct
              return (
                <section key={act}>
                  <p className={`mb-1 text-[11px] tracking-[0.1em] uppercase ${isCurrentAct ? 'text-[#9eea7a]' : actDone ? 'text-white/40' : 'text-white/50'}`}>
                    {ai + 1}. {act}
                    {actDone ? ' ✓' : ''}
                  </p>
                  {/* Un acte terminé ou à venir se replie : on lit l'acte en cours. */}
                  {isCurrentAct ? (
                    <ol className="flex flex-col gap-0.5">
                      {inAct.map(({ s, i }) => (
                        <StepRow
                          key={s.key}
                          step={s}
                          index={i}
                          current={i === current}
                          clientId={state.client?.id ?? ''}
                          onGo={() => toggle(false)}
                        />
                      ))}
                    </ol>
                  ) : null}
                </section>
              )
            })}
            {finished ? (
              <p className="rounded-xl bg-[#9eea7a]/[0.08] px-3 py-2 text-xs text-white/80 ring-1 ring-[#9eea7a]/30">
                The whole journey is done — from a prospect to a released reserve. Restart to present it again.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-white/10 px-4 py-2.5">
        {live ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/40">Clock</span>
            <ActionButton action={advanceClock} label="+1 month" pendingLabel="…" fields={{ months: '1' }} />
            <ActionButton action={advanceClock} label="+6 months" pendingLabel="…" fields={{ months: '6' }} />
            <Link href="/account" className="ml-auto text-[11px] text-[#9eea7a] no-underline hover:underline">
              Client view →
            </Link>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-white/40">All figures are fictional.</p>
          <div className="flex gap-2">
            {state.tour !== null ? <ActionButton action={startDemo} label="Restart" pendingLabel="…" fields={{ clientName: state.tour.clientName }} /> : null}
            <ActionButton action={resetDemo} label="Reset" pendingLabel="…" />
          </div>
        </div>
      </footer>
    </aside>
  )
}

function StepRow({
  step: s,
  index,
  current,
  clientId,
  onGo,
}: Readonly<{ step: Step; index: number; current: boolean; clientId: string; onGo: () => void }>) {
  /* Déjà sur l'écran de l'étape : le lien ne mènerait nulle part, et le
     panneau cache justement ce qu'il faut montrer. On propose de le replier. */
  const pathname = usePathname()
  const here = s.href !== undefined && s.href.split('?')[0] === pathname
  return (
    <li className={`rounded-xl px-3 py-2 ${current ? 'bg-[#9eea7a]/[0.08] ring-1 ring-[#9eea7a]/30' : ''}`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
            s.done ? 'bg-[#9eea7a] text-[#06140a]' : current ? 'text-[#9eea7a] ring-1 ring-[#9eea7a]' : 'text-white/40 ring-1 ring-white/20'
          }`}
        >
          {s.done ? '✓' : index + 1}
        </span>
        <span className={`text-[13px] ${s.done ? 'text-white/50' : current ? 'font-medium' : 'text-white/70'}`}>{s.title}</span>
      </div>
      {current ? (
        <div className="mt-2 flex flex-col gap-2.5 pl-7.5">
          <p className="text-xs text-white/70">{s.detail}</p>
          <div className="flex flex-wrap gap-2">
            {s.play === 'kyc' ? (
              <ActionButton action={clearKyc} label="Sumsub clears KYC & AML" pendingLabel="Clearing…" fields={{ clientId }} primary />
            ) : s.play ? (
              <ActionButton action={advanceClock} label={s.play.label} pendingLabel="Moving the calendar…" fields={{ months: String(s.play.months) }} primary />
            ) : here ? (
              <button
                type="button"
                onClick={onGo}
                className="inline-flex h-8 items-center rounded-full bg-[#9eea7a] px-3.5 text-xs font-medium text-[#06140a] hover:bg-[#b4f294]"
              >
                You’re on it — hide this panel
              </button>
            ) : s.href ? (
              // Le panneau se replie : l'écran de l'étape est ce qu'on présente.
              <Link
                href={s.href}
                onClick={onGo}
                className="inline-flex h-8 items-center rounded-full bg-[#9eea7a] px-3.5 text-xs font-medium text-[#06140a] no-underline hover:bg-[#b4f294]"
              >
                {s.cta} →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}

function StartForm() {
  const [outcome, run, pending] = useActionState<DemoOutcome | null, FormData>(startDemo, null)
  return (
    <form action={run} className="flex flex-col gap-3">
      <p className="text-xs text-white/70">
        Starts from a clean book with one prospect, and walks the whole relationship in six acts: onboarding, the first month,
        the client’s side, operations, a second vault, and the end of the lockup.
      </p>
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Prospect name
        <input
          name="clientName"
          defaultValue="Orbit Capital"
          className="h-9 rounded-lg bg-white/5 px-3 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-[#9eea7a]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded-full bg-[#9eea7a] text-sm font-medium text-[#06140a] hover:bg-[#b4f294] disabled:opacity-50"
      >
        {pending ? 'Starting…' : 'Start the demo'}
      </button>
      {outcome?.ok === false ? <p className="text-[11px] text-amber-300">{outcome.error}</p> : null}
    </form>
  )
}
