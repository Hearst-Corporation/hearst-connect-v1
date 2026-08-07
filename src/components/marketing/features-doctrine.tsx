import { SectionIntro } from '@/components/marketing/section-intro'
import { DocumentTextIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

/**
 * Acte 3 — Fonctionnalités & doctrine. Grille statique de trois piliers, calme :
 * aucun mouvement, seul le filet se raffermit au survol (console-line-soft → console-line).
 * Version sobre de l'ancien bento (skeletons décoratifs retirés).
 */
const PILLARS = [
  {
    icon: KeyIcon,
    title: 'Lecture des rôles',
    desc: 'Chaque membre voit exactement ce que son rôle autorise. Les postures à risque — propriétaire sans MFA, membre hors politique — sont nommées, jamais masquées.',
  },
  {
    icon: DocumentTextIcon,
    title: 'Journal d’accès traçable',
    desc: 'Chaque connexion et chaque mouvement est horodaté et attribuable. L’audit se lit tel quel, sans reconstruire l’historique à la main.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Véracité des données',
    desc: 'Une source indisponible s’affiche comme indisponible. Pas de zéro inventé, pas de badge vert forcé : l’absence est un état, pas un remplissage.',
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
          eyebrow="Doctrine produit"
          title="Conçu pour la gouvernance, pas pour la démonstration"
          sub="Des rôles lisibles, un audit attribuable, une doctrine de données stricte — trois principes qui tiennent en production."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl bg-console-card p-6 ring-1 ring-console-line-soft backdrop-blur-xl transition duration-200 hover:ring-console-line md:p-8"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft ring-1 ring-accent-400/20">
                <Icon className="size-5 text-accent-300" aria-hidden />
              </span>
              <h3 className="mt-6 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm/6 text-white/50">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
