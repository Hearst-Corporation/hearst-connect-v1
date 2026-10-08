import { DashCard, DashboardHeader } from '@/components/admin/dashboard'
import { Callout } from '@/components/compositions'
import { loadDocuments, loadOverview, type PortalDocument } from '@/features/client-portal/load'
import { requireSession } from '@/lib/auth'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/20/solid'
import type { Metadata } from 'next'
import Link from 'next/link'
import { statementHref } from '@/features/client-portal/statement-href'

export const metadata: Metadata = { title: 'Documents' }
export const dynamic = 'force-dynamic'

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** `rank` : le rang du vault chez le client — l'URL dit `vault-2`, pas `31337-0x1111…`. */
function hrefOf(d: PortalDocument, rank: (vaultId: string | undefined) => number): string {
  if (d.kind === 'proposal' && d.offerId) return `/proposal/${d.offerId}`
  if (d.kind === 'tax') return statementHref(d.period.slice(0, 4))
  return statementHref(d.period, rank(d.vaultId ?? undefined))
}

/** Une tuile de document : ce qu'il est, pour quoi, et l'ouvrir. */
function DocTile({ doc, sub, href }: Readonly<{ doc: PortalDocument; sub: string; href: string }>) {
  return (
    // Aplat vert, encre sombre : les deux documents qu'on cherche ressortent
    // du reste de la page, comme la tuile mise en avant de My Vault.
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[var(--ud-radius)] bg-[var(--hearst-green)] p-5 no-underline transition hover:brightness-105"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hearst-green-ink)]/10 text-[var(--hearst-green-ink)]">
        <DocumentTextIcon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-[var(--hearst-green-ink)]">{doc.title}</span>
        <span className="truncate text-xs text-[var(--hearst-green-ink)]/70">{sub}</span>
      </span>
      <ChevronRightIcon
        className="size-4 shrink-0 text-[var(--hearst-green-ink)] opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden="true"
      />
    </Link>
  )
}

/**
 * DOCUMENTS — ce qu'un client garde et transmet.
 *
 * Les rapports annuels et les propositions signées en tuiles, en tête : peu
 * nombreux, ce sont eux qu'on cherche. Les relevés mensuels ensuite, UNE ligne
 * par mois et un bouton par vault — une ligne par vault et par mois répétait
 * chaque mois autant de fois qu'il y a de vaults.
 */
export default async function DocumentsPage() {
  await requireSession()
  const [docs, overview] = await Promise.all([loadDocuments(), loadOverview()])
  const rank = (vaultId: string | undefined) => (overview?.vaults.findIndex((v) => v.vaultId === vaultId) ?? -1) + 1
  if (docs === null) {
    return (
      <>
        <DashboardHeader title="Documents" description="Statements, annual reports and the terms you signed — ready to download." kpis={[]} />
        <Callout tone="warning" title="Your documents could not be read">
          Nothing is shown rather than a guess.
        </Callout>
      </>
    )
  }

  const reports = docs.filter((d) => d.kind === 'tax')
  const proposals = docs.filter((d) => d.kind === 'proposal')
  const statements = docs.filter((d) => d.kind === 'statement')
  const months = [...new Set(statements.map((d) => d.period))].sort().reverse()
  // Une ligne par relevé, le plus récent d'abord : la ligne entière l'ouvre.
  const rows = [...statements].sort((a, b) => b.period.localeCompare(a.period) || a.vault.localeCompare(b.vault))

  return (
    <>
      <DashboardHeader title="Documents" description="Statements, annual reports and the terms you signed — ready to download." kpis={[]} />

      {reports.length + proposals.length > 0 ? (
        <div className="grid gap-[var(--ud-gap-section)] lg:grid-cols-2">
          <DashCard title="Annual reports" subtitle="Every vault, the full year — for your accountant">
            <div className="flex flex-col gap-3">
              {reports.map((d) => (
                <DocTile key={d.id} doc={d} sub={d.vault} href={hrefOf(d, rank)} />
              ))}
            </div>
          </DashCard>
          <DashCard title="Proposals & terms" subtitle="What you signed, one per vault">
            <div className="flex flex-col gap-3">
              {proposals.map((d) => (
                <DocTile key={d.id} doc={d} sub={`Signed terms · ${d.vault}`} href={hrefOf(d, rank)} />
              ))}
            </div>
          </DashCard>
        </div>
      ) : null}

      <DashCard title="Monthly statements" subtitle={`${months.length} months · one statement per vault, issued after each close`}>
        <PaginatedTable
          className="docs-table [&_table]:w-full [&_td]:px-4 [&_th]:px-4"
          collapsed={8}
          noun="statements"
          head={
            <TableRow>
              <TableHeader>Month</TableHeader>
              <TableHeader>Vault</TableHeader>
              <TableHeader className="hidden sm:table-cell">Document</TableHeader>
              <TableHeader className="w-10">
                <span className="sr-only">Open</span>
              </TableHeader>
            </TableRow>
          }
          rows={rows.map((d) => (
            <TableRow key={d.id} href={hrefOf(d, rank)} title={`${d.vault} — ${monthLabel(d.period)}`} className="group">
              <TableCell className="pr-6">
                <span className="mr-4 flex items-center gap-3 whitespace-nowrap font-medium text-fg">
                  <DocumentTextIcon className="size-4 shrink-0 text-fg-tertiary" aria-hidden="true" />
                  {monthLabel(d.period)}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-fg-secondary">{d.vault}</TableCell>
              <TableCell className="hidden text-fg-tertiary sm:table-cell">Statement · PDF</TableCell>
              <TableCell className="text-right">
                <ChevronRightIcon
                  className="ml-auto size-4 text-[var(--hearst-green-text)] opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </TableCell>
            </TableRow>
          ))}
          exportData={{
            filename: 'hearst-statements',
            title: 'Monthly statements',
            columns: ['Month', 'Vault', 'Document'],
            data: rows.map((d) => [monthLabel(d.period), d.vault, d.title]),
          }}
        />
      </DashCard>
    </>
  )
}
