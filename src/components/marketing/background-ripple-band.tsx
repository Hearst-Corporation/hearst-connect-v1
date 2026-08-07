'use client'

import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect'
import Link from 'next/link'

/** Bande CTA Aceternity ripple — à poser entre deux bentos. */
export function BackgroundRippleBand() {
  return (
    <section className="relative flex min-h-[28rem] w-full flex-col items-center justify-center overflow-hidden py-20 md:min-h-[32rem]">
      <BackgroundRippleEffect rows={8} cols={27} cellSize={56} />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Un accès. Toute la Corporation.
        </h2>
        <p className="mt-4 text-sm/6 text-white/50 sm:text-base">
          Cliquez la grille — l’onde se propage. Puis ouvrez la console.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-md bg-accent-400 px-3.5 py-2.5 text-sm font-semibold text-accent-ink shadow-xs hover:bg-accent-300"
          >
            Accéder à la console
          </Link>
          <Link href="/register" className="text-sm/6 font-semibold text-white">
            Demander un accès <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
