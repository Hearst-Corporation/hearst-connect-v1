import { SectionIntro } from '@/components/marketing/section-intro'
import { ClosingCta } from '@/components/marketing/closing-cta'
import {
  ArrowPathIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  FingerPrintIcon,
  KeyIcon,
  LockClosedIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/20/solid'
import { Squares2X2Icon, UsersIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

const CONSOLE_PREVIEW = '/brand/console-preview.png'

const primaryFeatures = [
  {
    name: 'Unified access',
    description:
      'Identities, permissions, and access logs in one console. Each member sees only what their role allows — risk postures are named, never hidden.',
    href: '/login',
    icon: KeyIcon,
  },
  {
    name: 'Vault oversight',
    description:
      'Track vault status, contract addresses, and indexed movements. An empty series stays empty; unavailability is shown as such.',
    href: '/login',
    icon: Squares2X2Icon,
  },
  {
    name: 'Compliance surface',
    description:
      'Client files and watchpoints raised by Hearst services, with traceable status. No forced green badge when the backend confirms nothing.',
    href: '/login',
    icon: ShieldCheckIcon,
  },
] as const

const secondaryFeatures = [
  {
    name: 'Backend-sourced data.',
    description: 'Every value comes from the Hearst API on Railway — an absence stays an absence.',
    icon: ServerIcon,
  },
  {
    name: 'Encrypted sessions.',
    description: 'HttpOnly session cookie carries identity and bearer token — never readable client-side.',
    icon: LockClosedIcon,
  },
  {
    name: 'Attributable audit.',
    description: 'Sign-ins and movements are timestamped. Audit reads as-is, without reconstructing history.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Role governance.',
    description: 'Owner, admin, and member postures are explicit — including MFA and policy exceptions.',
    icon: FingerPrintIcon,
  },
  {
    name: 'Workspace members.',
    description: 'Invite, revoke, and review who can open each Hearst workspace from one place.',
    icon: UsersIcon,
  },
  {
    name: 'Operations journal.',
    description: 'Product, runtime, and compliance consoles share the same source of truth.',
    icon: DocumentTextIcon,
  },
] as const

const doctrinePillars = [
  {
    icon: KeyIcon,
    title: 'Role reading',
    desc: 'Each member sees exactly what their role allows. Risk postures are named, never hidden.',
  },
  {
    icon: DocumentTextIcon,
    title: 'Traceable access journal',
    desc: 'Every sign-in and movement is timestamped and attributable — no manual reconstruction.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Data veracity',
    desc: 'An unavailable source is shown as unavailable. Absence is a state, not filler.',
  },
] as const

const domainBadges = ['Access', 'Vaults', 'Compliance', 'Operations', 'Product'] as const

function HeroGridPattern({ id }: Readonly<{ id: string }>) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-white/10"
    >
      <defs>
        <pattern
          x="50%"
          y={-1}
          id={id}
          width={200}
          height={200}
          patternUnits="userSpaceOnUse"
        >
          <path d="M.5 200V.5H200" fill="none" />
        </pattern>
      </defs>
      <svg x="50%" y={-1} className="overflow-visible fill-console-surface/30">
        <path
          d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
          strokeWidth={0}
        />
      </svg>
      <rect fill={`url(#${id})`} width="100%" height="100%" strokeWidth={0} />
    </svg>
  )
}

function HeroGlow() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
    >
      <div
        style={{
          clipPath:
            'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
        }}
        className="aspect-1108/632 w-277 bg-linear-to-r from-accent-300/25 to-accent-600/20 opacity-80"
      />
    </div>
  )
}

/**
 * Hearst Connect landing — Tailwind Plus structure, Hearst tokens and copy.
 * Server component: no scroll hijack, no invented metrics.
 */
