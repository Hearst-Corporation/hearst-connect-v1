import { formatRelativeTime } from '@/lib/format'
import { libelleMouvement } from '@/lib/mouvements'
import { isAvailable, type Availability, type ClientException, type Movement } from '@/lib/vaults/model'
import { Subheading } from '@/components/catalyst/heading'
import { Text, Strong } from '@/components/catalyst/text'
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
  movements,
}: Readonly<{
  exceptions: Availability<readonly ClientException[]>
  deployments: Availability<unknown>
  sourcesLive: Availability<string>
  movements: Availability<readonly Movement[]>
}>) {
  return (
    <Panel as="section" className={gcc.infoGrid} aria-label="Operational detail" data-gcc="info-grid">
      {/* ── Client exceptions ─────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <Subheading level={3} className={gcc.cardTitle}>Client exceptions</Subheading>
        {isAvailable(exceptions) ? (
          exceptions.value.length === 0 ? (
            <Text className={gcc.cellText}>None</Text>
          ) : (
            exceptions.value.slice(0, 3).map((exception) => (
              <Text key={`${exception.clientLabel}-${exception.issue}`} className={gcc.cellText}>
                {exception.clientLabel} · {exception.issue.toLowerCase().replaceAll('_', ' ')}
              </Text>
            ))
          )
        ) : (
          <Absent availability={exceptions} showRoute={false} />
        )}
      </article>

      {/* ── Deployment queue ──────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <Subheading level={3} className={gcc.cardTitle}>Deployment queue</Subheading>
        {isAvailable(deployments) ? (
          <Text className={gcc.cellText}>Readable</Text>
        ) : (
          <>
            <Text className={gcc.cellText}>
              {deployments.status === 'NOT_EXPOSED' ? 'Not exposed' : 'Unavailable'}
            </Text>
            <Text className={gcc.cellText}>Deployment ledger unavailable</Text>
          </>
        )}
      </article>

      {/* ── Source health ─────────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <Subheading level={3} className={gcc.cardTitle}>Source health</Subheading>
        <div className={gcc.health}>
          <span className={gcc.healthIcon} aria-hidden="true">
            ₿
          </span>
          <div className={gcc.healthText}>
            {isAvailable(sourcesLive) ? (
              <>
                <Strong className={gcc.healthValue}>{sourcesLive.value}</Strong>
              </>
            ) : (
              <Absent availability={sourcesLive} showRoute={false} />
            )}
          </div>
        </div>
      </article>

      {/* ── Recent activity ──────────────────────────────────────────────── */}
      <article className={gcc.infoCell} data-gcc="info-cell">
        <Subheading level={3} className={gcc.cardTitle}>Recent activity</Subheading>
        {isAvailable(movements) ? (
          movements.value.length === 0 ? (
            <Text className={gcc.cellText}>None</Text>
          ) : (
            movements.value.slice(0, 3).map((movement) => (
              <Text key={movement.id} className={gcc.cellText}>
                {libelleMouvement(movement.eventName)} · {formatRelativeTime(movement.occurredAt)}
              </Text>
            ))
          )
        ) : (
          <Absent availability={movements} showRoute={false} />
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
      <Subheading level={3} className={gcc.cardTitle}>Vault register</Subheading>
      {!isAvailable(vaultAbsence) ? (
        <Absent availability={vaultAbsence} showRoute={false} />
      ) : vaultLines.length === 0 ? (
        <Text className={gcc.cellText}>None</Text>
      ) : (
        vaultLines.slice(0, 2).map((line) => (
          <div className={gcc.vaultLine} key={line.id}>
            <span aria-hidden="true">↳</span>
            <div className={gcc.vaultLineText}>
              <Strong className={gcc.cellStrong}>{line.label}</Strong>
              <Text className={gcc.cellText}>Readable · {line.detail}</Text>
            </div>
          </div>
        ))
      )}

      <div className={gcc.vaultEstate}>
        <Text className={gcc.cellText}>Estate value</Text>
        {isAvailable(estateValue) ? (
          <Strong className={gcc.cellStrong}>{estateValue.value}</Strong>
        ) : (
          <Absent availability={estateValue} showRoute={false} />
        )}
      </div>

      <hr className={gcc.cellDivider} />

      <Subheading level={3} className={gcc.cardTitle}>Source activity</Subheading>
      {sourceLines.slice(0, 4).map((source) => (
        <div key={source.id} className={gcc.sourceRow}>
          <Text className={gcc.cellText}>{source.label}</Text>
          <Strong className={gcc.cellStrong}>{source.status}</Strong>
        </div>
      ))}
    </Panel>
  )
}
