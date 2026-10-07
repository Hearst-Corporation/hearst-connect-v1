/**
 * Les marques des services branchés au produit — affichées là où l'on agit
 * à travers eux (envoyer par Gmail, consigner dans HubSpot), pour qu'on sache
 * où part ce qu'on fait.
 */

export function GmailLogo({ className = 'size-4' }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75V40h7a3 3 0 0 0 3-3z" />
      <path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6a3 3 0 0 1-3-3z" />
      <path fill="#e53935" d="M35 11.2L24 19.45 13 11.2l-1 5.8 1 6.7 11 8.25 11-8.25 1-6.7z" />
      <path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859A4.298 4.298 0 0 0 3 12.298z" />
      <path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341A4.298 4.298 0 0 1 45 12.298z" />
    </svg>
  )
}

export function HubSpotLogo({ className = 'size-4' }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#ff7a59"
        d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.978v-.067A2.2 2.2 0 0 0 17.238.845h-.067a2.2 2.2 0 0 0-2.193 2.193v.067a2.196 2.196 0 0 0 1.252 1.973l.013.006v2.852a6.22 6.22 0 0 0-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 1 0 4.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 0 0-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033 1.978 1.978 0 0 0-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 1 0 4.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 1 1 3.215-3.207v.002a3.206 3.206 0 0 1-3.207 3.207z"
      />
    </svg>
  )
}

export function FireblocksLogo({ className = 'size-4' }: Readonly<{ className?: string }>) {
  // Trois blocs empilés : la marque Fireblocks, simplifiée.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M4 15.5 12 20l8-4.5-2.4-1.35L12 17.3l-5.6-3.15z" opacity=".55" />
      <path d="M4 11.5 12 16l8-4.5-2.4-1.35L12 13.3l-5.6-3.15z" opacity=".8" />
      <path d="M12 3 4 7.5 12 12l8-4.5z" />
    </svg>
  )
}

export function SumsubLogo({ className = 'size-4' }: Readonly<{ className?: string }>) {
  // Le monogramme, simplifié : un « S » dans un carré arrondi.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#1f6bff" />
      <path
        fill="#fff"
        d="M15.6 8.6c-.6-.9-1.8-1.5-3.3-1.5-2 0-3.4 1-3.4 2.6 0 1.6 1.3 2.2 3 2.6 1.3.3 1.9.5 1.9 1.1 0 .6-.6 1-1.6 1-1.1 0-1.9-.5-2.4-1.2l-1.5 1.1c.7 1.1 2.1 1.8 3.9 1.8 2.1 0 3.5-1.1 3.5-2.8 0-1.7-1.4-2.3-3.1-2.6-1.2-.3-1.8-.4-1.8-1 0-.5.5-.8 1.4-.8.8 0 1.5.3 1.9.9z"
      />
    </svg>
  )
}
