'use client'

import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect'

/**
 * Interlude « vague » — grille Aceternity qui propage une onde au survol / au clic.
 * Placée tôt (après le hero) : moment atmosphérique sur le réseau unifié, sans CTA
 * (les appels à l'action vivent dans le hero et la bande de clôture) ni titre dupliqué.
 */
export function BackgroundRippleBand() {
  return (
    <section
      aria-labelledby="reseau-heading"
      className="relative flex min-h-112 w-full flex-col items-center justify-center overflow-hidden border-t border-console-line-soft py-24 md:min-h-128"
    >
      <BackgroundRippleEffect rows={8} cols={27} cellSize={56} />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-accent-300 uppercase">Un seul réseau</p>
        <h2
          id="reseau-heading"
          className="mt-4 text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl md:text-5xl"
        >
          Tous les espaces Hearst, sur une même surface
        </h2>
        <p className="mt-4 text-sm/6 text-white/50 md:text-base">
          Chaque coffre, chaque rôle, chaque journal — reliés. Effleurez la grille : l’onde suit.
        </p>
      </div>
    </section>
  )
}
