'use client'

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { cn } from '@/lib/utils'
import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  KeyIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

/** Équivalent public de `@aceternity/bento-grid-example-three` (`bento-grid-demo-3`). */

const chatVariants: Variants = {
  initial: { x: 0 },
  animate: { x: 10, rotate: 5, transition: { duration: 0.2 } },
}

const chatVariantsSecond: Variants = {
  initial: { x: 0 },
  animate: { x: -10, rotate: -5, transition: { duration: 0.2 } },
}

function SkeletonOne() {
  return (
    <motion.div
      initial="initial"
      whileHover="animate"
      className="flex h-full min-h-[6rem] w-full flex-1 flex-col space-y-2"
    >
      <motion.div
        variants={chatVariants}
        className="flex flex-row items-center space-x-2 rounded-full bg-console-card p-2 ring-1 ring-console-line-soft"
      >
        <div className="size-6 shrink-0 rounded-full bg-linear-to-r from-accent-400 to-accent-600" />
        <div className="h-4 w-full rounded-full bg-white/10" />
      </motion.div>
      <motion.div
        variants={chatVariantsSecond}
        className="ml-auto flex w-3/4 flex-row items-center space-x-2 rounded-full bg-console-card p-2 ring-1 ring-console-line-soft"
      >
        <div className="h-4 w-full rounded-full bg-white/10" />
        <div className="size-6 shrink-0 rounded-full bg-linear-to-r from-accent-400 to-accent-600" />
      </motion.div>
      <motion.div
        variants={chatVariants}
        className="flex flex-row items-center space-x-2 rounded-full bg-console-card p-2 ring-1 ring-console-line-soft"
      >
        <div className="size-6 shrink-0 rounded-full bg-linear-to-r from-accent-400 to-accent-600" />
        <div className="h-4 w-full rounded-full bg-white/10" />
      </motion.div>
    </motion.div>
  )
}

const BAR_WIDTHS = ['72%', '88%', '56%', '94%', '64%', '80%'] as const

function SkeletonTwo() {
  const variants: Variants = {
    initial: { width: 0 },
    animate: { width: '100%', transition: { duration: 0.2 } },
    hover: { width: ['0%', '100%'], transition: { duration: 2 } },
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="flex h-full min-h-[6rem] w-full flex-1 flex-col space-y-2"
    >
      {BAR_WIDTHS.map((width, i) => (
        <motion.div
          key={`bar-${i}`}
          variants={variants}
          style={{ maxWidth: width }}
          className="flex h-4 w-full flex-row items-center space-x-2 rounded-full bg-console-card p-2 ring-1 ring-console-line-soft"
        />
      ))}
    </motion.div>
  )
}

function SkeletonThree() {
  const variants: Variants = {
    initial: { backgroundPosition: '0% 50%' },
    animate: { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] },
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse' }}
      className="flex h-full min-h-[6rem] w-full flex-1 flex-col space-y-2 rounded-lg bg-size-[400%_400%] bg-linear-to-br from-accent-600 via-accent-400 to-accent-300"
    >
      <motion.div className="h-full w-full rounded-lg" />
    </motion.div>
  )
}

