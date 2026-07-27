import { Divider } from '@/components/catalyst/divider'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DataState, RetryButton, StatusBadge } from '@/components/data-state'
import { requireSession } from '@/lib/auth'
import { fetchAccessEvents, fetchWorkspaces } from '@/lib/data-sources'
import { hasDisplayableValue, formatCount } from '@/lib/resolved'
import { retryPath } from '@/lib/revalidate'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vue d’ensemble',
}

async function retry() {
  'use server'
  await retryPath('/dashboard')
}

export default async function DashboardPage() {
  const user = await requireSession()
  const [workspaces, events] = await Promise.all([fetchWorkspaces(), fetchAccessEvents()])

  return (
    <>
      <Heading>Bonjour, {user.name}</Heading>
      <Text className="mt-2">
        Vous êtes connecté en tant que <span className="font-medium text-zinc-950 dark:text-white">{user.email}</span>.
      </Text>

      <div className="mt-12 flex items-center gap-3">
        <Subheading>Espaces de travail</Subheading>
        <StatusBadge state={workspaces} />
      </div>

      {hasDisplayableValue(workspaces) ? (
        workspaces.value.length === 0 ? (
          <DataState state={{ ...workspaces, status: 'EMPTY', value: null }} />
        ) : (
          <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
            <TableHead>
              <TableRow>
                <TableHeader>Espace</TableHeader>
                <TableHeader>Région</TableHeader>
                <TableHeader className="text-right">Membres</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspaces.value.map((workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell className="font-medium">{workspace.name}</TableCell>
                  <TableCell className="text-zinc-500">{workspace.region}</TableCell>
                  {/* `null` reste « — » : jamais converti en 0. */}
                  <TableCell className="text-right">{formatCount(workspace.members)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        <div className="mt-4">
          <DataState state={workspaces} retryAction={<RetryButton action={retry}>Réessayer</RetryButton>} />
        </div>
      )}

      <Divider className="my-12" />

      <div className="flex items-center gap-3">
        <Subheading>Dernières entrées du journal</Subheading>
        <StatusBadge state={events} />
      </div>

      {hasDisplayableValue(events) ? (
        events.value.length === 0 ? (
          <DataState state={{ ...events, status: 'EMPTY', value: null }} />
        ) : (
          <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
            <TableHead>
              <TableRow>
                <TableHeader>Auteur</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader className="text-right">Horodatage</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.value.slice(0, 4).map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.actor}</TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell className="text-right text-zinc-500">{event.at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        <div className="mt-4">
          <DataState state={events} retryAction={<RetryButton action={retry}>Réessayer</RetryButton>} />
        </div>
      )}
    </>
  )
}
