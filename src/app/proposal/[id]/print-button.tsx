'use client'

/**
 * Le PDF passe par l'impression du navigateur (« Enregistrer en PDF ») : un
 * rendu fidèle à la page, sans dépendance de génération côté serveur.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center rounded-full bg-[#9eea7a] px-5 text-[13px] font-medium text-[#06140a] hover:brightness-105"
    >
      Download PDF
    </button>
  )
}
