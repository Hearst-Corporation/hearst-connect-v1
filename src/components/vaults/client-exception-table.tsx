import clsx from 'clsx'

import { Absent, Panel, gcc } from '@/components/design-lab/green-command-center/primitives'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { formatAddress, formatDateTime, formatRelativeTime } from '@/lib/format'
import { motifLisible } from '@/lib/mouvements'
import {
  isAvailable,
  parseVaultId,
  type Availability,
  type ClientException,
  type ClientIssue,
  type Unavailable,
  type VaultId,
} from '@/lib/vaults/model'
import Link from 'next/link'

/**
 * Client exceptions — the client-side work items an admin has to clear.
 *
 * ── Why the three states are not interchangeable ──────────────────────────
 * This surface has to keep two facts apart that look identical on screen if
 * you are careless:
 *
 *   · the service enumerated its clients and none of them is in trouble
 *     → "No client exceptions detected." — a positive claim, and a real one;
 *   · the service has no client directory to enumerate
 *     → the directory is not exposed, and NOTHING is claimed about clients.
 *
 * Today only the second is true: `GET /api/v1/clients` does not exist (404,
 * verified against production 2026-07-28), so `registry.clientExceptions` is
 * `unavailable` with the reason `no_client_directory_endpoint` — except in
 * the one case the service does attest, where `dashboard.identity` reports
 * `no_investor_record` for the signed-in account and that single, real work
 * item is carried through.
 *
 * The empty branch below is therefore dead today on purpose. It is what runs
 * the day a directory endpoint appears, and writing it now is what stops the
 * next person from reaching for "No client exceptions detected." as a generic
 * fallback for an absent source.
 */

/** The one link this surface offers to the technical explanation of an absence. */
const DATA_COVERAGE_HREF = entityHref('source', 'data-coverage')

const LINK_CLASS = 'text-accent-600 hover:underline dark:text-accent-400'

type ExceptionColumn = Readonly<{
  key: string
  header: string
  className?: string
  cell: (row: ClientException) => React.ReactNode
}>

/* ── The issue vocabulary ─────────────────────────────────────────────────── */

/**
 * Every issue of the model gets a short column label and a human sentence.
 *
 * All six are written even though the registry only produces
 * `MISSING_INVESTOR_RECORD` today: the union is exhaustive, so a new issue
 * wired into the loader tomorrow cannot reach the screen as a raw enum name.
 */
const ISSUE_LABEL: Record<ClientIssue, string> = {
  NO_VAULT_ASSIGNED: 'No vault assigned',
  COMPLIANCE_REVIEW_PENDING: 'Compliance review pending',
  VAULT_INACTIVE: 'Vault inactive',
  DEPLOYMENT_BLOCKED: 'Deployment blocked',
  MISSING_INVESTOR_RECORD: 'No investor record',
  NO_ACTIVE_STRATEGY: 'No active strategy',
}

const ISSUE_SENTENCE: Record<ClientIssue, string> = {
  NO_VAULT_ASSIGNED: 'No vault is attached to this client, so nothing can be deployed for them.',
  COMPLIANCE_REVIEW_PENDING: 'A compliance review is open and holds this client back from operating.',
  VAULT_INACTIVE: 'The vault attached to this client is not active on its chain.',
  DEPLOYMENT_BLOCKED: 'A deployment requested for this client has not confirmed.',
  MISSING_INVESTOR_RECORD: 'The service reports no investor record attached to this account.',
  NO_ACTIVE_STRATEGY: 'The vault attached to this client has no strategy taking capital.',
}

/* ── Absence wording ──────────────────────────────────────────────────────── */

/**
 * The service's machine reasons, said in one sentence.
 *
 * A reason this map does not know falls through to the shared dictionary in
 * `@/lib/mouvements`, and only then to a generic sentence — which still says
 * "unavailable", never "none".
 */
const ABSENCE_SENTENCE: Record<string, string> = {
  no_client_directory_endpoint:
    'The client directory is not exposed by the service, so client exceptions cannot be enumerated.',
}

function absenceSentence(state: Unavailable): string {
  const known = state.reason === null ? undefined : ABSENCE_SENTENCE[state.reason]
  if (known !== undefined) return known
  const motif = motifLisible(state.reason)
  return motif === undefined
    ? 'Client exceptions are unavailable — the service did not enumerate clients.'
    : `Client exceptions are unavailable — ${motif}.`
}

/* ── Cells ────────────────────────────────────────────────────────────────── */

/**
 * A vault reference the console can name without a label source.
 *
 * The identifier carries the chain and the contract, so the contract's short
 * form is a description of the object rather than an invented name.
 */
function vaultShortLabel(id: VaultId): string {
  const parsed = parseVaultId(id)
  if (parsed === null) return id
  return formatAddress(parsed.contractAddress) ?? id
}

function ClientCell({ row }: Readonly<{ row: ClientException }>) {
  // With no client record behind the label there is nothing to open, so the
  // name renders as text. Linking it would promise a destination that cannot
  // resolve this client.
  if (row.clientId === null) {
    return <span className="font-medium text-zinc-950 dark:text-white">{row.clientLabel}</span>
  }
  return <VaultEntityLink kind="client" id={row.clientId} label={row.clientLabel} />
}

