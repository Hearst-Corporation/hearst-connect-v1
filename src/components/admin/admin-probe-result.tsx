import { surfaceInset } from '@/components/admin/surface'
import { ProblemState, RequestMetadata, StatusBadge } from '@/components/admin/truthful'
import type { CallTrace, KeeperActionResult, Problem } from '@/lib/backend/client'
import type { ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Hearst Connect admin surface wrappers.
 * Material = `surfaceInset` (PASS 2 canon) — not a second glass layer.
 * Every component here renders what the backend gives it — none of them fabricate data.
 */

export function AdminProbeResult({
  status,
  reason,
  trace,
  rawJson,
  problem,
  keeper,
}: Readonly<{
  status: ResolvedStatus | 'SNAPSHOT'
  reason?: string | null
  trace: CallTrace
  rawJson?: string
  problem?: Problem | null
  keeper?: KeeperActionResult | null
}>) {
  return (
    <div className={clsx(surfaceInset, 'p-3')}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
      </div>
      {reason ? <p className="mt-2 text-xs text-fg-secondary">{reason}</p> : null}
      <div className="mt-2">
        <RequestMetadata trace={trace} />
      </div>
      {rawJson ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-fg-secondary hover:text-fg">Raw JSON</summary>
          <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs text-fg/80">{rawJson}</pre>
        </details>
      ) : null}
      <ProblemState problem={problem ?? null} keeper={keeper ?? null} />
    </div>
  )
}
