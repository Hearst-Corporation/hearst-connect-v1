import type { SVGProps } from 'react'

/**
 * Symbole bitcoin (₿) dans un cercle.
 *
 * Heroicons ne fournit aucun glyphe monétaire pour le bitcoin — il couvre le
 * dollar, l'euro, la livre, mais pas ₿. Le tracé est donc dessiné ici, au même
 * registre que les icônes Heroicons qui l'entourent : contour de 1.5, cercle de
 * 24, `currentColor` pour que la couleur vienne du CSS.
 */
export function BitcoinIcon({ className, ...props }: Readonly<SVGProps<SVGSVGElement>>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      {/*
        Le ₿ est tracé PLEIN, pas en contour : à 16px, deux ventres cerclés d'un
        trait de 1.5 se refermaient en taches. Le cercle reste en contour, comme
        les Heroicons voisines — l'ensemble garde leur poids visuel.
      */}
      <path
        fill="currentColor"
        stroke="none"
        d="M14.4 11.6c.7-.4 1.1-1.1 1.1-2 0-1.2-.9-2.1-2.2-2.3V5.9h-1.2v1.3h-.9V5.9h-1.2v1.3H8.4v1.3h.9v6.9h-.9v1.3h1.6v1.4h1.2v-1.4h.9v1.4h1.2v-1.4c1.6-.1 2.7-1.1 2.7-2.6 0-1.1-.6-1.9-1.6-2.2Zm-3.6-3h2.1c.6 0 1 .4 1 1s-.4 1-1 1h-2.1v-2Zm2.4 5.9h-2.4v-2.1h2.4c.7 0 1.2.4 1.2 1s-.5 1.1-1.2 1.1Z"
      />
    </svg>
  )
}

/**
 * Le ₿ en grand, dans la construction du monogramme H : une lettre ÉPAISSE,
 * géométrique (segments droits, angles coupés en biais comme la diagonale du
 * H), dessinée par son seul contour — un trait fin d'épaisseur fixe en pixels,
 * comme `DottedH`. Les deux barres verticales du ₿ dépassent en haut et en bas.
 */
export function BitcoinMark({ className, ...props }: Readonly<SVGProps<SVGSVGElement>>) {
  return (
    <svg viewBox="-4 -4 208 308" fill="none" aria-hidden="true" focusable="false" className={className} {...props}>
      <path
        stroke="currentColor"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="miter"
        fillRule="evenodd"
        d="M0 30H40V0H62V30H100V0H122V30H150L190 70V120L165 145L200 180V230L160 270H122V300H100V270H62V300H40V270H0Z M60 80H125L135 90V110L125 120H60Z M60 170H135L145 180V210L135 220H60Z"
      />
    </svg>
  )
}