/**
 * The label must not wrap and the sentence must not set the column width.
 *
 * This table gets six of twelve columns on the dashboard — roughly 530px for
 * six columns. Left to itself, the explanatory sentence claimed a prose
 * measure, the browser gave the Issue column what was left, and "No investor
 * record" came out one word per line beside a 40px-wide neighbour. The label
 * is the column; the sentence is a second line that wraps inside whatever the
 * label already established.
 */
function IssueCell({ row }: Readonly<{ row: ClientException }>) {
  return (
    <div className="min-w-0">
      <span className="block font-medium whitespace-nowrap text-zinc-950 dark:text-white">
        {ISSUE_LABEL[row.issue]}
      </span>
      <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {ISSUE_SENTENCE[row.issue]}
      </span>
    </div>
  )
}

function RelatedVaultCell({ row }: Readonly<{ row: ClientException }>) {
  // `null` here is not an unreadable field: the model says this exception
  // carries no vault reference. Saying "Unavailable" would report a source
  // problem where there is none.
  if (row.relatedVaultId === null) {
    return <span className="text-zinc-500 dark:text-zinc-400">Not linked to a vault</span>
  }
  return (
    <VaultEntityLink
      kind="vault"
      id={row.relatedVaultId}
      label={vaultShortLabel(row.relatedVaultId)}
      className="font-mono"
    />
  )
}

function TextOrSource({ value }: Readonly<{ value: Availability<string> }>) {
  if (!isAvailable(value)) return <Absent availability={value} showRoute={false} />
  if (value.value === '') return <span className="text-zinc-500 dark:text-zinc-400">—</span>
  return <span className="text-zinc-700 dark:text-zinc-300">{value.value}</span>
}

function TimestampCell({ value }: Readonly<{ value: Availability<string> }>) {
  if (!isAvailable(value)) return <Absent availability={value} showRoute={false} />
  if (value.value === '') return <span className="text-zinc-500 dark:text-zinc-400">—</span>
  return (
    <span className="tabular-nums text-zinc-700 dark:text-zinc-300" title={formatDateTime(value.value)}>
      {formatRelativeTime(value.value)}
    </span>
  )
}

const COLUMNS: readonly ExceptionColumn[] = [
  { key: 'client', header: 'Client', cell: (row) => <ClientCell row={row} /> },
  { key: 'issue', header: 'Issue', cell: (row) => <IssueCell row={row} /> },
  { key: 'vault', header: 'Related vault', cell: (row) => <RelatedVaultCell row={row} /> },
  { key: 'compliance', header: 'Compliance', cell: (row) => <TextOrSource value={row.compliance} /> },
  {
    key: 'activity',
    header: 'Last activity',
    className: 'whitespace-nowrap',
    cell: (row) => <TimestampCell value={row.lastActivityAt} />,
  },
  {
    key: 'action',
    header: 'Action',
    className: 'whitespace-nowrap',
    // An exception you cannot act on is a complaint. The entity carries the
    // page that resolves it, so the link is never guessed here.
    cell: (row) => (
      <Link href={row.actionHref} className={LINK_CLASS}>
        {row.actionLabel}
      </Link>
    ),
  },
] as const

const HEAD_CELL = 'px-3 py-2 font-medium whitespace-normal break-words'
const BODY_CELL = 'px-3 py-2 align-top'

/* ── Card chrome ──────────────────────────────────────────────────────────── */

function Heading({ exceptions }: Readonly<{ exceptions: Availability<readonly ClientException[]> }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h3 className={gcc.cardTitle}>Client exceptions</h3>
      <Absent availability={exceptions} showRoute={false} />
    </div>
  )
}

/* ── The surface ──────────────────────────────────────────────────────────── */

export function ClientExceptionTable({
  exceptions,
}: Readonly<{ exceptions: Availability<readonly ClientException[]> }>) {
  if (!isAvailable(exceptions)) {
    return (
      <Panel className={gcc.wavePanel}>
        <div className={gcc.heroHead}>
          <Heading exceptions={exceptions} />
        </div>
        <div className={gcc.heroBody}>
          <p className={gcc.cellText}>{absenceSentence(exceptions)}</p>
          <Link href={DATA_COVERAGE_HREF} className={LINK_CLASS}>
            Data coverage
          </Link>
        </div>
      </Panel>
    )
  }

  if (exceptions.value.length === 0) {
    // Only reachable once a client directory exists. Until then the branch
    // above runs, and this sentence is never printed over an absent source.
    return (
      <Panel className={gcc.wavePanel}>
        <div className={gcc.heroHead}>
          <Heading exceptions={exceptions} />
        </div>
        <div className={gcc.heroBody}>
          <p className={gcc.cellText}>
          No client exceptions detected. The service enumerated its clients and none of them is in an
          exception state.
          </p>
        </div>
      </Panel>
    )
  }

  return (
    <Panel className={gcc.wavePanel}>
      <div className={gcc.heroHead}>
        <Heading exceptions={exceptions} />
      </div>
      <div className={clsx(gcc.heroBody, 'overflow-x-auto')}>
        <table className="w-full min-w-[860px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-950/10 text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
              {COLUMNS.map((column) => (
                <th key={column.key} className={clsx(HEAD_CELL, column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
            {exceptions.value.map((row) => (
              <tr key={`${row.clientId ?? row.clientLabel}·${row.issue}`}>
                {COLUMNS.map((column) => (
                  <td key={`${row.clientId ?? row.clientLabel}-${column.key}`} className={clsx(BODY_CELL, column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
