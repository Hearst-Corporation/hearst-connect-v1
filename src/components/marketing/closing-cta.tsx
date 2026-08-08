import { LOGIN_HREF, REGISTER_HREF } from '@/components/marketing/landing-content'
import { MarketingPrimaryLinkWide, MarketingSecondaryLink } from '@/components/marketing/marketing-cta'
import { marketingSection } from '@/components/marketing/marketing-styles'

/** Closing CTA — mint radial glow via CSS tokens. */
export function ClosingCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className={`relative isolate overflow-hidden ${marketingSection}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 40%, color-mix(in oklab, var(--color-accent-400) 22%, transparent), transparent 70%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-console-app/75" aria-hidden />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center md:py-32">
        <h2
          id="cta-heading"
          className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl md:text-5xl"
        >
          One access. The whole Corporation.
        </h2>
        <p className="mt-5 max-w-2xl text-sm/6 text-white/50 md:text-base">
          Open the Hearst administration console, or request access for your workspace. Data stays backend-sourced
          from the first view to the last.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <MarketingPrimaryLinkWide href={LOGIN_HREF}>Open the console</MarketingPrimaryLinkWide>
          <MarketingSecondaryLink href={REGISTER_HREF}>
            Request access <span aria-hidden="true">→</span>
          </MarketingSecondaryLink>
        </div>
      </div>
    </section>
  )
}