export function LandingPage() {
  return (
    <>
      <div className="relative isolate overflow-hidden bg-console-app">
        <HeroGridPattern id="landing-hero-grid" />
        <HeroGlow />

        <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-32">
          <div className="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:pt-4">
            <p className="text-xs font-medium tracking-[0.2em] text-accent-300 uppercase">Hearst Connect</p>
            <div className="mt-10 sm:mt-14 lg:mt-8">
              <Link href="/login" className="inline-flex space-x-6">
                <span className="rounded-full bg-accent-400/10 px-3 py-1 text-sm/6 font-semibold text-accent-300 ring-1 ring-accent-400/25 ring-inset">
                  Admin console
                </span>
                <span className="inline-flex items-center space-x-2 text-sm/6 font-medium text-white/60">
                  <span>Open your workspace</span>
                  <ChevronRightIcon aria-hidden="true" className="size-5 text-white/40" />
                </span>
              </Link>
            </div>
            <h1 className="mt-10 text-5xl font-semibold tracking-tight text-pretty text-white sm:text-6xl lg:text-7xl">
              One sign-in for all your Hearst workspaces
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-white/50 sm:text-xl/8">
              Identities, permissions, and access logs in one place. Every value comes from the Hearst
              backend — an absence stays an absence.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/login"
                className="rounded-md bg-accent-400 px-3.5 py-2.5 text-sm font-semibold text-accent-ink shadow-xs transition-colors hover:bg-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
              >
                Open the console
              </Link>
              <Link href="/register" className="text-sm/6 font-semibold text-white transition-colors hover:text-accent-300">
                Request access <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/40">For Hearst workspace owners and administrators only.</p>
          </div>

          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="overflow-hidden rounded-xl bg-console-inset shadow-2xl ring-1 ring-console-line">
                <Image
                  src={CONSOLE_PREVIEW}
                  alt="Hearst Connect administration console preview"
                  width={2432}
                  height={1442}
                  className="w-full"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="domains-heading" className="border-t border-console-line-soft bg-console-app">
        <div className="mx-auto mt-8 max-w-7xl px-6 sm:mt-16 lg:px-8">
          <h2 id="domains-heading" className="text-center text-lg/8 font-semibold text-white">
            One console across Hearst workspace domains
          </h2>
          <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3">
            {domainBadges.map((domain) => (
              <li key={domain}>
                <span className="rounded-full border border-console-line-soft bg-console-card/40 px-4 py-2 text-sm font-medium text-white/70">
                  {domain}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="border-t border-console-line-soft bg-console-app"
      >
        <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
          <SectionIntro
            id="features-heading"
            align="center"
            eyebrow="Console domains"
            title="Everything you need to govern Hearst workspaces"
            sub="Access, vaults, and compliance on one Railway-backed surface — readable roles, attributable audit, strict data doctrine."
          />
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {primaryFeatures.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="text-base/7 font-semibold text-white">
                    <div className="mb-6 flex size-10 items-center justify-center rounded-lg bg-accent-400">
                      <feature.icon aria-hidden="true" className="size-6 text-accent-ink" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-1 flex flex-auto flex-col text-base/7 text-white/50">
                    <p className="flex-auto">{feature.description}</p>
                    <p className="mt-6">
                      <Link
                        href={feature.href}
                        className="text-sm/6 font-semibold text-accent-300 transition-colors hover:text-accent-200"
                      >
                        Open console <span aria-hidden="true">→</span>
                      </Link>
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="platform-heading" className="mt-32 border-t border-console-line-soft bg-console-app sm:mt-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionIntro
            id="platform-heading"
            align="center"
            eyebrow="Platform"
            title="Built for production governance"
            sub="Session security, backend veracity, and an audit trail you can trust — not a demo shell with invented numbers."
          />
        </div>
        <div className="relative overflow-hidden pt-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-console-line">
              <Image
                src={CONSOLE_PREVIEW}
                alt=""
                aria-hidden
                width={2432}
                height={1442}
                className="mb-[-12%] w-full"
              />
            </div>
            <div aria-hidden="true" className="relative">
              <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-console-app pt-[7%]" />
            </div>
          </div>
        </div>
        <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
          <dl className="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base/7 text-white/50 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
            {secondaryFeatures.map((feature) => (
              <div key={feature.name} className="relative pl-9">
                <dt className="inline font-semibold text-white">
                  <feature.icon aria-hidden="true" className="absolute top-1 left-0 size-5 text-accent-300" />
                  {feature.name}
                </dt>{' '}
                <dd className="inline">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="doctrine-heading"
        className="border-t border-console-line-soft bg-console-app"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-8 md:py-32">
          <SectionIntro
            id="doctrine-heading"
            eyebrow="Product doctrine"
            title="Built for governance, not for demo"
            sub="Readable roles, attributable audit, strict data doctrine — three principles that hold in production."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-3">
            {doctrinePillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-console-line-soft bg-console-card/40 p-6 transition-colors hover:border-console-line"
              >
                <pillar.icon className="size-6 text-accent-300" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-white">{pillar.title}</h3>
                <p className="mt-2 text-sm/6 text-white/50">{pillar.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ClosingCta />
    </>
  )
}
