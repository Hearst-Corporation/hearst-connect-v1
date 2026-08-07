import { AppStoreDemo } from '@/components/marketing/app-store-demo'
import { ClosingCta } from '@/components/marketing/closing-cta'
import { FeaturesDoctrine } from '@/components/marketing/features-doctrine'
import { HeroScrollDemo } from '@/components/marketing/hero-scroll-demo'
import { SectionIntro } from '@/components/marketing/section-intro'

/**
 * Landing Hearst Connect — récit en 4 actes, dark-only :
 *   Acte 1 Hero         — la console réelle se redresse au défilement (mouvement n°1).
 *   Acte 2 Preuve       — quatre domaines, cartes qui s'ouvrent sur des captures (mouvement n°2).
 *   Acte 3 Doctrine     — trois piliers de gouvernance, immobiles.
 *   Acte 4 CTA          — clôture calme vers /login et /register.
 * Server component : n'importe que les deux îlots client (hero, cartes) + deux sections statiques.
 */
export default function HomePage() {
  return (
    <>
      <HeroScrollDemo />

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

      <FeaturesDoctrine />

      <ClosingCta />
    </>
  )
}
