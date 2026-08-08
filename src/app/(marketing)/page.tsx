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
 * Landing Hearst Connect — récit premium 4 actes (dark-only) + interludes Motion.
 *   Acte 1 Hero            → interlude Vague (ripple) → interlude Carousel 3D (scroll-vélocité)
 *   Acte 2 Preuve (domaines) → interlude Grille de fond → interlude Pin 3D
 *   Acte 3 Doctrine (3 piliers) → interlude Bento
 *   Acte 4 CTA (aurore mint)
 * Header/footer premium conservés. Un filet `console-line-soft` ouvre chaque section.
 * Server component : les blocs animés sont des îlots client autonomes.
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
          eyebrow="Aperçu de la console"
          title="Quatre domaines, une seule vérité"
          sub="Accès, coffres, conformité, opérations : quatre domaines réunis dans un même environnement. Les aperçus ci-dessous illustrent chaque espace ; dans le produit, la donnée vient du backend Hearst et une absence y reste une absence. Ouvrez un aperçu pour l’agrandir."
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
