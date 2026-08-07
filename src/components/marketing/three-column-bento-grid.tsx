'use client'

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { cn } from '@/lib/utils'
import {
  ClipboardDocumentListIcon,
  KeyIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

function SkeletonPanel({ className, children }: Readonly<{ className?: string; children?: ReactNode }>) {
  return (
    <div
      className={cn(
        'flex min-h-[6rem] w-full flex-1 flex-col overflow-hidden rounded-xl bg-console-inset ring-1 ring-console-line-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}

function SkeletonAccess() {
  return (
    <SkeletonPanel className="justify-center gap-2 p-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.45, x: 0 }}
          whileHover={{ opacity: 1, x: i % 2 === 0 ? 6 : -6 }}
          className={cn(
            'flex items-center gap-2 rounded-full bg-console-card px-3 py-2 ring-1 ring-console-line-soft',
            i === 1 && 'ml-auto w-4/5',
          )}
        >
          <span className="size-5 shrink-0 rounded-full bg-accent-300/30 ring-1 ring-accent-300/40" />
          <span className="h-2 flex-1 rounded-full bg-white/10" />
        </motion.div>
      ))}
    </SkeletonPanel>
  )
}

function SkeletonAudit() {
  return (
    <SkeletonPanel className="justify-center gap-2 p-3">
      {[72, 88, 56, 94, 64, 80].map((width, i) => (
        <motion.div
          key={i}
          initial={{ scaleX: 0.35 }}
          whileHover={{ scaleX: 1 }}
          style={{ transformOrigin: 'left', width: `${width}%` }}
          className="h-2 rounded-full bg-accent-300/25 ring-1 ring-console-line-soft"
        />
      ))}
    </SkeletonPanel>
  )
}

function SkeletonRoles() {
  return (
    <SkeletonPanel className="items-center justify-center p-4">
      <motion.div
        className="flex size-20 items-center justify-center rounded-2xl bg-accent-soft ring-1 ring-accent-400/25"
        whileHover={{ scale: 1.05 }}
      >
        <KeyIcon className="size-8 text-accent-300" />
      </motion.div>
    </SkeletonPanel>
  )
}

function SkeletonConsole() {
  return (
    <SkeletonPanel className="grid grid-cols-3 gap-2 p-3">
      {['Coffres', 'Clients', 'Conformité'].map((label) => (
        <motion.div
          key={label}
          whileHover={{ y: -4 }}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-console-card p-3 ring-1 ring-console-line-soft"
        >
          <span className="size-8 rounded-full bg-accent-300/20" />
          <span className="text-[10px] font-medium text-white/60">{label}</span>
        </motion.div>
      ))}
    </SkeletonPanel>
  )
}

function SkeletonSpaces() {
  return (
    <SkeletonPanel className="justify-end gap-2 p-3">
      <motion.div
        whileHover={{ x: 6 }}
        className="rounded-2xl bg-console-card p-3 ring-1 ring-console-line-soft"
      >
        <p className="text-xs text-white/70">Espace propriétaire</p>
        <p className="mt-1 text-[10px] text-white/40">Identité Hearst · session chiffrée</p>
      </motion.div>
      <motion.div
        whileHover={{ x: -6 }}
        className="ml-auto w-3/4 rounded-full bg-console-card px-3 py-2 text-right text-[10px] text-white/50 ring-1 ring-console-line-soft"
      >
        Accès accordé
      </motion.div>
    </SkeletonPanel>
  )
}

const items = [
  {
    title: 'Identités unifiées',
    description: 'Une connexion pour tous les espaces Hearst — sans silo.',
    header: <SkeletonAccess />,
    className: 'md:col-span-1',
    icon: <UsersIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Journal d’accès',
    description: 'Chaque entrée, chaque autorisation, traçable au même endroit.',
    header: <SkeletonAudit />,
    className: 'md:col-span-1',
    icon: <ClipboardDocumentListIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Autorisations',
    description: 'Rôles et droits portés par le backend — jamais inventés côté UI.',
    header: <SkeletonRoles />,
    className: 'md:col-span-1',
    icon: <ShieldCheckIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Console d’administration',
    description: 'Pilotage des coffres, clients, conformité et opérations.',
    header: <SkeletonConsole />,
    className: 'md:col-span-2',
    icon: <Squares2X2Icon className="size-4 text-accent-300" />,
  },
  {
    title: 'Espaces propriétaires',
    description: 'Surface membre pour suivre l’activité de son espace.',
    header: <SkeletonSpaces />,
    className: 'md:col-span-1',
    icon: <KeyIcon className="size-4 text-accent-300" />,
  },
]

/** Grille bento 3 colonnes — primitive Aceternity, contenu Hearst Connect. */
export function ThreeColumnBentoGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-8">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          La plateforme, en trois colonnes
        </h2>
        <p className="mt-3 text-sm/6 text-white/50">
          Accès, audit et pilotage — la même matière visuelle que la console.
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
            className={item.className}
          />
        ))}
      </BentoGrid>
    </section>
  )
}