function SkeletonFour() {
  const first: Variants = {
    initial: { x: 20, rotate: -5 },
    hover: { x: 0, rotate: 0 },
  }
  const second: Variants = {
    initial: { x: -20, rotate: 5 },
    hover: { x: 0, rotate: 0 },
  }

  const cards = [
    {
      variants: first,
      initials: 'OW',
      label: 'Propriétaire sans MFA',
      badge: 'Risque',
      badgeClass: 'border-danger-500 bg-danger-950/40 text-danger-400',
    },
    {
      variants: undefined,
      initials: 'AD',
      label: 'Admin console actif',
      badge: 'Sain',
      badgeClass: 'border-success-500 bg-success-950/40 text-success-400',
      center: true,
    },
    {
      variants: second,
      initials: 'MB',
      label: 'Membre hors politique',
      badge: 'À traiter',
      badgeClass: 'border-warning-500 bg-warning-950/40 text-warning-400',
    },
  ] as const

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="flex h-full min-h-[6rem] w-full flex-1 flex-row space-x-2"
    >
      {cards.map((card) => (
        <motion.div
          key={card.initials}
          variants={card.variants}
          className={cn(
            'flex h-full w-1/3 flex-col items-center justify-center rounded-2xl bg-console-card p-4 ring-1 ring-console-line-soft',
            'center' in card && card.center && 'relative z-20',
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-300 ring-1 ring-accent-400/25">
            {card.initials}
          </span>
          <p className="mt-4 text-center text-xs font-semibold text-white/50 sm:text-sm">{card.label}</p>
          <p className={cn('mt-4 rounded-full border px-2 py-0.5 text-xs', card.badgeClass)}>{card.badge}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}

function SkeletonFive() {
  return (
    <motion.div
      initial="initial"
      whileHover="animate"
      className="flex h-full min-h-[6rem] w-full flex-1 flex-col space-y-2"
    >
      <motion.div
        variants={chatVariants}
        className="flex flex-row items-start space-x-2 rounded-2xl bg-console-card p-2 ring-1 ring-console-line-soft"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent-300">
          HC
        </span>
        <p className="text-xs text-white/50">
          Les journaux d’accès, les rôles et les coffres vivent sur le même backend Railway…
        </p>
      </motion.div>
      <motion.div
        variants={chatVariantsSecond}
        className="ml-auto flex w-3/4 flex-row items-center justify-end space-x-2 rounded-full bg-console-card p-2 ring-1 ring-console-line-soft"
      >
        <p className="text-xs text-white/50">Pas de donnée inventée.</p>
        <div className="size-6 shrink-0 rounded-full bg-linear-to-r from-accent-400 to-accent-600" />
      </motion.div>
    </motion.div>
  )
}

const items: ReadonlyArray<{
  title: string
  description: ReactNode
  header: ReactNode
  className: string
  icon: ReactNode
}> = [
  {
    title: 'Flux d’identité',
    description: <span className="text-sm">Bulles de session qui réagissent au survol.</span>,
    header: <SkeletonOne />,
    className: 'md:col-span-1',
    icon: <ClipboardDocumentListIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Charge d’audit',
    description: <span className="text-sm">Barres qui se remplissent — largeurs fixes, jamais au hasard.</span>,
    header: <SkeletonTwo />,
    className: 'md:col-span-1',
    icon: <DocumentTextIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Accent Hearst',
    description: <span className="text-sm">Dégradé mint animé — la couleur de marque en mouvement.</span>,
    header: <SkeletonThree />,
    className: 'md:col-span-1',
    icon: <KeyIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Lecture des rôles',
    description: <span className="text-sm">Trois postures d’accès qui se recentrent au survol.</span>,
    header: <SkeletonFour />,
    className: 'md:col-span-2',
    icon: <Squares2X2Icon className="size-4 text-accent-300" />,
  },
  {
    title: 'Vérité des données',
    description: <span className="text-sm">Une absence reste une absence — jamais un zéro inventé.</span>,
    header: <SkeletonFive />,
    className: 'md:col-span-1',
    icon: <ShieldCheckIcon className="size-4 text-accent-300" />,
  },
]

export function BentoGridExampleThree() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-8">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Bento · example three
        </h2>
        <p className="mt-3 text-sm/6 text-white/50">
          Même structure Motion que le démo Aceternity 3 — surfaces console Hearst.
        </p>
      </div>
      <BentoGrid className="md:auto-rows-[20rem]">
        {items.map((item) => (
          <BentoGridItem
            key={item.title}
            title={item.title}
            description={item.description}
            header={item.header}
            icon={item.icon}
            className={cn(item.className)}
          />
        ))}
      </BentoGrid>
    </section>
  )
}
