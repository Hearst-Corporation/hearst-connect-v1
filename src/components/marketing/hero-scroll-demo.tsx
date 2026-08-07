'use client'

import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import Image from 'next/image'

/** Démo Aceternity container-scroll — textes / image Hearst Connect. */
export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <h1 className="text-4xl font-semibold text-white">
            Un seul accès à
            <br />
            <span className="mt-1 block text-4xl leading-none font-bold text-accent-300 md:text-[6rem]">
              Hearst Connect
            </span>
          </h1>
        }
      >
        <Image
          src="/brand/console-preview.png"
          alt="Aperçu de la console Hearst Connect"
          height={720}
          width={1400}
          className="mx-auto h-full rounded-2xl object-cover object-left-top"
          draggable={false}
          priority
        />
      </ContainerScroll>
    </div>
  )
}
