import { CONSOLE_GLOW_SRC } from '@/lib/brand'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Acte 4 — CTA de clôture, immobile. Filigrane console-glow.png (aurore mint de la marque)
 * en couche basse + voile console-app pour garantir le contraste AA du titre et des boutons.
 * Remplace l'ancienne bande ripple (copy impérative « cliquez la grille » bannie).
 */
export function ClosingCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="relative isolate overflow-hidden border-t border-console-line-soft bg-console-app"
    >
      <Image
        src={CONSOLE_GLOW_SRC}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-40"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-console-app/70" aria-hidden />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center md:py-32">
        <h2
          id="cta-heading"
          className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl md:text-5xl"
        >
          Un accès. Toute la Corporation.
        </h2>
        <p className="mt-5 max-w-2xl text-sm/6 text-white/50 md:text-base">
          Ouvrez la console d’administration Hearst, ou demandez un accès pour votre espace. La
          donnée reste celle du backend, de la première vue à la dernière.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-md bg-accent-400 px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-xs transition-colors hover:bg-accent-300"
          >
            Accéder à la console
          </Link>
          <Link
            href="/register"
            className="text-sm/6 font-semibold text-white transition-colors hover:text-accent-300"
          >
            Demander un accès <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
