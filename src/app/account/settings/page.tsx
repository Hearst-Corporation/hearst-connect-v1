import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { DashCard, DashboardHeader } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { Callout } from '@/components/compositions'
import { AddWalletForm, NotificationSwitch } from '@/features/client-portal/controls'
import { loadOverview, loadPreferences, loadWallets } from '@/features/client-portal/load'
import { requireSession } from '@/lib/auth'
import { formatDate, formatDateTime } from '@/lib/format'
import {
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  ClockIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  GiftIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import type { Metadata } from 'next'
import type { ComponentType, SVGProps } from 'react'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

const NOTIFS = [
  { id: 'rewards', label: 'Monthly reward credited', detail: 'When a month’s reward reaches your reserve', icon: GiftIcon },
  { id: 'withdrawals', label: 'Withdrawal updates', detail: 'Approved, co-signed, confirmed on-chain', icon: ArrowUpTrayIcon },
  { id: 'lockup', label: 'End of lockup', detail: '90, 30 and 7 days before a vault unlocks', icon: CalendarDaysIcon },
  { id: 'statements', label: 'Monthly statement', detail: 'Your statement, by email, each month', icon: DocumentTextIcon },
] as const

/** Le picto d'une ligne : vert, dans un carré teinté — le même partout dans l'app. */
function Pic({ icon: Icon }: Readonly<{ icon: ComponentType<SVGProps<SVGSVGElement>> }>) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--hearst-green)]/10 text-[var(--hearst-green-text)]">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  )
}

/**
 * SETTINGS — ce que le client règle lui-même : où son bitcoin peut aller (ses
 * portefeuilles autorisés), qui de son équipe voit et agit, sa sécurité, ce
 * dont il veut être prévenu.
 */
export default async function AccountSettingsPage() {
  await requireSession()
  const [wallets, prefs, overview] = await Promise.all([loadWallets(), loadPreferences(), loadOverview()])

  return (
    <>
      <DashboardHeader title="Settings" description="Where your bitcoin can go, who in your team has access, and what you hear about." kpis={[]} />

      <DashCard eyebrow="Wallets" title="Whitelisted wallets" subtitle="The only addresses a withdrawal can be sent to — mirrored in Hearst’s Fireblocks policy">
        {wallets === null ? (
          <Callout tone="warning" title="Your wallets could not be read">
            Nothing is shown rather than a guess.
          </Callout>
        ) : (
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
              {wallets.map((w) => (
                <li key={w.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 first:pt-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_7rem_9rem]">
                  <span className="flex min-w-0 items-center gap-3">
                    <Pic icon={WalletIcon} />
                    <span className="truncate text-sm text-fg">{w.label}</span>
                  </span>
                  <span className="hidden truncate font-mono text-xs text-[var(--hearst-green-text)] sm:block">{w.address}</span>
                  <span className="hidden items-center gap-1.5 text-xs text-fg-tertiary sm:flex">
                    <BitcoinIcon className="size-4 text-[var(--hearst-green-text)]" aria-hidden="true" />
                    {w.network}
                  </span>
                  <span
                    className={`justify-self-end rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                      w.status === 'active' ? 'text-[var(--hearst-green-text)] ring-[var(--hearst-green)]/30' : 'text-amber-300 ring-amber-300/30'
                    }`}
                  >
                    {w.status === 'active' ? 'Active' : `Usable ${formatDate(w.activeFrom)}`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-[var(--ud-line)] pt-5">
              <p className="mb-5 flex items-center gap-3 text-sm font-medium text-fg">
                <Pic icon={PlusCircleIcon} />
                Add a wallet
              </p>
              <AddWalletForm />
            </div>
          </div>
        )}
      </DashCard>

      <BentoGrid>
        <BentoCard span={6} bare>
          <DashCard eyebrow="Team" title="Who has access" subtitle="Owners act, viewers read. Ask your relationship manager to add someone.">
            {prefs === null ? (
              <p className="text-sm text-fg-tertiary">Your team could not be read.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
                {prefs.team.map((m) => (
                  <li key={m.email} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <span className="flex min-w-0 items-center gap-3">
                      <Pic icon={UserCircleIcon} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm text-fg">{m.name}</span>
                        <span className="truncate text-xs text-fg-tertiary">{m.email}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {m.twoFactor ? <span className="text-[11px] text-fg-tertiary">2FA</span> : null}
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-fg-secondary ring-1 ring-[var(--ud-line)]">{m.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {overview ? (
              <p className="mt-4 text-xs text-fg-tertiary">
                Your relationship manager: {overview.owner.name} · {overview.owner.email}
              </p>
            ) : null}
          </DashCard>
        </BentoCard>
        <BentoCard span={6} bare>
          <DashCard eyebrow="Security" title="Sign-in" subtitle="How your account is protected">
            {prefs === null ? (
              <p className="text-sm text-fg-tertiary">Security settings could not be read.</p>
            ) : (
              <dl className="flex flex-col divide-y divide-[var(--ud-line)]">
                {(
                  [
                    ['Two-factor authentication', prefs.security.twoFactor ? 'On' : 'Off', ShieldCheckIcon],
                    ['Last sign-in', formatDateTime(prefs.security.lastSignInAt), ClockIcon],
                    ['Active sessions', String(prefs.security.sessions), ComputerDesktopIcon],
                  ] as const
                ).map(([k, v, icon]) => (
                  <div key={k} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <dt className="flex items-center gap-3 text-sm text-fg-tertiary">
                      <Pic icon={icon} />
                      {k}
                    </dt>
                    <dd className="text-sm text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </DashCard>
        </BentoCard>
      </BentoGrid>

      <DashCard eyebrow="Notifications" title="What you hear about" subtitle="By email — changes apply immediately">
        {prefs === null ? (
          <p className="text-sm text-fg-tertiary">Notification settings could not be read.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--ud-line)]">
            {NOTIFS.map((n) => (
              <NotificationSwitch
                key={n.id}
                id={n.id}
                label={n.label}
                detail={n.detail}
                value={prefs.notifications[n.id] !== false}
                icon={<Pic icon={n.icon} />}
              />
            ))}
          </div>
        )}
      </DashCard>
    </>
  )
}
