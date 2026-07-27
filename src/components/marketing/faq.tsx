// Bloc officiel Tailwind Plus — Marketing / FAQs
// « Two columns » (faqs/06), palette du projet.

const faqs = [
  {
    id: 1,
    question: 'Faut-il remplacer notre annuaire existant ?',
    answer:
      'Non. Hearst Connect se branche sur Okta, Google Workspace ou un annuaire SCIM v2 et les laisse maîtres de l’identité. Il ajoute la couche d’autorisation et le journal, pas un second référentiel.',
  },
  {
    id: 2,
    question: 'Que se passe-t-il au départ d’un collaborateur ?',
    answer:
      'La désactivation dans l’annuaire coupe les sessions actives et retire les accès sur tous les espaces. La trace de ce qui a été fait avant reste, elle, dans le journal.',
  },
  {
    id: 3,
    question: 'Où sont hébergées les données ?',
    answer:
      'En Europe par défaut (eu-west-3). Le plan Corporation permet de choisir une autre région et de fixer contractuellement la durée de rétention du journal.',
  },
  {
    id: 4,
    question: 'Peut-on exporter le journal d’accès ?',
    answer:
      'Oui, depuis la console ou l’API, au format CSV ou JSON. Les exports sont eux-mêmes journalisés : on sait qui a extrait quoi, et quand.',
  },
  {
    id: 5,
    question: 'Comment ouvre-t-on un compte ?',
    answer:
      'L’accès se fait sur invitation d’un propriétaire d’espace. Écrivez-nous : nous ouvrons l’espace, vous invitez ensuite vos équipes depuis la console.',
  },
  {
    id: 6,
    question: 'Y a-t-il une API ?',
    answer:
      'Oui, une API REST couvre les membres, les autorisations et le journal, avec des clés à portée limitée et rotation sans interruption.',
  },
]

export function Faq() {
  return (
    <div id="questions" className="scroll-mt-16 bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
          Questions fréquentes
        </h2>
        <p className="mt-6 max-w-2xl text-base/7 text-zinc-600 dark:text-zinc-400">
          Une autre question ? Écrivez à l’équipe à{' '}
          <a
            href="mailto:connect@hearstcorporation.io"
            className="font-semibold text-accent-600 hover:text-accent-500 dark:text-accent-400 dark:hover:text-accent-300"
          >
            connect@hearstcorporation.io
          </a>{' '}
          — nous répondons sous un jour ouvré.
        </p>
        <div className="mt-20">
          <dl className="space-y-16 sm:grid sm:grid-cols-2 sm:space-y-0 sm:gap-x-6 sm:gap-y-16 lg:gap-x-10">
            {faqs.map((faq) => (
              <div key={faq.id}>
                <dt className="text-base/7 font-semibold text-zinc-950 dark:text-white">{faq.question}</dt>
                <dd className="mt-2 text-base/7 text-zinc-600 dark:text-zinc-400">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
