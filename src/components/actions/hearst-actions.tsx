'use client'

/**
 * Frontière d'actions Hearst — HC-ADMIN-DASHBOARD-UI-ASSETS-005 /
 * HC-ADMIN-DESIGN-SYSTEM-FORENSIC-033.
 *
 * ── Ce que cette frontière est, et n'est pas ──────────────────────────────
 * Le brief demande une frontière `src/components/actions/` inspirée des boutons
 * Aceternity. La doctrine locale (§2, §8, §15) prime : la SEULE primitive de
 * bouton est Catalyst `<Button>` ; un bouton Aceternity est « interdit sans
 * audit » et ne doit jamais doublonner Catalyst. Ces composants NE
 * réimplémentent donc PAS un bouton — ils COMPOSENT Catalyst `<Button>` et lui
 * ajoutent, en surcouche, deux choses qu'Aceternity nous a seulement inspirées :
 *
 *   1. une micro-interaction Motion (lift au survol, scale au clic) ;
 *   2. une machine à états (`idle → loading → success | error`) pour une action
 *      asynchrone réelle.
 *
 * ── Contrat couleur (033) ─────────────────────────────────────────────────
 * UNE source de vérité : variables CSS Hearst (`--btn-bg` / `--btn-border` /
 * `--btn-icon` / `--btn-hover-overlay`) via `style`. Catalyst fournit
 * structure + comportement (`solid` / `plain`) — JAMAIS `color="lime"|amber|red`
 * (palettes raw qui collisionnent avec les variables accent).
 *
 * Le focus clavier est recalé produit-wide dans `src/styles/tailwind.css`
 * (remap `outline-color` → `--color-accent-500`) ; on n'utilise pas
 * `outline-none`.
 *
 * ── Reduced motion est STRUCTUREL ─────────────────────────────────────────
 * En miroir de `compositions/motion.tsx` : `useReducedMotion()` → on rend une
 * `<span>` inerte, aucune transition. Le spinner de chargement s'arrête aussi,
 * via `motion-reduce:animate-none`.
 *
 * ── Véracité ───────────────────────────────────────────────────────────────
 * Une action sans endpoint réel n'est pas câblée sur un faux handler : elle se
 * rend `disabled` avec un `disabledReason` en tooltip (brief §8). `loading` et
 * `success` ne s'exécutent que pour une `onAction` qui fait un vrai travail.
 */

