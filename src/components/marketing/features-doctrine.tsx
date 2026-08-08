import { SectionIntro } from '@/components/marketing/section-intro'
import { DocumentTextIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

/** Act 3 — Features & doctrine. Three calm pillars, hover border only. */
const PILLARS = [
  {
    icon: KeyIcon,
    title: 'Role reading',
    desc: 'Each member sees exactly what their role allows. Risk postures — owner without MFA, member outside policy — are named, never hidden.',
  },
  {
    icon: DocumentTextIcon,
    title: 'Traceable access journal',
    desc: 'Every sign-in and every movement is timestamped and attributable. Audit reads as-is, without reconstructing history by hand.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Data veracity',
    desc: 'An unavailable source is shown as unavailable. No invented zero, no forced green badge: absence is a state, not filler.',
  },
] as const

export function FeaturesDoctrine() {
  return (
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
          {PILLARS.map((pillar) => (
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
  )
}
