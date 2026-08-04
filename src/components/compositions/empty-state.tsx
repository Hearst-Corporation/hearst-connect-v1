import { gcc } from '@/components/layout/console'
import { Panel, PanelBody, PanelHeader } from '@/components/compositions/panel'

/**
 * SourceAttendue — l'état le plus important du produit.
 *
 * Une partie des surfaces décrit une activité dont le backend n'expose pas
 * encore les données. La console le DIT, et nomme ce qui manque, au lieu
 * d'afficher une liste vide qui se lirait comme une panne — ou pire, un jeu
 * d'exemple qui se lirait comme la réalité.
 *
 * ── Ce qu'elle remplace ───────────────────────────────────────────────────
 * Six routes déclaraient leur propre copie. Les cinq variantes ne différaient
 * que par la présence d'un `action` facultatif et par la mise en forme du
 * `.map()` — même structure, même matière, même contrat. Le `action` est
 * conservé ici : c'est la seule différence qui portait un besoin réel.
 *
 * ── Ce qu'elle n'est pas ──────────────────────────────────────────────────
 * Ce n'est PAS un état d'erreur, et ce n'est pas un état vide au sens
 * « la liste est vide » : c'est « la source n'existe pas encore ». Les trois
 * disent des choses différentes et ne doivent pas être confondus dans un
 * composant unique piloté par un booléen.
 */
export function SourceAttendue({
  quoi,
  detail,
  requis,
  action,
}: Readonly<{
  /** Ce que cette surface montrerait si la source existait. */
  quoi: string
  /** Pourquoi elle ne le montre pas — en une phrase, sans jargon. */
  detail: string
  /** Ce que le backend doit exposer. Une ligne par élément attendu. */
  requis: readonly string[]
  action?: React.ReactNode
}>) {
  return (
    <Panel tone="wave">
      <PanelHeader title={quoi} />
      <PanelBody>
        <p className={gcc.cellText}>{detail}</p>
        {requis.map((item) => (
          <p key={item} className={gcc.cellText}>
            {item}
          </p>
        ))}
        {action}
      </PanelBody>
    </Panel>
  )
}

/**
 * CalmState — « rien ne demande votre attention ».
 *
 * À distinguer d'une absence : ici la source a répondu, et sa réponse est que
 * tout va bien. Un état vide muet laisserait le lecteur se demander si la page
 * a échoué.
 */
export function CalmState({ message }: Readonly<{ message: string }>) {
  return (
    <Panel tone="wave">
      <PanelBody>
        <p className={gcc.cellText}>{message}</p>
      </PanelBody>
    </Panel>
  )
}
