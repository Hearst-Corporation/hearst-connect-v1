import { Pin3dDemo } from '@/components/marketing/3d-pin-demo'
import { AppStoreDemo } from '@/components/marketing/app-store-demo'
import { BackgroundRippleBand } from '@/components/marketing/background-ripple-band'
import { BentoGridExampleThree } from '@/components/marketing/bento-grid-example-three'
import { ClosingCta } from '@/components/marketing/closing-cta'
import { FeaturesDoctrine } from '@/components/marketing/features-doctrine'
import { GridBackgroundDemo } from '@/components/marketing/grid-background-demo'
import { HeritageScrollDemo } from '@/components/marketing/heritage-scroll-demo'
import { HeroScrollDemo } from '@/components/marketing/hero-scroll-demo'
import { SectionIntro } from '@/components/marketing/section-intro'

/**
 * Hearst Connect landing — premium 4-act narrative (dark-only) + Motion interludes.
 *   Act 1 Hero            → ripple interlude → scroll-velocity carousel interlude
 *   Act 2 Proof (domains) → grid background interlude → 3D pin interlude
 *   Act 3 Doctrine (3 pillars) → bento interlude
 *   Act 4 CTA (mint aurora)
 * Premium header/footer kept. A `console-line-soft` rule opens each section.
 * Server component: animated blocks are self-contained client islands.
 */
export default function HomePage() {
  return (
    <>
      <HeroScrollDemo />

      <BackgroundRippleBand />

      <div className="border-t border-console-line-soft">
        <HeritageScrollDemo />
      </div>

      <section
        aria-labelledby="preuve-heading"
        className="border-t border-console-line-soft bg-console-app"
      >
        <SectionIntro
          id="preuve-heading"
          align="center"
          className="px-6 pt-24 md:pt-32"
          eyebrow="Console preview"
          title="Four domains, one source of truth"
          sub="Access, vaults, compliance, operations: four domains in one environment. The previews below illustrate each space; in the product, data comes from the Hearst backend and an absence stays an absence. Open a preview to enlarge it."
        />
        <AppStoreDemo />
      </section>

      <div className="border-t border-console-line-soft">
        <GridBackgroundDemo />
      </div>

      <div className="border-t border-console-line-soft">
        <Pin3dDemo />
      </div>

      <FeaturesDoctrine />

      <div className="border-t border-console-line-soft">
        <BentoGridExampleThree />
      </div>

      <ClosingCta />
    </>
  )
}
