'use client'

/**
 * SubscriptionJourneyStepper — HC-ADMIN-DASHBOARD-UI-ASSETS-005.
 *
 * Remplace les six barres comparatives (`FunnelColumns`) par un vrai parcours à
 * paliers, d'après Application UI v4 `navigation/progress-bars/04-panels-with-border`
 * (+ 07 pour le rendu vertical mobile). Le brief §3 l'exige : « Aucune barre
 * verticale comparative ».
 *
 * ── Piloté par la donnée réelle, jamais décoratif ─────────────────────────
 * Les six étapes viennent de `buildFunnel` (Compte→KYC→Wallet→Dépôt→
 * Souscription→Position). L'état d'une étape est DÉRIVÉ de sa donnée, pas
 * choisi pour l'effet :
 *   - `attention`     — `pending` mesuré > 0 : du travail attend à cette étape ;
 *   - `clear`         — `count` mesuré, aucun `pending` en attente : l'étape coule ;
 *   - `unavailable`   — `count` absent : la source n'a pas répondu (jamais un zéro).
 * On ne fabrique pas de 4e état « bloqué » : aucun endpoint ne publie un compte
 * de blocage par étape aujourd'hui — l'inventer violerait la véracité. Le
 * `pending` en attente porte déjà le signal d'action.
 *
 * ── Sélection + panneau de détail ──────────────────────────────────────────
 * Sur Headless UI `TabGroup` : clavier (flèches, Home/End), rôles ARIA et
 * focus roving fournis par la primitive (doctrine §5 — on ne recode pas un
 * focus trap). Le panneau de détail affiche le `count`, le `pending`, la note
 * de source honnête et l'action de résolution (une vraie route). Le mouvement
 * (fade + 6px) respecte `prefers-reduced-motion`.
 */

import { HearstCriticalAction, HearstSecondaryAction } from '@/components/actions'
import type { FunnelStepView } from '@/components/compositions'
import { isAvailable, valueOf } from '@/lib/vaults/model'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import {
  BanknotesIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  MinusIcon,
  UserPlusIcon,
  WalletIcon,
} from '@heroicons/react/16/solid'
import { ChartBarSquareIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import type { ComponentType, SVGProps } from 'react'

type StepState = 'attention' | 'clear' | 'unavailable'

const STEP_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  compte: UserPlusIcon,
  kyc: ClipboardDocumentCheckIcon,
  wallet: WalletIcon,
  depot: BanknotesIcon,
  souscription: DocumentCheckIcon,
  position: ChartBarSquareIcon,
}

const SHORT_LABEL: Record<string, string> = {
  compte: 'Compte',
  kyc: 'KYC',
  wallet: 'Wallet',
  depot: 'Dépôt',
  souscription: 'Souscription',
  position: 'Position',
}

function numeric(a: FunnelStepView['count']): number | null {
  if (!isAvailable(a)) return null
  const n = Number(a.value)
  return Number.isFinite(n) ? n : null
}

/**
 * Le seul morceau honnête de la note de source : la mise en garde « proxy »
 * après le tiret. On NE rend PAS le préfixe `GET /api/v1/…` — c'est de la
 * plomberie technique que la surface pilotage tient hors de l'UI (cleanup
 * HC-ADMIN-DASHBOARD-VISUAL-CLEANUP-003). Si l'étape lit une source directe
 * (pas de proxy), il n'y a pas de tiret, donc aucune ligne technique.
 */
function sourceCaveat(note: string): string | null {
  const idx = note.indexOf('—')
  if (idx === -1) return null
  const caveat = note.slice(idx + 1).trim()
  return caveat.length > 0 ? caveat : null
}

function stepState(step: FunnelStepView): StepState {
  if (!isAvailable(step.count)) return 'unavailable'
  const pending = valueOf(step.pending)
  if (pending !== null) {
    const n = Number(pending)
    if (Number.isFinite(n) && n > 0) return 'attention'
  }
  return 'clear'
}

/** Classes du cercle d'état — tokens uniquement (accent / warning / zinc). */
const CIRCLE: Record<StepState, string> = {
  clear: 'bg-accent-400/20 text-accent-700 ring-1 ring-accent-500/40 dark:bg-accent-400/10 dark:text-accent-300 dark:ring-accent-400/30',
  attention: 'bg-warning-400/15 text-warning-700 ring-1 ring-warning-500/40 dark:bg-warning-400/10 dark:text-warning-400 dark:ring-warning-400/30',
  unavailable: 'bg-zinc-100 text-zinc-400 ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-white/10',
}

const STATE_ICON: Record<StepState, ComponentType<SVGProps<SVGSVGElement>>> = {
  clear: CheckIcon,
  attention: ExclamationTriangleIcon,
  unavailable: MinusIcon,
}

