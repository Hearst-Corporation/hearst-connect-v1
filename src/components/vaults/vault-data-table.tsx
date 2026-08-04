import Link from 'next/link'
import { Panel } from '@/components/compositions'
import clsx from 'clsx'

import { Absent, gcc } from '@/components/layout/console'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { formatCurrency, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format'
import {
  REBALANCING_THRESHOLD_BPS,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  requiresRebalancing,
  valueOf,
  type Availability,
  type Vault,
} from '@/lib/vaults/model'

/**
 * The register of vaults — the console's principal surface.
 *
 * ── Why this table is shaped the way it is ────────────────────────────────
 * An admin reads this table to answer one question per column: whose vault is
 * this, is it readable, how much does it hold, how much of that is actually
 * working, and is there anything to do about it. Every column below answers
 * exactly one of those, and none of them is a derived score.
 *
 * Most of what an operator would want here has no source today — the service
 * exposes ONE vault and returns 404 for a client directory, and the contract
 * publishes no rebalancing timestamp. Those cells therefore render a named
 * absence with the route that would answer it, never a dash and never a zero.
 * A vault whose total the service could not read is still listed: dropping it
 * would quietly shrink the register, which is its own kind of fiction.
 */

/* ── Money ────────────────────────────────────────────────────────────────── */

/**
 * Atomic units are scaled by the decimals the SERVICE reports for the vault's
 * asset, not by a constant we assume. When the asset block is unreadable the
 * helper's own documented default (6 decimals, USDC) applies — that default
 * lives in `formatCurrency`, so the assumption is stated in exactly one place.
 */
function assetScale(vault: Vault): number | undefined {
  const asset = valueOf(vault.asset)
  if (asset === null) return undefined
  return 10 ** asset.decimals
}

function MoneyCell({ vault, reading }: Readonly<{ vault: Vault; reading: Availability<string | bigint> }>) {
  if (!isAvailable(reading)) return <Absent availability={reading} showRoute={false} />
  return (
    <span className="tabular-nums text-zinc-950 dark:text-white">
      {formatCurrency(reading.value.toString(), { fromAtomic: assetScale(vault) })}
    </span>
  )
}

/**
 * A drift is a gap between two shares, so it reads in POINTS with its sign —
 * "+2.15 pt". Raw basis points are the wire format, not a figure an operator
 * compares against a threshold at a glance.
 */
function driftPoints(bps: number): string {
  return `${formatNumber(bps / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`
}

const THRESHOLD_POINTS = formatNumber(REBALANCING_THRESHOLD_BPS / 100, { maximumFractionDigits: 2 })

/* ── Cells ────────────────────────────────────────────────────────────────── */

function ClientCell({ vault }: Readonly<{ vault: Vault }>) {
  const client = valueOf(vault.client)
  if (client === null) return <Absent availability={vault.client} showRoute={false} />
  return <VaultEntityLink kind="client" id={client.id} label={client.label} className="relative z-10" />
}

/** Deployed capital, with the share it represents when that share is readable. */
function DeployedCell({ vault }: Readonly<{ vault: Vault }>) {
  const bps = valueOf(vault.deployedBps)
  return (
    <>
      <MoneyCell vault={vault} reading={deployedAtomic(vault)} />
      {bps === null ? null : (
        <span className="mt-0.5 block text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
          {formatPercent(bps, { fromBps: true })} of total
        </span>
      )}
    </>
  )
}

/**
 * The pockets, each linking to its own anchor on the vault page.
 *
 * The count is what the service actually returned — a vault whose strategies
 * did not resolve shows the absence rather than "0 strategies", which would
 * assert that the vault deploys nothing.
 */
const POCKETS_SHOWN = 5

function StrategiesCell({ vault }: Readonly<{ vault: Vault }>) {
  const strategies = valueOf(vault.strategies)
  if (strategies === null) return <Absent availability={vault.strategies} showRoute={false} />

  const shown = strategies.slice(0, POCKETS_SHOWN)
  const hidden = strategies.length - shown.length

  return (
    <>
      <span className="tabular-nums text-zinc-950 dark:text-white">{formatNumber(strategies.length)}</span>
      <span className="mt-1 flex flex-wrap gap-1">
        {shown.map((strategy) => (
          <Link
            key={strategy.id}
            href={entityHref('strategy', strategy.id)}
            className="relative z-10 rounded px-1.5 py-0.5 font-mono text-[0.6875rem] text-zinc-500 ring-1 ring-inset ring-console-line-soft hover:text-zinc-950 hover:ring-console-line dark:text-zinc-400 dark:hover:text-white"
          >
            {strategy.pocket}
          </Link>
        ))}
        {hidden > 0 ? (
          <span className="px-1 py-0.5 text-[0.6875rem] text-zinc-500 dark:text-zinc-500">+{formatNumber(hidden)}</span>
        ) : null}
      </span>
    </>
  )
}

/**
 * The widest pocket drift, coloured only when it breaches the threshold.
 *
 * A semantic tone is a claim, so it is spent here and only here: the value is
 * ordinary data until it crosses a stated line, and the line itself is this
 * console's convention, named in the note under the table.
 */
function DriftCell({ vault }: Readonly<{ vault: Vault }>) {
  const bps = valueOf(vault.worstDriftBps)
  if (bps === null) return <Absent availability={vault.worstDriftBps} showRoute={false} />

  const breached = valueOf(requiresRebalancing(vault)) === true
  return (
    <span
      className={clsx(
        'tabular-nums',
        breached ? 'font-medium text-warning-600 dark:text-warning-400' : 'text-zinc-950 dark:text-white',
      )}
      title={breached ? `Beyond this console's ±${THRESHOLD_POINTS} pt threshold` : undefined}
    >
      {driftPoints(bps)}
    </span>
  )
}

/**
 * `rebalancing/status` answers UNAVAILABLE / `not_exposed_by_contract` on this
 * deployment, so this column is an absence today. It is written to render a
 * real timestamp the day the contract publishes one, without changing shape.
 */
function LastRebalanceCell({ vault }: Readonly<{ vault: Vault }>) {
  const rebalancing = valueOf(vault.rebalancing)
  if (rebalancing === null) return <Absent availability={vault.rebalancing} showRoute={false} />
  if (rebalancing.lastRebalanceAt === null) {
    return <span className="text-zinc-500 dark:text-zinc-500">Non renseigné</span>
  }
  return (
    <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
      {formatRelativeTime(rebalancing.lastRebalanceAt)}
    </span>
  )
}

/**
 * What the admin has to do about this row, in order of precedence: a vault
 * that does not read is inspected before its allocation is discussed; an
 * allocation that cannot be read yields no instruction at all; and "None"
 * is only said when the drift was genuinely measured.
 */
function PendingActionCell({ vault }: Readonly<{ vault: Vault }>) {
  if (vault.status !== 'ACTIVE') {
    return <VaultEntityLink kind="vault" id={vault.id} label="Inspecter le coffre" className="relative z-10" />
  }

  const breaches = valueOf(requiresRebalancing(vault))
  if (breaches === null) return <Absent availability={vault.worstDriftBps} showRoute={false} />
  if (breaches) {
    return <VaultEntityLink kind="keeper" id={vault.id} label="Traiter dans Keeper" className="relative z-10" />
  }
  return <span className="text-zinc-500 dark:text-zinc-500">Aucune</span>
}

/* ── Table ────────────────────────────────────────────────────────────────── */

const HEAD_CELL = 'px-4 py-3 font-medium whitespace-normal break-words'
const BODY_CELL = 'px-4 py-3 align-top'

export function VaultDataTable({ vaults }: Readonly<{ vaults: Availability<readonly Vault[]> }>) {
  const list = valueOf(vaults)

  if (list === null || list.length === 0) {
    return (
      <Panel tone="plain" className={gcc.heroChart}>
        <div className={gcc.heroHead}>
          <h3 className={gcc.cardTitle}>Registre des coffres</h3>
        </div>
        <div className={gcc.heroBody}>
          <p className={gcc.cellText}>
            {list === null
              ? 'Vault reading unavailable.'
              : 'The service answered without a vault in registry.'}
          </p>
          <Absent availability={vaults} showRoute />
          <Link href={entityHref('source', 'vault')} className="text-sm text-accent-300 underline underline-offset-2">
            Data coverage
          </Link>
        </div>
      </Panel>
    )
  }

  return (
    <Panel tone="plain" className={gcc.heroChart}>
      <div className={gcc.heroHead}>
        <h3 className={gcc.cardTitle}>Coffres</h3>
        <p className={gcc.cellText}>Threshold ±{THRESHOLD_POINTS} pt</p>
      </div>

      <div className={clsx(gcc.heroBody, 'overflow-x-auto')}>
        <table className="w-full min-w-[980px] table-fixed text-left text-sm">
          <caption className="sr-only">
            Coffres, leur client, leur état, leur valeur, le capital déployé et disponible, les stratégies, l’écart
            d’allocation, le dernier rééquilibrage et l’action en attente.
          </caption>
          <thead>
            <tr className="border-b border-zinc-950/10 text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
              <th scope="col" className={clsx(HEAD_CELL)}>
                Coffre
              </th>
              <th scope="col" className={HEAD_CELL}>
                Client
              </th>
              <th scope="col" className={HEAD_CELL}>
                État
              </th>
              <th scope="col" className={HEAD_CELL}>
                Valeur totale
              </th>
              <th scope="col" className={HEAD_CELL}>
                Déployé
              </th>
              <th scope="col" className={HEAD_CELL}>
                Disponible
              </th>
              <th scope="col" className={HEAD_CELL}>
                Stratégies
              </th>
              <th scope="col" className={HEAD_CELL}>
                Écart d’allocation
              </th>
              <th scope="col" className={HEAD_CELL}>
                Dernier rééquilibrage
              </th>
              {/*
                `table-fixed` répartit les dix colonnes à égalité : 98 px
                chacune, soit 66 px utiles une fois le padding retiré. La
                dernière porte le contenu le plus long (« Inspecter le coffre »,
                114 px) et le tronquait sur les quatre viewports. Une largeur
                explicite ici suffit — les autres colonnes se repartagent le
                reste, et la table garde son défilement horizontal.
              */}
              <th scope="col" className={clsx(HEAD_CELL, 'w-[9.5rem]')}>
                Action en attente
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
            {list.map((vault) => (
              /*
                The whole row opens the vault. A link inside a link is invalid
                HTML, so the row carries ONE anchor stretched over it and the
                real entity links are raised above it with `relative z-10` —
                they stay independently clickable and independently tabbable.
                Badges are deliberately NOT raised: they are not links, and a
                raised span would swallow the row click over its own area.
              */
              <tr key={vault.id} className="relative hover:bg-zinc-950/3 dark:hover:bg-white/3">
                <td className={clsx(BODY_CELL)}>
                  <Link
                    href={entityHref('vault', vault.id)}
                    className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-400"
                  >
                    <span className="sr-only">Open {vault.label}</span>
                  </Link>
                  <span className="block font-medium text-zinc-950 dark:text-white">{vault.label}</span>
                  {/* Short form only. The full address was ~330px of a ~700px
                      column and pushed six of the ten columns out of view; it
                      is on the vault page, and in this cell's title. */}
                  <span
                    className="mt-0.5 block font-mono text-[0.6875rem] text-zinc-500 dark:text-zinc-500"
                    title={vault.contractAddress}
                  >
                    {vault.chainId === null
                      ? `${vault.contractAddress.slice(0, 6)}…${vault.contractAddress.slice(-4)}`
                      : `chain ${vault.chainId} · ${vault.contractAddress.slice(0, 6)}…${vault.contractAddress.slice(-4)}`}
                  </span>
                </td>
                <td className={BODY_CELL}>
                  <ClientCell vault={vault} />
                </td>
                <td className={BODY_CELL}>
                  <VaultStatusBadge status={vault.status} />
                </td>
                <td className={BODY_CELL}>
                  <MoneyCell vault={vault} reading={vault.totalAssetsAtomic} />
                </td>
                <td className={BODY_CELL}>
                  <DeployedCell vault={vault} />
                </td>
                <td className={BODY_CELL}>
                  <MoneyCell vault={vault} reading={idleAtomic(vault)} />
                </td>
                <td className={BODY_CELL}>
                  <StrategiesCell vault={vault} />
                </td>
                <td className={BODY_CELL}>
                  <DriftCell vault={vault} />
                </td>
                <td className={BODY_CELL}>
                  <LastRebalanceCell vault={vault} />
                </td>
                <td className={clsx(BODY_CELL)}>
                  <PendingActionCell vault={vault} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3">
          <Link href={entityHref('source', 'vault')} className="text-sm text-accent-300 underline underline-offset-2">
            Data coverage
          </Link>
        </div>
      </div>
    </Panel>
  )
}
