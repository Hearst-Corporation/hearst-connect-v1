import type { VaultStatus } from '@/lib/vaults/model'
import clsx from 'clsx'

/**
 * What the service could establish about a vault, in one word.
 *
 * The three states are genuinely different facts and the reader has to be able
 * to tell them apart:
 *
 *   ACTIVE      the address holds code and the snapshot read cleanly
 *   NO_CODE     the read succeeded, and reported no contract at that address
 *   UNREADABLE  the service answered, and could not read the vault
 *
 * ── Where colour is spent ────────────────────────────────────────────────
 * `ACTIVE` is the ordinary case, so it gets the brand mint and nothing louder:
 * a vault behaving normally is not an event, and celebrating it in green would
 * spend the semantic tones on the state that needs no decision.
 *
 * The other two are real state claims made by the service, so they carry a
 * semantic tone — and in both cases the WORD carries the same information as
 * the colour, because a reader who cannot separate amber from red still has
 * to be able to act.
 */

const STATUS: Record<VaultStatus, { label: string; title: string; tone: string; dot: string }> = {
  ACTIVE: {
    label: 'Actif',
    title: 'The contract holds code and the vault snapshot was read.',
    tone: 'bg-white/5 text-zinc-700 ring-zinc-950/10 dark:text-zinc-200 dark:ring-console-line-strong',
    dot: 'bg-accent-600 dark:bg-accent-400',
  },
  NO_CODE: {
    label: 'Aucun code de contrat',
    title: 'The service read the address and found no contract code there.',
    tone: 'bg-danger-500/15 text-danger-700 ring-danger-500/30 dark:text-danger-400',
    dot: 'bg-danger-500 dark:bg-danger-400',
  },
  UNREADABLE: {
    label: 'Illisible',
    title: 'The service answered, and could not read the vault.',
    tone: 'bg-warning-500/15 text-warning-700 ring-warning-500/30 dark:text-warning-400',
    dot: 'bg-warning-500 dark:bg-warning-400',
  },
}

export function VaultStatusBadge({ status }: Readonly<{ status: VaultStatus }>) {
  const state = STATUS[status]

  return (
    <span
      title={state.title}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        state.tone,
      )}
    >
      {/* The dot is decoration: the label alone already says the state. */}
      <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', state.dot)} />
      {state.label}
    </span>
  )
}