function StepDetail({ step }: Readonly<{ step: FunnelStepView }>) {
  const reduced = useReducedMotion()
  const state = stepState(step)
  const countText = isAvailable(step.count) ? step.count.value : null
  const caveat = sourceCaveat(step.sourceNote)
  const pending = valueOf(step.pending)
  const pendingNum = pending === null ? null : Number(pending)
  const hasWork = pendingNum !== null && Number.isFinite(pendingNum) && pendingNum > 0

  const body = (
    <div className="rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-950/5 dark:bg-zinc-800/50 dark:ring-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950 dark:text-white">{step.label}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {countText === null ? (
              'Source indisponible — aucune valeur mesurée.'
            ) : (
              <>
                <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{countText}</span>{' '}
                enregistré{Number(countText) > 1 ? 's' : ''}
                {hasWork ? (
                  <>
                    {' · '}
                    <span className="font-semibold text-warning-700 dark:text-warning-400">{pending}</span> en attente
                  </>
                ) : state === 'clear' ? (
                  ' · au clair'
                ) : null}
              </>
            )}
          </p>
        </div>
        {isAvailable(step.count) ? (
          hasWork ? (
            <HearstCriticalAction href={step.actionHref}>{step.actionLabel}</HearstCriticalAction>
          ) : (
            <HearstSecondaryAction href={step.actionHref}>{step.actionLabel}</HearstSecondaryAction>
          )
        ) : (
          <HearstSecondaryAction disabledReason="Source indisponible — rien à ouvrir">
            {step.actionLabel}
          </HearstSecondaryAction>
        )}
      </div>
      {caveat !== null ? (
        <p className="mt-3 border-t border-zinc-950/5 pt-2 text-[11px] leading-4 text-zinc-400 dark:border-white/10 dark:text-zinc-500">
          {caveat}
        </p>
      ) : null}
    </div>
  )

  if (reduced) return body
  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {body}
    </motion.div>
  )
}

export function SubscriptionJourneyStepper({ steps }: Readonly<{ steps: readonly FunnelStepView[] }>) {
  // « Étape active » par défaut : la première qui demande une action, sinon la première.
  const firstAttention = steps.findIndex((s) => stepState(s) === 'attention')
  const initialIndex = firstAttention >= 0 ? firstAttention : 0

  return (
    <TabGroup defaultIndex={initialIndex} as="div" data-widget="subscription-journey">
      <TabList className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 xl:gap-0">
        {steps.map((step, index) => {
          const state = stepState(step)
          const StepIcon = STEP_ICON[step.id] ?? ClipboardDocumentCheckIcon
          const StateGlyph = STATE_ICON[state]
          const value = numeric(step.count)
          const pending = valueOf(step.pending)
          const hasWork = state === 'attention'
          const label = SHORT_LABEL[step.id] ?? step.label

          return (
            <Tab
              key={step.id}
              className={clsx(
                'group relative flex flex-col items-center rounded-lg px-2 py-3 text-center outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-accent-500',
                'data-selected:bg-accent-400/10 data-selected:ring-1 data-selected:ring-accent-500/40',
                'not-data-selected:data-hover:bg-zinc-950/2.5 dark:not-data-selected:data-hover:bg-white/5',
              )}
            >
              {/* Connecteur vers l'étape précédente — visible seulement sur la rangée xl à 6 colonnes. */}
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={clsx(
                    'absolute top-8 left-[-50%] hidden h-0.5 w-full xl:block',
                    value === null ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-accent-400/50',
                  )}
                />
              ) : null}

              <span
                className={clsx(
                  'relative z-10 inline-flex size-10 items-center justify-center rounded-full',
                  CIRCLE[state],
                )}
              >
                <StepIcon className="size-5" aria-hidden="true" />
                <span className="absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full bg-white ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/15">
                  <StateGlyph
                    className={clsx(
                      'size-3',
                      state === 'clear' && 'text-accent-600 dark:text-accent-400',
                      state === 'attention' && 'text-warning-600 dark:text-warning-400',
                      state === 'unavailable' && 'text-zinc-400',
                    )}
                    aria-hidden="true"
                  />
                </span>
              </span>

              <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-zinc-950 dark:text-white">
                <span className="text-zinc-400 tabular-nums dark:text-zinc-500">{index + 1}.</span>
                {label}
              </span>
              <span className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-zinc-950 dark:text-white">
                {value === null ? '—' : value}
              </span>
              <span
                className={clsx(
                  'mt-0.5 text-[11px] leading-4',
                  hasWork
                    ? 'font-medium text-warning-700 dark:text-warning-400'
                    : state === 'clear'
                      ? 'text-accent-700 dark:text-accent-400'
                      : 'text-zinc-400 dark:text-zinc-500',
                )}
              >
                {state === 'unavailable'
                  ? 'Indisponible'
                  : hasWork
                    ? `${pending} en attente`
                    : 'Au clair'}
              </span>
            </Tab>
          )
        })}
      </TabList>

      <TabPanels className="mt-4">
        {steps.map((step) => (
          <TabPanel key={step.id} className="outline-none">
            <StepDetail step={step} />
          </TabPanel>
        ))}
      </TabPanels>

      <p className="mt-3 flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
        <ChevronRightIcon className="size-3" aria-hidden="true" />
        Sélectionnez une étape pour son détail et son action. Chaque compteur lit sa propre source réelle.
      </p>
    </TabGroup>
  )
}
