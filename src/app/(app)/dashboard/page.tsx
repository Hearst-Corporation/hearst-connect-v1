import { Badge } from '@/components/catalyst/badge'
import { Divider } from '@/components/catalyst/divider'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DemoNotice } from '@/components/demo-notice'
import { requireSession } from '@/lib/auth'
import { accessEvents, workspaces } from '@/lib/demo-data'
import { statusColor } from './status'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vue d’ensemble',
}

export default async function DashboardPage() {
  const user = await requireSession()

  return (
    <>
      <Heading>Bonjour, {user.name}</Heading>
      <Text className="mt-2">
        Vous êtes connecté en tant que <span className="font-medium text-zinc-950 dark:text-white">{user.email}</span>.
      </Text>

      <div className="mt-6">
        <DemoNotice />
      </div>

      <Subheading className="mt-12">Espaces de travail</Subheading>
      <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Espace</TableHeader>
            <TableHeader>Région</TableHeader>
            <TableHeader className="text-right">Membres</TableHeader>
            <TableHeader className="text-right">Connexions (7 j.)</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {workspaces.map((workspace) => (
            <TableRow key={workspace.id}>
              <TableCell className="font-medium">{workspace.name}</TableCell>
              <TableCell className="text-zinc-500">{workspace.region}</TableCell>
              <TableCell className="text-right">{workspace.members}</TableCell>
              <TableCell className="text-right">{workspace.connections}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Divider className="my-12" />

      <Subheading>Dernières entrées du journal</Subheading>
      <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Auteur</TableHeader>
            <TableHeader>Action</TableHeader>
            <TableHeader>Statut</TableHeader>
            <TableHeader className="text-right">Horodatage</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {accessEvents.slice(0, 4).map((event) => (
            <TableRow key={event.id} href="/dashboard/acces" title={`Journal — ${event.id}`}>
              <TableCell className="font-medium">{event.actor}</TableCell>
              <TableCell>{event.action}</TableCell>
              <TableCell>
                <Badge color={statusColor[event.status]}>{event.status}</Badge>
              </TableCell>
              <TableCell className="text-right text-zinc-500">{event.at}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
