'use client'

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { cn } from '@/lib/utils'
import {
  ClipboardDocumentListIcon,
  CloudArrowUpIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useId, useState, type ReactNode } from 'react'

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 24 }
const SNAP = { type: 'spring' as const, stiffness: 420, damping: 28 }

function SkeletonShell({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        'relative flex min-h-[7.5rem] w-full flex-1 overflow-hidden rounded-xl bg-console-inset ring-1 ring-console-line-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Cycles avatars + corner brackets + score — effet « Generate scores » Aceternity. */
function SkeletonScore() {
  const faces = ['AC', 'ML', 'JR', 'SK'] as const
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % faces.length)
    }, 1800)
    return () => window.clearInterval(id)
  }, [faces.length])

  return (
    <SkeletonShell className="items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        {faces.map((label, index) => {
          const isActive = index === active
          return (
            <motion.div
              key={label}
              className="relative flex size-11 items-center justify-center"
              animate={{ scale: isActive ? 1.08 : 1 }}
              transition={SNAP}
            >
              {isActive ? (
                <>
                  <span className="absolute -top-0.5 -left-0.5 size-2 border-t border-l border-accent-300" />
                  <span className="absolute -top-0.5 -right-0.5 size-2 border-t border-r border-accent-300" />
                  <span className="absolute -bottom-0.5 -left-0.5 size-2 border-b border-l border-accent-300" />
                  <span className="absolute -right-0.5 -bottom-0.5 size-2 border-r border-b border-accent-300" />
                </>
              ) : null}
              <motion.span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-console-line',
                  isActive ? 'bg-accent-300 text-accent-ink' : 'bg-console-card text-white/35',
                )}
                animate={{ filter: isActive ? 'grayscale(0%)' : 'grayscale(100%)', opacity: isActive ? 1 : 0.55 }}
                transition={{ duration: 0.35 }}
              >
                {label}
              </motion.span>
            </motion.div>
          )
        })}
      </div>
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="rounded-lg bg-console-card px-3 py-2 text-right ring-1 ring-console-line-soft"
      >
        <p className="text-[10px] tracking-wide text-white/40 uppercase">score</p>
        <p className="text-2xl font-semibold tabular-nums text-accent-300">{88 + active * 3}</p>
      </motion.div>
    </SkeletonShell>
  )
}

/** Timeline verticale + hover spring — effet « Track progress » Aceternity. */
function SkeletonTimeline() {
  const steps = [
    { title: 'Connexion', detail: 'Session chiffrée' },
    { title: 'Autorisation', detail: 'Rôle vérifié' },
    { title: 'Journal', detail: 'Événement indexé' },
  ] as const
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <SkeletonShell className="p-4">
      <div className="relative flex w-full flex-col gap-3">
        <div className="absolute top-2 bottom-2 left-[0.55rem] w-px bg-console-line" />
        {steps.map((step, index) => {
          const isHot = hovered === index
          return (
            <motion.button
              key={step.title}
              type="button"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex w-full items-start gap-3 text-left"
              whileHover={{ x: 4 }}
              transition={SNAP}
            >
              <motion.span
                className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-console-app"
                animate={{
                  backgroundColor: isHot ? 'var(--color-accent-300)' : 'var(--color-console-line-strong)',
                  scale: isHot ? 1.25 : 1,
                }}
                transition={SPRING}
              />
              <motion.div
                layout
                className={cn(
                  'min-w-0 flex-1 rounded-lg px-3 py-2 ring-1',
                  isHot ? 'bg-accent-soft ring-accent-400/25' : 'bg-console-card ring-console-line-soft',
                )}
                transition={SPRING}
              >
                <p className="text-xs font-semibold text-white">{step.title}</p>
                <p className="text-[10px] text-white/45">{step.detail}</p>
              </motion.div>
            </motion.button>
          )
        })}
      </div>
    </SkeletonShell>
  )
}

