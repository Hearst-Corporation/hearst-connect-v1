'use client'

import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Acte 1 — Hero. Le seul mouvement qui révèle le produit : au défilement, la capture réelle
 * de la console se redresse (rotateX 20°→0°) et se met à l'échelle. Titre + CTA + trust-line.
 */
export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-xs font-medium tracking-[0.2em] text-accent-300 uppercase">
              Console d’administration Hearst
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl md:text-[5.5rem] md:leading-[1.02]">
              Un seul accès <span className="text-accent-300">à tous vos espaces Hearst</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm/6 text-white/50 md:text-base">
              Identités, autorisations et journaux d’accès réunis dans une console unique. Dans le
              produit, chaque valeur vient du backend Hearst — une absence y reste une absence,
              jamais un chiffre de remplissage.
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
            <p className="mt-6 text-xs text-white/60">
              Réservé aux propriétaires et administrateurs d’espaces Hearst.
            </p>
          </div>
        }
      >
        <Image
          src="/brand/console-preview.png"
          alt="Aperçu de la console d’administration Hearst Connect"
          height={720}
          width={1400}
          className="mx-auto h-full rounded-2xl object-cover object-top-left"
          draggable={false}
          priority
        />
      </ContainerScroll>
    </div>
  )
}
