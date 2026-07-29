import { formatRelativeTime } from '@/lib/format'
import { libelleMouvement } from '@/lib/mouvements'
import { isAvailable, type Availability, type ClientException, type Movement } from '@/lib/vaults/model'
import { Absent, gcc, Panel } from './primitives'

/**
 * The 2×2 information grid at the bottom centre — the reference's four cells,
 * carrying the four lower surfaces of `/admin`.
 *
 * Reference geometry kept: the 560px column, the two-by-two split, the 34/38px
 * padding, the hairline separators that stop before the last row, the 10px
 * heading over 8px lines, the 30px accent medallion in the health cell.
 *
 * Content mapping (reference → real):
 *   "Vault Register"          → client exceptions actually blocking someone
 *   "Recommendation"          → the deployment queue's own state
 *   "Infrastructure Health"   → live sources over declared sources
 *   "Recent Activity"         → the last movements from the ledger
 */

export function GreenInfoGrid({
  exceptions,
  deployments,
  sourcesLive,
  sourcesNote,
  movements,
}: Readonly<{
  exceptions: Availability<readonly ClientException[]>
  deployments: Availability<unknown>
  sourcesLive: Availability<string>
  sourcesNote: string
  movements: Availability<readonly Movement[]>
}>) {
  return (
    <Panel as="section" className={gcc.infoGrid} aria-label="Operational detail" data-gcc="info-grid">
      {/* ── Client exceptions ─────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <h3>Client exceptions</h3>
        {isAvailable(exceptions) ? (
          exceptions.value.length === 0 ? (
            <p>No client is currently blocked.</p>
          ) : (
            exceptions.value.slice(0, 3).map((exception) => (
              <p key={`${exception.clientLabel}-${exception.issue}`}>
                {exception.clientLabel} · {exception.issue.toLowerCase().replaceAll('_', ' ')}
              </p>
            ))
          )
        ) : (
          <Absent availability={exceptions} />
        )}
      </article>

      {/* ── Deployment queue ──────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <h3>Deployment queue</h3>
        {isAvailable(deployments) ? (
          <p>Queue readable.</p>
        ) : (
          <>
            <p>No deployment ledger is exposed by the service.</p>
            <Absent availability={deployments} />
          </>
        )}
      </article>

      {/* ── Source health ─────────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <h3>Source health</h3>
        <div className={gcc.health}>
          <span className={gcc.healthIcon} aria-hidden="true">
            ₿
          </span>
          <p>
            {isAvailable(sourcesLive) ? (
              <>
                <b>{sourcesLive.value} live</b>
                <br />
                {sourcesNote}
              </>
            ) : (
              <Absent availability={sourcesLive} />
            )}
          </p>
        </div>
      </article>

      {/* ── Recent activity ──────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <h3>Recent activity</h3>
        {isAvailable(movements) ? (
          movements.value.length === 0 ? (
            <p>The window holds no movement.</p>
          ) : (
            movements.value.slice(0, 3).map((movement) => (
              <p key={movement.id}>
                {libelleMouvement(movement.eventName)} · {formatRelativeTime(movement.occurredAt)}
              </p>
            ))
          )
        ) : (
          <Absent availability={movements} />
        )}
      </article>
    </Panel>
  )
}

/**
 * The bottom-right vault panel — the reference's "Vault Register / Source
 * Activity" card, carrying the real vault register and the real source list.
 */
export function GreenVaultPanel({
  vaultLines,
  vaultAbsence,
  estateValue,
  sourceLines,
}: Readonly<{
  vaultLines: readonly Readonly<{ id: string; label: string; detail: string }>[]
  vaultAbsence: Availability<unknown>
  estateValue: Availability<string>
  sourceLines: readonly Readonly<{ id: string; label: string; status: string }>[]
}>) {
  return (
    <Panel className={gcc.vaultCard} aria-label="Vault register and source activity" data-gcc="vault-card">
      <h3>Vault register</h3>
      {!isAvailable(vaultAbsence) ? (
        <Absent availability={vaultAbsence} />
      ) : vaultLines.length === 0 ? (
        <p>The register lists no vault.</p>
      ) : (
        vaultLines.slice(0, 2).map((line) => (
          <div className={gcc.vaultLine} key={line.id}>
            <span aria-hidden="true">↳</span>
            <p>
              {line.label}
              <br />
              <small>{line.detail}</small>
            </p>
          </div>
        ))
      )}

      <p className={gcc.vaultEstate}>
        Estate value ·{' '}
        {isAvailable(estateValue) ? (
          <span className={gcc.readingInline}>{estateValue.value}</span>
        ) : (
          <Absent availability={estateValue} showRoute={false} />
        )}
      </p>

      <hr />

      <h3>Source activity</h3>
      {sourceLines.slice(0, 4).map((source) => (
        <p key={source.id}>
          {source.label} · <span className={gcc.readingInline}>{source.status}</span>
        </p>
      ))}
    </Panel>
  )
}
