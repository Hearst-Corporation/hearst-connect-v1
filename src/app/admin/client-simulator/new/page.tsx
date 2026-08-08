import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { ChartFrame } from '@/components/charts'
import { SectionCard } from '@/components/compositions'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { ROLE_LABELS } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import {
  PaperAirplaneIcon,
  ServerIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { CreateClientForm } from './create-client-form'

export const metadata: Metadata = { title: 'New simulated client' }
export const dynamic = 'force-dynamic'

const CHAMPS_REQUIS = [
  'Email — identifiant de connexion du compte',
  'Password — min. 8 characters, never returned by the service',
  'Role — investor (simulated client) or admin',
  'CONFIRM — garde-fou explicite avant tout envoi',
] as const

const NON_RESTITUE = [
  'Password: the backend never returns it, no copy on the front end',
  'No demo data: a 201 is a real creation in the database',
  'Directory indexing may take a moment after creation',
] as const

/**
 * New simulated client — POST /api/v1/admin/users (admin only).
 * Crée un compte réel en base ; le mot de passe n’est jamais restitué par le service.
 */
export default async function Page() {
  const session = await requireSession()

  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Role « ${ROLE_LABELS[session.role]} » does not grant access to account creation.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL is not set — no request can be sent.'
  }

  const canPost = disabledReason === null

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'role',
      title: 'Your role',
      value: editorial(ROLE_LABELS[session.role]),
      icon: UserIcon,
    },
    {
      id: 'backend',
      title: 'Backend',
      value: editorial(backendConfigured ? 'Configured' : 'Not configured'),
      icon: ServerIcon,
    },
    {
      id: 'envoi',
      title: 'Can submit',
      value: editorial(canPost ? 'Ready' : 'Blocked'),
      icon: PaperAirplaneIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="New simulated client"
        description="Real creation via POST /api/v1/admin/users — password never returned."
        kpis={kpis}
      />

      <SectionCard title="Recent creations" hint="Accounts created from this screen, by day." tone="chart">
        <ChartFrame
          question="Account creations per day"
          unite="comptes / jour"
          etat={{
            type: 'empty',
            explication:
              'No series to plot — this screen emits one creation at a time and does not measure history. The real account count lives in the client directory.',
          }}
        />
      </SectionCard>

      <SectionCard
        title="Create an investor or admin account"
        hint="The service never returns the password — only id, email, and role are shown after success."
      >
        <CreateClientForm disabled={!canPost} disabledReason={disabledReason} />
      </SectionCard>

      <SectionCard title="Request fields" hint="What POST /api/v1/admin/users expects." tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {CHAMPS_REQUIS.map((champ) => (
            <li key={champ}>{champ}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="What is not returned" hint="Simulator veracity rule." tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {NON_RESTITUE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <Text>
        <Link href="/admin/clients" className="underline">Back to client directory</Link>
      </Text>
    </div>
  )
}
