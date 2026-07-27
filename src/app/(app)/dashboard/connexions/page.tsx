import { Heading } from '@/components/catalyst/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DataState, RetryButton, StatusBadge } from '@/components/data-state'
import { fetchConnections } from '@/lib/data-sources'
import { hasDisplayableValue } from '@/lib/resolved'
import { retryPath } from '@/lib/revalidate'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexions',
}

async function retry() {
  'use server'
  await retryPath('/dashboard/connexions')
}

export default async function ConnectionsPage() {
  const connections = await fetchConnections()

  return (
    <>
      <div className="flex items-center gap-3">
        <Heading>Connexions</Heading>
        <StatusBadge state={connections} />
      </div>
      <Text className="mt-2">Les services branchés sur votre organisation : identité, annuaire, notifications.</Text>

      {hasDisplayableValue(connections) ? (
        connections.value.length === 0 ? (
          <div className="mt-8">
            <DataState state={{ ...connections, status: 'EMPTY', value: null }} />
          </div>
        ) : (
          <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
            <TableHead>
              <TableRow>
                <TableHeader>Service</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>État</TableHeader>
                <TableHeader className="text-right">Depuis</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {connections.value.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell className="font-medium">{connection.name}</TableCell>
                  <TableCell className="text-zinc-500">{connection.kind}</TableCell>
                  <TableCell>{connection.status}</TableCell>
                  <TableCell className="text-right text-zinc-500">{connection.since ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        <div className="mt-8">
          <DataState state={connections} retryAction={<RetryButton action={retry}>Réessayer</RetryButton>} />
        </div>
      )}
    </>
  )
}