/** Beams SVG horizontaux — effet « Schedule interviews » Aceternity. */
function SkeletonBeams() {
  const gid = useId().replace(/:/g, '')
  const gradientId = `beam-${gid}`

  return (
    <SkeletonShell className="items-center justify-center p-4">
      <div className="relative flex w-full items-center justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-console-card text-[10px] font-semibold text-white/70 ring-1 ring-console-line">
          ID
        </div>
        <svg className="h-10 flex-1 overflow-visible" viewBox="0 0 220 40" fill="none" aria-hidden="true">
          <path d="M0 20 H220" stroke="var(--color-console-line)" strokeWidth="1.5" />
          <motion.path
            d="M0 20 H220"
            stroke={`url(#${gradientId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: [0, 1], opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent-300)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--color-accent-300)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--color-accent-300)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent-300 ring-1 ring-accent-400/30">
          OK
        </div>
      </div>
      <motion.p
        className="absolute bottom-3 left-4 text-[10px] text-white/40"
        animate={{ opacity: [0.35, 0.8, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        Jeton porteur · backend Railway
      </motion.p>
    </SkeletonShell>
  )
}

/** Upload spring + grille — effet « Easy upload » Aceternity. */
function SkeletonUpload() {
  const [files, setFiles] = useState<readonly string[]>([])

  function addFile() {
    const next = [`accès-${files.length + 1}.log`, `session-${files.length + 1}.json`, `audit-${files.length + 1}.csv`][
      files.length % 3
    ]
    if (files.length >= 3) {
      setFiles([next])
      return
    }
    setFiles([...files, next])
  }

  return (
    <SkeletonShell className="flex-col p-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,var(--color-console-line-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-console-line-soft)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      <LayoutGroup>
        <motion.button
          type="button"
          layout
          onClick={addFile}
          className="relative z-10 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-console-line bg-console-card/80 px-3 py-5 text-center"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
        >
          <CloudArrowUpIcon className="size-5 text-accent-300" />
          <span className="text-xs font-medium text-white/70">Déposer un journal</span>
          <span className="text-[10px] text-white/35">un clic · layout spring</span>
        </motion.button>

        <div className="relative z-10 mt-2 flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {files.map((name) => (
              <motion.div
                key={name}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={SPRING}
                className="flex items-center justify-between rounded-lg bg-console-card px-3 py-2 ring-1 ring-console-line-soft"
              >
                <span className="truncate font-mono text-[10px] text-white/70">{name}</span>
                <span className="text-[10px] text-accent-300">ok</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </SkeletonShell>
  )
}

const items = [
  {
    title: 'Score d’accès',
    description: 'État de session et identité — sélection animée, score lisible.',
    header: <SkeletonScore />,
    className: 'md:col-span-1',
    icon: <UsersIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Parcours d’autorisation',
    description: 'Chaque étape du voyage d’accès, survolée avec un ressort Motion.',
    header: <SkeletonTimeline />,
    className: 'md:col-span-2',
    icon: <ClipboardDocumentListIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Liaison backend',
    description: 'Flux jeton ↔ Railway, beams SVG en dégradé mint.',
    header: <SkeletonBeams />,
    className: 'md:col-span-2',
    icon: <ShieldCheckIcon className="size-4 text-accent-300" />,
  },
  {
    title: 'Dépôt de journaux',
    description: 'Upload mock en layout spring — grille masquée en fond.',
    header: <SkeletonUpload />,
    className: 'md:col-span-1',
    icon: <CloudArrowUpIcon className="size-4 text-accent-300" />,
  },
]

/** Bento 3 colonnes — effets du bloc Aceternity Pro, Motion + tokens Hearst. */
export function ThreeColumnBentoGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-8">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          La plateforme, animée
        </h2>
        <p className="mt-3 text-sm/6 text-white/50">
          Accès, audit, liaison backend et journaux — les mêmes interactions que le bento
          Aceternity, sur la matière console Hearst.
        </p>
      </div>
      <BentoGrid className="md:auto-rows-[22rem]">
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