import { Button } from '@/components/catalyst/button'
import { ArrowPathIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'

type Tone = 'primary' | 'critical' | 'danger' | 'secondary' | 'icon'
type Phase = 'idle' | 'loading' | 'success' | 'error'

/**
 * Ajoute `data-slot=icon` (dimensionnement Catalyst) + `aria-hidden` à l'élément
 * icône. L'icône est un ÉLÉMENT (`<PlusIcon />`), jamais un composant : un
 * composant (forwardRef) n'est pas sérialisable d'un composant serveur vers un
 * composant client — c'était la cause de l'erreur RSC « Only plain objects can
 * be passed to Client Components ».
 */
function iconSlot(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node
  const el = node as ReactElement<{ 'data-slot'?: string; 'aria-hidden'?: boolean }>
  return cloneElement(el, { 'data-slot': 'icon', 'aria-hidden': true })
}

/** Variables sémantiques Hearst — seule source de couleur pour les tons solid. */
const TONE_STYLE: Record<Exclude<Tone, 'icon' | 'secondary'>, CSSProperties> = {
  primary: {
    '--btn-bg': 'var(--color-accent-400)',
    '--btn-border': 'var(--color-accent-500)',
    '--btn-icon': 'var(--color-accent-700)',
    '--btn-hover-overlay': 'var(--color-white)',
  } as CSSProperties,
  critical: {
    '--btn-bg': 'var(--color-warning-400)',
    '--btn-border': 'var(--color-warning-500)',
    '--btn-icon': 'var(--color-warning-700)',
    '--btn-hover-overlay': 'var(--color-white)',
  } as CSSProperties,
  danger: {
    '--btn-bg': 'var(--color-danger-600)',
    '--btn-border': 'var(--color-danger-700)',
    '--btn-icon': 'var(--color-danger-300)',
    '--btn-hover-overlay': 'var(--color-white)',
  } as CSSProperties,
}

/**
 * Classes d'encre / overlay — battent le texte du défaut Catalyst
 * `dark/neutral` (`text-white`) via le modificateur important Tailwind.
 * Focus : `!data-focus:outline-accent-500` bat le `outline-blue-500` vendor.
 * Overlay /25 pour primary+critical (fond clair) ; /10 pour danger (fond sombre).
 */
const FOCUS_ACCENT = '!data-focus:outline-accent-500'

const TONE_CLASS: Record<Exclude<Tone, 'icon'>, string> = {
  primary: clsx(FOCUS_ACCENT, '!text-accent-ink dark:[--btn-hover-overlay:var(--color-white)]/25'),
  critical: clsx(FOCUS_ACCENT, '!text-warning-ink dark:[--btn-hover-overlay:var(--color-white)]/25'),
  danger: clsx(FOCUS_ACCENT, '!text-white dark:[--btn-hover-overlay:var(--color-white)]/10'),
  secondary: FOCUS_ACCENT,
}

/** Tons qui portent une micro-interaction. Le secondaire reste inerte (doctrine : hover Catalyst suffit). */
const TONE_MOTION: Record<Tone, boolean> = {
  primary: true,
  critical: true,
  danger: true,
  secondary: false,
  icon: true,
}

type BaseProps = Readonly<{
  children?: ReactNode
  /** Élément icône menant (ex. `<PlusIcon />`) — jamais un composant, pour rester sérialisable serveur→client. */
  icon?: ReactNode
  className?: string
  'aria-label'?: string
  /** Rendu `disabled` avec ce texte en tooltip — l'état honnête d'une action sans endpoint. */
  disabledReason?: string
  disabled?: boolean
  /** Libellé transitoire affiché ~1,5 s après une `onAction` résolue. */
  successLabel?: string
}>

type HearstActionProps = BaseProps &
  (
    | Readonly<{ href: string; onAction?: never }>
    | Readonly<{ href?: never; onAction?: () => void | Promise<void> }>
  )

/** Wrapper Motion — inerte si reduced-motion ou si le ton ne bouge pas. */
function Interactive({
  children,
  active,
  tapScale,
}: Readonly<{ children: ReactNode; active: boolean; tapScale: number }>) {
  const reduced = useReducedMotion()
  if (!active || reduced) return <span className="inline-flex">{children}</span>
  return (
    <motion.span
      className="inline-flex"
      whileHover={{ y: -1 }}
      whileTap={{ scale: tapScale }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  )
}

function PhaseContent({
  phase,
  icon,
  children,
  successLabel,
}: Readonly<{ phase: Phase; icon?: ReactNode; children?: ReactNode; successLabel?: string }>) {
  if (phase === 'loading') {
    return (
      <>
        <ArrowPathIcon data-slot="icon" className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {children}
      </>
    )
  }
  if (phase === 'success') {
    return (
      <>
        <CheckIcon data-slot="icon" aria-hidden="true" />
        {successLabel ?? children}
      </>
    )
  }
  if (phase === 'error') {
    return (
      <>
        <ExclamationTriangleIcon data-slot="icon" aria-hidden="true" />
        {children}
      </>
    )
  }
  return (
    <>
      {iconSlot(icon)}
      {children}
    </>
  )
}

function HearstAction({ tone, ...props }: HearstActionProps & { tone: Tone }) {
  const { children, icon, className, disabledReason, disabled: disabledProp, successLabel } = props
  const ariaLabel = props['aria-label']
  const href = 'href' in props ? props.href : undefined
  const onAction = 'onAction' in props ? props.onAction : undefined

  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const run = async () => {
    if (phase === 'loading' || onAction === undefined) return
    setPhase('loading')
    try {
      await onAction()
      setPhase('success')
      timer.current = setTimeout(() => setPhase('idle'), 1500)
    } catch {
      setPhase('error')
      timer.current = setTimeout(() => setPhase('idle'), 2500)
    }
  }

  const isDisabled = disabledProp === true || (href === undefined && onAction === undefined && disabledReason !== undefined)
  const busy = phase === 'loading'
  const tapScale = tone === 'icon' ? 0.94 : 0.98
  const mergedClass =
    tone === 'icon' ? clsx(FOCUS_ACCENT, className) : clsx(TONE_CLASS[tone], className)

  const content =
    onAction !== undefined ? (
      <PhaseContent phase={phase} icon={icon} successLabel={successLabel}>
        {children}
      </PhaseContent>
    ) : (
      <>
        {iconSlot(icon)}
        {children}
      </>
    )

  // Bouton Catalyst résolu par ton — jamais un <button> maison.
  // Structure = défaut `dark/neutral` (tokens console) ou `white` / `plain`.
  // Couleur sémantique = variables Hearst uniquement (pas de color="lime").
  let button: ReactNode
  if (tone === 'icon') {
    button = href !== undefined
      ? <Button plain href={href} className={mergedClass} aria-label={ariaLabel} title={disabledReason}>{content}</Button>
      : <Button plain disabled={isDisabled || busy} onClick={onAction ? run : undefined} className={mergedClass} aria-label={ariaLabel} title={disabledReason}>{content}</Button>
  } else if (tone === 'secondary') {
    button = href !== undefined
      ? <Button color="white" href={href} className={mergedClass} aria-label={ariaLabel} title={disabledReason}>{content}</Button>
      : <Button color="white" disabled={isDisabled || busy} onClick={onAction ? run : undefined} className={mergedClass} aria-label={ariaLabel} title={disabledReason}>{content}</Button>
  } else {
    const style = TONE_STYLE[tone]
    button = href !== undefined
      ? <Button href={href} style={style} className={mergedClass} aria-label={ariaLabel} title={disabledReason}>{content}</Button>
      : <Button disabled={isDisabled || busy} onClick={onAction ? run : undefined} style={style} className={mergedClass} aria-label={ariaLabel} title={disabledReason}>{content}</Button>
  }

  return <Interactive active={TONE_MOTION[tone] && !isDisabled && !busy} tapScale={tapScale}>{button}</Interactive>
}

/** Action principale — accent mint Hearst, lift + tap. Le CTA le plus proéminent d'un contexte. */
export function HearstPrimaryAction(props: HearstActionProps) {
  return <HearstAction tone="primary" {...props} />
}

/** Action critique — travail en attente (souscription à reprendre, KYC à valider). États loading + success bornés. */
export function HearstCriticalAction(props: HearstActionProps) {
  return <HearstAction tone="critical" {...props} />
}

/** Action à risque — incident, échec. Tokens danger Hearst. */
export function HearstDangerAction(props: HearstActionProps) {
  return <HearstAction tone="danger" {...props} />
}

/** Action secondaire — fond blanc, bordure grise, hover léger, AUCUNE animation (doctrine). */
export function HearstSecondaryAction(props: HearstActionProps) {
  return <HearstAction tone="secondary" {...props} />
}

/** Action icône seule — `Button plain` + `aria-label` requis, tap 0.94. */
export function HearstIconAction(props: HearstActionProps) {
  return <HearstAction tone="icon" {...props} />
}

export type { HearstActionProps }
