import { Badge } from '@/components/catalyst/badge'
import { Heading } from '@/components/catalyst/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DemoNotice } from '@/components/demo-notice'
import { connections } from '@/lib/demo-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexions',
}

export default function ConnectionsPage() {
  return (
    <>
      <Heading>Connexions</Heading>
      <Text className="mt-2">Les services branchés sur votre organisation : identité, annuaire, notifications.</Text>

      <div className="mt-6">
        <DemoNotice />
      </div>

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
          {connections.map((connection) => (
            <TableRow key={connection.id}>
              <TableCell className="font-medium">{connection.name}</TableCell>
              <TableCell className="text-zinc-500">{connection.kind}</TableCell>
              <TableCell>
                <Badge color={connection.status === 'Connecté' ? 'lime' : 'amber'}>{connection.status}</Badge>
              </TableCell>
              <TableCell className="text-right text-zinc-500">{connection.since}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
