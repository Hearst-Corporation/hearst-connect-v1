import { DashCard } from '@/components/admin/dashboard'
import { formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { callBackend } from '@/lib/backend/client'
import { formatNumber } from '@/lib/format'
import { ReportMetricsButton } from '@/app/admin/settlement/report-metrics-button'

/**
 * La déclaration Keeper du parc : ce qui a été déclaré la dernière fois, face à
 * ce que mesure le registre des machines aujourd'hui — l'écart dit s'il faut
 * déclarer à nouveau. Le formulaire part pré-rempli avec le registre.
 *
 * Elle vivait sur la page de minage ; c'est un outil Keeper (une requête
 * journalisée, rien n'est signé), pas un geste du mois.
 */

type Resolved<T> = { readonly value: T | null }

export async function ReportFleetMetrics() {
  const [miningRes, machinesRes] = await Promise.all([
    callBackend<{ readonly hashrate?: Resolved<{ reportedHashrateTh: string; totalBtcEarnedSats: string }> }>('mining'),
    callBackend<{ readonly machines: Resolved<readonly { hashrateThs: number }[]> }>('mining-machines'),
  ])
  const reported = miningRes.ok ? (miningRes.data.hashrate?.value ?? null) : null
  const num = (v: string | null | undefined) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null)
  const reportedThs = num(reported?.reportedHashrateTh)
  const reportedSats = num(reported?.totalBtcEarnedSats)
  const fleetThs =
    machinesRes.ok && machinesRes.data.machines?.value
      ? machinesRes.data.machines.value.reduce((t, m) => t + m.hashrateThs, 0)
      : 0

  const gap = reportedThs !== null && reportedThs > 0 ? ((fleetThs - reportedThs) / reportedThs) * 100 : null
  const eh = (ths: number) => `${formatNumber(ths / 1e6, { maximumFractionDigits: 2 })} EH/s`

  return (
    <DashCard
      eyebrow="Keeper"
      title="Report fleet metrics"
      subtitle="What the fleet declares to the backend — a log request, nothing is signed"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)]">
          <div className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3.5">
            <dt className="text-xs text-fg-tertiary">Last reported hashrate</dt>
            <dd className="text-2xl font-medium tabular-nums text-fg">{reportedThs !== null ? eh(reportedThs) : '—'}</dd>
            <dd className={`text-xs ${gap !== null && Math.abs(gap) > 1 ? 'text-amber-400' : 'text-fg-tertiary'}`}>
              Registry today {eh(fleetThs)}
              {gap !== null ? ` · ${formatNumber(gap, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })} %` : ''}
            </dd>
          </div>
          <div className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3.5">
            <dt className="text-xs text-fg-tertiary">BTC earned, reported</dt>
            <dd className="text-2xl font-medium tabular-nums text-fg">
              {reportedSats !== null ? `${formatBtcValue(reportedSats / 1e8)} BTC` : '—'}
            </dd>
            <dd className="text-xs text-fg-tertiary">Cumulative, since inception</dd>
          </div>
        </dl>
        <div>
          <ReportMetricsButton defaultThs={fleetThs > 0 ? fleetThs : reportedThs} defaultSats={reportedSats} />
        </div>
      </div>
    </DashCard>
  )
}
