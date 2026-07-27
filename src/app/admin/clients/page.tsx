import { SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — l'entrée par l'organisation.
 *
 * Cette page attend une source. Le service n'expose aucun annuaire : il
 * n'existe pas de route pour lire les organisations, et le modèle de données
 * lui-même n'a pas d'entité `Organization` — l'entité la plus proche,
 * `Investor`, est vide en production.
 *
 * On pourrait dessiner un tableau à colonnes vides. Ce serait indiscernable
 * d'un annuaire réel qui n'aurait pas encore de client, et indiscernable
 * aussi d'une panne. La page dit donc précisément ce qui manque, et ce qu'il
 * faudra pour l'ouvrir.
 */
export default function Page() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Clients"
        description="Les organisations, leurs personnes, leurs portefeuilles et leurs mouvements — réunis autour d’une seule fiche."
      />

      <section aria-labelledby="registre-client" className="bg-surface-page border-y border-zinc-300 py-10 sm:py-14">
        <div className="max-w-5xl">
          <p className="text-xs tracking-[0.18em] text-zinc-600 uppercase">Registre client</p>
          <h2
            id="registre-client"
            className="mt-5 max-w-4xl text-3xl leading-[1.08] font-normal tracking-[-0.03em] text-black sm:text-5xl"
          >
            Une organisation doit relier les personnes habilitées, les portefeuilles autorisés et chaque mouvement.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-700">
            Cette structure n’est pas encore transmise par le service. Elle est donc décrite comme une source attendue,
            sans annuaire factice ni état vide ambigu.
          </p>
        </div>

        <ol className="mt-12 grid border-t border-zinc-300 md:grid-cols-3">
          {[
            ['01', 'Organisation', 'L’entité de référence à laquelle rattacher le dossier client.'],
            ['02', 'Personnes', 'Les représentants et bénéficiaires reliés à cette organisation.'],
            ['03', 'Portefeuilles', 'Les adresses autorisées, souscriptions et mouvements associés.'],
          ].map(([numero, titre, detail]) => (
            <li
              key={numero}
              className="border-b border-zinc-300 py-6 md:border-r md:border-b-0 md:px-6 md:first:pl-0 md:last:border-r-0"
            >
              <span className="text-xs text-zinc-500 tabular-nums">{numero}</span>
              <h3 className="mt-8 text-xl font-normal text-black">{titre}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-600">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <SourceAttendue
        quoi="L’annuaire des organisations n’est pas encore ouvert"
        detail="Le service ne transmet aucune organisation aujourd’hui. Plutôt qu’un tableau vide — qu’on prendrait pour une panne ou pour un portefeuille sans client — cette page nomme ce qui manque."
        requis={[
          'Une entité Organisation dans le modèle de données : elle n’existe pas encore, seul un enregistrement Investisseur s’en approche',
          'Une lecture de l’annuaire, avec l’encours, l’état de conformité et le niveau de risque de chaque organisation',
          'Le rattachement des personnes, des portefeuilles autorisés et des souscriptions à leur organisation',
        ]}
      />
    </div>
  )
}
