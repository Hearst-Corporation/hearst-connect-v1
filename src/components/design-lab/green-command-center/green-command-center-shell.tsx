import { gcc } from './primitives'

/**
 * The full-screen shell.
 *
 * The reference is explicit that this is not a mock-up: no outer frame, no
 * page margin, no global radius, no top header, the rail flush to the left
 * edge, content out to the viewport bounds. This component is the only place
 * that geometry is asserted, and it mounts NO AdminShell — the laboratory
 * lives outside `/admin` precisely so the console's sidebar is not stacked
 * underneath a second one.
 *
 * ── Pourquoi il y a un `dark` ici, et pourquoi il est OBLIGATOIRE ──────────
 * Toute la composition est faite de composants Catalyst, et Catalyst déclare
 * ses couleurs en paires `text-zinc-950 dark:text-white`. Sans ancêtre `.dark`,
 * c'est la branche CLAIRE qui gagne : `zinc-950` (#020611) posé sur un panneau
 * à #020203, soit un ratio de 1.01:1 — du texte littéralement invisible. Mesuré
 * sur cette page : 39 échecs de contraste, 102 éléments concernés, dont les
 * trois vrais points de la table d'activité et les six comptes de mouvement.
 *
 * `/admin` s'en sort parce que `admin-shell.tsx` monte
 * `<div className="cockpit-theme dark contents">`. Le laboratoire vit hors de
 * `/admin`, donc hors de ce div : il doit déclarer son propre contexte sombre.
 * `contents` fait que le div ne crée aucune boîte — il ne porte que la classe.
 */
export function GreenCommandCenterShell({
  rail,
  children,
  label,
}: Readonly<{ rail: React.ReactNode; children: React.ReactNode; label: string }>) {
  return (
    <main className={`dark ${gcc.viewport}`} aria-label={label}>
      {/*
        * Le titre de niveau 1, en `sr-only`.
        *
        * La composition n'a AUCUN en-tête visible — c'est le contrat du
        * prototype : « aucun header supérieur ». Mais la page portait cinq `h2`
        * (la bande de métriques) sans aucun `h1` au-dessus : le plan du document
        * démarrait au niveau 2, et un lecteur d'écran n'avait pas de titre de
        * page. Le `h1` existe donc pour la structure, sans occuper un pixel.
        */}
      <h1 className={gcc.srOnly}>{label}</h1>
      <section className={gcc.shell} data-gcc="shell">
        {rail}
        <div className={gcc.workspace} data-gcc="workspace">
          {children}
        </div>
      </section>
    </main>
  )
}

export { gcc }
