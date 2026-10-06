import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { DashCard } from '@/components/admin/dashboard'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { btcFromSats, usdRound } from '@/lib/admin-dashboard/amounts'
import { formatNumber } from '@/lib/format'
import type { CloseMonth } from './monthly-close'

/**
 * L'ÉLECTRICITÉ, VAULT PAR VAULT.
 *
 * Le parc est commun, mais chaque vault paie l'électricité de SA puissance :
 * une ligne par client, le montant du dernier mois (et sa contre-valeur en
 * bitcoin, au cours du mois), payé ou dû. « Pay » mène à la fiche du client,
 * où le paiement se fait pour ce vault seul.
 */

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function ElectricityByVault({ months }: Readonly<{ months: readonly CloseMonth[] }>) {
  const m = [...months].sort((a, b) => b.month.localeCompare(a.month))[0]
  if (m === undefined) {
    return (
      <DashCard eyebrow="Costs" title="Electricity by vault" subtitle="No monthly close yet">
        <p className="py-6 text-center text-sm text-fg-tertiary">Nothing to pay yet.</p>
      </DashCard>
    )
  }
  const toSats = (usd: number) => (m.btcPriceUsd > 0 ? Math.round((usd / m.btcPriceUsd) * 1e8) : 0)
  const lines = [...m.lines].sort(
    (a, b) => Number(a.electricityStatus === 'paid') - Number(b.electricityStatus === 'paid') || b.electricityUsd - a.electricityUsd,
  )
  const due = lines.filter((l) => l.electricityStatus !== 'paid')
  const dueUsd = due.reduce((t, l) => t + l.electricityUsd, 0)

  return (
    <DashCard
      eyebrow="Costs"
      title="Electricity by vault"
      subtitle={`${monthLabel(m.month)} — each vault pays the electricity of its own hashrate`}
      className="h-full"
    >
      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)]">
          {[
            ['Due this month', usdRound(dueUsd), `≈ ${btcFromSats(toSats(dueUsd))}`],
            ['Vaults to pay', `${due.length} / ${lines.length}`, due.length === 0 ? 'All paid' : 'Pay from each client page'],
            // Ce qui est déjà réglé ce mois-là (l'électricité du parc entier est dans la clôture, plus bas).
            [
              'Paid this month',
              usdRound(lines.filter((l) => l.electricityStatus === 'paid').reduce((t, l) => t + l.electricityUsd, 0)),
              `${lines.length - due.length} of ${lines.length} vaults`,
            ],
          ].map(([label, value, hint]) => (
            <div key={label} className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3.5">
              <dt className="text-xs text-fg-tertiary">{label}</dt>
              <dd className="text-2xl font-medium tabular-nums text-fg">{value}</dd>
              <dd className="text-xs text-fg-tertiary">{hint}</dd>
            </div>
          ))}
        </dl>

        <PaginatedTable
          className="[&_table]:w-full [&_table]:min-w-[40rem]"
          noun="vaults"
          head={
            <TableRow>
              <TableHeader>Client vault</TableHeader>
              <TableHeader>Hashrate</TableHeader>
              <TableHeader>Electricity</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>
                <span className="sr-only">Pay</span>
              </TableHeader>
            </TableRow>
          }
          rows={lines.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium text-fg">{l.clientLabel}</TableCell>
              <TableCell className="tabular-nums">
                {l.hashrateThs != null ? `${formatNumber(l.hashrateThs / 1000, { maximumFractionDigits: 1 })} PH/s` : '—'}
              </TableCell>
              <TableCell className="tabular-nums">
                <div className="text-fg">{usdRound(l.electricityUsd)}</div>
                <div className="text-[11px] text-fg-tertiary">≈ {btcFromSats(toSats(l.electricityUsd))}</div>
              </TableCell>
              <TableCell>
                <Badge color={l.electricityStatus === 'paid' ? 'lime' : 'amber'}>
                  {l.electricityStatus === 'paid' ? 'Paid' : 'Due'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {l.electricityStatus === 'paid' ? (
                  <Link href={`/admin/clients/${l.clientId}#electricity`} className="text-xs text-fg-tertiary">
                    View
                  </Link>
                ) : (
                  <Link
                    href={`/admin/clients/${l.clientId}#electricity`}
                    className="ud-detail-btn inline-flex items-center no-underline"
                    aria-label={`Pay electricity for ${l.clientLabel}`}
                  >
                    Pay electricity
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
          exportData={{
            filename: `hearst-electricity-${m.month}`,
            title: `Electricity by vault — ${monthLabel(m.month)}`,
            columns: ['Client', 'Vault', 'Hashrate (TH/s)', 'Electricity (USD)', 'Electricity (BTC)', 'BTC price (USD)', 'Status'],
            data: lines.map((l) => [
              l.clientLabel,
              l.vaultId,
              l.hashrateThs ?? null,
              l.electricityUsd,
              toSats(l.electricityUsd) / 1e8,
              m.btcPriceUsd,
              l.electricityStatus ?? null,
            ]),
          }}
        />
      </div>
    </DashCard>
  )
}
