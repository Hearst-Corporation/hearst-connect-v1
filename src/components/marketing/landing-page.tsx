import { ClosingCta } from '@/components/marketing/closing-cta'
import { ConsolePreviewShot } from '@/components/marketing/console-preview-shot'
import { HeroGlow, HeroGridPattern } from '@/components/marketing/hero-decoration'
import {
  doctrinePillars,
  domainBadges,
  LOGIN_HREF,
  platformCapabilities,
  primaryFeatures,
  REGISTER_HREF,
} from '@/components/marketing/landing-content'
import { MarketingPrimaryLink, MarketingSecondaryLink } from '@/components/marketing/marketing-cta'
import { marketingContainer, marketingSection } from '@/components/marketing/marketing-styles'
import { SectionIntro } from '@/components/marketing/section-intro'
import Link from 'next/link'

/**
 * Hearst Connect landing — Tailwind Plus structure, Hearst tokens and copy.
 * Server component: no scroll hijack, no invented metrics.
 */
export function LandingPage() {
  return (
    <>
      <div className="relative isolate overflow-hidden bg-(--ds-surface)">
        <HeroGridPattern id="landing-hero-grid" />
        <HeroGlow />

        <div
          className={`${marketingContainer} pt-10 pb-24 sm:pb-32 lg:flex lg:items-center lg:gap-x-12 lg:py-32 xl:gap-x-16`}
        >
          <div className="mx-auto max-w-2xl shrink-0 lg:mx-0">
            <p className="text-xs font-medium tracking-[0.2em] text-(--ds-shell-subtle) uppercase">Hearst</p>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-pretty sm:text-6xl lg:text-7xl">
              <span className="text-(--ds-text)">One sign-in </span>
              <span className="text-(--ds-accent)">for all your Hearst workspaces</span>
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-(--ds-text)/50 sm:text-xl/8">
              One administration console for identities, permissions, and access logs. Values are
              read from the Hearst backend on Railway — an absence stays an absence.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <MarketingPrimaryLink href={LOGIN_HREF}>Open the console</MarketingPrimaryLink>
              <MarketingSecondaryLink href={REGISTER_HREF}>
                Request access <span aria-hidden="true">→</span>
              </MarketingSecondaryLink>
            </div>
            <p className="mt-6 text-xs text-(--ds-text)/40">For Hearst workspace owners and administrators only.</p>
          </div>

          <div className="mx-auto mt-16 w-full max-w-xl sm:mt-20 lg:mt-0 lg:max-w-md lg:shrink-0 xl:max-w-xl">
            <ConsolePreviewShot
              alt="Hearst Connect administration console preview"
              className="rounded-xl bg-(--ds-surface-raised) shadow-2xl ring-1 ring-(--ds-shell-border)"
              priority
            />
          </div>
        </div>
      </div>

      <section aria-labelledby="domains-heading" className={`${marketingSection} pb-16 sm:pb-20`}>
        <div className={`${marketingContainer} pt-16 sm:pt-20`}>
          <h2 id="domains-heading" className="text-center text-lg/8 font-semibold text-(--ds-text)">
            One console across Hearst workspace domains
          </h2>
          <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3">
            {domainBadges.map((domain) => (
              <li key={domain}>
                <span className="rounded-full border border-(--ds-divider) bg-(--ds-surface-raised)/40 px-4 py-2 text-sm font-medium text-(--ds-text)/70">
                  {domain}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="features-heading" className={marketingSection}>
        <div className={`${marketingContainer} py-24 sm:py-32`}>
          <SectionIntro
            id="features-heading"
            align="center"
            eyebrow="Console domains"
            title="Everything you need to govern Hearst workspaces"
            sub="Access, vaults, and compliance on one Railway-backed surface — readable roles, attributable audit, strict data doctrine."
          />
          <dl className="mx-auto mt-16 grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:mt-20 lg:max-w-none lg:grid-cols-3">
            {primaryFeatures.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="text-base/7 font-semibold text-(--ds-text)">
                  <div className="mb-6 flex size-10 items-center justify-center rounded-lg bg-(--ds-accent)">
                    <feature.icon aria-hidden="true" className="size-6 text-(--ds-accent-text)" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base/7 text-(--ds-text)/50">
                  <p className="flex-auto">{feature.description}</p>
                  <p className="mt-6">
                    <Link
                      href={feature.href}
                      className="text-sm/6 font-semibold text-(--ds-accent) transition-colors hover:text-(--ds-accent-hover)"
                    >
                      Open console <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="platform-heading" className={marketingSection}>
        <div className={`${marketingContainer} py-24 sm:py-32`}>
          <SectionIntro
            id="platform-heading"
            align="center"
            eyebrow="Platform"
            title="Built for production governance"
            sub="Session security, backend veracity, and an audit trail you can trust — not a demo shell with invented numbers."
          />
          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base/7 text-(--ds-text)/50 sm:mt-20 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
            {platformCapabilities.map((feature) => (
              <div key={feature.name} className="relative pl-9">
                <dt className="inline font-semibold text-(--ds-text)">
                  <feature.icon aria-hidden="true" className="absolute top-1 left-0 size-5 text-(--ds-accent)" />
                  {feature.name}
                </dt>{' '}
                <dd className="inline">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="doctrine-heading" className={marketingSection}>
        <div className={`${marketingContainer} py-24 md:py-32`}>
          <SectionIntro
            id="doctrine-heading"
            eyebrow="Product doctrine"
            title="Built for governance, not for demo"
            sub="Three principles that hold in production — separate from the feature lists above."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-3">
            {doctrinePillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-(--ds-divider) bg-(--ds-surface-raised)/40 p-6 transition-colors hover:border-(--ds-shell-border)"
              >
                <pillar.icon className="size-6 text-(--ds-accent)" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-(--ds-text)">{pillar.title}</h3>
                <p className="mt-2 text-sm/6 text-(--ds-text)/50">{pillar.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ClosingCta />
    </>
  )
}
